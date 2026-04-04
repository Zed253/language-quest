import type { Card, FsrsRating, SessionStats } from './domain';

// ============================================================
// Domain Events -- typed discriminated union
// All cross-module communication goes through these events
// ============================================================

export type DomainEvent =
  | CardReviewedEvent
  | SessionCompletedEvent
  | CardAddedEvent
  | StreakUpdatedEvent;

export interface CardReviewedEvent {
  type: 'CardReviewed';
  payload: {
    card_id: string;
    user_id: string;
    rating: FsrsRating;
    word_l2: string;
    was_correct: boolean;
    next_review: string;
  };
}

export interface SessionCompletedEvent {
  type: 'SessionCompleted';
  payload: {
    user_id: string;
    stats: SessionStats;
    completed_at: string;
  };
}

export interface CardAddedEvent {
  type: 'CardAdded';
  payload: {
    user_id: string;
    cards: Pick<Card, 'word_l2' | 'word_l1' | 'direction'>[];
  };
}

export interface StreakUpdatedEvent {
  type: 'StreakUpdated';
  payload: {
    user_id: string;
    streak_current: number;
    streak_longest: number;
  };
}
