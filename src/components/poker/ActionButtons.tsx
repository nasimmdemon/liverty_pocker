import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

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
  isMobile?: boolean;
}

const ActionButtons = ({
  chipCount, onFold, onCheck, onCall, onBet, onRaise, onAllIn,
  disabled, callAmount, canCheck, minRaise, isMobile = false,
}: ActionButtonsProps) => (
  <motion.div
    className="absolute bottom-0 left-0 right-0 z-30"
    style={{ background: 'linear-gradient(0deg, hsl(var(--casino-dark)) 70%, transparent)' }}
    initial={{ y: 50, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.5 }}
  >
    <div className={`flex items-center justify-center gap-1.5 sm:gap-2 lg:gap-3 px-2 sm:px-3 ${isMobile ? 'py-2' : 'py-3 sm:py-4'}`}>
      {/* Chat icon */}
      <button
        className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border-2 border-primary"
        style={{ background: 'hsl(var(--casino-dark))' }}
      >
        <MessageCircle size={isMobile ? 14 : 16} className="text-primary" />
      </button>

      {/* Chip count */}
      <div className="flex flex-col items-center shrink-0 mx-1 sm:mx-2">
        <span className="text-primary font-display text-sm sm:text-lg lg:text-xl font-bold leading-tight">
          ${chipCount.toLocaleString()}
        </span>
        <span className="text-muted-foreground text-[7px] sm:text-[9px] uppercase tracking-wider">Chips</span>
      </div>

      {/* Action buttons */}
      <button
        className={`casino-btn ${isMobile ? 'text-[10px] px-3 py-2' : 'text-xs sm:text-sm'}`}
        onClick={onFold}
        disabled={disabled}
      >
        Fold
      </button>

      {canCheck ? (
        <button
          className={`casino-btn ${isMobile ? 'text-[10px] px-3 py-2' : 'text-xs sm:text-sm'}`}
          onClick={onCheck}
          disabled={disabled}
        >
          Check
        </button>
      ) : (
        <button
          className={`casino-btn ${isMobile ? 'text-[10px] px-3 py-2' : 'text-xs sm:text-sm'}`}
          onClick={onCall}
          disabled={disabled}
        >
          Call ${callAmount}
        </button>
      )}

      {canCheck ? (
        <button
          className={`casino-btn-neutral ${isMobile ? 'text-[10px] px-3 py-2' : 'text-xs sm:text-sm'}`}
          onClick={onBet}
          disabled={disabled}
        >
          Bet ${minRaise}
        </button>
      ) : (
        <button
          className={`casino-btn-neutral ${isMobile ? 'text-[10px] px-3 py-2' : 'text-xs sm:text-sm'}`}
          onClick={onRaise}
          disabled={disabled}
        >
          Raise ${minRaise}
        </button>
      )}

      <button
        className={`casino-btn ${isMobile ? 'text-[10px] px-3 py-2' : 'text-xs sm:text-sm'}`}
        onClick={onAllIn}
        disabled={disabled}
      >
        All-In
      </button>
    </div>
  </motion.div>
);

export default ActionButtons;
