# Module: shared-types

## Responsibility
Defines ALL canonical TypeScript types, Zod validation schemas, and the Result pattern used across the entire system. This is the single source of truth for data shapes.

Does NOT: contain runtime logic, database queries, or business rules. Pure types and schemas only.

## Public API

```typescript
// Result pattern
type Result<T, E> = { ok: true; data: T } | { ok: false; error: E }
ok<T>(data: T): Result<T, never>
err<E>(error: E): Result<never, E>

// Core domain types
Card, NewCard, FsrsCardState, CardDirection
FsrsRating (1 | 2 | 3 | 4)
ReviewLog, SchedulingResult
UserProfile, TargetLanguage, ThemeId
SessionStats, ModuleError

// Domain events
DomainEvent (discriminated union)
CardReviewedEvent, SessionCompletedEvent, CardAddedEvent, StreakUpdatedEvent

// Zod schemas
CardSchema, NewCardSchema, ReviewLogSchema, FsrsRatingSchema
```

## Dependencies
- zod (external)

## State Owned
None. Pure types.

## Error Modes
None. Cannot fail.

## Deployment Phase
Phase 1a (first module created)

## Testing Checklist
- [ ] Unit: Zod schemas accept valid data
- [ ] Unit: Zod schemas reject invalid data
- [ ] Unit: ok() and err() produce correct discriminated union
