# Module: game-master

## Responsibility
Quest creation, counter-quests, scheduled quests, GM reputation. One user creates challenges for the other.

## Public API
```typescript
createQuest(fromUserId, quest): Promise<Result<Quest>>
getActiveQuests(userId): Promise<Result<Quest[]>>
completeQuest(questId, result): Promise<Result<void>>
createCounterQuest(questId, counterQuest): Promise<Result<Quest>>
```

## Quest Types
vocabulary-hunt, translation-dare, mystery-word, survival-challenge, speed-run, sentence-forge

## Dependencies
- shared-types, data-layer

## Deployment Phase
Phase 6
