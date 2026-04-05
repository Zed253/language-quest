import { type Result, ok, err } from '@/modules/shared-types';
import { getNextCards } from '@/modules/fsrs-engine';
import { generateExercises, generateNarrative } from '@/modules/llm-pipeline';
import { gradeExercise } from '@/modules/exercise-engine';
import { reviewCard } from '@/modules/fsrs-engine';
import { eventBus } from '@/modules/event-bus';
import type {
  SessionPlan,
  SessionState,
  SessionPhase,
  SessionExercise,
  NextStep,
  SessionComplete,
  PeriodizationDirective,
} from '../types';

// ============================================================
// Session Orchestrator
// Composes warm-up → main → finisher → cool-down
// ============================================================

// In-memory session state (per user, single session at a time)
const activeSessions = new Map<string, SessionState>();

function generateId(): string {
  return crypto.randomUUID();
}

// Default directive when periodization engine is not yet built
function getDefaultDirective(dayNumber: number): PeriodizationDirective {
  const isOral = dayNumber % 2 === 1;
  return {
    dominance: isOral ? 'accumulation-oral' : 'intensification-written',
    targetTenses: ['presente'],
    targetVocabulary: [],
    mesoTheme: 'daily-life',
    exerciseCount: 4,
    difficultyTarget: 3,
  };
}

export async function buildSession(
  userId: string,
  directive?: PeriodizationDirective
): Promise<Result<SessionPlan>> {
  try {
    const dir = directive || getDefaultDirective(Date.now() % 365);

    // 1. Get FSRS cards for warm-up (5 cards)
    const cardsResult = await getNextCards(userId, 5);
    const warmupCards = cardsResult.ok ? cardsResult.data : [];

    // 2. Generate exercises via LLM
    const exercisesResult = await generateExercises({
      userId,
      targetLanguage: 'es', // TODO: read from user profile
      nativeLanguage: 'fr',
      currentPhase: 1, // TODO: read from user profile
      mesoTheme: dir.mesoTheme,
      dominance: dir.dominance,
      targetTenses: dir.targetTenses,
      targetVocabulary: dir.targetVocabulary,
      recentlyLearnedWords: [],
      weakAreas: [],
      difficultyTarget: dir.difficultyTarget,
      exerciseCount: dir.exerciseCount,
      themeId: 'one-piece', // TODO: read from user profile
    });

    // 3. Generate narrative
    const introResult = await generateNarrative({
      userId,
      type: 'session-intro',
      targetLanguage: 'es',
      currentPhase: 1,
      themeId: 'one-piece',
      mesoTheme: dir.mesoTheme,
      narrativeArc: 'East Blue',
      userLevel: 1,
    });

    const outroResult = await generateNarrative({
      userId,
      type: 'session-outro',
      targetLanguage: 'es',
      currentPhase: 1,
      themeId: 'one-piece',
      mesoTheme: dir.mesoTheme,
      narrativeArc: 'East Blue',
      userLevel: 1,
    });

    // Build exercise items
    const warmupExercises: SessionExercise[] = warmupCards.map((card) => ({
      id: generateId(),
      source: 'fsrs' as const,
      exercise: null,
      card,
      status: 'pending' as const,
    }));

    const llmExercises = exercisesResult.ok ? exercisesResult.data.exercises : [];
    const mainExercises: SessionExercise[] = llmExercises.slice(0, -1).map((ex) => ({
      id: generateId(),
      source: 'llm' as const,
      exercise: ex,
      card: null,
      status: 'pending' as const,
    }));

    const finisherExercise: SessionExercise[] = llmExercises.length > 0
      ? [{
          id: generateId(),
          source: 'llm' as const,
          exercise: llmExercises[llmExercises.length - 1],
          card: null,
          status: 'pending' as const,
        }]
      : [];

    const plan: SessionPlan = {
      id: generateId(),
      userId,
      phases: {
        warmup: { type: 'warmup', exercises: warmupExercises, completed: false },
        main: { type: 'main', exercises: mainExercises, completed: false },
        finisher: { type: 'finisher', exercises: finisherExercise, completed: false },
        cooldown: { type: 'cooldown', exercises: [], completed: false },
      },
      totalExercises: warmupExercises.length + mainExercises.length + finisherExercise.length,
      estimatedMinutes: Math.round((warmupExercises.length + mainExercises.length + finisherExercise.length) * 1.5),
      dominance: dir.dominance,
      theme: dir.mesoTheme,
      narrativeIntro: introResult.ok ? introResult.data.text : '¡Vamos a aprender!',
      narrativeOutro: outroResult.ok ? outroResult.data.text : '¡Buen trabajo!',
      narrativeIntroTranslation: introResult.ok ? introResult.data.translation : "C'est parti !",
      narrativeOutroTranslation: outroResult.ok ? outroResult.data.translation : 'Bon travail !',
    };

    // Initialize session state
    const state: SessionState = {
      plan,
      currentPhase: 'warmup',
      currentExerciseIndex: 0,
      stats: {
        exercisesCompleted: 0,
        exercisesCorrect: 0,
        exercisesIncorrect: 0,
        totalTimeMs: 0,
        currentSuccessRate: 0,
      },
      freshness: 7, // Default, will be set by UI
    };

    activeSessions.set(plan.id, state);
    return ok(plan);
  } catch (e) {
    return err({
      code: 'SESSION_BUILD_FAILED',
      message: 'Failed to build session',
      module: 'session-orchestrator',
      cause: e,
    });
  }
}

