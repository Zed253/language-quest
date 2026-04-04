import type { DomainEvent } from '@/modules/shared-types';

// ============================================================
// Typed Event Bus -- error-isolated pub/sub
// Handler errors are caught and logged, never propagated.
// This is the ONLY mechanism for upward communication between tiers.
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (event: any) => void | Promise<void>;

export type EventHandler<T extends DomainEvent['type']> = (
  event: Extract<DomainEvent, { type: T }>
) => void | Promise<void>;

export type EventUnsubscribe = () => void;

class EventBus {
  private handlers = new Map<string, Set<AnyHandler>>();

  on<T extends DomainEvent['type']>(
    type: T,
    handler: EventHandler<T>
  ): EventUnsubscribe {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    const handlerSet = this.handlers.get(type)!;
    handlerSet.add(handler as AnyHandler);

    return () => {
      handlerSet.delete(handler as AnyHandler);
    };
  }

  emit(event: DomainEvent): void {
    const handlerSet = this.handlers.get(event.type);
    if (!handlerSet) return;

    for (const handler of handlerSet) {
      try {
        const result = handler(event);
        if (result instanceof Promise) {
          result.catch((err) => {
            console.error(
              `[EventBus] Async handler error for "${event.type}":`,
              err
            );
          });
        }
      } catch (err) {
        console.error(
          `[EventBus] Handler error for "${event.type}":`,
          err
        );
      }
    }
  }

  /** Remove all handlers -- useful for testing */
  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
