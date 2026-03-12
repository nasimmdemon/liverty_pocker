import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, LogOut, UserPlus } from 'lucide-react';
import PlayButton from './PlayButton';
import { useAuth } from '@/contexts/AuthContext';
import CreateGameModal from '@/components/multiplayer/CreateGameModal';
import JoinGameModal from '@/components/multiplayer/JoinGameModal';
import charactersBg from '@/assets/characters-alt.png';
import pokerRoomBg from '@/assets/poker-room-bg.png';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StartScreenProps {
  onPlay: () => void;
  canInviteFriends?: boolean;
  botMatchesPlayed?: number;
  onMultiplayerCreate?: (room: import('@/lib/multiplayer').GameRoom) => void;
  onMultiplayerJoin?: (gameId: string) => void;
  joinCodeFromUrl?: string | null;
}

const BOT_MATCHES_REQUIRED = 3;

const StartScreen = ({
  onPlay,
  canInviteFriends = false,
  botMatchesPlayed = 0,
  onMultiplayerCreate,
  onMultiplayerJoin,
  joinCodeFromUrl,
}: StartScreenProps) => {
  const { user, signOut } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(!!joinCodeFromUrl);

  const handleInviteClick = () => {
    if (!canInviteFriends) return;
    setShowCreateModal(true);
  };

  const handleJoinClick = () => {
    if (!canInviteFriends) return;
    setShowJoinModal(true);
  };
  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Dark poker room background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${pokerRoomBg})` }}
      />

      {/* Characters overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${charactersBg})`, backgroundPosition: 'center 60%' }}
      />

      {/* Dark gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-start px-4 sm:px-6 py-3 sm:py-5 z-10">
        <h1
          className="text-lg sm:text-2xl md:text-3xl tracking-wider"
          style={{ fontFamily: "'Bebas Neue', 'Cinzel', serif", color: '#F2D27A' }}
        >
          LIBERTY POKER
        </h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <span
            className="text-sm sm:text-base tracking-wider truncate max-w-[120px] sm:max-w-[180px]"
            style={{ fontFamily: "'Bebas Neue', 'Cinzel', serif", color: '#F2D27A' }}
            title={user?.email ?? user?.displayName ?? 'User'}
          >
            {user?.displayName || user?.email?.split('@')[0] || 'Player'}
          </span>
          <span
            className="text-base sm:text-xl md:text-2xl tracking-wider"
            style={{ fontFamily: "'Bebas Neue', 'Cinzel', serif", color: '#F2D27A' }}
          >
            FUNDS: 999$
          </span>
          <button
            onClick={() => signOut()}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#F2D27A' }} />
          </button>
        </div>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8 mt-12 sm:mt-16 px-4">
        <motion.h2
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-[0.15em] sm:tracking-[0.2em] text-center"
          style={{ fontFamily: "'Bebas Neue', 'Cinzel', serif", color: '#F2D27A', textShadow: '0 3px 10px rgba(0,0,0,0.7)' }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          WELCOME TO LIBERTY POKER
        </motion.h2>

        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5, type: 'spring' }}
        >
          <PlayButton onClick={onPlay} />
          <div className="flex flex-col sm:flex-row gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="casino-btn border-primary/50 flex items-center gap-2"
                    onClick={handleInviteClick}
                    disabled={!canInviteFriends}
                  >
                    <Users className="h-4 w-4" />
                    Create Game
                    {!canInviteFriends && (
                      <span className="text-[10px] opacity-80">
                        ({botMatchesPlayed}/{BOT_MATCHES_REQUIRED})
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {canInviteFriends
                    ? 'Create a game and invite friends'
                    : `Play ${BOT_MATCHES_REQUIRED} bot matches to unlock`}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="casino-btn border-primary/50 flex items-center gap-2"
                    onClick={handleJoinClick}
                    disabled={!canInviteFriends}
                  >
                    <UserPlus className="h-4 w-4" />
                    Join Game
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {canInviteFriends
                    ? 'Join a game with invite code'
                    : `Play ${BOT_MATCHES_REQUIRED} bot matches to unlock`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.div>

        <CreateGameModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          hostId={user?.uid ?? ''}
          hostName={user?.displayName || user?.email?.split('@')[0] || 'Player'}
          hostPhotoURL={user?.photoURL ?? null}
          onCreated={(room) => onMultiplayerCreate?.(room)}
        />
        <JoinGameModal
          open={showJoinModal}
          onOpenChange={setShowJoinModal}
          onJoined={(gameId, room) => onMultiplayerJoin?.(gameId, room)}
          initialCode={joinCodeFromUrl ?? undefined}
          currentUserId={user?.uid}
          currentUserName={user?.displayName || user?.email?.split('@')[0]}
          currentUserPhoto={user?.photoURL}
        />
      </div>

      {/* Bottom icons row */}
      <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 flex items-center gap-2 sm:gap-3 z-10">
        {['◁', 'ⓘ', '☺', '⚙', '⇥'].map((icon, i) => (
          <button
            key={i}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-base sm:text-lg opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: '#F2D27A', border: '1px solid rgba(242, 210, 122, 0.3)' }}
          >
            {icon}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default StartScreen;
