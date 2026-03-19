import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const REWARD_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
const REWARD_AMOUNT = '$0.30';

const CHECKLIST = [
  'Play instantly — no deposit',
  'Game starts in 45s',
  'Real winnings, zero cost',
  'No credit card',
] as const;

const INSTRUCTION_TEXT =
  'INSTRUCTION: WATCH THE FULL VIDEO TO EARN YOUR REWARD. ONCE THE VIDEO ENDS, THE REWARD WILL BE AUTOMATICALLY ADDED TO YOUR ACCOUNT.';

interface WatchAndEarnScreenProps {
  onClaim: () => void;
  onBack: () => void;
}

const WatchAndEarnScreen = ({ onClaim, onBack }: WatchAndEarnScreenProps) => {
  const { user } = useAuth();
  const emailDisplay = (user?.email ?? user?.displayName ?? '—').toUpperCase();

  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const popupVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!showVideoPopup || !popupVideoRef.current) return;
    const v = popupVideoRef.current;
    v.currentTime = 0;
    v.play().catch(() => {});
  }, [showVideoPopup]);

  const openVideoPopup = useCallback(() => {
    if (hasCompleted) return;
    setShowVideoPopup(true);
  }, [hasCompleted]);

  const closeVideoPopup = useCallback(() => {
    popupVideoRef.current?.pause();
    setShowVideoPopup(false);
  }, []);

  const handleVideoEnded = useCallback(() => {
    setShowVideoPopup(false);
    setHasCompleted(true);
    setShowReward(true);
  }, []);

  const handleClaim = useCallback(() => {
    setShowReward(false);
    onClaim();
  }, [onClaim]);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background — vault theme */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/bg.jpg)' }}
      />
      <div className="absolute inset-0 bg-black/40" />

      {/* Flying coins — decorative edges */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[28%] min-w-[100px] max-w-[180px] bg-contain bg-left bg-no-repeat opacity-90 z-10 pointer-events-none"
        style={{ backgroundImage: 'url(/flying_coins_left.png)' }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-[28%] min-w-[100px] max-w-[180px] bg-contain bg-right bg-no-repeat opacity-90 z-10 pointer-events-none"
        style={{ backgroundImage: 'url(/flying_coins_right.png)' }}
      />

      {/* Top bar */}
      <div className="relative z-20 flex justify-between items-center px-4 sm:px-6 py-4">
        <span
          className="text-[11px] sm:text-xs font-semibold tracking-[0.25em] uppercase text-white"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          LIBERTY POKER
        </span>
        <motion.button
          onClick={onBack}
          className="px-4 py-2 rounded-lg border border-[#F2D27A]/60 text-[#F2D27A] text-xs font-medium tracking-wider hover:bg-white/5 transition-colors"
          style={{ fontFamily: "'Inter', sans-serif" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          ← BACK
        </motion.button>
      </div>

      {/* Main content */}
      <div className="relative z-20 flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Headlines */}
        <div className="text-center px-4 pt-1 pb-4 sm:pb-6">
          <h2
            className="text-xl sm:text-2xl md:text-3xl lg:text-[2.2rem] font-bold tracking-[0.06em] uppercase"
            style={{
              fontFamily: "'Cinzel', serif",
              color: '#F2D27A',
              textShadow: '0 0 20px rgba(242, 210, 122, 0.4), 0 2px 6px rgba(0,0,0,0.6)',
            }}
          >
            WATCH & EARN {REWARD_AMOUNT} CASH REWARD
          </h2>
          <p
            className="mt-1.5 text-sm sm:text-base font-semibold tracking-[0.12em] uppercase"
            style={{ fontFamily: "'Inter', sans-serif", color: '#F2D27A' }}
          >
            PLAY FIRST GAME FOR FREE!
          </p>
        </div>

        {/* Two-column layout: features left | TV right */}
        <div className="flex flex-col md:flex-row items-center md:items-center justify-center gap-6 md:gap-16 lg:gap-24 px-6 sm:px-10 pb-6 max-w-6xl mx-auto w-full flex-1">
          {/* Features checklist — left */}
          <div
            className="w-full max-w-[300px] md:max-w-[280px] rounded-2xl p-6 shrink-0"
            style={{
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(242, 210, 122, 0.35)',
              boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
            }}
          >
            <ul className="space-y-5">
              {CHECKLIST.map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px]"
                    style={{ borderColor: '#F2D27A', color: '#F2D27A' }}
                  >
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                  <span
                    className="text-[13px] sm:text-sm leading-snug text-white/95"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* TV + email + instruction — right */}
          <div className="flex flex-col items-center w-full max-w-[340px] sm:max-w-[380px]">
            {/* TV */}
            <button
              type="button"
              onClick={openVideoPopup}
              disabled={hasCompleted}
              className={`relative w-full aspect-[4/3] max-h-[260px] bg-transparent border-0 p-0 ${
                hasCompleted ? 'cursor-default opacity-50' : 'cursor-pointer'
              }`}
              aria-label="Tap the TV to watch and earn"
            >
              <div
                className="absolute inset-0 bg-contain bg-center bg-no-repeat transition-opacity hover:opacity-95"
                style={{ backgroundImage: 'url(/video_player_tv.png)' }}
              />
            </button>

            {/* Email */}
            <p
              className="mt-8 text-center text-sm sm:text-base font-bold tracking-[0.08em] uppercase break-all px-2"
              style={{ fontFamily: "'Inter', sans-serif", color: '#F2D27A' }}
            >
              EMAIL: {emailDisplay}
            </p>

            {/* Instruction */}
            <p
              className="mt-3 text-center text-[10px] sm:text-[11px] leading-relaxed tracking-wide uppercase max-w-[320px] sm:max-w-[360px] px-2"
              style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(242, 210, 122, 0.85)' }}
            >
              {INSTRUCTION_TEXT}
            </p>
          </div>
        </div>
      </div>

      {/* Video popup */}
      <AnimatePresence>
        {showVideoPopup && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/95 px-4 py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && closeVideoPopup()}
          >
            <motion.div
              className="relative w-full max-w-[min(94vw,1000px)] rounded-xl overflow-hidden border-2 border-[#F2D27A]/50 shadow-[0_0_50px_rgba(242,210,122,0.2)]"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeVideoPopup}
                className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/80 border border-[#F2D27A]/40 flex items-center justify-center text-[#F2D27A] hover:bg-black transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <p
                className="absolute top-3 left-3 z-20 text-xs font-medium tracking-wider text-[#F2D27A] pr-12"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Watch to the end to earn {REWARD_AMOUNT}
              </p>
              <div className="aspect-video w-full bg-black">
                <video
                  ref={popupVideoRef}
                  src={REWARD_VIDEO_URL}
                  className="w-full h-full object-contain"
                  playsInline
                  controls={false}
                  onEnded={handleVideoEnded}
                />
              </div>
            </motion.div>
            <p className="mt-4 text-center text-xs text-white/60 max-w-sm">
              Close early and you won’t receive the reward.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reward overlay */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="max-w-sm w-full rounded-2xl overflow-hidden border-2 border-[#F2D27A]/60"
              style={{
                background: 'linear-gradient(180deg, rgba(30,26,20,0.98) 0%, rgba(18,15,12,0.98) 100%)',
              }}
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            >
              <div className="p-8 text-center">
                <span className="text-5xl">🎉</span>
                <h3
                  className="mt-4 text-2xl font-bold tracking-wider uppercase"
                  style={{ fontFamily: "'Cinzel', serif", color: '#F2D27A' }}
                >
                  CONGRATULATIONS!
                </h3>
                <p className="mt-2 text-sm text-white/70">You earned</p>
                <p
                  className="mt-1 text-3xl font-bold tracking-wider"
                  style={{ fontFamily: "'Inter', sans-serif", color: '#F2D27A' }}
                >
                  {REWARD_AMOUNT}
                </p>
                <p className="mt-4 text-xs text-white/60">
                  Your reward has been added. Play your first game for free!
                </p>
                <motion.button
                  className="mt-6 w-full py-4 rounded-xl font-bold text-base tracking-wider border-2 transition-colors"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    background: 'linear-gradient(180deg, #C0392B 0%, #8B1A1A 100%)',
                    color: '#F2D27A',
                    borderColor: '#F2D27A',
                  }}
                  onClick={handleClaim}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  CLAIM & PLAY
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WatchAndEarnScreen;
