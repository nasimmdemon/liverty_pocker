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

const ChipAnimation = ({ bets, onComplete }: ChipAnimationProps) => {
  return (
    <AnimatePresence>
      {bets.map((bet) => (
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
          <ChipIcon size={56} />
          <span
            className="text-xs font-bold text-primary drop-shadow-md"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            ${formatChips(bet.amount)}
          </span>
        </motion.div>
      ))}
    </AnimatePresence>
  );
};

export default ChipAnimation;
export type { ChipBet };
