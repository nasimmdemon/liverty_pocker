import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArrowLeft, Copy, Check, Search, Share2, Crown, Mail, UserPlus } from 'lucide-react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GameRoom } from '@/lib/multiplayer';
import { startGame, joinGameRoom, isMatchmakingBotUserId } from '@/lib/multiplayer';
import { toast } from '@/hooks/use-toast';
import { hapticLight, hapticMedium, hapticHeavy } from '@/lib/haptics';
import { QRCodeSVG } from 'qrcode.react';
import pokerRoomBg from '@/assets/poker-room-bg.png';
import charactersBg from '@/assets/characters-alt.png';

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

const RESERVATION_DURATION = 16 * 60; // 16 minutes in seconds

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
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeLeft, setTimeLeft] = useState(RESERVATION_DURATION);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStartBotTableRef = useRef(false);

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

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

  // Matchmaking bot fallback: host auto-starts when human + system bot are seated
  useEffect(() => {
    if (!room || !isHost || room.status !== 'waiting' || autoStartBotTableRef.current) return;
    const hasBot = room.players.some((p) => isMatchmakingBotUserId(p.userId));
    if (hasBot && room.players.length >= 2) {
      autoStartBotTableRef.current = true;
      const t = window.setTimeout(() => {
        startGame(gameId).catch(() => {
          autoStartBotTableRef.current = false;
        });
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [room, isHost, gameId]);

  const handleStart = async () => {
    if (!isHost || !room || room.players.length < 2) return;
    hapticHeavy();
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
    } catch {
      toast({ title: 'Failed to start', variant: 'destructive' });
    } finally {
      setStarting(false);
    }
  };

  const inviteLink = `${window.location.origin}?join=${inviteCode}`;

  const handleCopy = () => {
    hapticLight();
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const players = room?.players ?? [];
  const maxPlayers = 6;
  const canStart = isHost && players.length >= 2;
  const openForJoining = !!room?.matchmakingOpen;

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${pokerRoomBg})` }} />
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40" style={{ backgroundImage: `url(${charactersBg})`, backgroundPosition: 'center 60%' }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/70" />

      {/* Back button */}
      <motion.button
        className="absolute top-3 left-3 z-20 casino-btn text-[10px] sm:text-xs px-3 py-1.5 touch-manipulation"
        onClick={() => { hapticLight(); onBack(); }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowLeft className="h-3 w-3 inline mr-1" /> BACK
      </motion.button>

      {/* Main content */}
      <div className="relative z-10 flex items-start gap-6 max-w-3xl w-full mx-4">
        {/* Left column: Player avatars */}
        <div className="hidden sm:flex flex-col gap-3 pt-8">
          <AnimatePresence>
            {players.map((p, i) => (
              <motion.div
                key={p.userId}
                className="relative"
                initial={{ x: -60, opacity: 0, scale: 0.5 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: -60, opacity: 0 }}
                transition={{ delay: i * 0.15, type: 'spring', stiffness: 200, damping: 18 }}
              >
                <div
                  className="w-16 h-16 rounded-full overflow-hidden border-3"
                  style={{
                    borderColor: p.userId === room?.hostId ? 'hsl(var(--casino-gold))' : 'hsl(var(--primary) / 0.5)',
                    boxShadow: p.userId === room?.hostId
                      ? '0 0 20px hsl(var(--casino-gold) / 0.4)'
                      : '0 0 10px hsl(0 0% 0% / 0.5)',
                  }}
                >
                  {p.photoURL ? (
                    <img src={p.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/30 flex items-center justify-center text-primary text-xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                      {p.displayName[0]}
                    </div>
                  )}
                </div>
                {/* Host crown */}
                {p.userId === room?.hostId && (
                  <motion.div
                    className="absolute -top-2 -right-1"
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                  >
                    <Crown size={16} className="text-primary drop-shadow-lg" fill="hsl(var(--casino-gold))" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {/* Empty slots */}
          {Array.from({ length: maxPlayers - players.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-16 h-16 rounded-full border-2 border-dashed border-muted/30 flex items-center justify-center"
            >
              <UserPlus size={18} className="text-muted-foreground/30" />
            </div>
          ))}
        </div>

        {/* Center column: QR + invite */}
        <div className="flex-1 flex flex-col items-center gap-4">
          {/* QR Code + Stats row */}
          <div className="flex items-start gap-4">
            {/* QR Code */}
            <motion.div
              className="p-3 rounded-xl"
              style={{
                background: 'linear-gradient(145deg, hsl(40 20% 12%) 0%, hsl(30 15% 8%) 100%)',
                border: '2px solid hsl(var(--casino-gold) / 0.5)',
                boxShadow: '0 0 25px hsl(var(--casino-gold) / 0.15)',
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <QRCodeSVG
                value={inviteLink}
                size={140}
                bgColor="transparent"
                fgColor="#F2D27A"
                level="M"
              />
            </motion.div>

            {/* Stats */}
            <div className="flex flex-col gap-2 pt-2">
              {[
                { icon: <Crown size={14} />, label: `${players.filter(p => p.userId === room?.hostId).length}/1`, tip: 'Host' },
                { icon: <Users size={14} />, label: `${players.length}/${maxPlayers}`, tip: 'Players' },
                { icon: <Mail size={14} />, label: `0/${maxPlayers}`, tip: 'Invited' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-2 text-muted-foreground"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <span className="text-primary">{stat.icon}</span>
                  <span className="text-xs font-bold tracking-wider" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    {stat.label}
                  </span>
                </motion.div>
              ))}
              <motion.button
                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors mt-1 touch-manipulation"
                onClick={handleCopy}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                whileTap={{ scale: 0.95 }}
              >
                <Share2 size={14} />
                <span className="text-[10px] tracking-wider" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>SHARE</span>
              </motion.button>
            </div>
          </div>

          {/* Copy invite link */}
          <motion.button
            className="flex items-center gap-2 px-5 py-2 rounded-lg border transition-all touch-manipulation"
            style={{
              borderColor: copied ? 'hsl(120 40% 40%)' : 'hsl(var(--casino-gold) / 0.5)',
              background: 'linear-gradient(180deg, hsl(0 0% 10%) 0%, hsl(0 0% 6%) 100%)',
              fontFamily: "'Bebas Neue', sans-serif",
            }}
            onClick={handleCopy}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-primary" />}
            <span className="text-xs tracking-wider text-foreground">
              {copied ? 'Copied!' : 'Copy invite link'}
            </span>
          </motion.button>

          {openForJoining && (
            <motion.div
              className="w-full max-w-sm text-center px-3 py-2 rounded-lg border border-green-500/40 bg-green-500/10 text-green-200 text-[10px] sm:text-xs"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Open for joining — share the code so more players can join this matchmaking table.
            </motion.div>
          )}

          {/* Search for friend */}
          <motion.div
            className="w-full max-w-xs flex items-center gap-2 px-3 py-2 rounded-lg border"
            style={{
              borderColor: 'hsl(var(--casino-gold) / 0.3)',
              background: 'linear-gradient(180deg, hsl(0 0% 10%) 0%, hsl(0 0% 6%) 100%)',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <input
              type="text"
              placeholder="Search for friend by username"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
            />
            <Search size={16} className="text-muted-foreground shrink-0" />
          </motion.div>

          {/* Mobile: Player list */}
          <div className="sm:hidden w-full max-w-xs">
            <div className="flex flex-wrap gap-2 justify-center">
              {players.map((p, i) => (
                <motion.div
                  key={p.userId}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/20"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  {p.photoURL ? (
                    <img src={p.photoURL} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center text-primary text-xs font-bold">
                      {p.displayName[0]}
                    </div>
                  )}
                  <span className="text-xs font-medium text-foreground">{p.displayName}</span>
                  {p.userId === room?.hostId && <Crown size={10} className="text-primary" fill="hsl(var(--casino-gold))" />}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Reservation timer */}
          <motion.p
            className="text-xs tracking-[0.15em] uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Reserved for {minutes} minutes & {seconds.toString().padStart(2, '0')} seconds
          </motion.p>

          {/* Ready / Waiting button */}
          {isHost ? (
            <motion.button
              className="w-full max-w-xs py-4 rounded-xl font-bold tracking-[0.2em] text-lg touch-manipulation"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                background: canStart
                  ? 'linear-gradient(180deg, hsl(var(--casino-red)) 0%, hsl(0 45% 30%) 100%)'
                  : 'linear-gradient(180deg, hsl(0 0% 20%) 0%, hsl(0 0% 12%) 100%)',
                color: canStart ? 'hsl(var(--casino-gold))' : 'hsl(var(--muted-foreground))',
                border: `2px solid ${canStart ? 'hsl(var(--casino-gold) / 0.6)' : 'hsl(0 0% 20%)'}`,
                boxShadow: canStart ? '0 0 30px hsl(var(--casino-red) / 0.3), inset 0 1px 0 hsl(var(--casino-gold) / 0.2)' : 'none',
              }}
              onClick={handleStart}
              disabled={!canStart || starting}
              whileHover={canStart ? { scale: 1.02 } : {}}
              whileTap={canStart ? { scale: 0.98 } : {}}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              {starting ? 'STARTING...' : 'READY?'}
            </motion.button>
          ) : (
            <motion.div
              className="w-full max-w-xs py-4 rounded-xl text-center font-bold tracking-[0.15em]"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                background: 'linear-gradient(180deg, hsl(0 0% 12%) 0%, hsl(0 0% 8%) 100%)',
                color: 'hsl(var(--muted-foreground))',
                border: '2px solid hsl(var(--primary) / 0.2)',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              ⏳ Waiting for host to start...
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MultiplayerLobby;
