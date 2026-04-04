import { fsrs, createEmptyCard, Rating, type Card as TsFsrsCard } from 'ts-fsrs';
import {
  type Result, ok, err,
  type Card, type NewCard, type FsrsRating, type SchedulingResult, type FsrsCardState,
} from '@/modules/shared-types';
import {
  getCardsDueForUser, insertCards, updateCard, getCardStats, getCardById,
} from '@/modules/data-layer';
import { insertReviewLog } from '@/modules/data-layer';
import { eventBus } from '@/modules/event-bus';

// ============================================================
// FSRS Engine -- wraps ts-fsrs with persistence and events
// ============================================================

const f = fsrs({
  request_retention: 0.9, // 90% target retention
  maximum_interval: 365,
});

// Map our 1-4 rating to ts-fsrs Rating enum
function toFsrsRating(rating: FsrsRating): Rating {
  const map: Record<FsrsRating, Rating> = {
    1: Rating.Again,
    2: Rating.Hard,
    3: Rating.Good,
    4: Rating.Easy,
  };
  return map[rating];
}

// Convert our stored state to ts-fsrs Card format
function toFsrsCard(state: FsrsCardState): TsFsrsCard {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsed_days,
    scheduled_days: state.scheduled_days,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
    last_review: state.last_review ? new Date(state.last_review) : undefined,
  } as TsFsrsCard;
}

// Convert ts-fsrs Card back to our stored format
function fromFsrsCard(card: TsFsrsCard): FsrsCardState {
  return {
    due: card.due instanceof Date ? card.due.toISOString() : String(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as number,
    last_review: card.last_review
      ? (card.last_review instanceof Date ? card.last_review.toISOString() : String(card.last_review))
      : undefined,
  };
}

// Derive mastery level from FSRS stability
function deriveMasteryLevel(stability: number, reps: number): number {
  if (reps === 0) return 0;
  if (stability < 1) return 1;
  if (stability < 5) return 2;
  if (stability < 21) return 3;
  if (stability < 90) return 4;
  return 5;
}

// ============================================================
// Public API
// ============================================================

export async function getNextCards(
  userId: string,
  count: number = 20
): Promise<Result<Card[]>> {
  try {
    const cards = await getCardsDueForUser(userId, count);
    return ok(cards);
  } catch (e) {
    return err({
      code: 'FSRS_GET_CARDS_FAILED',
      message: 'Failed to get due cards',
      module: 'fsrs-engine',
      cause: e,
    });
  }
}

export async function reviewCard(
  cardId: string,
  userId: string,
  rating: FsrsRating
): Promise<Result<SchedulingResult>> {
  try {
    const card = await getCardById(cardId);
    if (!card) {
      return err({
        code: 'CARD_NOT_FOUND',
        message: `Card ${cardId} not found`,
        module: 'fsrs-engine',
      });
    }

    // Run FSRS scheduling
    const fsrsCard = toFsrsCard(card.fsrs_state);
    const fsrsRating = toFsrsRating(rating);
    const now = new Date();
    const scheduling = f.repeat(fsrsCard, now);

    // ts-fsrs returns results keyed by Rating numeric value (1-4)
    const result = (scheduling as unknown as Record<number, { card: TsFsrsCard; log: unknown }>)[fsrsRating as number];

    // Convert back to our format
    const newFsrsState = fromFsrsCard(result.card);
    const newMastery = deriveMasteryLevel(result.card.stability, result.card.reps);

    // Persist card update
    const updatedCard = await updateCard(cardId, {
      fsrs_state: newFsrsState,
      next_review: newFsrsState.due,
      last_reviewed: now.toISOString(),
      mastery_level: newMastery,
    });

    // Persist review log
    const reviewLog = await insertReviewLog({
      card_id: cardId,
      user_id: userId,
      rating,
      scheduled_days: result.card.scheduled_days,
      elapsed_days: result.card.elapsed_days,
      review_at: now.toISOString(),
      state: result.card.state as number,
    });

    // Emit event (Tier 3 modules react to this)
    eventBus.emit({
      type: 'CardReviewed',
      payload: {
        card_id: cardId,
        user_id: userId,
        rating,
        word_l2: card.word_l2,
        was_correct: rating >= 3,
        next_review: newFsrsState.due,
      },
    });

    return ok({
      card: updatedCard,
      reviewLog,
      nextReviewDate: newFsrsState.due,
    });
  } catch (e) {
    return err({
      code: 'FSRS_REVIEW_FAILED',
      message: 'Failed to review card',
      module: 'fsrs-engine',
      cause: e,
    });
  }
}

export async function addCards(
  userId: string,
  cards: NewCard[]
): Promise<Result<Card[]>> {
  try {
    const inserted = await insertCards(userId, cards);

    eventBus.emit({
      type: 'CardAdded',
      payload: {
        user_id: userId,
        cards: inserted.map((c) => ({
          word_l2: c.word_l2,
          word_l1: c.word_l1,
          direction: c.direction,
        })),
      },
    });

    return ok(inserted);
  } catch (e) {
    return err({
      code: 'FSRS_ADD_CARDS_FAILED',
      message: 'Failed to add cards',
      module: 'fsrs-engine',
      cause: e,
    });
  }
}

export async function getStats(
  userId: string
): Promise<Result<{ total: number; due: number; new_cards: number; learning: number; mastered: number }>> {
  try {
    const stats = await getCardStats(userId);
    return ok(stats);
  } catch (e) {
    return err({
      code: 'FSRS_STATS_FAILED',
      message: 'Failed to get card stats',
      module: 'fsrs-engine',
      cause: e,
    });
  }
}
