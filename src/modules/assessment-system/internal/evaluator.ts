import { type Result, ok, err } from '@/modules/shared-types';
import { supabase } from '@/modules/data-layer';

// ============================================================
// Assessment System -- competency radar + starting state mapping
// ============================================================

export interface CompetencyRadar {
  vocabulary_score: number;   // 0-100
  reading_score: number;      // 0-100
  listening_score: number;    // 0-100
  grammar_score: number;      // 0-100
  writing_score: number;      // 0-100
  speaking_score: number;     // 0-100
  assessed_at: string;
}

export interface StartingState {
  phase: number;          // 1-5
  startWeek: number;      // which week to start at
  fsrsSeedCount: number;  // how many words to pre-seed as "known"
  fsrsSeedMastery: number; // mastery level for seeded words
  channelEmphasis: {
    boost: string[];      // channels to boost (+20%)
    reduce: string[];     // channels to reduce (-10%)
  };
}

// ============================================================
// Mapping rules (from spec Section 6.4)
// ============================================================

export function mapRadarToStartingState(radar: CompetencyRadar): StartingState {
  const scores = [
    radar.vocabulary_score,
    radar.reading_score,
    radar.listening_score,
    radar.grammar_score,
    radar.writing_score,
    radar.speaking_score,
  ];
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Phase placement
  let phase: number;
  let startWeek: number;
  if (average < 15) { phase = 1; startWeek = 1; }
  else if (average < 35) { phase = 1; startWeek = 5; }
  else if (average < 55) { phase = 2; startWeek = 9; }
  else if (average < 75) { phase = 3; startWeek = 21; }
  else { phase = 4; startWeek = 35; }

  // FSRS seed
  let fsrsSeedCount: number;
  let fsrsSeedMastery: number;
  if (radar.vocabulary_score < 20) { fsrsSeedCount = 0; fsrsSeedMastery = 0; }
  else if (radar.vocabulary_score < 40) { fsrsSeedCount = 200; fsrsSeedMastery = 2; }
  else if (radar.vocabulary_score < 60) { fsrsSeedCount = 500; fsrsSeedMastery = 3; }
  else if (radar.vocabulary_score < 80) { fsrsSeedCount = 1000; fsrsSeedMastery = 4; }
  else { fsrsSeedCount = 2000; fsrsSeedMastery = 4; }

  // Channel emphasis: find 2 lowest and 1 highest
  const channels = [
    { name: 'vocabulary', score: radar.vocabulary_score },
    { name: 'reading', score: radar.reading_score },
    { name: 'listening', score: radar.listening_score },
    { name: 'grammar', score: radar.grammar_score },
    { name: 'writing', score: radar.writing_score },
    { name: 'speaking', score: radar.speaking_score },
  ].sort((a, b) => a.score - b.score);

  const boost = channels.slice(0, 2).map(c => c.name);
  const reduce = [channels[channels.length - 1].name];

  return {
    phase,
    startWeek,
    fsrsSeedCount,
    fsrsSeedMastery,
    channelEmphasis: { boost, reduce },
  };
}

// ============================================================
// Radar CRUD
// ============================================================

export async function saveRadar(
  userId: string,
  radar: Omit<CompetencyRadar, 'assessed_at'>
): Promise<Result<CompetencyRadar>> {
  try {
    const { data, error } = await supabase
      .from('user_competency_radar')
      .insert({
        user_id: userId,
        ...radar,
        assessed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return ok(data as CompetencyRadar);
  } catch (e) {
    return err({
      code: 'ASSESSMENT_SAVE_FAILED',
      message: 'Failed to save radar',
      module: 'assessment-system',
      cause: e,
    });
  }
}

export async function getRadar(userId: string): Promise<Result<CompetencyRadar | null>> {
  try {
    const { data, error } = await supabase
      .from('user_competency_radar')
      .select('*')
      .eq('user_id', userId)
      .order('assessed_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return ok(null);
      throw error;
    }
    return ok(data as CompetencyRadar);
  } catch (e) {
    return err({
      code: 'ASSESSMENT_GET_FAILED',
      message: 'Failed to get radar',
      module: 'assessment-system',
      cause: e,
    });
  }
}

export async function getRadarHistory(userId: string): Promise<Result<CompetencyRadar[]>> {
  try {
    const { data, error } = await supabase
      .from('user_competency_radar')
      .select('*')
      .eq('user_id', userId)
      .order('assessed_at', { ascending: true });

    if (error) throw error;
    return ok((data || []) as CompetencyRadar[]);
  } catch (e) {
    return err({
      code: 'ASSESSMENT_HISTORY_FAILED',
      message: 'Failed to get radar history',
      module: 'assessment-system',
      cause: e,
    });
  }
}
