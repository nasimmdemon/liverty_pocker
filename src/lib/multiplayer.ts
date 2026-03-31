import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  Timestamp,
  runTransaction,
  limit,
  type FirestoreError,
} from 'firebase/firestore';
import { db } from './firebase';
import { buildMatchmakingPoolId, type MatchmakingTierKey } from './matchmakingPoolId';
import type { GameState, Player } from './gameTypes';
import { createInitialGameState, startNewRound } from './gameLogic';
import avatar1 from '@/assets/avatar-1.png';
import avatar2 from '@/assets/avatar-2.png';
import avatar3 from '@/assets/avatar-3.png';
import avatar4 from '@/assets/avatar-4.png';
import avatar5 from '@/assets/avatar-5.png';
import avatar6 from '@/assets/avatar-6.png';

const AVATARS = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6];

export interface GameRoomPlayer {
  userId: string;
  displayName: string;
  photoURL: string | null;
  seatIndex: number;
  chips: number;
  isReady: boolean;
}

export interface GameRoom {
  id: string;
  inviteCode: string;
  hostId: string;
  hostName: string;
  status: 'waiting' | 'playing' | 'ended';
  players: GameRoomPlayer[];
  buyIn: number;
  smallBlind: number;
  bigBlind: number;
  gameState: GameState | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  inviterId?: string;      // UID of who invited table creator (private tables only)
  isPrivateTable?: boolean;
  /** Public matchmaking: table accepts joins; same pool = tier + stake lane */
  matchmakingOpen?: boolean;
  matchmakingPoolId?: string;
  /** Seated from human-only queue pairing — lobby / client may auto-start */
  matchmakingHumanPair?: boolean;
}

/** Prefix for system bots in matchmaking tables (host client runs AI). */
export const MATCHMAKING_BOT_PREFIX = '__matchmaking_bot__';

export function isMatchmakingBotUserId(userId: string): boolean {
  return userId.startsWith(MATCHMAKING_BOT_PREFIX);
}

