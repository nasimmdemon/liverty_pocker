import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import ChipIcon from './ChipIcon';

interface WinChipAnimationProps {
  winnerSeatIndex: number | null;
  amount: number;
  onComplete?: () => void;
}

const CHIP_COUNT = 12;

const WinChipAnimation = ({ winnerSeatIndex, amount, onComplete }: WinChipAnimationProps) => {
  useEffect(() => {
    if (winnerSeatIndex === null || amount <= 0) return;
    const t = setTimeout(() => onComplete?.(), 2500);
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
              opacity: [1, 1, 0.9],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1.2,
              delay: i * 0.06,
              ease: [0.25, 0.46, 0.45, 0.94],
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
            opacity: [1, 1, 0],
            scale: [1.2, 1.5, 1.8],
          }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
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
