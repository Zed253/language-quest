import { supabase } from '../client';
import type { ReviewLog } from '@/modules/shared-types';

export async function insertReviewLog(
  log: Omit<ReviewLog, 'id'>
): Promise<ReviewLog> {
  const { data, error } = await supabase
    .from('review_logs')
    .insert(log)
    .select()
    .single();

  if (error) throw error;
  return data as ReviewLog;
}
