# Module: llm-pipeline

## Responsibility
Abstracts all LLM interactions behind a provider interface. Handles prompt construction, response parsing, retry/fallback, and cost tracking. This is the ONLY module that calls external AI APIs.

Does NOT: decide what exercises to generate (that's exercise-engine + session-orchestrator), grade exercises (that's exercise-engine), or manage session flow.

## Public API

```typescript
// Generate exercises for a session
generateExercises(context: ExerciseGenerationContext): Promise<Result<LLMExerciseResponse>>

// Evaluate a free-form answer (translation, free writing, speaking)
evaluateAnswer(params: EvaluationParams): Promise<Result<GradingHint>>

// Generate narrative text (session intro/outro, couple message)
generateNarrative(context: NarrativeContext): Promise<Result<NarrativeResponse>>
```

## Dependencies
- shared-types (types, Result)
- OpenAI API (external)

## State Owned
- No database tables
- In-memory: prompt template cache, circuit breaker state

## Error Modes
- `LLM_TIMEOUT`: API call exceeded 15s → retry once, then fallback
- `LLM_MALFORMED_RESPONSE`: JSON parse failed → retry with simplified prompt
- `LLM_RATE_LIMITED`: 429 response → back off, return cached/fallback
- `LLM_UNAVAILABLE`: network error → circuit breaker opens, return fallback

## Deployment Phase
Phase 1b

## Testing Checklist
- [ ] Unit: prompt construction produces valid messages array
- [ ] Unit: response parser handles valid JSON
- [ ] Unit: response parser handles malformed JSON gracefully
- [ ] Unit: circuit breaker opens after 3 failures
- [ ] Contract: ExerciseGenerationContext matches shared-types
- [ ] Integration: real API call returns parseable response
