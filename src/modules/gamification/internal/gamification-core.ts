import { type Result, ok, err } from '@/modules/shared-types';
import { getUserProfile, updateUserProfile } from '@/modules/data-layer';
import { eventBus } from '@/modules/event-bus';

// ============================================================
// Gamification -- XP, currency, streaks, ranks, unlocking
// ============================================================

export interface StreakInfo {
  current: number;
  longest: number;
  isActive: boolean;
}

export interface RankInfo {
  name: string;
  level: number;
  xpCurrent: number;
  xpNextRank: number;
  progress: number; // 0-100
}

// Rank definitions (theme-agnostic, mapped by theme-system)
const RANK_THRESHOLDS = [
  { level: 1, name: 'Novice', xp: 0 },
  { level: 2, name: 'Apprentice', xp: 500 },
  { level: 3, name: 'Adventurer', xp: 1500 },
  { level: 4, name: 'Warrior', xp: 4000 },
  { level: 5, name: 'Captain', xp: 8000 },
  { level: 6, name: 'Commander', xp: 15000 },
  { level: 7, name: 'Legend', xp: 30000 },
];

function getRankForXP(xp: number): RankInfo {
  let currentRank = RANK_THRESHOLDS[0];
  let nextRank = RANK_THRESHOLDS[1];

  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= RANK_THRESHOLDS[i].xp) {
      currentRank = RANK_THRESHOLDS[i];
      nextRank = RANK_THRESHOLDS[i + 1] || RANK_THRESHOLDS[i];
      break;
    }
  }

  const xpInRank = xp - currentRank.xp;
  const xpRankSize = nextRank.xp - currentRank.xp;
  const progress = xpRankSize > 0 ? Math.round((xpInRank / xpRankSize) * 100) : 100;

  return {
    name: currentRank.name,
    level: currentRank.level,
    xpCurrent: xp,
    xpNextRank: nextRank.xp,
    progress,
  };
}

// ============================================================
// Public API
// ============================================================

export async function awardXP(userId: string, amount: number): Promise<Result<void>> {
  try {
    const user = await getUserProfile(userId);
    if (!user) return err({ code: 'USER_NOT_FOUND', message: 'User not found', module: 'gamification' });

    await updateUserProfile(userId, { xp: user.xp + amount });
    return ok(undefined);
  } catch (e) {
    return err({ code: 'XP_AWARD_FAILED', message: 'Failed to award XP', module: 'gamification', cause: e });
  }
}

export async function awardCurrency(userId: string, amount: number): Promise<Result<void>> {
  try {
    const user = await getUserProfile(userId);
    if (!user) return err({ code: 'USER_NOT_FOUND', message: 'User not found', module: 'gamification' });

    // Currency can go negative from penalties but floor at 0
    const newCurrency = Math.max(0, user.currency + amount);
    await updateUserProfile(userId, { currency: newCurrency });
    return ok(undefined);
  } catch (e) {
    return err({ code: 'CURRENCY_AWARD_FAILED', message: 'Failed to award currency', module: 'gamification', cause: e });
  }
}

export async function updateStreak(userId: string): Promise<Result<StreakInfo>> {
  try {
    const user = await getUserProfile(userId);
    if (!user) return err({ code: 'USER_NOT_FOUND', message: 'User not found', module: 'gamification' });

    const newStreak = user.streak_current + 1;
    const newLongest = Math.max(user.streak_longest, newStreak);

    await updateUserProfile(userId, {
      streak_current: newStreak,
      streak_longest: newLongest,
    });

    return ok({
      current: newStreak,
      longest: newLongest,
      isActive: true,
    });
  } catch (e) {
    return err({ code: 'STREAK_UPDATE_FAILED', message: 'Failed to update streak', module: 'gamification', cause: e });
  }
}

export async function getRank(userId: string): Promise<Result<RankInfo>> {
  try {
    const user = await getUserProfile(userId);
    if (!user) return err({ code: 'USER_NOT_FOUND', message: 'User not found', module: 'gamification' });

    return ok(getRankForXP(user.xp));
  } catch (e) {
    return err({ code: 'RANK_GET_FAILED', message: 'Failed to get rank', module: 'gamification', cause: e });
  }
}

export async function checkUnlock(userId: string, mesoId: number): Promise<Result<boolean>> {
  // Unlock requires 80%+ average success rate on the meso-cycle
  // For now, always return true (proper implementation needs session history query)
  return ok(true);
}

// ============================================================
// Event listeners
// ============================================================

export function initGamificationListeners(): void {
  eventBus.on('SessionCompleted', async (event) => {
    const { user_id, stats } = event.payload;
    const correctRatio = stats.cards_reviewed > 0 ? stats.cards_correct / stats.cards_reviewed : 0;

    // XP: 10 per correct exercise
    await awardXP(user_id, stats.cards_correct * 10);

    // Currency: +5 per correct, -2 per incorrect (never blocks)
    const currencyGain = stats.cards_correct * 5 - stats.cards_incorrect * 2;
    await awardCurrency(user_id, currencyGain);

    // Streak
    await updateStreak(user_id);
  });
}
