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

    // Add a 12s timeout -- if LLM takes too long, we'll still show flashcards
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('SESSION_TIMEOUT')), 12000)
    );

    let result;
    try {
      result = await Promise.race([buildSession(userId), timeoutPromise]);
    } catch (e) {
      // Timeout or error -- create a fallback FSRS-only session
      const { getNextCards } = await import('@/modules/fsrs-engine');
      const cardsResult = await getNextCards(userId, 10);
      const cards = cardsResult.ok ? cardsResult.data : [];

      if (cards.length === 0) {
        set({ isLoading: false, error: 'No cards available. Try loading flashcards first.' });
        return;
      }

      // Build a minimal FSRS-only plan
      const fallbackPlan = {
        id: crypto.randomUUID(),
        userId,
        phases: {
          warmup: {
            type: 'warmup' as const,
            exercises: cards.map(card => ({
              id: crypto.randomUUID(),
              source: 'fsrs' as const,
              exercise: null,
              card,
              status: 'pending' as const,
            })),
            completed: false,
          },
          main: { type: 'main' as const, exercises: [], completed: true },
          finisher: { type: 'finisher' as const, exercises: [], completed: true },
          cooldown: { type: 'cooldown' as const, exercises: [], completed: true },
        },
        totalExercises: cards.length,
        estimatedMinutes: Math.round(cards.length * 0.5),
        dominance: 'review',
        theme: 'daily-life',
        narrativeIntro: '¡Hoy revisamos vocabulario! El capitán necesita refrescar su memoria.',
        narrativeOutro: '¡Buen trabajo, marinero! Tu tripulación está orgullosa.',
        narrativeIntroTranslation: '',
        narrativeOutroTranslation: '',
      };

      set({
        plan: fallbackPlan,
        currentExercise: fallbackPlan.phases.warmup.exercises[0],
        currentPhase: 'warmup',
        overallProgress: 0,
        isLoading: false,
        phase: 'intro',
        showTranslation: false,
      });
      return;
    }

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
