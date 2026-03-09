import { motion } from 'framer-motion';

interface ActionButtonsProps {
  chipCount: number;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onBet: () => void;
  onRaise: () => void;
  onAllIn: () => void;
  disabled: boolean;
  callAmount: number;
  canCheck: boolean;
  minRaise: number;
}

const ActionButtons = ({
  chipCount, onFold, onCheck, onCall, onBet, onRaise, onAllIn,
  disabled, callAmount, canCheck, minRaise,
}: ActionButtonsProps) => (
  <motion.div
    className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 sm:gap-3 px-3 py-3 sm:py-4 z-30"
    style={{ background: 'linear-gradient(0deg, hsl(var(--casino-dark)) 60%, transparent)' }}
    initial={{ y: 50, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.5 }}
  >
    <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border-2 border-primary" style={{ background: 'hsl(var(--casino-dark))' }}>
      <span className="text-primary text-lg">💬</span>
    </button>

    <div className="flex flex-col items-center mx-2 sm:mx-4">
      <span className="text-primary font-display text-lg sm:text-2xl font-bold">${chipCount.toLocaleString()}</span>
      <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Chip Count</span>
    </div>

    <button className="casino-btn text-xs sm:text-sm" onClick={onFold} disabled={disabled}>Fold</button>

    {canCheck ? (
      <button className="casino-btn text-xs sm:text-sm" onClick={onCheck} disabled={disabled}>Check</button>
    ) : (
      <button className="casino-btn text-xs sm:text-sm" onClick={onCall} disabled={disabled}>
        Call ${callAmount}
      </button>
    )}

    {canCheck ? (
      <button className="casino-btn-neutral text-xs sm:text-sm" onClick={onBet} disabled={disabled}>
        Bet ${minRaise}
      </button>
    ) : (
      <button className="casino-btn-neutral text-xs sm:text-sm" onClick={onRaise} disabled={disabled}>
        Raise ${minRaise}
      </button>
    )}

    <button className="casino-btn text-xs sm:text-sm" onClick={onAllIn} disabled={disabled}>All-In</button>
  </motion.div>
);

export default ActionButtons;
