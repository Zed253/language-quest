import { create } from 'zustand';
import { buildSession, advanceSession } from '@/modules/session-orchestrator';
import type { SessionPlan, NextStep, SessionComplete, SessionExercise } from '@/modules/session-orchestrator';

interface SessionStoreState {
  // Session
  plan: SessionPlan | null;
  currentExercise: SessionExercise | null;
  currentPhase: string;
  overallProgress: number;
  isLoading: boolean;
  error: string | null;

  // Phases
  phase: 'idle' | 'intro' | 'exercising' | 'feedback' | 'outro' | 'complete';
  showTranslation: boolean;

  // Last feedback
  lastFeedback: {
    score: number;
    feedback: string;
    correction?: string;
    grammarNote?: string;
  } | null;

  // Complete stats
  completeData: SessionComplete | null;

  // Actions
  startSession: (userId: string) => Promise<void>;
  dismissIntro: () => void;
  submitAnswer: (answer: string) => Promise<void>;
  skipExercise: () => Promise<void>;
  dismissFeedback: () => void;
  toggleTranslation: () => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  plan: null,
  currentExercise: null,
  currentPhase: 'warmup',
  overallProgress: 0,
  isLoading: false,
  error: null,
  phase: 'idle',
  showTranslation: false,
  lastFeedback: null,
  completeData: null,

  startSession: async (userId: string) => {
    set({ isLoading: true, error: null, phase: 'idle' });

    const result = await buildSession(userId);

    if (result.ok) {
      const plan = result.data;
      // Find first exercise
      const firstPhase = plan.phases.warmup.exercises.length > 0
        ? 'warmup'
        : plan.phases.main.exercises.length > 0
          ? 'main'
          : 'finisher';
      const firstExercise = plan.phases[firstPhase]?.exercises[0] || null;

      set({
        plan,
        currentExercise: firstExercise,
        currentPhase: firstPhase,
        overallProgress: 0,
        isLoading: false,
        phase: 'intro',
        showTranslation: false,
      });
    } else {
      set({ isLoading: false, error: result.error.message });
    }
  },

  dismissIntro: () => {
    set({ phase: 'exercising' });
  },

  submitAnswer: async (answer: string) => {
    const { plan, currentExercise } = get();
    if (!plan || !currentExercise) return;

    set({ isLoading: true });

    const startTime = Date.now();
    const result = await advanceSession(plan.id, {
      exerciseId: currentExercise.id,
      userAnswer: answer,
      timeSpentMs: startTime, // simplified -- real impl would track per-exercise
    });

    if (result.ok) {
      if (result.data.type === 'next-exercise') {
        const next = result.data as NextStep;

        // Show feedback briefly, then next exercise
        set({
          isLoading: false,
          lastFeedback: currentExercise.result
            ? {
                score: currentExercise.result.score,
                feedback: currentExercise.result.feedback,
                correction: currentExercise.result.correction,
                grammarNote: currentExercise.result.grammarNote,
              }
            : null,
          phase: 'feedback',
          overallProgress: next.overallProgress,
          currentPhase: next.phase,
          currentExercise: next.exercise,
        });
      } else {
        // Session complete
        const complete = result.data as SessionComplete;
        set({
          isLoading: false,
          phase: 'outro',
          completeData: complete,
          overallProgress: 100,
        });
      }
    } else {
      set({ isLoading: false, error: result.error.message });
    }
  },

  skipExercise: async () => {
    // Skip = submit empty answer
    await get().submitAnswer('');
  },

  dismissFeedback: () => {
    set({ phase: 'exercising', lastFeedback: null });
  },

  toggleTranslation: () => {
    set({ showTranslation: !get().showTranslation });
  },

  reset: () => {
    set({
      plan: null,
      currentExercise: null,
      currentPhase: 'warmup',
      overallProgress: 0,
      isLoading: false,
      error: null,
      phase: 'idle',
      showTranslation: false,
      lastFeedback: null,
      completeData: null,
    });
  },
}));
