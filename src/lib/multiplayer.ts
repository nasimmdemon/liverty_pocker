import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
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
  };
  await setDoc(roomRef, room);
  return { id: gameId, ...room } as GameRoom;
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
  const roomRef = doc(db, 'games', gameId);
  const snap = await getDoc(roomRef);
  if (!snap.exists() || snap.data()?.status !== 'waiting') return false;
  const data = snap.data();
  const roomData = { id: snap.id, ...data } as GameRoom;
  const players = (data?.players as GameRoomPlayer[]) || [];
  if (players.length < 2) return false;

  const referredByMap = new Map<string, string>();
  for (const mp of players) {
    try {
      const userSnap = await getDoc(doc(db, 'users', mp.userId));
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

  const buyIn = data?.buyIn ?? 1500;
  const smallBlind = data?.smallBlind ?? 5;
  const bigBlind = data?.bigBlind ?? 10;
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

  await updateDoc(roomRef, {
    status: 'playing',
    gameState: gameStateToFirestore(gameState),
    updatedAt: serverTimestamp(),
  });
  return true;
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
