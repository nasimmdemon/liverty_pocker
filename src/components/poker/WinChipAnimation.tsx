import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import ChipIcon from './ChipIcon';

interface WinChipAnimationProps {
  winnerSeatIndex: number | null;
  winnerPlayerId?: number | null; // Use player id for reliable DOM lookup (data-player-zone)
  amount: number;
  onComplete?: () => void;
}

const MIN_CHIPS = 12;
const MAX_CHIPS = 36;
const CHIPS_PER_100 = 1; // +1 chip per $100 won

const FLY_DURATION = 1.2;
const FADE_START = 1.5; // Start fading after chips arrive
const FADE_DURATION = 0.6; // Fade out duration
const TOTAL_DURATION = FADE_START + FADE_DURATION; // ~2.1s
const CHIP_DELAY = 0.05; // Delay between each chip

const WinChipAnimation = ({ winnerSeatIndex, winnerPlayerId, amount, onComplete }: WinChipAnimationProps) => {
  const chipCount = Math.min(MAX_CHIPS, Math.max(MIN_CHIPS, MIN_CHIPS + Math.floor(amount / 100) * CHIPS_PER_100));
  const maxChipDelay = (chipCount - 1) * CHIP_DELAY;
  const unmountAfter = (TOTAL_DURATION + maxChipDelay + 0.1) * 1000;

  useEffect(() => {
    if ((winnerSeatIndex === null && winnerPlayerId == null) || amount <= 0) return;
    const t = setTimeout(() => onComplete?.(), unmountAfter);
    return () => clearTimeout(t);
  }, [winnerSeatIndex, winnerPlayerId, amount, onComplete, unmountAfter]);

  if ((winnerSeatIndex === null && winnerPlayerId == null) || amount <= 0) return null;

  const potEl = document.querySelector('[data-pot-display]');
  // Use data-player-zone (unique per player) for reliable targeting - avoids wrong element on mobile
  const targetId = winnerPlayerId ?? winnerSeatIndex;
  const seatEl = targetId != null
    ? (document.querySelector(`[data-player-zone="${targetId}"]`) ?? document.querySelector(`[data-seat-index="${targetId}"]`))
    : null;
  if (!potEl || !seatEl) return null;

  const potRect = potEl.getBoundingClientRect();
  const seatRect = seatEl.getBoundingClientRect();
  const fromX = potRect.left + potRect.width / 2 - 20;
  const fromY = potRect.top + potRect.height / 2;
  const toX = seatRect.left + seatRect.width / 2 - 20;
  const toY = seatRect.top + seatRect.height / 2;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[25] pointer-events-none">
        {Array.from({ length: chipCount }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute flex items-center gap-1"
            initial={{ x: fromX, y: fromY, opacity: 1, scale: 1 }}
            animate={{
              x: toX + ((i % 5) - 2) * 25,
              y: toY + ((i % 3) - 1) * 20,
              opacity: [1, 1, 0.9, 0], // Fade out at end — no chips left behind
              scale: [1, 1.2, 1, 0.8],
            }}
            transition={{
              duration: TOTAL_DURATION,
              delay: i * CHIP_DELAY,
              ease: [0.25, 0.46, 0.45, 0.94],
              times: [0, 0.55, 0.7, 1], // opacity: 1 until 70%, then fade to 0
            }}
          >
            <ChipIcon size={28} />
          </motion.div>
        ))}
        <motion.div
          className="absolute flex items-center gap-1"
          style={{ left: 0, top: 0 }}
          initial={{ x: fromX, y: fromY, opacity: 1, scale: 1.2 }}
          animate={{
            x: toX,
            y: toY - 40,
            opacity: [1, 1, 0.9, 0], // Fade out — no permanent text
            scale: [1.2, 1.5, 1.8, 2],
          }}
          transition={{
            duration: TOTAL_DURATION,
            ease: 'easeOut',
            times: [0, 0.6, 0.75, 1],
          }}
        >
          <span
            className="text-lg font-bold text-primary drop-shadow-lg"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            +${amount.toLocaleString()}
          </span>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WinChipAnimation;
