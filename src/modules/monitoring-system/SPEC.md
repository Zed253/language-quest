# Module: monitoring-system

## Responsibility
Tracks the 4 monitoring signals after each session. Applies decision rules to adjust upcoming sessions. Listens to SessionCompleted events.

Does NOT: modify session content directly (provides recommendations to periodization-engine), grade exercises, or manage UI.

## Public API

```typescript
recordSignals(sessionId: string, signals: MonitoringSignals): Promise<Result<void>>
getDecision(userId: string): Promise<Result<MonitoringDecision>>
getSignalHistory(userId: string, days: number): Promise<Result<SignalSnapshot[]>>
```

## 4 Signals (transposed from Katchavenda)
1. Performance: session success rate (auto-calculated)
2. Cognitive freshness: self-assessment 1-10 at session start
3. Engagement: time spent, exercises completed vs skipped (auto)
4. Retention: FSRS flashcard performance on items from previous days (auto)

## Decision Rules
- 1 signal negative: log, no change → "none"
- 2 signals negative: reduce new content 30-40% → "reduce-volume"
- 3-4 signals negative: deload session → "deload"

## Signal thresholds (what counts as "negative")
- Performance < 60%
- Freshness < 4/10
- Engagement < 50% (more than half exercises skipped or session < 50% expected duration)
- Retention < 70% on review cards

## Events Consumed
- SessionCompleted → auto-record signals

## Dependencies
- shared-types (Result)
- data-layer (persist signals)
- event-bus (listen to SessionCompleted)

## State Owned
- DB: monitoring_signals table

## Deployment Phase
Phase 3
