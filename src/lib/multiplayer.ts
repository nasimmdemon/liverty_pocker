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
}

function generateInviteCode(): string {
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
  bigBlind: number
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
  };
  await setDoc(roomRef, room);
  return { id: roomRef.id, ...room } as GameRoom;
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
  await updateDoc(roomRef, {
    players,
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
  const players = (data?.players as GameRoomPlayer[]) || [];
  if (players.length < 2) return false;

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
  let newGameState = room.gameState ? firestoreToGameState(room.gameState as Record<string, unknown>) : null;

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
