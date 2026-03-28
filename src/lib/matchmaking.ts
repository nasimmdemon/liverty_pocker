/**
 * Public matchmaking: instant open table → queue + pair → ~30s bot fallback.
 * Pool doc: matchmaking_pools/{poolId}. Flow logs: matchmaking_flow.
 */
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  limit,
  runTransaction,
  serverTimestamp,
  onSnapshot,
  addDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  generateInviteCode,
  createMatchmakingGameRoom,
  getGameRoomById,
  isMatchmakingBotUserId,
  type GameRoom,
  type GameRoomPlayer,
} from '@/lib/multiplayer';

export type MatchmakingTierKey = 'human' | 'rat' | 'cat' | 'dog';

export const MATCHMAKING_WAIT_MS = 30_000;
/** After a full human table is found, UI countdown before auto startGame */
export const MATCHMAKING_POST_MATCH_COUNTDOWN_SEC = 5;
const QUEUE_STALE_MS = 120_000;
const MAX_RECENT_PAIRS = 48;
/** Pair `ts` is client time; allow skew vs `sinceTs` without matching hours-old `recentPairs` */
const PAIR_TS_LOOKBACK_MS = 120_000;

function roundMoney(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Pool = same tier + game mode + blinds + buy-in (not grid index).
 * Fixes two phones picking FREE 0.01/0.02 with different subTierIndex / row.
 */
export function buildMatchmakingPoolId(
  tierKey: MatchmakingTierKey,
  gameMode: 'tournament' | 'sit-and-go',
  smallBlind: number,
  bigBlind: number,
  buyIn: number
): string {
  const sb = roundMoney(smallBlind);
  const bb = roundMoney(bigBlind);
  const bi = roundMoney(buyIn);
  return `${tierKey}_${gameMode}_sb${sb}_bb${bb}_buy${bi}`;
}

const MAX_SEATS_PER_TABLE = 6;

/**
 * Split N queued humans into table sizes in [2, 6], each table ≥2 players.
 * Maximizes table count (prefer tables of 2) so e.g. 4→2+2, 5→2+3, 6→2+2+2.
 */
export function planMatchmakingTableSizes(n: number): number[] {
  if (n < 2) return [];
  let remaining = n;
  const groups: number[] = [];
  while (remaining > MAX_SEATS_PER_TABLE) {
    groups.push(2);
    remaining -= 2;
  }
  if (remaining === 6) {
    groups.push(2, 2, 2);
  } else if (remaining === 5) {
    groups.push(2, 3);
  } else if (remaining === 4) {
    groups.push(2, 2);
  } else if (remaining === 3) {
    groups.push(3);
  } else if (remaining === 2) {
    groups.push(2);
  }
  return groups;
}

interface QueuedPlayer {
  userId: string;
  displayName: string;
  photoURL: string | null;
  buyIn: number;
  sb: number;
  bb: number;
  ts: number;
  nonce: string;
}

interface RecentPair {
  gameId: string;
  members: string[];
  ts: number;
}

async function logFlow(poolId: string, type: string, userId: string): Promise<void> {
  try {
    await addDoc(collection(db, 'matchmaking_flow'), {
      poolId,
      type,
      userId,
      createdAt: serverTimestamp(),
    });
  } catch {
    // non-fatal
  }
}

/** Try to join an existing open matchmaking table with a free seat. */
export async function tryJoinOpenMatchmakingGame(
  userId: string,
  displayName: string,
  photoURL: string | null,
  poolId: string
): Promise<string | null> {
  const q = query(
    collection(db, 'games'),
    where('matchmakingPoolId', '==', poolId),
    where('matchmakingOpen', '==', true),
    where('status', '==', 'waiting'),
    limit(24)
  );
  let snap;
  try {
    snap = await getDocs(q);
  } catch (e) {
    console.warn('[matchmaking] open-table query failed (deploy Firestore index if needed):', e);
    return null;
  }
  const docs = snap.docs
    .map((d) => ({ id: d.id, ...d.data(), _updated: (d.data().updatedAt as { seconds?: number })?.seconds ?? 0 }))
    .sort((a, b) => a._updated - b._updated);

  for (const d of docs) {
    const gameId = d.id;
    const ok = await runTransaction(db, async (tx) => {
      const ref = doc(db, 'games', gameId);
      const s = await tx.get(ref);
      if (!s.exists() || s.data()?.status !== 'waiting') return false;
      const data = s.data()!;
      if (data.matchmakingPoolId !== poolId || !data.matchmakingOpen) return false;
      const players = [...((data.players as GameRoomPlayer[]) || [])];
      if (players.some((p) => p.userId === userId)) return true;
      if (players.length >= 6) return false;
      const usedSeats = new Set(players.map((p) => p.seatIndex));
      let seatIndex = 0;
      while (usedSeats.has(seatIndex) && seatIndex < 6) seatIndex++;
      if (seatIndex >= 6) return false;
      players.push({
        userId,
        displayName,
        photoURL,
        seatIndex,
        chips: data.buyIn ?? 1500,
        isReady: true,
      });
      const humans = players.filter((p) => !isMatchmakingBotUserId(p.userId));
      const finalPlayers =
        humans.length >= 2 ? players.filter((p) => !isMatchmakingBotUserId(p.userId)) : players;
      tx.update(ref, {
        players: finalPlayers,
        updatedAt: serverTimestamp(),
      });
      return true;
    });
    if (ok) {
      await logFlow(poolId, 'open_join', userId);
      return gameId;
    }
  }
  return null;
}

function normalizeQueue(queued: QueuedPlayer[], now: number): QueuedPlayer[] {
  let q = queued.filter((x) => now - x.ts < QUEUE_STALE_MS);
  const byUser = new Map<string, QueuedPlayer>();
  for (const item of q) {
    const prev = byUser.get(item.userId);
    if (!prev || item.ts > prev.ts) byUser.set(item.userId, item);
  }
  q = Array.from(byUser.values()).sort((a, b) => a.ts - b.ts);
  return q;
}

/**
 * Add self to queue; form as many full tables as possible (2–6 per table, ≥2 humans each).
 */
export async function enqueueAndMaybePair(params: {
  userId: string;
  displayName: string;
  photoURL: string | null;
  poolId: string;
  buyIn: number;
  smallBlind: number;
  bigBlind: number;
}): Promise<{ kind: 'paired'; gameId: string } | { kind: 'queued' }> {
  const poolRef = doc(db, 'matchmaking_pools', params.poolId);
  const now = Date.now();

  const result = await runTransaction(db, async (tx) => {
    const poolSnap = await tx.get(poolRef);
    const data = poolSnap.exists() ? poolSnap.data() : {};
    let queued = normalizeQueue((data.queued as QueuedPlayer[]) || [], now);
    const recentPairs = ((data.recentPairs as RecentPair[]) || []).slice(-MAX_RECENT_PAIRS);

    const exists = queued.some((q) => q.userId === params.userId);
    if (!exists) {
      queued.push({
        userId: params.userId,
        displayName: params.displayName,
        photoURL: params.photoURL,
        buyIn: roundMoney(params.buyIn),
        sb: roundMoney(params.smallBlind),
        bb: roundMoney(params.bigBlind),
        ts: now,
        nonce: `${now}_${Math.random().toString(36).slice(2, 9)}`,
      });
    }

    queued = normalizeQueue(queued, now);

    let pairedGameId: string | null = null;
    let newQueued = [...queued];
    const newPairs: RecentPair[] = [...recentPairs];

    const plan = planMatchmakingTableSizes(newQueued.length);
    let cursor = 0;
    for (const tableSize of plan) {
      const slice = newQueued.slice(cursor, cursor + tableSize);
      if (slice.length < tableSize) break;
      cursor += tableSize;
      const sorted = [...slice].sort((a, b) => a.ts - b.ts);
      const host = sorted[0];
      const buyIn = sorted[0].buyIn;
      const smallBlind = sorted[0].sb;
      const bigBlind = sorted[0].bb;
      const gameRef = doc(collection(db, 'games'));
      const gameId = gameRef.id;
      const players: GameRoomPlayer[] = sorted.map((q, seatIndex) => ({
        userId: q.userId,
        displayName: q.displayName,
        photoURL: q.photoURL,
        seatIndex,
        chips: buyIn,
        isReady: true,
      }));
      tx.set(gameRef, {
        inviteCode: generateInviteCode(),
        hostId: host.userId,
        hostName: host.displayName,
        status: 'waiting',
        players,
        buyIn,
        smallBlind,
        bigBlind,
        gameState: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        matchmakingOpen: true,
        matchmakingPoolId: params.poolId,
        matchmakingHumanPair: true,
      });
      newPairs.push({ gameId, members: sorted.map((q) => q.userId), ts: now });
      if (sorted.some((q) => q.userId === params.userId)) {
        pairedGameId = gameId;
      }
    }
    newQueued = newQueued.slice(cursor);

    const trimmedPairs = newPairs.slice(-MAX_RECENT_PAIRS);
    tx.set(
      poolRef,
      {
        queued: newQueued,
        recentPairs: trimmedPairs,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return pairedGameId;
  });

  if (result) {
    await logFlow(params.poolId, 'pair', params.userId);
    return { kind: 'paired', gameId: result };
  }
  await logFlow(params.poolId, 'enqueue', params.userId);
  return { kind: 'queued' };
}

/** Remove user from pool queue (e.g. cancel). */
export async function leaveMatchmakingQueue(poolId: string, userId: string): Promise<void> {
  const poolRef = doc(db, 'matchmaking_pools', poolId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(poolRef);
    if (!snap.exists()) return;
    const queued = ((snap.data().queued || []) as QueuedPlayer[]).filter((q) => q.userId !== userId);
    tx.set(poolRef, { queued, updatedAt: serverTimestamp() }, { merge: true });
  });
}

export type MatchmakingSearchParams = {
  userId: string;
  displayName: string;
  photoURL: string | null;
  tierKey: MatchmakingTierKey;
  /** @deprecated Pool uses blinds + buy-in; kept for logging/UI only */
  subTierIndex?: number;
  gameMode: 'tournament' | 'sit-and-go';
  buyIn: number;
  smallBlind: number;
  bigBlind: number;
};

function subscribePoolForPairedGame(
  poolId: string,
  myUserId: string,
  sinceTs: number,
  onMatch: (gameId: string) => void
): () => void {
  const poolRef = doc(db, 'matchmaking_pools', poolId);
  let fired = false;
  return onSnapshot(poolRef, (snap) => {
    if (fired || !snap.exists()) return;
    const pairs = (snap.data().recentPairs || []) as RecentPair[];
    for (const p of [...pairs].reverse()) {
      if (p.members.includes(myUserId) && p.ts >= sinceTs - PAIR_TS_LOOKBACK_MS) {
        fired = true;
        onMatch(p.gameId);
        return;
      }
    }
  });
}

/**
 * Full flow: join open table → queue + pair (transaction or snapshot) → after 30s bot table.
 * Caller should deduct buy-in before calling (same as solo public play).
 */
export async function runMatchmakingUntilSeated(
  params: MatchmakingSearchParams,
  options?: { signal?: AbortSignal; onPhase?: (p: 'open' | 'queue' | 'paired' | 'bot') => void }
): Promise<GameRoom> {
  const poolId = buildMatchmakingPoolId(
    params.tierKey,
    params.gameMode,
    params.smallBlind,
    params.bigBlind,
    params.buyIn
  );
  const sinceTs = Date.now();
  const base = {
    userId: params.userId,
    displayName: params.displayName,
    photoURL: params.photoURL,
    poolId,
    buyIn: params.buyIn,
    smallBlind: params.smallBlind,
    bigBlind: params.bigBlind,
  };

  const openId = await tryJoinOpenMatchmakingGame(
    params.userId,
    params.displayName,
    params.photoURL,
    poolId
  );
  if (openId) {
    options?.onPhase?.('open');
    const room = await getGameRoomById(openId);
    if (room) return room;
  }

  options?.onPhase?.('queue');
  let enq: { kind: 'paired'; gameId: string } | { kind: 'queued' };
  try {
    enq = await enqueueAndMaybePair(base);
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : 'Queue failed';
    throw new Error(
      `${msg}. If this persists, run: firebase deploy --only firestore (rules + indexes).`
    );
  }
  if (enq.kind === 'paired') {
    options?.onPhase?.('paired');
    const room = await getGameRoomById(enq.gameId);
    if (room) return room;
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanupFns: Array<() => void> = [];

    const finish = (room: GameRoom) => {
      if (settled) return;
      settled = true;
      cleanupFns.forEach((f) => f());
      resolve(room);
    };

    const fail = (e: Error) => {
      if (settled) return;
      settled = true;
      cleanupFns.forEach((f) => f());
      reject(e);
    };

    const unsubPair = subscribePoolForPairedGame(poolId, params.userId, sinceTs, async (gameId) => {
      const room = await getGameRoomById(gameId);
      if (room && room.status === 'waiting') {
        options?.onPhase?.('paired');
        await leaveMatchmakingQueue(poolId, params.userId).catch(() => {});
        finish(room);
      }
    });
    cleanupFns.push(unsubPair);

    const poll = window.setInterval(async () => {
      if (settled) return;
      try {
        const jid = await tryJoinOpenMatchmakingGame(
          params.userId,
          params.displayName,
          params.photoURL,
          poolId
        );
        if (jid) {
          options?.onPhase?.('open');
          await leaveMatchmakingQueue(poolId, params.userId).catch(() => {});
          const room = await getGameRoomById(jid);
          if (room) finish(room);
          return;
        }
        const again = await enqueueAndMaybePair(base);
        if (again.kind === 'paired') {
          options?.onPhase?.('paired');
          await leaveMatchmakingQueue(poolId, params.userId).catch(() => {});
          const room = await getGameRoomById(again.gameId);
          if (room) finish(room);
        }
      } catch {
        // ignore transient errors
      }
    }, 2000);
    cleanupFns.push(() => clearInterval(poll));

    const timer = window.setTimeout(async () => {
      if (settled) return;
      try {
        await leaveMatchmakingQueue(poolId, params.userId);
        options?.onPhase?.('bot');
        const room = await createMatchmakingGameRoom(
          params.userId,
          params.displayName,
          params.photoURL,
          null,
          true,
          params.buyIn,
          params.smallBlind,
          params.bigBlind,
          poolId
        );
        await logFlow(poolId, 'bot', params.userId);
        finish(room);
      } catch (e) {
        fail(e instanceof Error ? e : new Error('Matchmaking failed'));
      }
    }, MATCHMAKING_WAIT_MS);
    cleanupFns.push(() => clearTimeout(timer));

    const onAbort = () => {
      leaveMatchmakingQueue(poolId, params.userId).catch(() => {});
      fail(new DOMException('Aborted', 'AbortError'));
    };
    options?.signal?.addEventListener('abort', onAbort);
    if (options?.signal?.aborted) onAbort();
    else if (options?.signal) {
      cleanupFns.push(() => options.signal?.removeEventListener('abort', onAbort));
    }
  });
}