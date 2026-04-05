import { create } from 'zustand';
import { buildSession } from '@/modules/session-orchestrator';
import { gradeExercise } from '@/modules/exercise-engine';
import { reviewCard } from '@/modules/fsrs-engine';
import { eventBus } from '@/modules/event-bus';
import type { SessionPlan, SessionExercise, SessionComplete } from '@/modules/session-orchestrator';

interface SessionStoreState {
  plan: SessionPlan | null;
  currentExercise: SessionExercise | null;
  currentPhaseKey: 'warmup' | 'main' | 'finisher' | 'cooldown';
  currentExerciseIndex: number;
  overallProgress: number;
  isLoading: boolean;
  error: string | null;
  phase: 'idle' | 'intro' | 'exercising' | 'feedback' | 'outro' | 'complete';
  showTranslation: boolean;
  lastFeedback: { score: number; feedback: string; correction?: string; grammarNote?: string } | null;
  completeData: SessionComplete | null;
  stats: { completed: number; correct: number; incorrect: number; startTime: number };

  startSession: (userId: string) => Promise<void>;
  dismissIntro: () => void;
  submitAnswer: (userId: string, answer: string) => Promise<void>;
  dismissFeedback: () => void;
  toggleTranslation: () => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  plan: null,
  currentExercise: null,
  currentPhaseKey: 'warmup',
  currentExerciseIndex: 0,
  overallProgress: 0,
  isLoading: false,
  error: null,
  phase: 'idle',
  showTranslation: false,
  lastFeedback: null,
  completeData: null,
  stats: { completed: 0, correct: 0, incorrect: 0, startTime: 0 },

