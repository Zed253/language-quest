// ============================================================
// Initialize all event listeners
// Call this once at app startup (in layout or root component)
// ============================================================

import { initGamificationListeners } from '@/modules/gamification';
import { initMonitoringListeners } from '@/modules/monitoring-system';

let initialized = false;

export function initAllListeners() {
  if (initialized) return;
  initialized = true;

  initGamificationListeners();
  initMonitoringListeners();

  console.log('[Language Quest] Event listeners initialized');
}
