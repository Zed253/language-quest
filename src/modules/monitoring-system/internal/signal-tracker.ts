import { type Result, ok, err } from '@/modules/shared-types';
import { supabase } from '@/modules/data-layer';
import { eventBus } from '@/modules/event-bus';

// ============================================================
// Monitoring System -- 4 signals + decision rules
// Transposed from Katchavenda's periodization monitoring
// ============================================================

export interface MonitoringSignals {
  performance_score: number;  // 0-100 (session success rate)
  freshness_score: number;    // 1-10 (self-assessment)
  engagement_score: number;   // 0-100 (time * completion rate)
  retention_score: number;    // 0-100 (FSRS review performance)
}

export type MonitoringDecision = 'none' | 'reduce-volume' | 'deload';

export interface SignalSnapshot {
  id: string;
  user_id: string;
  session_id: string;
  performance_score: number;
  freshness_score: number;
  engagement_score: number;
  retention_score: number;
  decision: MonitoringDecision;
  created_at: string;
}

// Thresholds (what counts as "negative")
const THRESHOLDS = {
  performance: 60,    // below 60% = negative
  freshness: 4,       // below 4/10 = negative
  engagement: 50,     // below 50% = negative
  retention: 70,      // below 70% on review cards = negative
};

function countNegativeSignals(signals: MonitoringSignals): number {
  let count = 0;
  if (signals.performance_score < THRESHOLDS.performance) count++;
  if (signals.freshness_score < THRESHOLDS.freshness) count++;
  if (signals.engagement_score < THRESHOLDS.engagement) count++;
  if (signals.retention_score < THRESHOLDS.retention) count++;
  return count;
}

function computeDecision(signals: MonitoringSignals): MonitoringDecision {
  const negatives = countNegativeSignals(signals);
  if (negatives >= 3) return 'deload';
  if (negatives >= 2) return 'reduce-volume';
  return 'none';
}

// ============================================================
// Public API
// ============================================================

export async function recordSignals(
  sessionId: string,
  userId: string,
  signals: MonitoringSignals
): Promise<Result<MonitoringDecision>> {
  try {
    const decision = computeDecision(signals);

    const { error } = await supabase
      .from('monitoring_signals')
      .insert({
        session_id: sessionId,
        user_id: userId,
        performance_score: signals.performance_score,
        freshness_score: signals.freshness_score,
        engagement_score: signals.engagement_score,
        retention_score: signals.retention_score,
        decision,
      });

    if (error) throw error;
    return ok(decision);
  } catch (e) {
    return err({
      code: 'MONITORING_RECORD_FAILED',
      message: 'Failed to record monitoring signals',
      module: 'monitoring-system',
      cause: e,
    });
  }
}

export async function getDecision(userId: string): Promise<Result<MonitoringDecision>> {
  try {
    // Get the last 3 sessions' signals to detect trends
    const { data, error } = await supabase
      .from('monitoring_signals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) throw error;

    if (!data || data.length === 0) return ok('none');

    // Use the most recent signal's decision
    const latest = data[0] as SignalSnapshot;
    return ok(latest.decision);
  } catch (e) {
    return err({
      code: 'MONITORING_DECISION_FAILED',
      message: 'Failed to get monitoring decision',
      module: 'monitoring-system',
      cause: e,
    });
  }
}

export async function getSignalHistory(
  userId: string,
  days: number = 7
): Promise<Result<SignalSnapshot[]>> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('monitoring_signals')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;
    return ok((data || []) as SignalSnapshot[]);
  } catch (e) {
    return err({
      code: 'MONITORING_HISTORY_FAILED',
      message: 'Failed to get signal history',
      module: 'monitoring-system',
      cause: e,
    });
  }
}

// ============================================================
// Event listener -- auto-record signals on session complete
// ============================================================

export function initMonitoringListeners(): void {
  eventBus.on('SessionCompleted', (event) => {
    const { user_id, stats } = event.payload;

    const signals: MonitoringSignals = {
      performance_score: stats.cards_reviewed > 0
        ? Math.round((stats.cards_correct / stats.cards_reviewed) * 100)
        : 0,
      freshness_score: 7, // Default -- will be overridden by UI-provided value
      engagement_score: Math.min(100, Math.round((stats.duration_seconds / (30 * 60)) * 100)), // % of expected 30 min
      retention_score: stats.review_cards_seen > 0
        ? Math.round((stats.cards_correct / stats.review_cards_seen) * 100)
        : 100,
    };

    // Fire and forget -- monitoring errors don't block the session
    recordSignals('auto', user_id, signals);
  });
}