  startSession: async (userId: string) => {
    set({ isLoading: true, error: null, phase: 'idle' });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('SESSION_TIMEOUT')), 30000)
    );

    let result;
    try {
      result = await Promise.race([buildSession(userId), timeoutPromise]);
    } catch {
      // Fallback: FSRS-only session
      const { getNextCards } = await import('@/modules/fsrs-engine');
      const cardsResult = await getNextCards(userId, 10);
      const cards = cardsResult.ok ? cardsResult.data : [];

      if (cards.length === 0) {
        set({ isLoading: false, error: 'Pas de cartes disponibles. Charge du vocabulaire d\'abord.' });
        return;
      }

      const fallbackPlan: SessionPlan = {
        id: crypto.randomUUID(),
        userId,
        phases: {
          warmup: {
            type: 'warmup', completed: false,
            exercises: cards.map(card => ({
              id: crypto.randomUUID(), source: 'fsrs' as const,
              exercise: null, card, status: 'pending' as const,
            })),
          },
          main: { type: 'main', exercises: [], completed: true },
          finisher: { type: 'finisher', exercises: [], completed: true },
          cooldown: { type: 'cooldown', exercises: [], completed: true },
        },
        totalExercises: cards.length,
        estimatedMinutes: Math.round(cards.length * 0.5),
        dominance: 'review', theme: 'revision',
        narrativeIntro: '¡Hoy revisamos vocabulario! El capitán necesita refrescar su memoria.',
        narrativeOutro: '¡Buen trabajo, marinero! Tu tripulación está orgullosa.',
        narrativeIntroTranslation: '', narrativeOutroTranslation: '',
      };

      set({
        plan: fallbackPlan,
        currentExercise: fallbackPlan.phases.warmup.exercises[0],
        currentPhaseKey: 'warmup', currentExerciseIndex: 0,
        overallProgress: 0, isLoading: false, phase: 'intro',
        showTranslation: false,
        stats: { completed: 0, correct: 0, incorrect: 0, startTime: Date.now() },
      });
      return;
    }

    if (result.ok) {
      const plan = result.data;
      const firstPhaseKey: 'warmup' | 'main' | 'finisher' = 
        plan.phases.warmup.exercises.length > 0 ? 'warmup' :
        plan.phases.main.exercises.length > 0 ? 'main' : 'finisher';
      const firstExercise = plan.phases[firstPhaseKey]?.exercises[0] || null;

      set({
        plan, currentExercise: firstExercise,
        currentPhaseKey: firstPhaseKey, currentExerciseIndex: 0,
        overallProgress: 0, isLoading: false, phase: 'intro',
        showTranslation: false,
        stats: { completed: 0, correct: 0, incorrect: 0, startTime: Date.now() },
      });
    } else {
      set({ isLoading: false, error: result.error.message });
    }
  },

  dismissIntro: () => set({ phase: 'exercising' }),

  submitAnswer: async (userId: string, answer: string) => {
    const { plan, currentExercise, currentPhaseKey, currentExerciseIndex, stats } = get();
    if (!plan || !currentExercise) return;

    set({ isLoading: true });

    let feedbackData = { score: 0, feedback: '', correction: undefined as string | undefined, grammarNote: undefined as string | undefined };

    try {
      if (currentExercise.source === 'fsrs' && currentExercise.card) {
        // Flashcard: answer is the rating (1-4)
        const rating = parseInt(answer) as 1 | 2 | 3 | 4;
        await reviewCard(currentExercise.card.id, userId, rating);
        const isCorrect = rating >= 3;
        feedbackData = {
          score: isCorrect ? 1 : 0,
          feedback: isCorrect ? '¡Bien!' : 'Lo verás de nuevo pronto.',
          correction: undefined, grammarNote: undefined,
        };
      } else if (currentExercise.exercise) {
        // LLM exercise: grade via exercise-engine
        const result = await gradeExercise(
          currentExercise.exercise.type, answer,
          currentExercise.exercise.expected_answer,
          currentExercise.exercise.acceptable_variants,
          { responseTimeMs: 10000, medianResponseTimeMs: 15000, targetLanguage: 'es', exerciseContext: currentExercise.exercise.prompt }
        );
        if (result.ok) {
          feedbackData = { score: result.data.score, feedback: result.data.feedback, correction: result.data.correction, grammarNote: result.data.grammarNote };
        } else {
          feedbackData = { score: 0.5, feedback: 'Credit partiel.', correction: undefined, grammarNote: undefined };
        }
      }
    } catch {
      feedbackData = { score: 0.5, feedback: 'Erreur de notation.', correction: undefined, grammarNote: undefined };
    }

    // Update stats
    const newStats = {
      ...stats,
      completed: stats.completed + 1,
      correct: stats.correct + (feedbackData.score >= 0.5 ? 1 : 0),
      incorrect: stats.incorrect + (feedbackData.score < 0.5 ? 1 : 0),
    };

    // Find next exercise
    const phaseOrder: ('warmup' | 'main' | 'finisher' | 'cooldown')[] = ['warmup', 'main', 'finisher', 'cooldown'];
    let nextPhaseKey = currentPhaseKey;
    let nextIndex = currentExerciseIndex + 1;
    let nextExercise: SessionExercise | null = null;

    // Try next in current phase
    const currentPhaseExercises = plan.phases[currentPhaseKey].exercises;
    if (nextIndex < currentPhaseExercises.length) {
      nextExercise = currentPhaseExercises[nextIndex];
    } else {
      // Move to next phase
      const currentPhaseIdx = phaseOrder.indexOf(currentPhaseKey);
      for (let i = currentPhaseIdx + 1; i < phaseOrder.length; i++) {
        const phase = plan.phases[phaseOrder[i]];
        if (phase.exercises.length > 0) {
          nextPhaseKey = phaseOrder[i];
          nextIndex = 0;
          nextExercise = phase.exercises[0];
          break;
        }
      }
    }

    const progress = (newStats.completed / plan.totalExercises) * 100;

    if (nextExercise) {
      // Show feedback, then next exercise
      set({
        isLoading: false,
        lastFeedback: feedbackData,
        phase: 'feedback',
        overallProgress: progress,
        currentPhaseKey: nextPhaseKey,
        currentExerciseIndex: nextIndex,
        currentExercise: nextExercise,
        stats: newStats,
      });
    } else {
      // Session complete!
      const durationMin = Math.round((Date.now() - stats.startTime) / 60000);
      const successRate = newStats.completed > 0 ? Math.round((newStats.correct / newStats.completed) * 100) : 0;
      const currencyEarned = newStats.correct * 5 - newStats.incorrect * 2;

      eventBus.emit({
        type: 'SessionCompleted',
        payload: {
          user_id: userId,
          stats: {
            cards_reviewed: newStats.completed, cards_correct: newStats.correct,
            cards_incorrect: newStats.incorrect, duration_seconds: durationMin * 60,
            new_cards_seen: 0, review_cards_seen: newStats.completed,
          },
          completed_at: new Date().toISOString(),
        },
      });

      set({
        isLoading: false,
        lastFeedback: feedbackData,
        phase: 'outro',
        overallProgress: 100,
        stats: newStats,
        completeData: {
          type: 'session-complete',
          stats: { exercisesCompleted: newStats.completed, exercisesCorrect: newStats.correct, exercisesIncorrect: newStats.incorrect, successRate, durationMinutes: durationMin },
          narrativeOutro: plan.narrativeOutro,
          narrativeOutroTranslation: plan.narrativeOutroTranslation,
          xpEarned: newStats.correct * 10,
          currencyEarned,
        },
      });
    }
  },

  dismissFeedback: () => set({ phase: 'exercising', lastFeedback: null }),
  toggleTranslation: () => set({ showTranslation: !get().showTranslation }),
  reset: () => set({
    plan: null, currentExercise: null, currentPhaseKey: 'warmup',
    currentExerciseIndex: 0, overallProgress: 0, isLoading: false,
    error: null, phase: 'idle', showTranslation: false,
    lastFeedback: null, completeData: null,
    stats: { completed: 0, correct: 0, incorrect: 0, startTime: 0 },
  }),
}));
