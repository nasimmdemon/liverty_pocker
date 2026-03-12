import { useEffect, useState, useCallback } from 'react';
import { subscribeToGame, updateGameState } from '@/lib/multiplayer';
import type { GameRoom } from '@/lib/multiplayer';
import type { GameState } from '@/lib/gameTypes';
import PokerTable from '@/components/poker/PokerTable';

interface MultiplayerPokerTableProps {
  gameId: string;
  currentUserId: string;
  isHost: boolean;
  initialRoom: GameRoom;
  onExit: () => void;
}

export default function MultiplayerPokerTable({
  gameId,
  currentUserId,
  isHost,
  initialRoom,
  onExit,
}: MultiplayerPokerTableProps) {
  const [room, setRoom] = useState<GameRoom | null>(initialRoom);

  useEffect(() => {
    return subscribeToGame(gameId, setRoom);
  }, [gameId]);

  const handleUpdate = useCallback((state: GameState) => {
    updateGameState(gameId, state);
  }, [gameId]);

  if (!room || !gameState) return null;

  const gameState = room.gameState;
  const stateWithUser: GameState = {
    ...gameState,
    players: gameState.players.map(p => ({
      ...p,
      isUser: p.userId === currentUserId,
    })),
  };

  return (
    <PokerTable
      initialBuyIn={room.buyIn}
      onExit={onExit}
      multiplayer={{
        gameId,
        currentUserId,
        isHost,
        gameState: stateWithUser,
        onUpdate: handleUpdate,
      }}
    />
  );
}
