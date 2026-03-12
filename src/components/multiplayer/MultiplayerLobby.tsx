import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Play, ArrowLeft } from 'lucide-react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GameRoom } from '@/lib/multiplayer';
import { startGame, joinGameRoom } from '@/lib/multiplayer';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface MultiplayerLobbyProps {
  gameId: string;
  inviteCode: string;
  currentUserId: string;
  currentUserName: string;
  currentUserPhoto: string | null;
  isHost: boolean;
  onStart: (room: GameRoom) => void;
  onBack: () => void;
}

const MultiplayerLobby = ({
  gameId,
  inviteCode,
  currentUserId,
  currentUserName,
  currentUserPhoto,
  isHost,
  onStart,
  onBack,
}: MultiplayerLobbyProps) => {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'games', gameId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const r = {
        id: snap.id,
        ...data,
        gameState: data?.gameState ? JSON.parse(JSON.stringify(data.gameState)) : null,
      } as GameRoom;
      setRoom(r);
      if (data?.status === 'playing') onStart(r);
    });
    return () => unsub();
  }, [gameId, onStart]);

  useEffect(() => {
    if (!room || room.players.some(p => p.userId === currentUserId)) return;
    joinGameRoom(gameId, currentUserId, currentUserName, currentUserPhoto).catch(() => {});
  }, [gameId, currentUserId, currentUserName, currentUserPhoto, room]);

  const handleStart = async () => {
    if (!isHost || !room || room.players.length < 2) return;
    setStarting(true);
    try {
      const ok = await startGame(gameId);
      if (ok && room) {
        const snap = await getDoc(doc(db, 'games', gameId));
        if (snap.exists()) {
          const data = snap.data();
          const r = { id: snap.id, ...data, gameState: data?.gameState ? JSON.parse(JSON.stringify(data.gameState)) : null } as GameRoom;
          onStart(r);
        } else {
          onStart({ ...room, status: 'playing', gameState: null } as GameRoom);
        }
      }
      else toast({ title: 'Need at least 2 players', variant: 'destructive' });
    } catch (e) {
      toast({ title: 'Failed to start', variant: 'destructive' });
    } finally {
      setStarting(false);
    }
  };

  const players = room?.players ?? [];
  const canStart = isHost && players.length >= 2;

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/5" />
      <div className="relative z-10 w-full max-w-md mx-4 px-6 py-8 rounded-2xl border-2 border-primary/50 bg-background/95">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-display text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            MULTIPLAYER LOBBY
          </h1>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 mb-6">
          <span className="text-muted-foreground text-sm">Code:</span>
          <span className="font-mono font-bold text-primary tracking-widest">{inviteCode}</span>
        </div>
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Users className="h-4 w-4" />
            Players ({players.length}/6)
          </div>
          {players.map((p, i) => (
            <div
              key={p.userId}
              className="flex items-center gap-3 p-2 rounded-lg border border-primary/20"
            >
              {p.photoURL ? (
                <img src={p.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-primary text-sm font-bold">
                  {p.displayName[0]}
                </div>
              )}
              <span className="font-medium">{p.displayName}</span>
              {p.userId === room?.hostId && (
                <span className="text-xs text-primary">Host</span>
              )}
            </div>
          ))}
        </div>
        {isHost ? (
          <Button
            className="w-full casino-btn"
            onClick={handleStart}
            disabled={!canStart || starting}
          >
            <Play className="h-4 w-4 mr-2" />
            {starting ? 'Starting...' : `Start Game (${players.length}/2 min)`}
          </Button>
        ) : (
          <p className="text-center text-muted-foreground text-sm">
            Waiting for host to start the game...
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default MultiplayerLobby;
