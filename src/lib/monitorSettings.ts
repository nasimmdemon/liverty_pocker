/**
 * Firestore-backed monitor controls: bot fallback, matchmaking timing, reserve planning.
 * Doc: monitor_settings/controls
 */
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { listMatchmakingPoolCatalog } from '@/lib/matchmakingPoolCatalog';
import type { MatchmakingTierKey } from '@/lib/matchmakingPoolId';

/** Keep in sync with defaults in `matchmaking.ts` when monitor doc has no overrides. */
const DEFAULT_MATCHMAKING_WAIT_MS = 30_000;
const DEFAULT_MATCHMAKING_POST_MATCH_COOLDOWN_MS = 25_000;

export const MONITOR_CONTROLS_REF = doc(db, 'monitor_settings', 'controls');

export type MonitorTierReserve = {
  maxUsd: number;
  allocatedUsd: number;
  currentUsd: number;
};

export type MonitorControlsSnapshot = {
  botFallbackDisabledPoolIds: string[];
  matchmakingWaitMs: number;
  matchmakingPostMatchCooldownMs: number;
  reserveMaxTotalUsd: number;
  reserveByTier: Partial<Record<MatchmakingTierKey, MonitorTierReserve>>;
};

const TIER_KEYS: MatchmakingTierKey[] = ['human', 'rat', 'cat', 'dog'];

function emptyTierReserve(): MonitorTierReserve {
  return { maxUsd: 0, allocatedUsd: 0, currentUsd: 0 };
}

function parseTierReserve(raw: unknown): MonitorTierReserve {
  if (!raw || typeof raw !== 'object') return emptyTierReserve();
  const o = raw as Record<string, unknown>;
  const num = (k: string) =>
    typeof o[k] === 'number' && Number.isFinite(o[k]) ? Math.max(0, o[k] as number) : 0;
  return { maxUsd: num('maxUsd'), allocatedUsd: num('allocatedUsd'), currentUsd: num('currentUsd') };
}

function parseControlsData(data: Record<string, unknown> | undefined): MonitorControlsSnapshot {
  const rawDisabled = data?.botFallbackDisabledPoolIds;
  const botFallbackDisabledPoolIds = Array.isArray(rawDisabled)
    ? rawDisabled.filter((x): x is string => typeof x === 'string')
    : [];

  const w = data?.matchmakingWaitMs;
  const matchmakingWaitMs =
    typeof w === 'number' && Number.isFinite(w) && w >= 5_000 && w <= 600_000
      ? Math.floor(w)
      : DEFAULT_MATCHMAKING_WAIT_MS;

  const c = data?.matchmakingPostMatchCooldownMs;
  const matchmakingPostMatchCooldownMs =
    typeof c === 'number' && Number.isFinite(c) && c >= 0 && c <= 600_000
      ? Math.floor(c)
      : DEFAULT_MATCHMAKING_POST_MATCH_COOLDOWN_MS;

  const r = data?.reserveMaxTotalUsd;
  const reserveMaxTotalUsd =
    typeof r === 'number' && Number.isFinite(r) && r >= 0 ? Math.round(r * 100) / 100 : 0;

  const rawTiers = data?.reserveByTier;
  const reserveByTier: Partial<Record<MatchmakingTierKey, MonitorTierReserve>> = {};
  if (rawTiers && typeof rawTiers === 'object') {
    for (const k of TIER_KEYS) {
      const row = (rawTiers as Record<string, unknown>)[k];
      reserveByTier[k] = parseTierReserve(row);
    }
  }

  return {
    botFallbackDisabledPoolIds,
    matchmakingWaitMs,
    matchmakingPostMatchCooldownMs,
    reserveMaxTotalUsd,
    reserveByTier,
  };
}

/** Live snapshot for dashboard + matchmaking (one listener). */
export function subscribeMonitorControls(
  onUpdate: (state: MonitorControlsSnapshot) => void,
  onError?: () => void
): () => void {
  return onSnapshot(
    MONITOR_CONTROLS_REF,
    (snap) => {
      onUpdate(parseControlsData(snap.data() as Record<string, unknown> | undefined));
    },
    () => {
      onError?.();
      onUpdate(parseControlsData(undefined));
    }
  );
}

export async function fetchMonitorControlsSnapshot(): Promise<MonitorControlsSnapshot> {
  const snap = await getDoc(MONITOR_CONTROLS_REF);
  return parseControlsData(snap.data() as Record<string, unknown> | undefined);
}

/** Used by matchmaking client — no subscription. */
export async function fetchMonitorMatchmakingTiming(): Promise<{
  waitMs: number;
  postMatchCooldownMs: number;
}> {
  const s = await fetchMonitorControlsSnapshot();
  return { waitMs: s.matchmakingWaitMs, postMatchCooldownMs: s.matchmakingPostMatchCooldownMs };
}

export async function saveBotFallbackDisabledPools(poolIds: string[]): Promise<void> {
  await setDoc(
    MONITOR_CONTROLS_REF,
    { botFallbackDisabledPoolIds: poolIds, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function saveMonitorTimingAndReserve(params: {
  matchmakingWaitMs: number;
  matchmakingPostMatchCooldownMs: number;
  reserveMaxTotalUsd: number;
  reserveByTier: Partial<Record<MatchmakingTierKey, MonitorTierReserve>>;
}): Promise<void> {
  const reserveByTier: Record<string, MonitorTierReserve> = {};
  for (const k of TIER_KEYS) {
    const row = params.reserveByTier[k] ?? emptyTierReserve();
    reserveByTier[k] = {
      maxUsd: Math.round(row.maxUsd * 100) / 100,
      allocatedUsd: Math.round(row.allocatedUsd * 100) / 100,
      currentUsd: Math.round(row.currentUsd * 100) / 100,
    };
  }
  await setDoc(
    MONITOR_CONTROLS_REF,
    {
      matchmakingWaitMs: params.matchmakingWaitMs,
      matchmakingPostMatchCooldownMs: params.matchmakingPostMatchCooldownMs,
      reserveMaxTotalUsd: Math.round(params.reserveMaxTotalUsd * 100) / 100,
      reserveByTier,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeBotFallbackDisabledPools(
  onUpdate: (disabledPoolIds: Set<string>) => void
): () => void {
  return subscribeMonitorControls((s) => onUpdate(new Set(s.botFallbackDisabledPoolIds)));
}

export async function fetchBotFallbackDisabledPools(): Promise<Set<string>> {
  const s = await fetchMonitorControlsSnapshot();
  return new Set(s.botFallbackDisabledPoolIds);
}

/** True when every matchmaking pool for this tier has “pause bot fill” on — players never get bot fallback (wait for humans only). */
export function isTierAllBotFallbackDisabled(
  tierKey: MatchmakingTierKey,
  disabledPoolIds: Set<string>
): boolean {
  const ids = listMatchmakingPoolCatalog()
    .filter((r) => r.tierKey === tierKey)
    .map((r) => r.poolId);
  if (ids.length === 0) return false;
  return ids.every((id) => disabledPoolIds.has(id));
}