export async function advanceSession(
  sessionId: string,
  exerciseResult: {
    exerciseId: string;
    userAnswer: string;
    timeSpentMs: number;
  }
): Promise<Result<NextStep | SessionComplete>> {
  const state = activeSessions.get(sessionId);
  if (!state) {
    return err({
      code: 'SESSION_NOT_FOUND',
      message: `Session ${sessionId} not found`,
      module: 'session-orchestrator',
    });
  }

  // Find the current exercise
  const phaseKey = state.currentPhase;
  const phase = state.plan.phases[phaseKey];
  const currentExercise = phase.exercises[state.currentExerciseIndex];

  if (currentExercise) {
    // Grade the exercise
    let gradeResult;

    if (currentExercise.source === 'fsrs' && currentExercise.card) {
      // Flashcard: userAnswer is the self-grade (1-4)
      const rating = parseInt(exerciseResult.userAnswer) as 1 | 2 | 3 | 4;
      const fsrsResult = await reviewCard(
        currentExercise.card.id,
        state.plan.userId,
        rating
      );

      gradeResult = {
        score: rating >= 3 ? 1.0 : rating === 2 ? 0.5 : 0,
        fsrsGrade: rating,
        feedback: rating >= 3 ? 'Good!' : 'You\'ll see this again soon.',
        userAnswer: exerciseResult.userAnswer,
        timeSpentMs: exerciseResult.timeSpentMs,
      };
    } else if (currentExercise.exercise) {
      // LLM exercise: grade via exercise-engine
      const result = await gradeExercise(
        currentExercise.exercise.type,
        exerciseResult.userAnswer,
        currentExercise.exercise.expected_answer,
        currentExercise.exercise.acceptable_variants,
        {
          responseTimeMs: exerciseResult.timeSpentMs,
          medianResponseTimeMs: 15000, // TODO: calculate from history
          targetLanguage: 'es',
          exerciseContext: currentExercise.exercise.prompt,
        }
      );

      const grade = result.ok ? result.data : { score: 0.5, fsrsGrade: 2 as const, feedback: 'Partial credit.' };

      gradeResult = {
        ...grade,
        userAnswer: exerciseResult.userAnswer,
        timeSpentMs: exerciseResult.timeSpentMs,
      };
    } else {
      gradeResult = {
        score: 0,
        fsrsGrade: 1 as const,
        feedback: 'Error',
        userAnswer: exerciseResult.userAnswer,
        timeSpentMs: exerciseResult.timeSpentMs,
      };
    }

    // Update exercise status
    currentExercise.status = 'completed';
    currentExercise.result = gradeResult;

    // Update stats
    state.stats.exercisesCompleted++;
    state.stats.totalTimeMs += exerciseResult.timeSpentMs;
    if (gradeResult.score >= 0.5) {
      state.stats.exercisesCorrect++;
    } else {
      state.stats.exercisesIncorrect++;
    }
    state.stats.currentSuccessRate = state.stats.exercisesCompleted > 0
      ? (state.stats.exercisesCorrect / state.stats.exercisesCompleted) * 100
      : 0;
  }

  // Advance to next exercise or next phase
  const nextIndex = state.currentExerciseIndex + 1;

  if (nextIndex < phase.exercises.length) {
    // More exercises in current phase
    state.currentExerciseIndex = nextIndex;
    const nextExercise = phase.exercises[nextIndex];

    return ok({
      type: 'next-exercise' as const,
      phase: phaseKey,
      exercise: nextExercise,
      exerciseIndex: nextIndex,
      totalInPhase: phase.exercises.length,
      overallProgress: (state.stats.exercisesCompleted / state.plan.totalExercises) * 100,
    });
  }

  // Phase complete -- advance to next phase
  phase.completed = true;
  const phaseOrder: Array<'warmup' | 'main' | 'finisher' | 'cooldown'> = ['warmup', 'main', 'finisher', 'cooldown'];
  const currentPhaseIdx = phaseOrder.indexOf(phaseKey);
  const nextPhaseIdx = currentPhaseIdx + 1;

  // Check if finisher should be skipped (fatigue or low success)
  if (phaseOrder[nextPhaseIdx] === 'finisher') {
    if (state.freshness < 4 || state.stats.currentSuccessRate < 60) {
      state.plan.phases.finisher.completed = true;
      // Skip to cooldown
      state.currentPhase = 'cooldown';
      state.currentExerciseIndex = 0;
    }
  }

  // Find next phase with exercises
  for (let i = nextPhaseIdx; i < phaseOrder.length; i++) {
    const nextPhase = state.plan.phases[phaseOrder[i]];
    if (!nextPhase.completed && nextPhase.exercises.length > 0) {
      state.currentPhase = phaseOrder[i];
      state.currentExerciseIndex = 0;
      const nextExercise = nextPhase.exercises[0];

      return ok({
        type: 'next-exercise' as const,
        phase: phaseOrder[i],
        exercise: nextExercise,
        exerciseIndex: 0,
        totalInPhase: nextPhase.exercises.length,
        overallProgress: (state.stats.exercisesCompleted / state.plan.totalExercises) * 100,
      });
    }
  }

  // All phases complete -- session done
  const durationMinutes = Math.round(state.stats.totalTimeMs / 60000);

  // Emit event
  eventBus.emit({
    type: 'SessionCompleted',
    payload: {
      user_id: state.plan.userId,
      stats: {
        cards_reviewed: state.stats.exercisesCompleted,
        cards_correct: state.stats.exercisesCorrect,
        cards_incorrect: state.stats.exercisesIncorrect,
        duration_seconds: Math.round(state.stats.totalTimeMs / 1000),
        new_cards_seen: 0,
        review_cards_seen: state.stats.exercisesCompleted,
      },
      completed_at: new Date().toISOString(),
    },
  });

  // Clean up
  activeSessions.delete(sessionId);

  return ok({
    type: 'session-complete' as const,
    stats: {
      exercisesCompleted: state.stats.exercisesCompleted,
      exercisesCorrect: state.stats.exercisesCorrect,
      exercisesIncorrect: state.stats.exercisesIncorrect,
      successRate: Math.round(state.stats.currentSuccessRate),
      durationMinutes,
    },
    narrativeOutro: state.plan.narrativeOutro,
    narrativeOutroTranslation: state.plan.narrativeOutroTranslation,
    xpEarned: state.stats.exercisesCorrect * 10,
    currencyEarned: state.stats.exercisesCorrect * 5 - state.stats.exercisesIncorrect * 2,
  });
}

export function getSessionState(sessionId: string): Result<SessionState> {
  const state = activeSessions.get(sessionId);
  if (!state) {
    return err({
      code: 'SESSION_NOT_FOUND',
      message: `Session ${sessionId} not found`,
      module: 'session-orchestrator',
    });
  }
  return ok(state);
}
