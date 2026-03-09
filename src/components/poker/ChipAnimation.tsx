import { motion, AnimatePresence } from 'framer-motion';
import pokerChip from '@/assets/poker-chip.png';

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
          initial={{ x: bet.fromX, y: bet.fromY, opacity: 1, scale: 0.6 }}
          animate={{
            x: window.innerWidth / 2 - 20,
            y: window.innerHeight * 0.35,
            opacity: [1, 1, 0.8],
            scale: [0.6, 0.8, 0.5],
          }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          onAnimationComplete={() => onComplete?.(bet.id)}
        >
          <img src={pokerChip} alt="" className="w-8 h-8 drop-shadow-lg" />
          <span
            className="text-xs font-bold text-primary drop-shadow-md"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            ${bet.amount}
          </span>
        </motion.div>
      ))}
    </AnimatePresence>
  );
};

export default ChipAnimation;
export type { ChipBet };
