import { motion } from 'framer-motion';

interface ActionButtonsProps {
  chipCount: number;
  onFold: () => void;
  onCheck: () => void;
  onBet: () => void;
  onRaise: () => void;
  onAway: () => void;
  disabled: boolean;
}

const ActionButtons = ({ chipCount, onFold, onCheck, onBet, onRaise, onAway, disabled }: ActionButtonsProps) => (
  <motion.div
    className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 sm:gap-3 px-3 py-3 sm:py-4 z-30"
    style={{ background: 'linear-gradient(0deg, hsl(var(--casino-dark)) 60%, transparent)' }}
    initial={{ y: 50, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.5 }}
  >
    {/* Chat */}
    <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border-2 border-primary" style={{ background: 'hsl(var(--casino-dark))' }}>
      <span className="text-primary text-lg">💬</span>
    </button>

    <button className="casino-btn-neutral text-xs sm:text-sm" onClick={onAway} disabled={disabled}>Away</button>

    <div className="flex flex-col items-center mx-2 sm:mx-4">
      <span className="text-primary font-display text-lg sm:text-2xl font-bold">${chipCount.toLocaleString()}</span>
      <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Chip Count</span>
    </div>

    <button className="casino-btn text-xs sm:text-sm" onClick={onFold} disabled={disabled}>Fold</button>
    <button className="casino-btn text-xs sm:text-sm" onClick={onCheck} disabled={disabled}>Check</button>
    <button className="casino-btn text-xs sm:text-sm" onClick={onBet} disabled={disabled}>Bet</button>
    <button className="casino-btn text-xs sm:text-sm" onClick={onRaise} disabled={disabled}>Raise</button>
  </motion.div>
);

export default ActionButtons;
