# Module: couple-collab

## Responsibility
Shared vitality system, compensation mechanic, SOS/lifeline, postcards, partner NPC cameo data, couple connection messages, bilingual bridge moments.

## Public API
```typescript
getSharedVitality(userId): Promise<Result<VitalityState>>
updateVitality(userId, sessionCompleted): Promise<Result<void>>
compensate(userId): Promise<Result<void>>
sendPostcard(fromUserId, message): Promise<Result<void>>
getPostcards(userId): Promise<Result<Postcard[]>>
sendSOS(fromUserId, exerciseContext): Promise<Result<void>>
getPartnerStats(userId): Promise<Result<PartnerStats>>
```

## Dependencies
- shared-types, event-bus, data-layer

## Deployment Phase
Phase 5
