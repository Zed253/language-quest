import type { Result } from '@/modules/shared-types';

// ============================================================
// Exercise Type Registry -- plug-in architecture
// Adding a new type = 1 file + registry.register()
// ============================================================

export interface ExerciseProps {
  exercise: {
    type: string;
    prompt: string;
    expected_answer: string;
    acceptable_variants: string[];
    hints: string[];
    word_bank?: string[];
    distractors?: string[];
    audio_text?: string;
    difficulty_level: number;
    target_vocabulary: string[];
    target_tense?: string;
  };
  onSubmit: (answer: string) => void;
  onSkip: () => void;
  isLoading: boolean;
}

export interface GradeResult {
  score: number; // 0.0, 0.5, or 1.0
  fsrsGrade: 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
  feedback: string;
  correction?: string;
  grammarNote?: string;
}

export interface GradingContext {
  responseTimeMs: number;
  medianResponseTimeMs: number;
  targetLanguage: 'es' | 'fr';
  exerciseContext?: string; // the prompt for LLM context
}

export interface ExerciseTypeDefinition {
  type: string;
  channel: string;
  grader: (
    userAnswer: string,
    expectedAnswer: string,
    acceptableVariants: string[],
    context?: GradingContext
  ) => Promise<GradeResult>;
  supportsTenses: boolean;
  supportsAudio: boolean;
  minPhase: number;
  maxPhase?: number;
}

class ExerciseTypeRegistry {
  private types = new Map<string, ExerciseTypeDefinition>();

  register(definition: ExerciseTypeDefinition): void {
    this.types.set(definition.type, definition);
  }

  getType(type: string): ExerciseTypeDefinition | undefined {
    return this.types.get(type);
  }

  getAllTypes(): ExerciseTypeDefinition[] {
    return Array.from(this.types.values());
  }

  getTypesForPhase(phase: number): ExerciseTypeDefinition[] {
    return this.getAllTypes().filter(
      (t) => phase >= t.minPhase && (!t.maxPhase || phase <= t.maxPhase)
    );
  }
}

// Singleton
export const registry = new ExerciseTypeRegistry();
