# Module: event-bus

## Responsibility
Typed pub/sub system for cross-tier communication. The ONLY mechanism for lower tiers to notify higher tiers. All handler errors are caught and logged -- never propagated.

Does NOT: store events persistently, guarantee delivery order, or implement replay.

## Public API

```typescript
eventBus.on<T>(type: DomainEvent['type'], handler: EventHandler<T>): EventUnsubscribe
eventBus.emit(event: DomainEvent): void
eventBus.clear(): void  // testing only
```

## Dependencies
- shared-types (DomainEvent type)

## State Owned
- In-memory: Map of event type → Set of handlers

## Error Modes
- Handler errors are CAUGHT and logged to console. Never propagated to emitter.
- Async handler errors (Promise rejections) are also caught.

## Error Isolation Guarantee
If gamification's handler throws on a SessionCompleted event, the session still completes normally. The error is logged but does not affect the emitter or other handlers.

## Deployment Phase
Phase 1a

## Testing Checklist
- [ ] Unit: emit triggers registered handler
- [ ] Unit: handler error does not propagate to emitter
- [ ] Unit: async handler error is caught
- [ ] Unit: unsubscribe removes handler
- [ ] Unit: clear() removes all handlers
