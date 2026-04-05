import { type Result, ok, err } from '@/modules/shared-types';
import { supabase } from '@/modules/data-layer';

// ============================================================
// Game Master -- quest creation and management
// ============================================================

export type QuestType = 'vocabulary-hunt' | 'translation-dare' | 'mystery-word' | 'survival-challenge' | 'speed-run' | 'sentence-forge';

export interface Quest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  type: QuestType;
  title: string;
  description: string;
  parameters: Record<string, unknown>; // type-specific params
  reward_text: string;
  deadline: string | null;
  status: 'active' | 'completed' | 'failed' | 'expired';
  created_at: string;
  completed_at: string | null;
}

export async function createQuest(
  fromUserId: string,
  quest: {
    type: QuestType;
    title: string;
    description: string;
    parameters: Record<string, unknown>;
    reward_text: string;
    deadline?: string;
  }
): Promise<Result<Quest>> {
  try {
    // Find partner
    const { data: partner } = await supabase
      .from('users')
      .select('id')
      .neq('id', fromUserId)
      .limit(1)
      .single();

    if (!partner) return err({ code: 'NO_PARTNER', message: 'Partner not found', module: 'game-master' });

    const { data, error } = await supabase
      .from('quests')
      .insert({
        from_user_id: fromUserId,
        to_user_id: partner.id,
        type: quest.type,
        title: quest.title,
        description: quest.description,
        parameters: quest.parameters,
        reward_text: quest.reward_text,
        deadline: quest.deadline || null,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return ok(data as Quest);
  } catch (e) {
    return err({ code: 'QUEST_CREATE_FAILED', message: 'Failed to create quest', module: 'game-master', cause: e });
  }
}

export async function getActiveQuests(userId: string): Promise<Result<Quest[]>> {
  try {
    const { data, error } = await supabase
      .from('quests')
      .select('*')
      .eq('to_user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return ok((data || []) as Quest[]);
  } catch (e) {
    return err({ code: 'QUESTS_GET_FAILED', message: 'Failed to get quests', module: 'game-master', cause: e });
  }
}

export async function completeQuest(
  questId: string,
  success: boolean
): Promise<Result<void>> {
  try {
    const { error } = await supabase
      .from('quests')
      .update({
        status: success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', questId);

    if (error) throw error;
    return ok(undefined);
  } catch (e) {
    return err({ code: 'QUEST_COMPLETE_FAILED', message: 'Failed to complete quest', module: 'game-master', cause: e });
  }
}
