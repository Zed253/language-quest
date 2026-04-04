import { z } from 'zod';

export const CardDirectionSchema = z.enum(['l2-to-l1', 'l1-to-l2']);

export const FsrsCardStateSchema = z.object({
  due: z.string(),
  stability: z.number(),
  difficulty: z.number(),
  elapsed_days: z.number(),
  scheduled_days: z.number(),
  reps: z.number(),
  lapses: z.number(),
  state: z.number(),
  last_review: z.string().optional(),
});

export const NewCardSchema = z.object({
  word_l2: z.string().min(1),
  word_l1: z.string().min(1),
  example_sentence: z.string().min(1),
  image_url: z.string().url().nullable().optional(),
  frequency_rank: z.number().int().positive(),
  direction: CardDirectionSchema,
});

export const CardSchema = NewCardSchema.extend({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  mastery_level: z.number().int().min(0).max(5),
  fsrs_state: FsrsCardStateSchema,
  next_review: z.string(),
  first_seen: z.string(),
  last_reviewed: z.string().nullable(),
  created_at: z.string(),
});

export const ReviewLogSchema = z.object({
  id: z.string().uuid(),
  card_id: z.string().uuid(),
  user_id: z.string().uuid(),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  scheduled_days: z.number(),
  elapsed_days: z.number(),
  review_at: z.string(),
  state: z.number(),
});

export const FsrsRatingSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
