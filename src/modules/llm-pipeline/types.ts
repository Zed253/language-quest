export interface ExerciseGenerationContext {
  userId: string;
  targetLanguage: 'es' | 'fr';
  nativeLanguage: 'es' | 'fr';
  currentPhase: number;
  mesoTheme: string;
  dominance: string; // "accumulation-oral" | "intensification-written" | etc.
  targetTenses: string[];
  targetVocabulary: string[];
  recentlyLearnedWords: string[];
  weakAreas: string[];
  difficultyTarget: number; // 1-10
  exerciseCount: number;
  themeId: 'one-piece' | 'harry-potter';
  narrativeContext?: string;
}

export interface LLMExerciseResponse {
  exercises: GeneratedExercise[];
  narrative_intro: string;
  narrative_outro: string;
}

export interface GeneratedExercise {
  type: string;
  channel: string;
  prompt: string;
  expected_answer: string;
  acceptable_variants: string[];
  difficulty_level: number;
  hints: string[];
  audio_text?: string;
  word_bank?: string[];
  distractors?: string[];
  image_prompt?: string;
  target_vocabulary: string[];
  target_grammar?: string;
  target_tense?: string;
}

export interface EvaluationParams {
  exerciseType: string;
  userAnswer: string;
  expectedAnswer: string;
  acceptableVariants: string[];
  targetLanguage: 'es' | 'fr';
  context?: string; // the prompt/sentence for context
}

export interface GradingHint {
  score: number; // 0.0, 0.5, or 1.0
  feedback: string; // explanation in native language
  correction?: string; // corrected version if score < 1.0
  grammarNote?: string; // grammar tip if relevant
}

export interface NarrativeContext {
  userId: string;
  type: 'session-intro' | 'session-outro' | 'couple-message';
  targetLanguage: 'es' | 'fr';
  currentPhase: number;
  themeId: 'one-piece' | 'harry-potter';
  mesoTheme: string;
  narrativeArc: string;
  sessionStats?: { correct: number; total: number; duration: number };
  streakDays?: number;
  partnerName?: string;
  partnerStats?: { streakDays: number; lastScore: number; isActive: boolean };
  countdownDays?: number;
  countdownDestination?: string;
  userLevel: number; // 1-5, determines language complexity of the narrative
}

export interface NarrativeResponse {
  text: string; // in target language
  translation: string; // in native language (for translate button)
}
