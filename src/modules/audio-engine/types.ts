export interface TTSOptions {
  voice?: string; // OpenAI voice id: "nova", "alloy", "echo", "fable", "onyx", "shimmer"
  speed?: number; // 0.25 to 4.0, default 1.0
}

export interface TranscriptionResult {
  text: string;         // transcribed text
  confidence: number;   // 0-1 confidence score (approximate)
  language: string;     // detected language
  durationMs: number;   // duration of recording
}

export type AudioBlob = Blob;
