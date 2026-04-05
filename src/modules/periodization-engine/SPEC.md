# Module: periodization-engine

## Responsibility
Manages the macro/meso/micro cycle structure. Computes the daily directive (what to practice, which dominance, which tenses, which theme). Handles catch-up/replanification when sessions are missed.

Does NOT: generate exercises (that's llm-pipeline), grade (that's exercise-engine), or manage session flow (that's session-orchestrator).

## Public API

```typescript
getDailyDirective(userId: string): Promise<Result<PeriodizationDirective>>
getCurrentPosition(userId: string): Result<CurriculumPosition>
advanceDay(userId: string): Promise<Result<void>>
replanify(userId: string, missedDays: number): Promise<Result<void>>
getUpcomingThemes(userId: string, weeks: number): Result<MesoCyclePreview[]>
```

## Periodization Structure

Macro (52 weeks) → 5 phases
  Phase → 4-5 meso-cycles (2-3 weeks each)
    Meso → micro-cycle (1 week = 6 days + rest)
      Day → dominance (A/I alternation) + tense targets

## Micro-cycle pattern (Poliquin A/I)
- Mon: Accumulation Oral
- Tue: Intensification Written
- Wed: Accumulation Mixed
- Thu: Intensification Oral
- Fri: Accumulation Written
- Sat: Deload/Review
- Sun: Rest or catch-up

## 3:1 Paradigm
In a 3-week meso: weeks 1-2 = progression, week 3 = deload

## Dependencies
- shared-types (Result)
- data-layer (read/write user position)
- Curriculum JSON files (data/curriculum/)

## State Owned
- User position: current_phase, current_meso, current_day in users table

## Deployment Phase
Phase 3
