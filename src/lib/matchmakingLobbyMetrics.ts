/**
 * Live lobby demand for the monitor: matchmaking pool queues + recent flow events per pool.
 * Used to scale synthetic “open” table rows: 6/min equivalent → 1 … 24 → 4 (Sit & Go vs Tournament separate pools).
 */
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { firestoreTimestampToMs } from '@/lib/multiplayer';
import { listMatchmakingPoolCatalog } from '@/lib/matchmakingPoolCatalog';
import type { MatchmakingTierKey } from '@/lib/matchmakingPoolId';

const FLOW_WINDOW_MS = 60_000;
const FLOW_QUERY_LIMIT = 1000;

export type PoolLobbyMetrics = {
  poolId: string;
  queueCount: number;
  flowLast60: number;
  /** max(queue, flowLast60) */
  pressure: number;
  /** 0 if no pressure; else 1–4 from floor(pressure/6) */
  openOptions: number;
};

export type LobbyMetricsSnapshot = {
  byPool: Map<string, PoolLobbyMetrics>;
  /** Unique user ids currently in any pool queue */
  queuedUserIds: Set<string>;
  queuedUserIdsSitAndGo: Set<string>;
  queuedUserIdsTournament: Set<string>;
};

function parsePoolQueued(data: Record<string, unknown>): { count: number; userIds: string[] } {
  const raw = data.queued;
  if (!Array.isArray(raw)) return { count: 0, userIds: [] };
  const ids = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const uid = (item as { userId?: string }).userId;
    if (typeof uid === 'string' && uid.length > 0) ids.add(uid);
  }
  const userIds = [...ids];
  return { count: userIds.length, userIds };
}

/** 6–11 → 1, 12–17 → 2, 18–23 → 3, 24+ → 4; below 6 → 0 for that pool */
export function openOptionsFromPressure(pressure: number): number {
  if (pressure < 6) return 0;
  return Math.min(4, Math.floor(pressure / 6));
}

/** Max pressure across all pool ids for this tier + mode (Sit & Go vs Tournament separated). */
export function maxPressureForTierMode(
  snapshot: LobbyMetricsSnapshot | null,
  tierKey: MatchmakingTierKey,
  gameMode: 'tournament' | 'sit-and-go'
): number {
  if (!snapshot) return 0;
  let max = 0;
  for (const row of listMatchmakingPoolCatalog()) {
    if (row.tierKey !== tierKey || row.gameMode !== gameMode) continue;
    const p = snapshot.byPool.get(row.poolId)?.pressure ?? 0;
    if (p > max) max = p;
  }
  return max;
}

/**
 * How many stake / entry buttons to show in the lobby for this tier+mode.
 * 6 → 1, 12 → 2, 18 → 3, 24 → 4 (floor(pressure/6), clamped 1–4).
 * Before Firestore data loads, show all 4 so the UI does not flash empty.
 */
export function visibleLobbyStakeOptionCount(
  tierModeMaxPressure: number,
  hasReceivedFirestoreSnapshot: boolean
): number {
  if (!hasReceivedFirestoreSnapshot) return 4;
  return Math.max(1, Math.min(4, Math.floor(tierModeMaxPressure / 6)));
}

function poolIdIsTournament(poolId: string): boolean {
  return poolId.includes('_tournament_');
}

function mergeSnapshot(
  pools: Map<string, { queue: number; userIds: string[] }>,
  flowByPool: Map<string, number>
): LobbyMetricsSnapshot {
  const poolIds = new Set<string>([...pools.keys(), ...flowByPool.keys()]);
  const byPool = new Map<string, PoolLobbyMetrics>();
  const queuedUserIds = new Set<string>();
  const queuedUserIdsSitAndGo = new Set<string>();
  const queuedUserIdsTournament = new Set<string>();

  for (const poolId of poolIds) {
    const q = pools.get(poolId);
    const queueCount = q?.queue ?? 0;
    const flowLast60 = flowByPool.get(poolId) ?? 0;
    const pressure = Math.max(queueCount, flowLast60);
    const openOptions = openOptionsFromPressure(pressure);
    byPool.set(poolId, { poolId, queueCount, flowLast60, pressure, openOptions });

    if (q?.userIds) {
      const isTr = poolIdIsTournament(poolId);
      for (const uid of q.userIds) {
        queuedUserIds.add(uid);
        if (isTr) queuedUserIdsTournament.add(uid);
        else queuedUserIdsSitAndGo.add(uid);
      }
    }
  }

  return { byPool, queuedUserIds, queuedUserIdsSitAndGo, queuedUserIdsTournament };
}

export function subscribeMatchmakingLobbyMetrics(
  onUpdate: (snapshot: LobbyMetricsSnapshot) => void,
  onError?: () => void
): () => void {
  let poolsMap = new Map<string, { queue: number; userIds: string[] }>();
  let flowMap = new Map<string, number>();
  let reportedError = false;
  const fireError = () => {
    if (reportedError) return;
    reportedError = true;
    onError?.();
  };

  const emit = () => {
    onUpdate(mergeSnapshot(poolsMap, flowMap));
  };

  const unsubPools = onSnapshot(
    collection(db, 'matchmaking_pools'),
    (snap) => {
      const next = new Map<string, { queue: number; userIds: string[] }>();
      for (const d of snap.docs) {
        const { count, userIds } = parsePoolQueued(d.data() as Record<string, unknown>);
        next.set(d.id, { queue: count, userIds });
      }
      poolsMap = next;
      emit();
    },
    () => fireError()
  );

  const flowQ = query(
    collection(db, 'matchmaking_flow'),
    orderBy('createdAt', 'desc'),
    limit(FLOW_QUERY_LIMIT)
  );

  const unsubFlow = onSnapshot(
    flowQ,
    (snap) => {
      const now = Date.now();
      const fc = new Map<string, number>();
      for (const d of snap.docs) {
        const data = d.data();
        const ms = firestoreTimestampToMs(data.createdAt);
        if (ms === 0 || now - ms > FLOW_WINDOW_MS) continue;
        const pid = typeof data.poolId === 'string' ? data.poolId : '';
        if (!pid) continue;
        fc.set(pid, (fc.get(pid) ?? 0) + 1);
      }
      flowMap = fc;
      emit();
    },
    () => fireError()
  );

  return () => {
    unsubPools();
    unsubFlow();
  };
}
