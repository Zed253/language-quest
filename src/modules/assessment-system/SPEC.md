# Module: assessment-system

## Responsibility
Runs the initial multi-channel assessment to produce a competency radar. Maps radar scores to starting state (phase, FSRS seed, channel emphasis). Can be re-run at meso-cycle boundaries.

Does NOT: manage ongoing monitoring (that's monitoring-system), generate exercises (delegates to llm-pipeline), or manage FSRS (that's fsrs-engine).

## Public API

```typescript
runAssessment(userId: string): Promise<Result<AssessmentPlan>>
submitAssessmentAnswer(assessmentId: string, answer: AssessmentAnswer): Promise<Result<NextQuestion | AssessmentComplete>>
getRadar(userId: string): Promise<Result<CompetencyRadar>>
getRadarHistory(userId: string): Promise<Result<CompetencyRadar[]>>
mapRadarToStartingState(radar: CompetencyRadar): StartingState
```

## Assessment channels (6 axes)
1. Vocabulary breadth (progressive frequency-ranked recognition)
2. Reading comprehension (graded texts + questions)
3. Listening comprehension (audio + questions)
4. Grammar (cloze with tense targeting)
5. Writing production (prompted sentences)
6. Speaking production (prompted speech)

## Mapping rules (Section 6.4 of spec)
- Phase placement based on average score
- FSRS seed based on vocabulary score
- Channel emphasis: 2 lowest axes get +20% time

## Dependencies
- shared-types (Result)
- data-layer (persist radar)
- llm-pipeline (generate assessment exercises)
- fsrs-engine (seed known cards)

## State Owned
- DB: user_competency_radar table (multiple rows per user for history)

## Deployment Phase
Phase 3
