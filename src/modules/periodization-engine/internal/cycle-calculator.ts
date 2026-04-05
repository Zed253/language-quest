import { type Result, ok, err } from '@/modules/shared-types';
import { getUserProfile, updateUserProfile } from '@/modules/data-layer';
// PeriodizationDirective is defined locally to avoid circular dependency with session-orchestrator
// session-orchestrator imports from periodization-engine, not the reverse
interface PeriodizationDirective {
  dominance: string;
  targetTenses: string[];
  targetVocabulary: string[];
  mesoTheme: string;
  exerciseCount: number;
  difficultyTarget: number;
  narrativeContext?: string;
}
import phasesData from '../../../../data/curriculum/phases.json';
import mesoCyclesData from '../../../../data/curriculum/meso-cycles.json';
import microCycleData from '../../../../data/curriculum/micro-cycle-template.json';

// ============================================================
// Periodization Engine -- macro/meso/micro cycle calculator
// ============================================================

interface Phase {
  id: number;
  name: string;
  weeks_start: number;
  weeks_end: number;
  vocab_range: [number, number];
  tenses: string[];
  intensity_profile: string;
  description: string;
}

interface MesoCycle {
  id: number;
  phase_id: number;
  weeks: number[];
  theme: string;
  real_life_topic: string;
  target_tenses: string[];
  deload_week: number;
}

interface MicroDay {
  day_of_week: number;
  label: string;
  dominance: string;
  channel_focus: string;
  exercise_weights: Record<string, number>;
}

export interface CurriculumPosition {
  phase: Phase;
  mesoCycle: MesoCycle;
  week: number;
  dayOfWeek: number;
  dayNumber: number;
  isDeloadWeek: boolean;
  isRestDay: boolean;
  microDay: MicroDay;
}

export interface MesoCyclePreview {
  id: number;
  theme: string;
  realLifeTopic: string;
  weeks: number[];
  tenses: string[];
  isCurrent: boolean;
}

const phases = phasesData as Phase[];
const mesoCycles = mesoCyclesData as MesoCycle[];
const microTemplate = microCycleData.days as MicroDay[];

// ============================================================
// Core: compute position from day number
// ============================================================

function computePosition(dayNumber: number): CurriculumPosition {
  const week = Math.ceil(dayNumber / 7);
  const dayOfWeek = ((dayNumber - 1) % 7); // 0=Mon, 6=Sun

  // Find current phase
  const phase = phases.find(p => week >= p.weeks_start && week <= p.weeks_end) || phases[0];

  // Find current meso-cycle
  const meso = mesoCycles.find(m => m.weeks.includes(week)) || mesoCycles[0];

  // Is this a deload week?
  const isDeloadWeek = week === meso.deload_week;

  // Get micro-day template
  // Map our 0-6 (Mon-Sun) to template's day_of_week (1=Mon, 0=Sun)
  const templateDayOfWeek = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
  const microDay = microTemplate.find(d => d.day_of_week === templateDayOfWeek) || microTemplate[0];

  const isRestDay = microDay.dominance === 'rest';

  return {
    phase,
    mesoCycle: meso,
    week,
    dayOfWeek,
    dayNumber,
    isDeloadWeek,
    isRestDay,
    microDay,
  };
}

// ============================================================
// Public API
// ============================================================

export async function getDailyDirective(
  userId: string
): Promise<Result<PeriodizationDirective>> {
  try {
    const user = await getUserProfile(userId);
    if (!user) {
      return err({ code: 'USER_NOT_FOUND', message: 'User not found', module: 'periodization-engine' });
    }

    const pos = computePosition(user.current_day);

    // Rest day: return minimal directive
    if (pos.isRestDay) {
      return ok({
        dominance: 'rest',
        targetTenses: [],
        targetVocabulary: [],
        mesoTheme: pos.mesoCycle.theme,
        exerciseCount: 0,
        difficultyTarget: 0,
      });
    }

    // Deload week: reduce volume, review focus
    const exerciseCount = pos.isDeloadWeek ? 3 : 5;
    const difficultyTarget = pos.isDeloadWeek ? Math.max(1, pos.phase.id * 2 - 2) : pos.phase.id * 2;

    // Combine phase tenses + meso-specific tenses
    const targetTenses = [...new Set([...pos.mesoCycle.target_tenses])];

    return ok({
      dominance: pos.isDeloadWeek ? 'deload' : pos.microDay.dominance,
      targetTenses,
      targetVocabulary: [], // Will be populated from frequency list based on phase vocab_range
      mesoTheme: pos.mesoCycle.theme,
      exerciseCount,
      difficultyTarget,
      narrativeContext: `Phase: ${pos.phase.name}, Theme: ${pos.mesoCycle.real_life_topic}, Week ${pos.week}${pos.isDeloadWeek ? ' (deload)' : ''}`,
    });
  } catch (e) {
    return err({
      code: 'PERIODIZATION_FAILED',
      message: 'Failed to compute daily directive',
      module: 'periodization-engine',
      cause: e,
    });
  }
}

export function getCurrentPosition(dayNumber: number): Result<CurriculumPosition> {
  try {
    return ok(computePosition(dayNumber));
  } catch (e) {
    return err({
      code: 'POSITION_FAILED',
      message: 'Failed to compute position',
      module: 'periodization-engine',
      cause: e,
    });
  }
}

export async function advanceDay(userId: string): Promise<Result<void>> {
  try {
    const user = await getUserProfile(userId);
    if (!user) {
      return err({ code: 'USER_NOT_FOUND', message: 'User not found', module: 'periodization-engine' });
    }

    const newDay = Math.min(user.current_day + 1, 365);
    const newPos = computePosition(newDay);

    await updateUserProfile(userId, {
      current_day: newDay,
      current_phase: newPos.phase.id,
      current_meso: newPos.mesoCycle.id,
    });

    return ok(undefined);
  } catch (e) {
    return err({
      code: 'ADVANCE_FAILED',
      message: 'Failed to advance day',
      module: 'periodization-engine',
      cause: e,
    });
  }
}

export function getUpcomingThemes(currentDay: number, weeksAhead: number = 4): Result<MesoCyclePreview[]> {
  try {
    const currentWeek = Math.ceil(currentDay / 7);
    const endWeek = currentWeek + weeksAhead;

    const upcoming = mesoCycles
      .filter(m => m.weeks.some(w => w >= currentWeek && w <= endWeek))
      .map(m => ({
        id: m.id,
        theme: m.theme,
        realLifeTopic: m.real_life_topic,
        weeks: m.weeks,
        tenses: m.target_tenses,
        isCurrent: m.weeks.includes(currentWeek),
      }));

    return ok(upcoming);
  } catch (e) {
    return err({
      code: 'UPCOMING_FAILED',
      message: 'Failed to get upcoming themes',
      module: 'periodization-engine',
      cause: e,
    });
  }
}
