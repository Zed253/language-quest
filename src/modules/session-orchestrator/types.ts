import type { Card } from '@/modules/shared-types';
import type { GeneratedExercise } from '@/modules/llm-pipeline';

export interface PeriodizationDirective {
  dominance: string;
  targetTenses: string[];
  targetVocabulary: string[];
  mesoTheme: string;
  exerciseCount: number;
  difficultyTarget: number;
  narrativeContext?: string;
}

export interface SessionPhase {
  type: 'warmup' | 'main' | 'finisher' | 'cooldown';
  exercises: SessionExercise[];
  completed: boolean;
}

export interface SessionExercise {
  id: string;
  source: 'fsrs' | 'llm';
  exercise: GeneratedExercise | null; // null for FSRS cards
  card: Card | null; // null for LLM exercises
  status: 'pending' | 'completed' | 'skipped';
  result?: {
    score: number;
    fsrsGrade: 1 | 2 | 3 | 4;
    feedback: string;
    userAnswer: string;
    timeSpentMs: number;
  };
}

export interface SessionPlan {
  id: string;
  userId: string;
  phases: {
    warmup: SessionPhase;
    main: SessionPhase;
    finisher: SessionPhase;
    cooldown: SessionPhase;
  };
  totalExercises: number;
  estimatedMinutes: number;
  dominance: string;
  theme: string;
  narrativeIntro: string;
  narrativeOutro: string;
  narrativeIntroTranslation: string;
  narrativeOutroTranslation: string;
}

export interface SessionState {
  plan: SessionPlan;
  currentPhase: 'warmup' | 'main' | 'finisher' | 'cooldown';
  currentExerciseIndex: number;
  stats: {
    exercisesCompleted: number;
    exercisesCorrect: number;
    exercisesIncorrect: number;
    totalTimeMs: number;
    currentSuccessRate: number;
  };
  freshness: number; // 1-10, set at session start
}

export interface NextStep {
  type: 'next-exercise';
  phase: 'warmup' | 'main' | 'finisher' | 'cooldown';
  exercise: SessionExercise;
  exerciseIndex: number;
  totalInPhase: number;
  overallProgress: number; // 0-100
}

export interface SessionComplete {
  type: 'session-complete';
  stats: {
    exercisesCompleted: number;
    exercisesCorrect: number;
    exercisesIncorrect: number;
    successRate: number;
    durationMinutes: number;
  };
  narrativeOutro: string;
  narrativeOutroTranslation: string;
  xpEarned: number;
  currencyEarned: number;
}
