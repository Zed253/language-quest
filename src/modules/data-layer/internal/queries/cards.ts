import { supabase } from '../client';
import type { Card, NewCard, FsrsCardState } from '@/modules/shared-types';

export async function getCardsDueForUser(
  userId: string,
  limit: number = 20
): Promise<Card[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', userId)
    .lte('next_review', now)
    .order('next_review', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Card[];
}

export async function getCardsByUser(userId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', userId)
    .order('frequency_rank', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Card[];
}

export async function getCardById(cardId: string): Promise<Card | null> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('id', cardId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return data as Card;
}

export async function insertCards(
  userId: string,
  cards: NewCard[]
): Promise<Card[]> {
  const now = new Date().toISOString();
  const defaultFsrsState: FsrsCardState = {
    due: now,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: 0, // New
  };

  const rows = cards.map((card) => ({
    user_id: userId,
    word_l2: card.word_l2,
    word_l1: card.word_l1,
    example_sentence: card.example_sentence,
    image_url: card.image_url ?? null,
    frequency_rank: card.frequency_rank,
    direction: card.direction,
    mastery_level: 0,
    fsrs_state: defaultFsrsState,
    next_review: now,
    first_seen: now,
    last_reviewed: null,
    created_at: now,
  }));

  const { data, error } = await supabase
    .from('cards')
    .insert(rows)
    .select();

  if (error) throw error;
  return (data ?? []) as Card[];
}

export async function updateCard(
  cardId: string,
  updates: Partial<Pick<Card, 'fsrs_state' | 'next_review' | 'last_reviewed' | 'mastery_level'>>
): Promise<Card> {
  const { data, error } = await supabase
    .from('cards')
    .update(updates)
    .eq('id', cardId)
    .select()
    .single();

  if (error) throw error;
  return data as Card;
}

export async function getCardStats(userId: string): Promise<{
  total: number;
  due: number;
  new_cards: number;
  learning: number;
  mastered: number;
}> {
  const now = new Date().toISOString();

  const { data: allCards, error } = await supabase
    .from('cards')
    .select('fsrs_state, next_review, mastery_level')
    .eq('user_id', userId);

  if (error) throw error;

  const cards = allCards ?? [];
  const total = cards.length;
  const due = cards.filter((c) => c.next_review <= now).length;
  const new_cards = cards.filter((c) => (c.fsrs_state as FsrsCardState).state === 0).length;
  const learning = cards.filter((c) => {
    const state = (c.fsrs_state as FsrsCardState).state;
    return state === 1 || state === 3;
  }).length;
  const mastered = cards.filter((c) => c.mastery_level >= 4).length;

  return { total, due, new_cards, learning, mastered };
}
