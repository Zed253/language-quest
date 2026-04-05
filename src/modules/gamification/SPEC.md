# Module: gamification

## Responsibility
Manages XP, currency (Berrys/Gallions), streaks, ranks, and content unlocking. Listens to events and updates scores. Never blocks session flow.

## Public API
```typescript
awardXP(userId, amount): Promise<Result<void>>
awardCurrency(userId, amount): Promise<Result<void>>  // negative = penalty
updateStreak(userId): Promise<Result<StreakInfo>>
getRank(userId): Promise<Result<RankInfo>>
checkUnlock(userId, mesoId): Promise<Result<boolean>>
```

## Events Consumed
- SessionCompleted → award XP + currency, update streak
- CardReviewed → micro XP awards

## Dependencies
- shared-types, event-bus, data-layer

## Deployment Phase
Phase 4
