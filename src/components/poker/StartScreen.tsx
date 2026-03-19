import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LogOut, UserPlus, User, Tv } from 'lucide-react';
import PlayButton from './PlayButton';
import { formatFunds } from '@/lib/formatChips';
import { useAuth } from '@/contexts/AuthContext';
import charactersBg from '@/assets/characters-alt.png';
import pokerRoomBg from '@/assets/poker-room-bg.png';

interface StartScreenProps {
  onPlay: () => void;
  onWatchAndEarn?: () => void;
  funds?: number;
}

const StartScreen = ({ onPlay, onWatchAndEarn, funds = 0 }: StartScreenProps) => {
  const { user, signOut } = useAuth();
  return (
    <motion.div
      className="start-screen fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
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

      {/* Top bar — game name left, profile/name/funds/logout right */}
      <div className="start-nav absolute top-0 left-0 right-0 flex justify-between items-center gap-2 px-4 sm:px-6 py-3 sm:py-5 z-10 min-w-0">
        <h1
          className="start-nav-title text-lg sm:text-2xl md:text-3xl tracking-wider shrink-0"
          style={{ fontFamily: "'Bebas Neue', 'Cinzel', serif", color: '#F2D27A' }}
        >
          LIBERTY POKER
        </h1>
        <div className="start-nav-actions flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          <Link
            to="/profile"
            className="start-nav-profile flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors touch-manipulation min-h-[40px] shrink-0"
            title="Profile"
          >
            <User className="h-5 w-5 shrink-0 sm:h-5 sm:w-5" style={{ color: '#F2D27A' }} />
            <span className="start-nav-profile-text hidden sm:inline text-sm tracking-wider" style={{ fontFamily: "'Bebas Neue', 'Cinzel', serif", color: '#F2D27A' }}>
              PROFILE
            </span>
          </Link>
          <span
            className="start-nav-username text-sm sm:text-base tracking-wider truncate max-w-[80px] sm:max-w-[120px] md:max-w-[180px]"
            style={{ fontFamily: "'Bebas Neue', 'Cinzel', serif", color: '#F2D27A' }}
            title={user?.email ?? user?.displayName ?? 'User'}
          >
            {user?.displayName || user?.email?.split('@')[0] || 'Player'}
          </span>
          <span
            className="start-nav-funds text-base sm:text-xl md:text-2xl tracking-wider whitespace-nowrap shrink-0"
            style={{ fontFamily: "'Bebas Neue', 'Cinzel', serif", color: '#F2D27A' }}
          >
            FUNDS: ${formatFunds(funds)}
          </span>
          <button
            onClick={() => signOut()}
            className="start-nav-logout p-2 rounded-lg hover:bg-white/10 transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" style={{ color: '#F2D27A' }} />
          </button>
        </div>
      </div>

      {/* Center content */}
      <div className="start-content relative z-10 flex flex-col items-center gap-3 sm:gap-6 md:gap-8 mt-8 sm:mt-12 md:mt-16 px-4">
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
          className="start-buttons flex flex-col items-center gap-2 sm:gap-4"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5, type: 'spring' }}
        >
          <PlayButton onClick={onPlay} />
          {onWatchAndEarn && (
            <motion.button
              onClick={onWatchAndEarn}
              className="watch-earn-btn flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                fontFamily: "'Bebas Neue', 'Cinzel', serif",
                color: '#F2D27A',
                borderColor: '#F2D27A',
                background: 'rgba(0,0,0,0.3)',
                fontSize: '1.1rem',
                letterSpacing: '0.12em',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Tv className="h-5 w-5 sm:h-6 sm:w-6" />
              WATCH & EARN
            </motion.button>
          )}
          <Link
            to="/refer"
            className="secondary-btn flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              fontFamily: "'Bebas Neue', 'Cinzel', serif",
              color: '#F2D27A',
              borderColor: '#F2D27A',
              background: 'rgba(0,0,0,0.3)',
              fontSize: '1.25rem',
              letterSpacing: '0.15em',
            }}
          >
            <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
            INVITE FRIEND
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default StartScreen;
