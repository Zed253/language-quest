import { type Result, ok, err } from '@/modules/shared-types';
import type { TTSOptions, TranscriptionResult, AudioBlob } from '../types';

// Web Speech API types (not in all TS libs)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

// ============================================================
// Audio Controller -- TTS, STT, playback, recording
// Primary: OpenAI APIs. Fallback: Web Speech API.
// ============================================================

// ---------- State ----------
let currentAudio: HTMLAudioElement | null = null;
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let speechRecognition: SpeechRecognitionInstance | null = null;
let recognitionResolve: ((result: TranscriptionResult) => void) | null = null;
let _isListening = false;

// ---------- TTS ----------

export async function speak(
  text: string,
  language: 'es' | 'fr',
  options: TTSOptions = {}
): Promise<Result<AudioBlob>> {
  try {
    // Try OpenAI TTS first
    const voice = options.voice || (language === 'es' ? 'nova' : 'alloy');
    const speed = options.speed || 1.0;

    const response = await fetch('/api/audio/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, speed }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`);
    }

    const blob = await response.blob();

    // Auto-play
    const url = URL.createObjectURL(blob);
    stopSpeaking();
    currentAudio = new Audio(url);
    await currentAudio.play();

    return ok(blob);
  } catch (e) {
    // Fallback to Web Speech API
    return speakFallback(text, language);
  }
}

function speakFallback(text: string, language: 'es' | 'fr'): Result<AudioBlob> {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return err({
      code: 'AUDIO_NOT_SUPPORTED',
      message: 'Speech synthesis not available',
      module: 'audio-engine',
    });
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === 'es' ? 'es-ES' : 'fr-FR';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);

  // Web Speech API doesn't produce a Blob, return empty
  return ok(new Blob());
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// ---------- STT ----------

export async function startListening(
  language: 'es' | 'fr'
): Promise<Result<void>> {
  // Use Web Speech API for real-time listening, then send to Whisper for accuracy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = typeof window !== 'undefined' ? window as any : null;
  const SpeechRecognitionAPI = w?.SpeechRecognition || w?.webkitSpeechRecognition;

  if (!SpeechRecognitionAPI) {
    return err({
      code: 'AUDIO_NOT_SUPPORTED',
      message: 'Speech recognition not available in this browser',
      module: 'audio-engine',
    });
  }

  try {
    // Also start recording for Whisper fallback
    await startRecordingInternal();

    speechRecognition = new SpeechRecognitionAPI();
    speechRecognition.lang = language === 'es' ? 'es-ES' : 'fr-FR';
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;

    _isListening = true;
    speechRecognition.start();

    return ok(undefined);
  } catch (e) {
    _isListening = false;
    return err({
      code: 'AUDIO_PERMISSION_DENIED',
      message: e instanceof Error ? e.message : 'Microphone access denied',
      module: 'audio-engine',
    });
  }
}

export async function stopListening(): Promise<Result<TranscriptionResult>> {
  _isListening = false;

  // Stop Web Speech API
  const webSpeechPromise = new Promise<string>((resolve) => {
    if (!speechRecognition) {
      resolve('');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    speechRecognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      resolve(transcript);
    };

    speechRecognition.onerror = () => resolve('');
    speechRecognition.onend = () => {
      if (!speechRecognition?.onresult) resolve('');
    };

    speechRecognition.stop();
  });

  // Stop recording
  const recordingBlob = await stopRecordingInternal();

  // Try Whisper API for better accuracy
  if (recordingBlob && recordingBlob.size > 0) {
    try {
      const formData = new FormData();
      formData.append('file', recordingBlob, 'recording.webm');

      const response = await fetch('/api/audio/stt', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return ok({
          text: data.text || '',
          confidence: 0.9, // Whisper doesn't return confidence, assume high
          language: data.language || 'es',
          durationMs: 0,
        });
      }
    } catch {
      // Fall through to Web Speech API result
    }
  }

  // Fallback: use Web Speech API result
  const webSpeechText = await webSpeechPromise;
  return ok({
    text: webSpeechText,
    confidence: 0.7, // Web Speech API is less accurate
    language: 'es',
    durationMs: 0,
  });
}

export function isListening(): boolean {
  return _isListening;
}

// ---------- Playback ----------

export async function playAudio(blob: AudioBlob): Promise<Result<void>> {
  try {
    const url = URL.createObjectURL(blob);
    stopAudio();
    currentAudio = new Audio(url);
    await currentAudio.play();
    return ok(undefined);
  } catch (e) {
    return err({
      code: 'AUDIO_PLAYBACK_FAILED',
      message: e instanceof Error ? e.message : 'Playback failed',
      module: 'audio-engine',
    });
  }
}

export function stopAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

// ---------- Recording ----------

async function startRecordingInternal(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recordedChunks = [];
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.start();
}

async function stopRecordingInternal(): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      resolve(null);
      return;
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      // Stop all tracks
      mediaRecorder?.stream.getTracks().forEach((t) => t.stop());
      mediaRecorder = null;
      recordedChunks = [];
      resolve(blob);
    };

    mediaRecorder.stop();
  });
}

// Public recording API (for time capsule, post-session messages)
export async function startRecording(): Promise<Result<void>> {
  try {
    await startRecordingInternal();
    return ok(undefined);
  } catch (e) {
    return err({
      code: 'AUDIO_RECORDING_FAILED',
      message: e instanceof Error ? e.message : 'Recording failed',
      module: 'audio-engine',
    });
  }
}

export async function stopRecording(): Promise<Result<AudioBlob>> {
  const blob = await stopRecordingInternal();
  if (!blob) {
    return err({
      code: 'AUDIO_RECORDING_FAILED',
      message: 'No recording data',
      module: 'audio-engine',
    });
  }
  return ok(blob);
}
