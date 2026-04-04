// ============================================================
// Result type -- all module functions return this, never throw
// ============================================================

export type Result<T, E = ModuleError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E = ModuleError>(error: E): Result<never, E> {
  return { ok: false, error };
}

export interface ModuleError {
  code: string;
  message: string;
  module: string;
  cause?: unknown;
}

// ============================================================
// Card -- the atomic unit of learning
// ============================================================

export type CardDirection = 'l2-to-l1' | 'l1-to-l2';

export interface Card {
  id: string;
  user_id: string;
  word_l2: string;
  word_l1: string;
  example_sentence: string;
  image_url: string | null;
  frequency_rank: number;
  direction: CardDirection;
  mastery_level: number; // 0-5, derived from FSRS stability
  fsrs_state: FsrsCardState;
  next_review: string; // ISO timestamp
  first_seen: string;
  last_reviewed: string | null;
  created_at: string;
}

export interface NewCard {
  word_l2: string;
  word_l1: string;
  example_sentence: string;
  image_url?: string | null;
  frequency_rank: number;
  direction: CardDirection;
}

export interface FsrsCardState {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review?: string;
}

// ============================================================
// Review
// ============================================================

export type FsrsRating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export interface ReviewLog {
  id: string;
  card_id: string;
  user_id: string;
  rating: FsrsRating;
  scheduled_days: number;
  elapsed_days: number;
  review_at: string;
  state: number;
}

export interface SchedulingResult {
  card: Card;
  reviewLog: ReviewLog;
  nextReviewDate: string;
}

// ============================================================
// User
// ============================================================

export type TargetLanguage = 'es' | 'fr';
export type ThemeId = 'one-piece' | 'harry-potter';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  target_language: TargetLanguage;
  native_language: TargetLanguage;
  theme_id: ThemeId;
  current_phase: number;
  current_meso: number;
  current_day: number;
  xp: number;
  currency: number;
  streak_current: number;
  streak_longest: number;
  created_at: string;
}

// ============================================================
// Session stats (returned after a review session)
// ============================================================

export interface SessionStats {
  cards_reviewed: number;
  cards_correct: number;
  cards_incorrect: number;
  duration_seconds: number;
  new_cards_seen: number;
  review_cards_seen: number;
}
