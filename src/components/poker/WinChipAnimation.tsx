import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import ChipIcon from './ChipIcon';

interface WinChipAnimationProps {
  winnerSeatIndex: number | null;
  amount: number;
  onComplete?: () => void;
}

const CHIP_COUNT = 12;

const FLY_DURATION = 1.2;
const FADE_START = 1.5; // Start fading after chips arrive
const FADE_DURATION = 0.6; // Fade out duration
const TOTAL_DURATION = FADE_START + FADE_DURATION; // ~2.1s
const MAX_CHIP_DELAY = (CHIP_COUNT - 1) * 0.06; // Last chip delay
const UNMOUNT_AFTER = (TOTAL_DURATION + MAX_CHIP_DELAY + 0.1) * 1000; // ms

const WinChipAnimation = ({ winnerSeatIndex, amount, onComplete }: WinChipAnimationProps) => {
  useEffect(() => {
    if (winnerSeatIndex === null || amount <= 0) return;
    const t = setTimeout(() => onComplete?.(), UNMOUNT_AFTER);
    return () => clearTimeout(t);
  }, [winnerSeatIndex, amount, onComplete]);

  if (winnerSeatIndex === null || amount <= 0) return null;

  const potEl = document.querySelector('[data-pot-display]');
  const seatEl = document.querySelector(`[data-seat-index="${winnerSeatIndex}"]`);
  if (!potEl || !seatEl) return null;

  const potRect = potEl.getBoundingClientRect();
  const seatRect = seatEl.getBoundingClientRect();
  const fromX = potRect.left + potRect.width / 2 - 20;
  const fromY = potRect.top + potRect.height / 2;
  const toX = seatRect.left + seatRect.width / 2 - 20;
  const toY = seatRect.top + seatRect.height / 2;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[5] pointer-events-none">
        {Array.from({ length: CHIP_COUNT }).map((_, i) => (
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
              delay: i * 0.06,
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
