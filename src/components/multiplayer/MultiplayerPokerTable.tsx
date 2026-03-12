import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToGame, updateGameState, leaveGameRoom } from '@/lib/multiplayer';
import type { GameRoom } from '@/lib/multiplayer';
import type { GameState } from '@/lib/gameTypes';
import PokerTable from '@/components/poker/PokerTable';

interface MultiplayerPokerTableProps {
  gameId: string;
  currentUserId: string;
  isHost: boolean;
  initialRoom: GameRoom;
  onExit: () => void;
  isLandscapeMobile?: boolean;
}

export default function MultiplayerPokerTable({
  gameId,
  currentUserId,
  isHost,
  initialRoom,
  onExit,
  isLandscapeMobile = false,
}: MultiplayerPokerTableProps) {
  const [room, setRoom] = useState<GameRoom | null>(initialRoom);

  useEffect(() => {
    return subscribeToGame(gameId, setRoom);
  }, [gameId]);

  const handleUpdate = useCallback((state: GameState) => {
    updateGameState(gameId, state);
  }, [gameId]);

  const handleExit = useCallback(() => {
    leaveGameRoom(gameId, currentUserId).finally(() => onExit());
  }, [gameId, currentUserId, onExit]);

  const tableClosed = room?.status === 'ended';
  const hostLeft = tableClosed && room?.players && !room.players.some(p => p.userId === room.hostId);

  const gameState = room?.gameState;
  if (!room || !gameState) return null;
  const stateWithUser: GameState = {
    ...gameState,
    players: gameState.players.map(p => ({
      ...p,
      isUser: p.userId === currentUserId,
      // Only current user sees their own cards until showdown
      cards: p.cards.map(c => ({
        ...c,
        faceUp: p.userId === currentUserId || gameState.showdown,
      })),
    })),
  };

  return (
    <>
      <PokerTable
        initialBuyIn={room.buyIn}
        onExit={handleExit}
        isLandscapeMobile={isLandscapeMobile}
        multiplayer={{
        gameId,
        currentUserId,
        isHost,
        gameState: stateWithUser,
        onUpdate: handleUpdate,
      }}
    />
      <AnimatePresence>
        {tableClosed && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="mx-4 max-w-sm rounded-2xl border-2 border-primary bg-background/98 px-6 py-8 text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <span className="text-4xl">🃏</span>
              <h2 className="mt-2 font-bold tracking-wider text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem' }}>
                Table Closed
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {hostLeft
                  ? 'The host has left the table. At least two players are required to play the game.'
                  : 'At least two players are required to play the game.'}
              </p>
              <button
                className="casino-btn mt-6 px-6 py-3"
                onClick={() => onExit()}
              >
                Return to Lobby
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
