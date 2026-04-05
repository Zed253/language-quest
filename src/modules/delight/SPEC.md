# Module: delight

## Responsibility
Time capsule recordings, monthly Wrapped recaps, Teach Back mode, Eavesdrop mini-game, Dream Sequence sessions. Standalone features triggered by events or milestones.

## Public API
```typescript
saveTimeCapsule(userId, recording, message): Promise<Result<void>>
getTimeCapsules(userId): Promise<Result<TimeCapsule[]>>
generateWrapped(userId, month): Promise<Result<WrappedData>>
```

## Dependencies
- shared-types, data-layer, event-bus

## Deployment Phase
Phase 6
