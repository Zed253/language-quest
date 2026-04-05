# Module: audio-engine

## Responsibility
Manages all audio interactions: text-to-speech (TTS), speech-to-text (STT), audio playback, and recording. This is the ONLY module that touches audio APIs (OpenAI TTS, Whisper, Web Speech API).

Does NOT: grade exercises (that's exercise-engine), generate exercise content (that's llm-pipeline), or manage session flow (that's session-orchestrator).

## Public API

```typescript
// Text-to-Speech
speak(text: string, language: 'es' | 'fr', options?: TTSOptions): Promise<Result<AudioBlob>>
stopSpeaking(): void

// Speech-to-Text
startListening(language: 'es' | 'fr'): Promise<Result<void>>
stopListening(): Promise<Result<TranscriptionResult>>
isListening(): boolean

// Audio playback
playAudio(blob: AudioBlob): Promise<Result<void>>
stopAudio(): void

// Recording (for time capsule, post-session messages)
startRecording(): Promise<Result<void>>
stopRecording(): Promise<Result<AudioBlob>>
```

## Providers

### Primary: OpenAI (online)
- TTS: POST /api/audio/tts → OpenAI TTS API (voice: "nova" for ES, "alloy" for FR)
- STT: POST /api/audio/stt → OpenAI Whisper API

### Fallback: Web Speech API (offline)
- TTS: window.speechSynthesis
- STT: webkitSpeechRecognition / SpeechRecognition
- Automatically selected when offline or API fails

## Dependencies
- shared-types (Result)
- OpenAI API (external, via /api/audio/* routes)
- Web Speech API (browser-native fallback)

## State Owned
- In-memory: current playback state, recording state, active MediaRecorder
- No database tables

## Error Modes
- `AUDIO_TTS_FAILED`: OpenAI TTS error → fallback to Web Speech API
- `AUDIO_STT_FAILED`: Whisper error → fallback to Web Speech API
- `AUDIO_NOT_SUPPORTED`: browser doesn't support Web Speech API → disable audio exercises
- `AUDIO_PERMISSION_DENIED`: microphone access denied → show permission prompt
- `AUDIO_RECORDING_FAILED`: MediaRecorder error → Result.err

## Deployment Phase
Phase 2

## Testing Checklist
- [ ] Unit: speak() returns AudioBlob on success
- [ ] Unit: speak() falls back to Web Speech API on error
- [ ] Unit: stopSpeaking() cancels active speech
- [ ] Integration: full TTS flow (text → API → audio playback)
- [ ] Integration: full STT flow (record → API → transcription text)
- [ ] Browser: Web Speech API fallback works when offline
- [ ] Browser: microphone permission flow works
