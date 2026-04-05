import { type Result, ok, err } from '@/modules/shared-types';
import { supabase } from '@/modules/data-layer';

// ============================================================
// Delight -- time capsules, wrapped, special moments
// ============================================================

export interface TimeCapsule {
  id: string;
  user_id: string;
  day_number: number;
  message: string;
  audio_url: string | null;
  unlocked_at: string | null; // null = still sealed
  created_at: string;
}

export interface WrappedData {
  month: number;
  year: number;
  words_learned: number;
  sessions_completed: number;
  total_minutes: number;
  streak_best: number;
  accuracy_average: number;
  hardest_word: string;
  most_improved_channel: string;
  xp_earned: number;
  postcards_sent: number;
}

export async function saveTimeCapsule(
  userId: string,
  dayNumber: number,
  message: string,
  audioUrl?: string
): Promise<Result<void>> {
  try {
    const { error } = await supabase
      .from('time_capsules')
      .insert({
        user_id: userId,
        day_number: dayNumber,
        message,
        audio_url: audioUrl || null,
        unlocked_at: null,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
    return ok(undefined);
  } catch (e) {
    return err({ code: 'CAPSULE_SAVE_FAILED', message: 'Failed to save time capsule', module: 'delight', cause: e });
  }
}

export async function getTimeCapsules(userId: string): Promise<Result<TimeCapsule[]>> {
  try {
    const { data, error } = await supabase
      .from('time_capsules')
      .select('*')
      .eq('user_id', userId)
      .order('day_number', { ascending: true });

    if (error) throw error;
    return ok((data || []) as TimeCapsule[]);
  } catch (e) {
    return err({ code: 'CAPSULES_GET_FAILED', message: 'Failed to get time capsules', module: 'delight', cause: e });
  }
}

export async function generateWrapped(
  userId: string,
  month: number
): Promise<Result<WrappedData>> {
  // Simplified: return placeholder data
  // Full implementation would aggregate from sessions, cards, review_logs, postcards
  try {
    return ok({
      month,
      year: new Date().getFullYear(),
      words_learned: 0,
      sessions_completed: 0,
      total_minutes: 0,
      streak_best: 0,
      accuracy_average: 0,
      hardest_word: '',
      most_improved_channel: '',
      xp_earned: 0,
      postcards_sent: 0,
    });
  } catch (e) {
    return err({ code: 'WRAPPED_FAILED', message: 'Failed to generate wrapped', module: 'delight', cause: e });
  }
}
