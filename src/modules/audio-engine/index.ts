export {
  speak,
  stopSpeaking,
  startListening,
  stopListening,
  isListening,
  playAudio,
  stopAudio,
  startRecording,
  stopRecording,
} from './internal/audio-controller';
export type { TTSOptions, TranscriptionResult, AudioBlob } from './types';
