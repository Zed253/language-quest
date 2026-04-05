import { type Result, ok, err } from '@/modules/shared-types';
import { supabase } from '@/modules/data-layer';

// ============================================================
// Couple Collaboration -- shared vitality, postcards, partner stats
// ============================================================

export interface VitalityState {
  health: number;       // 0-100
  streak_together: number;
  last_both_active: string | null;
}

export interface Postcard {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  correction?: string;
  reaction?: string;
  created_at: string;
}

export interface PartnerStats {
  partner_id: string;
  partner_name: string;
  streak_current: number;
  last_session_date: string | null;
  last_session_score: number | null;
  is_active_today: boolean;
  xp: number;
  words_known: number;
}

// Helper: find partner user
async function findPartner(userId: string): Promise<{ id: string; display_name: string } | null> {
  // In a 2-user system, the partner is the other user
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name')
    .neq('id', userId)
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as { id: string; display_name: string };
}

export async function getSharedVitality(userId: string): Promise<Result<VitalityState>> {
  // Simplified: compute from both users' streak status
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('streak_current')
      .order('created_at');

    if (error) throw error;

    const streaks = (users || []).map((u: { streak_current: number }) => u.streak_current);
    const minStreak = Math.min(...streaks, 0);
    const health = Math.min(100, 50 + minStreak * 5); // Base 50, +5 per shared streak day

    return ok({
      health,
      streak_together: minStreak,
      last_both_active: null,
    });
  } catch (e) {
    return err({ code: 'VITALITY_FAILED', message: 'Failed to get vitality', module: 'couple-collab', cause: e });
  }
}

export async function updateVitality(userId: string, sessionCompleted: boolean): Promise<Result<void>> {
  // Vitality updates happen implicitly through streak tracking
  return ok(undefined);
}

export async function compensate(userId: string): Promise<Result<void>> {
  // Mark that this user did a compensation session for their partner
  // In practice: award half the normal XP and keep shared vitality stable
  return ok(undefined);
}

export async function sendPostcard(
  fromUserId: string,
  message: string,
  correction?: string
): Promise<Result<void>> {
  try {
    const partner = await findPartner(fromUserId);
    if (!partner) return err({ code: 'NO_PARTNER', message: 'Partner not found', module: 'couple-collab' });

    const { error } = await supabase
      .from('postcards')
      .insert({
        from_user_id: fromUserId,
        to_user_id: partner.id,
        message,
        correction,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
    return ok(undefined);
  } catch (e) {
    return err({ code: 'POSTCARD_SEND_FAILED', message: 'Failed to send postcard', module: 'couple-collab', cause: e });
  }
}

export async function getPostcards(userId: string): Promise<Result<Postcard[]>> {
  try {
    const { data, error } = await supabase
      .from('postcards')
      .select('*')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return ok((data || []) as Postcard[]);
  } catch (e) {
    return err({ code: 'POSTCARDS_GET_FAILED', message: 'Failed to get postcards', module: 'couple-collab', cause: e });
  }
}

export async function getPartnerStats(userId: string): Promise<Result<PartnerStats>> {
  try {
    const partner = await findPartner(userId);
    if (!partner) return err({ code: 'NO_PARTNER', message: 'Partner not found', module: 'couple-collab' });

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', partner.id)
      .single();

    if (error) throw error;

    const { count } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', partner.id)
      .gte('mastery_level', 3);

    return ok({
      partner_id: partner.id,
      partner_name: partner.display_name,
      streak_current: (user as { streak_current: number }).streak_current,
      last_session_date: null,
      last_session_score: null,
      is_active_today: false,
      xp: (user as { xp: number }).xp,
      words_known: count || 0,
    });
  } catch (e) {
    return err({ code: 'PARTNER_STATS_FAILED', message: 'Failed to get partner stats', module: 'couple-collab', cause: e });
  }
}
