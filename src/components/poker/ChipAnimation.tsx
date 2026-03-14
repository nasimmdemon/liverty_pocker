import { motion, AnimatePresence } from 'framer-motion';
import { formatChips } from '@/lib/formatChips';
import ChipIcon from './ChipIcon';

interface ChipBet {
  id: string;
  fromX: number;
  fromY: number;
  amount: number;
}

interface ChipAnimationProps {
  bets: ChipBet[];
  onComplete?: (id: string) => void;
}

/** Chip count scales with amount: ~1 chip per $25, min 1, max 8 */
const getChipCount = (amount: number) =>
  Math.min(8, Math.max(1, Math.ceil(amount / 25)));

const ChipAnimation = ({ bets, onComplete }: ChipAnimationProps) => {
  return (
    <AnimatePresence>
      {bets.map((bet) => {
        const chipCount = getChipCount(bet.amount);
        return (
          <motion.div
            key={bet.id}
            className="fixed z-50 pointer-events-none flex items-center gap-1"
            initial={{ x: bet.fromX, y: bet.fromY, opacity: 1, scale: 1 }}
            animate={{
              x: window.innerWidth / 2 - 20,
              y: window.innerHeight * 0.35,
              opacity: [1, 1, 0.8],
              scale: [1, 1.3, 0.85],
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
            onAnimationComplete={() => onComplete?.(bet.id)}
          >
            <div className="relative flex" style={{ width: 56, height: 56 }}>
              {Array.from({ length: chipCount }).map((_, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: Math.min(i * 4, 12),
                    top: -i * 2,
                    zIndex: chipCount - i,
                  }}
                >
                  <ChipIcon size={chipCount > 1 ? 48 : 56} variant="red" />
                </div>
              ))}
            </div>
            <span
              className="text-xs font-bold text-primary drop-shadow-md"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              ${formatChips(bet.amount)}
            </span>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
};

export default ChipAnimation;
export type { ChipBet };
