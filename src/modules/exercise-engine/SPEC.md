# Module: exercise-engine

## Responsibility
Manages all exercise types via a plug-in registry. Each exercise type defines: how to render it, how to grade it, and what data it needs. Adding a new exercise type = 1 file + 1 register call.

Does NOT: decide which exercises appear in a session (that's session-orchestrator), call the LLM directly (delegates to llm-pipeline via grading), or manage FSRS scheduling (that's fsrs-engine).

## Public API

```typescript
// Registry
ExerciseTypeRegistry.register(definition: ExerciseTypeDefinition): void
ExerciseTypeRegistry.getType(type: string): ExerciseTypeDefinition | undefined
ExerciseTypeRegistry.getAllTypes(): ExerciseTypeDefinition[]

// Rendering
renderExercise(exercise: Exercise): React.ComponentType<ExerciseProps>

// Grading
gradeExercise(type: string, userAnswer: string, expected: string, context?: GradingContext): Promise<Result<GradeResult>>
```

## Exercise Types (Phase 1b -- first 6)

1. **flashcard-rich**: Enhanced flashcard with progressive hints, audio, bidirectional, tense variants
2. **cloze**: Fill-in-the-blank with accent normalization
3. **translation-l1-to-l2**: Free-text translation, LLM-as-judge grading
4. **translation-l2-to-l1**: Free-text translation, exact match + variants
5. **sentence-building**: Reorder word bank into correct sentence
6. **qcm**: Multiple choice (Phase 1 scaffolding only, phased out)

## ExerciseTypeDefinition interface

```typescript
interface ExerciseTypeDefinition {
  type: string;
  channel: ExerciseChannel;
  component: React.ComponentType<ExerciseProps>;
  grader: (userAnswer: string, expected: string, context?: GradingContext) => Promise<GradeResult>;
  supportsTenses: boolean;
  supportsAudio: boolean;
  minPhase: number;  // earliest phase this type appears (e.g., QCM = 1 only)
  maxPhase?: number; // latest phase (e.g., QCM maxPhase = 1)
}
```

## Dependencies
- shared-types (types, Result)
- llm-pipeline (for LLM-as-judge grading)

## State Owned
- No database tables (exercise results stored by session-orchestrator)
- In-memory: ExerciseTypeRegistry singleton

## Error Modes
- `EXERCISE_TYPE_NOT_FOUND`: unknown type string → fallback to flashcard
- `GRADING_FAILED`: LLM grading failed → retry, then default to partial credit (0.5)

## Deployment Phase
Phase 1b

## Testing Checklist
- [ ] Unit: each grader produces correct scores for known inputs
- [ ] Unit: registry.register + registry.getType round-trips
- [ ] Unit: unknown type returns undefined
- [ ] Component: each exercise component renders without crash
- [ ] Contract: ExerciseTypeDefinition satisfies interface
