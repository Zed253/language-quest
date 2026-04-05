# Module: fsrs-engine

## Responsibility
Wraps ts-fsrs to provide spaced repetition scheduling for flashcards. Manages card lifecycle: creation, review, scheduling, mastery tracking. Emits events when cards are reviewed or added.

Does NOT: generate exercise content (that's llm-pipeline), render UI (that's exercise-engine components), or decide session structure (that's session-orchestrator).

## Public API

```typescript
getNextCards(userId, count?) → Result<Card[]>
reviewCard(cardId, userId, rating: 1|2|3|4) → Result<SchedulingResult>
addCards(userId, cards: NewCard[]) → Result<Card[]>
getStats(userId) → Result<{ total, due, new_cards, learning, mastered }>
```

## FSRS Configuration
- Target retention: 90%
- Maximum interval: 365 days
- Algorithm: FSRS v6 (via ts-fsrs)

## Mastery Level Derivation
Derived from FSRS stability + reps:
- 0: New (reps = 0)
- 1: Just started (stability < 1)
- 2: Learning (stability < 5)
- 3: Known (stability < 21)
- 4: Well known (stability < 90)
- 5: Mastered (stability >= 90)

## Events Emitted
- `CardReviewed`: after every review (includes rating, was_correct, next_review)
- `CardAdded`: after adding new cards to deck

## Dependencies
- shared-types (Card, Result, FsrsRating, etc.)
- data-layer (card queries, review log insert)
- event-bus (emit events)
- ts-fsrs (external)

## State Owned
- Database: cards table, review_logs table (via data-layer queries)
- No in-memory state

## Error Modes
- `FSRS_GET_CARDS_FAILED`: Supabase query error → Result.err
- `CARD_NOT_FOUND`: card ID doesn't exist → Result.err
- `FSRS_REVIEW_FAILED`: scheduling or persistence error → Result.err
- `FSRS_ADD_CARDS_FAILED`: insert error → Result.err
- `FSRS_STATS_FAILED`: stats query error → Result.err

## Deployment Phase
Phase 1a

## Testing Checklist
- [ ] Unit: toFsrsCard/fromFsrsCard round-trips correctly
- [ ] Unit: deriveMasteryLevel maps stability to correct levels
- [ ] Unit: toFsrsRating maps 1-4 to Rating enum
- [ ] Integration: reviewCard persists updated FSRS state
- [ ] Integration: getNextCards returns only due cards
- [ ] Integration: addCards creates both L2→L1 and L1→L2 directions
- [ ] Event: CardReviewed emitted after reviewCard
