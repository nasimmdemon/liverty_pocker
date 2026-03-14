import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { formatChips } from '@/lib/formatChips';
import ChipIcon from './ChipIcon';

export interface WinnerTarget {
  winnerSeatIndex: number;
  winnerPlayerId: number;
  amount: number;
}

interface WinChipAnimationProps {
  winners: WinnerTarget[];
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

const WinChipAnimation = ({ winners, onComplete }: WinChipAnimationProps) => {
  const totalAmount = winners.reduce((s, w) => s + w.amount, 0);
  const totalChipCount = Math.min(MAX_CHIPS, Math.max(MIN_CHIPS, MIN_CHIPS + Math.floor(totalAmount / 100) * CHIPS_PER_100));
  const chipsPerWinner = winners.length > 0 ? Math.max(4, Math.floor(totalChipCount / winners.length)) : 0;
  const maxChipDelay = (totalChipCount - 1) * CHIP_DELAY;
  const unmountAfter = (TOTAL_DURATION + maxChipDelay + 0.1) * 1000;

  useEffect(() => {
    if (winners.length === 0 || totalAmount <= 0) return;
    const t = setTimeout(() => onComplete?.(), unmountAfter);
    return () => clearTimeout(t);
  }, [winners.length, totalAmount, onComplete, unmountAfter]);

  if (winners.length === 0 || totalAmount <= 0) return null;

  const potEl = document.querySelector('[data-pot-display]');
  if (!potEl) return null;

  const potRect = potEl.getBoundingClientRect();
  const fromX = potRect.left + potRect.width / 2 - 20;
  const fromY = potRect.top + potRect.height / 2;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[25] pointer-events-none">
        {winners.map((winner, winnerIdx) => {
          const targetId = winner.winnerPlayerId ?? winner.winnerSeatIndex;
          const seatEl = targetId != null
            ? (document.querySelector(`[data-player-zone="${targetId}"]`) ?? document.querySelector(`[data-seat-index="${targetId}"]`))
            : null;
          if (!seatEl) return null;

          const seatRect = seatEl.getBoundingClientRect();
          const toX = seatRect.left + seatRect.width / 2 - 20;
          const toY = seatRect.top + seatRect.height / 2;

          const chipCount = winnerIdx === winners.length - 1
            ? totalChipCount - chipsPerWinner * (winners.length - 1) // Last winner gets remainder
            : chipsPerWinner;

          return (
            <div key={winner.winnerPlayerId}>
              {Array.from({ length: chipCount }).map((_, i) => (
                <motion.div
                  key={`${winner.winnerPlayerId}-${i}`}
                  className="absolute flex items-center gap-1"
                  initial={{ x: fromX, y: fromY, opacity: 1, scale: 1 }}
                  animate={{
                    x: toX + ((i % 5) - 2) * 25,
                    y: toY + ((i % 3) - 1) * 20,
                    opacity: [1, 1, 0.9, 0],
                    scale: [1, 1.2, 1, 0.8],
                  }}
                  transition={{
                    duration: TOTAL_DURATION,
                    delay: i * CHIP_DELAY,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    times: [0, 0.55, 0.7, 1],
                  }}
                >
                  <ChipIcon size={28} variant="red" />
                </motion.div>
              ))}
              <motion.div
                className="absolute flex items-center gap-1"
                style={{ left: 0, top: 0 }}
                initial={{ x: fromX, y: fromY, opacity: 1, scale: 1.2 }}
                animate={{
                  x: toX,
                  y: toY - 40,
                  opacity: [1, 1, 0.9, 0],
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
                  +${formatChips(winner.amount)}
                </span>
              </motion.div>
            </div>
          );
        })}
      </div>
    </AnimatePresence>
  );
};

export default WinChipAnimation;