export function matchmakingBotId(gameDocId: string, seatIndex: number): string {
  return `${MATCHMAKING_BOT_PREFIX}${gameDocId.slice(0, 12)}_${seatIndex}`;
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function gameStateToFirestore(state: GameState): Record<string, unknown> {
  return JSON.parse(JSON.stringify(state));
}

function firestoreToGameState(data: Record<string, unknown>): GameState {
  const state = JSON.parse(JSON.stringify(data)) as GameState;
  state.players = state.players.map((p, i) => ({
    ...p,
    avatar: (typeof p.avatar === 'string' && p.avatar) ? p.avatar : AVATARS[i % AVATARS.length],
  }));
  return state;
}

export async function createGameRoom(
  hostId: string,
  hostName: string,
  hostPhotoURL: string | null,
  buyIn: number,
  smallBlind: number,
  bigBlind: number,
  inviterId?: string,
  isPrivateTable?: boolean
): Promise<GameRoom> {
  const inviteCode = generateInviteCode();
  const roomRef = doc(collection(db, 'games'));
  const room: Omit<GameRoom, 'id'> = {
    inviteCode,
    hostId,
    hostName,
    status: 'waiting',
    players: [{
      userId: hostId,
      displayName: hostName,
      photoURL: hostPhotoURL,
      seatIndex: 0,
      chips: buyIn,
      isReady: true,
    }],
    buyIn,
    smallBlind,
    bigBlind,
    gameState: null,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    ...(inviterId && { inviterId }),
    ...(isPrivateTable !== undefined && { isPrivateTable }),
  };
  await setDoc(roomRef, room);
  return { id: roomRef.id, ...room } as GameRoom;
}

export async function createMatchmakingGameRoom(
  hostId: string,
  hostName: string,
  hostPhotoURL: string | null,
  secondHuman: { userId: string; displayName: string; photoURL: string | null } | null,
  withBotSeat: boolean,
  buyIn: number,
  smallBlind: number,
  bigBlind: number,
  poolId: string
): Promise<GameRoom> {
  const inviteCode = generateInviteCode();
  const roomRef = doc(collection(db, 'games'));
  const gameId = roomRef.id;
  const players: GameRoomPlayer[] = [
    {
      userId: hostId,
      displayName: hostName,
      photoURL: hostPhotoURL,
      seatIndex: 0,
      chips: buyIn,
      isReady: true,
    },
  ];
  if (secondHuman) {
    players.push({
      userId: secondHuman.userId,
      displayName: secondHuman.displayName,
      photoURL: secondHuman.photoURL,
      seatIndex: 1,
      chips: buyIn,
      isReady: true,
    });
  } else if (withBotSeat) {
    players.push({
      userId: matchmakingBotId(gameId, 1),
      displayName: 'Table Bot',
      photoURL: null,
      seatIndex: 1,
      chips: buyIn,
      isReady: true,
    });
  }
  const room: Omit<GameRoom, 'id'> = {
    inviteCode,
    hostId,
    hostName,
    status: 'waiting',
    players,
    buyIn,
    smallBlind,
    bigBlind,
    gameState: null,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    matchmakingOpen: true,
    matchmakingPoolId: poolId,
    matchmakingHumanPair: false,
  };
  await setDoc(roomRef, room);
  return { id: gameId, ...room } as GameRoom;
}

/** Mark a game ended (monitor / admin). */
export async function closeGameRoomAsEnded(gameId: string): Promise<void> {
  await updateDoc(doc(db, 'games', gameId), {
    status: 'ended',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Creates an open matchmaking table with only the host seated (no bot).
 * Host must be a real Firebase user; others can join via the same pool.
 */
export async function createMonitorMatchmakingOpenTable(
  hostId: string,
  hostName: string,
  hostPhoto: string | null,
  opts: {
    tierKey: MatchmakingTierKey;
    gameMode: 'tournament' | 'sit-and-go';
    buyIn: number;
    smallBlind: number;
    bigBlind: number;
  }
): Promise<GameRoom> {
  const poolId = buildMatchmakingPoolId(opts.tierKey, opts.gameMode, opts.smallBlind, opts.bigBlind);
  return createMatchmakingGameRoom(hostId, hostName, hostPhoto, null, false, opts.buyIn, opts.smallBlind, opts.bigBlind, poolId);
}

export async function getGameRoomById(gameId: string): Promise<GameRoom | null> {
  const snap = await getDoc(doc(db, 'games', gameId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as GameRoom;
}

export async function joinGameRoom(
  gameId: string,
  userId: string,
  displayName: string,
  photoURL: string | null
): Promise<boolean> {
  const roomRef = doc(db, 'games', gameId);
  const snap = await getDoc(roomRef);
  if (!snap.exists() || snap.data()?.status !== 'waiting') return false;
  const data = snap.data();
  const players = (data?.players as GameRoomPlayer[]) || [];
  if (players.some(p => p.userId === userId)) return true;
  const usedSeats = new Set(players.map(p => p.seatIndex));
  let seatIndex = 0;
  while (usedSeats.has(seatIndex) && seatIndex < 6) seatIndex++;
  if (seatIndex >= 6) return false;
  players.push({
    userId,
    displayName,
    photoURL,
    seatIndex,
    chips: data?.buyIn ?? 1500,
    isReady: true,
  });
  const humans = players.filter((p) => !isMatchmakingBotUserId(p.userId));
  const finalPlayers =
    humans.length >= 2 ? players.filter((p) => !isMatchmakingBotUserId(p.userId)) : players;
  await updateDoc(roomRef, {
    players: finalPlayers,
    updatedAt: serverTimestamp(),
  });
  return true;
}

export async function getGameByCode(inviteCode: string): Promise<GameRoom | null> {
  const q = query(
    collection(db, 'games'),
    where('inviteCode', '==', inviteCode.toUpperCase()),
    where('status', '==', 'waiting')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const gameDoc = snap.docs[0];
  return { id: gameDoc.id, ...gameDoc.data() } as GameRoom;
}

export async function startGame(gameId: string): Promise<boolean> {
  return runTransaction(db, async (transaction) => {
    const roomRef = doc(db, 'games', gameId);
    const snap = await transaction.get(roomRef);
    if (!snap.exists() || snap.data()?.status !== 'waiting') return false;
    const data = snap.data()!;
    const roomData = { id: snap.id, ...data } as GameRoom;
    const players = (data.players as GameRoomPlayer[]) || [];
    if (players.length < 2) return false;

    const referredByMap = new Map<string, string>();
    for (const mp of players) {
      try {
        const userRef = doc(db, 'users', mp.userId);
        const userSnap = await transaction.get(userRef);
        const referredBy = userSnap.data()?.referredBy as string | undefined;
        if (referredBy) referredByMap.set(mp.userId, referredBy);
      } catch {
        // ignore
      }
    }

    const PLAYER_NAMES = ['THE_HUSTLER', 'LADY_LUCK', 'IRON_RAT', 'SHADOW', 'SLICK', 'SMOKE'];
    const initialPlayers: Player[] = Array.from({ length: 6 }, (_, i) => {
      const mp = players.find(p => p.seatIndex === i);
      if (!mp) {
        return {
          id: i,
          name: PLAYER_NAMES[i],
          chips: 0,
          avatar: AVATARS[i],
          cards: [],
          isActive: false,
          isTurn: false,
          isUser: false,
          hasFolded: true,
          isAllIn: false,
          currentBet: 0,
          totalRoundBet: 0,
          totalHandBet: 0,
          status: 'sitting-out' as const,
          userId: undefined,
        };
      }
      return {
        id: i,
        name: mp.displayName,
        chips: mp.chips,
        avatar: mp.photoURL || AVATARS[i],
        cards: [],
        isActive: true,
        isTurn: false,
        isUser: false,
        hasFolded: false,
        isAllIn: false,
        currentBet: 0,
        totalRoundBet: 0,
        totalHandBet: 0,
        status: 'active' as const,
        userId: mp.userId,
        referredBy: referredByMap.get(mp.userId),
      };
    });

    const buyIn = data.buyIn ?? 1500;
    const smallBlind = data.smallBlind ?? 5;
    const bigBlind = data.bigBlind ?? 10;
    const initial = createInitialGameState(buyIn);
    const stateWithPlayers: GameState = {
      ...initial,
      players: initialPlayers,
      smallBlind,
      bigBlind,
      tableId: gameId.slice(0, 5).toUpperCase(),
      hostId: roomData.hostId,
      inviterId: roomData.inviterId,
      isPrivateTable: roomData.isPrivateTable ?? false,
    };
    const gameState = startNewRound(stateWithPlayers);

    transaction.update(roomRef, {
      status: 'playing',
      gameState: gameStateToFirestore(gameState),
      updatedAt: serverTimestamp(),
    });
    return true;
  });
}

export async function updateGameState(gameId: string, gameState: GameState): Promise<void> {
  const roomRef = doc(db, 'games', gameId);
  await updateDoc(roomRef, {
    gameState: gameStateToFirestore(gameState),
    updatedAt: serverTimestamp(),
  });
}

export type LeaveReason = 'host-left' | 'not-enough-players' | null;

export async function leaveGameRoom(gameId: string, userId: string): Promise<LeaveReason> {
  const roomRef = doc(db, 'games', gameId);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  const room = { id: snap.id, ...data } as GameRoom;
  const isHost = room.hostId === userId;

  let newPlayers = (room.players as GameRoomPlayer[]).filter(p => p.userId !== userId);
  let newStatus = room.status;
  let newGameState = room.gameState ? firestoreToGameState(room.gameState as unknown as Record<string, unknown>) : null;

  if (isHost) {
    newStatus = 'ended';
  } else if (newStatus === 'playing' && newGameState) {
    newGameState = {
      ...newGameState,
      players: newGameState.players.map(p =>
        p.userId === userId ? { ...p, isActive: false, status: 'sitting-out' as const } : p
      ),
    };
  }

  if (newPlayers.length < 2 && newStatus === 'playing') {
    newStatus = 'ended';
  }

  await updateDoc(roomRef, {
    players: newPlayers,
    status: newStatus,
    ...(newGameState && { gameState: gameStateToFirestore(newGameState) }),
    updatedAt: serverTimestamp(),
  });

  if (isHost) return 'host-left';
  if (newPlayers.length < 2) return 'not-enough-players';
  return null;
}

/** Milliseconds since epoch from Firestore Timestamp or serialized form (monitor + sorting). */
export function firestoreTimestampToMs(ts: unknown): number {
  if (ts == null) return 0;
  if (ts instanceof Timestamp) return ts.toMillis();
  if (typeof (ts as { toMillis?: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  const sec = (ts as { seconds?: number }).seconds;
  if (typeof sec === 'number' && Number.isFinite(sec)) return sec * 1000;
  return 0;
}

export function subscribeToGame(
  gameId: string,
  onUpdate: (room: GameRoom) => void
): () => void {
  const roomRef = doc(db, 'games', gameId);
  return onSnapshot(roomRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const gs = data?.gameState;
    const room: GameRoom = {
      id: snap.id,
      ...data,
      gameState: gs ? firestoreToGameState(gs as Record<string, unknown>) : null,
      createdAt: data?.createdAt,
      updatedAt: data?.updatedAt,
    } as GameRoom;
    onUpdate(room);
  });
}

/** Same staleness window as the monitor for waiting lobbies (zombie rooms). */
const WAITING_LOBBY_STALE_MS = 20 * 60 * 1000;

function roomActivityMsForLobby(room: GameRoom): number {
  return Math.max(firestoreTimestampToMs(room.updatedAt), firestoreTimestampToMs(room.createdAt));
}

function isWaitingLobbyStale(room: GameRoom): boolean {
  const ms = roomActivityMsForLobby(room);
  if (ms === 0) return true;
  return Date.now() - ms > WAITING_LOBBY_STALE_MS;
}

/**
 * Real-time count of unique real (non-bot) players seated in non-stale waiting rooms.
 * Used on the home screen (“N players in the lobby”).
 */
export function subscribeToWaitingLobbyPlayerCount(
  onCount: (count: number) => void,
  onError?: (error: FirestoreError) => void
): () => void {
  const q = query(collection(db, 'games'), where('status', '==', 'waiting'), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      const ids = new Set<string>();
      for (const d of snap.docs) {
        const data = d.data();
        const room = {
          id: d.id,
          ...data,
          createdAt: data?.createdAt,
          updatedAt: data?.updatedAt,
        } as GameRoom;
        if (isWaitingLobbyStale(room)) continue;
        for (const p of room.players || []) {
          if (!isMatchmakingBotUserId(p.userId)) ids.add(p.userId);
        }
      }
      onCount(ids.size);
    },
    (err) => {
      console.error('[subscribeToWaitingLobbyPlayerCount]', err);
      onError?.(err);
    }
  );
}

function mapGameDocToRoom(d: { id: string; data: () => Record<string, unknown> }): GameRoom {
  const data = d.data();
  const gs = data?.gameState;
  return {
    id: d.id,
    ...data,
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,
    gameState: gs ? firestoreToGameState(gs as Record<string, unknown>) : null,
  } as GameRoom;
}

/**
 * Subscribe to all active game rooms (status = 'waiting' | 'playing').
 * Uses two separate equality queries instead of `status in (...)` so Firestore does not
 * require a composite index (avoids failed-precondition in production).
 * Merges by document id, sorts client-side by last activity.
 */
export function subscribeToAllActiveGames(
  onUpdate: (rooms: GameRoom[]) => void,
  onError?: (error: FirestoreError) => void
): () => void {
  const qWaiting = query(collection(db, 'games'), where('status', '==', 'waiting'), limit(200));
  const qPlaying = query(collection(db, 'games'), where('status', '==', 'playing'), limit(200));

  let waitingRooms: GameRoom[] = [];
  let playingRooms: GameRoom[] = [];

  const mergeAndEmit = () => {
    const byId = new Map<string, GameRoom>();
    for (const r of playingRooms) byId.set(r.id, r);
    for (const r of waitingRooms) byId.set(r.id, r);
    const rooms = [...byId.values()];
    rooms.sort((a, b) => roomActivityMsForLobby(b) - roomActivityMsForLobby(a));
    onUpdate(rooms);
  };

  const unsubW = onSnapshot(
    qWaiting,
    (snap) => {
      waitingRooms = snap.docs.map((docSnap) => mapGameDocToRoom(docSnap));
      mergeAndEmit();
    },
    (err) => {
      console.error('[subscribeToAllActiveGames waiting]', err);
      onError?.(err);
    }
  );
  const unsubP = onSnapshot(
    qPlaying,
    (snap) => {
      playingRooms = snap.docs.map((docSnap) => mapGameDocToRoom(docSnap));
      mergeAndEmit();
    },
    (err) => {
      console.error('[subscribeToAllActiveGames playing]', err);
      onError?.(err);
    }
  );

  return () => {
    unsubW();
    unsubP();
  };
}

/**
 * One page of ended games for the history panel.
 * Sorts client-side so no composite Firestore index is required.
 * We fetch up to pageSize*3 docs then trim after sort to handle Firestore's
 * default ordering being by document ID — real cost is low given the limit.
 */
export async function getEndedGames(pageSize = 60): Promise<GameRoom[]> {
  // Simple single-field query — no composite index needed
  const q = query(
    collection(db, 'games'),
    where('status', '==', 'ended'),
    orderBy('updatedAt', 'desc'),
    limit(pageSize)
  );
  let snap;
  try {
    snap = await getDocs(q);
  } catch {
    // Index may not exist yet — fall back to unordered fetch + client-side sort
    const qFallback = query(
      collection(db, 'games'),
      where('status', '==', 'ended'),
      limit(pageSize * 2)
    );
    snap = await getDocs(qFallback);
  }
  const docs = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data?.createdAt,
      updatedAt: data?.updatedAt,
      gameState: null, // omit heavy payload for history list
    } as GameRoom;
  });
  // Client-side sort by updatedAt descending, most-recent first
  docs.sort((a, b) => {
    const aTs = (a.updatedAt as { seconds?: number } | null)?.seconds ?? 0;
    const bTs = (b.updatedAt as { seconds?: number } | null)?.seconds ?? 0;
    return bTs - aTs;
  });
  return docs.slice(0, pageSize);
}

