/**
 * Aggregated economy metrics for the monitor dashboard (Firestore).
 * Doc: monitor_settings/economy_summary
 *
 * Client increments on known flows; operators can adjust totals from the monitor UI.
 * “Expired funds (14d)” is tracked as a running total when you run cleanup / manual entry.
 */
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const MONITOR_ECONOMY_REF = doc(db, 'monitor_settings', 'economy_summary');

export type MonitorEconomySnapshot = {
  /** Watch & Earn and similar video rewards paid into player balances */
  videoPayoutsTotal: number;
  /** Net profit credited after beating bots (solo public + matchmaking tables with bots) */
  winsVsBotsTotal: number;
  /** Buy-in / stack lost vs bot tables (estimated from exit chips < buy-in) */
  lossesToBotsTotal: number;
  /** Inactive-balance expiry or policy removals (14-day rule, etc.) */
  expiredFundsTotal: number;
  updatedAtMs: number;
};

function parseEconomy(data: Record<string, unknown> | undefined): MonitorEconomySnapshot {
  const n = (k: string) => {
    const v = data?.[k];
    return typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
  };
  const ts = data?.updatedAt;
  let updatedAtMs = 0;
  if (ts && typeof ts === 'object' && 'seconds' in ts) {
    updatedAtMs = (ts as { seconds: number }).seconds * 1000;
  }
  return {
    videoPayoutsTotal: n('videoPayoutsTotal'),
    winsVsBotsTotal: n('winsVsBotsTotal'),
    lossesToBotsTotal: n('lossesToBotsTotal'),
    expiredFundsTotal: n('expiredFundsTotal'),
    updatedAtMs,
  };
}

export function subscribeMonitorEconomy(
  onUpdate: (s: MonitorEconomySnapshot) => void,
  onError?: () => void
): () => void {
  return onSnapshot(
    MONITOR_ECONOMY_REF,
    (snap) => onUpdate(parseEconomy(snap.data() as Record<string, unknown> | undefined)),
    () => {
      onError?.();
      onUpdate(parseEconomy(undefined));
    }
  );
}

export async function fetchMonitorEconomy(): Promise<MonitorEconomySnapshot> {
  const snap = await getDoc(MONITOR_ECONOMY_REF);
  return parseEconomy(snap.data() as Record<string, unknown> | undefined);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function incrementMonitorEconomy(
  field: keyof Pick<
    MonitorEconomySnapshot,
    'videoPayoutsTotal' | 'winsVsBotsTotal' | 'lossesToBotsTotal' | 'expiredFundsTotal'
  >,
  delta: number
): Promise<void> {
  if (!Number.isFinite(delta) || delta === 0) return;
  const snap = await getDoc(MONITOR_ECONOMY_REF);
  const cur = parseEconomy(snap.data() as Record<string, unknown> | undefined);
  const next = round2((cur[field] ?? 0) + delta);
  await setDoc(
    MONITOR_ECONOMY_REF,
    { [field]: next, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function saveMonitorEconomyTotals(totals: {
  videoPayoutsTotal: number;
  winsVsBotsTotal: number;
  lossesToBotsTotal: number;
  expiredFundsTotal: number;
}): Promise<void> {
  await setDoc(
    MONITOR_ECONOMY_REF,
    {
      videoPayoutsTotal: round2(totals.videoPayoutsTotal),
      winsVsBotsTotal: round2(totals.winsVsBotsTotal),
      lossesToBotsTotal: round2(totals.lossesToBotsTotal),
      expiredFundsTotal: round2(totals.expiredFundsTotal),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
