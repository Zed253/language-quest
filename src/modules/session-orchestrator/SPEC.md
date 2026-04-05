# Module: session-orchestrator

## Responsibility
Composes and manages a complete learning session. Pulls exercises from exercise-engine, cards from fsrs-engine, and narrative from llm-pipeline. Manages the session phases (warm-up → main → finisher → cool-down) and tracks session state.

Does NOT: grade exercises (delegates to exercise-engine), schedule cards (delegates to fsrs-engine), generate content (delegates to llm-pipeline), or decide periodization (accepts a directive from periodization-engine, uses defaults if absent).

## Public API

```typescript
// Build a session plan for today
buildSession(userId: string, directive?: PeriodizationDirective): Promise<Result<SessionPlan>>

// Process an exercise result and advance the session
advanceSession(sessionId: string, exerciseResult: ExerciseResult): Promise<Result<NextStep | SessionComplete>>

// Get current session state
getSessionState(sessionId: string): Result<SessionState>
```

## SessionPlan structure

```typescript
interface SessionPlan {
  id: string;
  userId: string;
  phases: {
    warmup: SessionPhase;    // FSRS flashcards + narrative intro
    main: SessionPhase;      // 4-6 LLM-generated exercises
    finisher: SessionPhase;  // challenge exercise (skipped if fatigue)
    cooldown: SessionPhase;  // recap + narrative outro + partner message prompt
  };
  totalExercises: number;
  estimatedMinutes: number;
  dominance: string;         // from periodization directive
  theme: string;             // from current meso-cycle
}
```

## Session flow

1. buildSession() called at session start
2. Warm-up: serve FSRS due cards (5 min), show narrative intro
3. Main: serve exercises one by one via advanceSession()
4. After each exercise: grade → update FSRS if vocab → emit events → return NextStep
5. Real-time difficulty check: if success < 60% → reduce difficulty; if > 90% → increase
6. Finisher: one challenge exercise (skipped if freshness < 4 or success < 60%)
7. Cool-down: recap stats, narrative outro, partner message prompt
8. Emit SessionCompleted event

## Default behavior (when periodization-engine is absent)

- Dominance: alternate oral/written daily based on day number (odd=oral, even=written)
- Exercise mix: 2 flashcards + 2 cloze + 1 translation + 1 sentence-building
- Difficulty: start at level 3/10, adjust based on real-time performance
- No theme filtering (all vocabulary eligible)

## Dependencies
- shared-types (types, Result, events)
- fsrs-engine (getNextCards, reviewCard)
- exercise-engine (registry, gradeExercise)
- llm-pipeline (generateExercises, generateNarrative)
- event-bus (emit SessionCompleted, ExerciseGraded)
- data-layer (persist session records)

## State Owned
- Database: sessions table, session_exercises table (exercise results within a session)
- In-memory: active session state per user

## Error Modes
- `SESSION_BUILD_FAILED`: LLM generation failed → fallback to FSRS-only review session
- `SESSION_NOT_FOUND`: invalid session ID
- `SESSION_ALREADY_COMPLETE`: trying to advance a finished session

## Deployment Phase
Phase 1b

## Testing Checklist
- [ ] Unit: buildSession with no directive uses defaults
- [ ] Unit: advanceSession transitions through phases correctly
- [ ] Unit: finisher is skipped when freshness < 4
- [ ] Unit: difficulty adjusts when success drops below 60%
- [ ] Integration: full session flow (build → exercises → complete → event emitted)
- [ ] Contract: SessionPlan matches shared-types
