import { motion } from 'framer-motion';
import GameChat from './GameChat';

interface ActionButtonsProps {
  chipCount: number;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onBet: () => void;
  onRaise: () => void;
  onAllIn: () => void;
  onSendMessage: (text: string) => void;
  disabled: boolean;
  callAmount: number;
  canCheck: boolean;
  minRaise: number;
  isMobile?: boolean;
}

const ActionButtons = ({
  chipCount, onFold, onCheck, onCall, onBet, onRaise, onAllIn, onSendMessage,
  disabled, callAmount, canCheck, minRaise, isMobile = false,
}: ActionButtonsProps) => (
  <motion.div
    className="absolute bottom-0 left-0 right-0 z-30"
    style={{ background: 'linear-gradient(0deg, hsl(var(--casino-dark)) 85%, transparent)' }}
    initial={{ y: 50, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.5 }}
  >
    <div className={`px-3 sm:px-4 ${isMobile ? 'py-4' : 'py-3 sm:py-4'}`}>
      {isMobile ? (
        /* Mobile: clean 2-row layout with larger tap targets */
        <div className="flex flex-col gap-4 max-w-md mx-auto">
          <div className="flex items-center justify-between gap-3">
            <GameChat onSendMessage={onSendMessage} isMobile />
            <div className="flex flex-col items-center shrink-0 px-4 py-2 rounded-xl bg-background/80 border-2 border-primary/40 shadow-lg">
              <span className="text-primary font-display text-xl font-bold leading-tight">
                ${chipCount.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Chips</span>
            </div>
            <div className="flex gap-2 flex-1 justify-end min-w-0">
              <button className="casino-btn-mobile flex-1 min-w-0" onClick={onFold} disabled={disabled}>
                Fold
              </button>
              {canCheck ? (
                <button className="casino-btn-mobile flex-1 min-w-0" onClick={onCheck} disabled={disabled}>
                  Check
                </button>
              ) : (
                <button className="casino-btn-mobile flex-1 min-w-0" onClick={onCall} disabled={disabled}>
                  Call ${callAmount}
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {canCheck ? (
              <button className="casino-btn-mobile-gold col-span-1" onClick={onBet} disabled={disabled}>
                Bet ${minRaise}
              </button>
            ) : (
              <button className="casino-btn-mobile-gold col-span-1" onClick={onRaise} disabled={disabled}>
                Raise ${minRaise}
              </button>
            )}
            <button className="casino-btn-mobile col-span-1" onClick={onAllIn} disabled={disabled}>
              All-In
            </button>
          </div>
        </div>
      ) : (
        /* Desktop: single row */
        <div className="flex items-center justify-center gap-2 lg:gap-3">
          <GameChat onSendMessage={onSendMessage} isMobile={false} />
          <div className="flex flex-col items-center shrink-0 mx-1 sm:mx-2">
            <span className="text-primary font-display text-sm sm:text-lg lg:text-xl font-bold leading-tight">
              ${chipCount.toLocaleString()}
            </span>
            <span className="text-muted-foreground text-[7px] sm:text-[9px] uppercase tracking-wider">Chips</span>
          </div>
          <button className="casino-btn text-xs sm:text-sm" onClick={onFold} disabled={disabled}>Fold</button>
          {canCheck ? (
            <button className="casino-btn text-xs sm:text-sm" onClick={onCheck} disabled={disabled}>Check</button>
          ) : (
            <button className="casino-btn text-xs sm:text-sm" onClick={onCall} disabled={disabled}>Call ${callAmount}</button>
          )}
          {canCheck ? (
            <button className="casino-btn-neutral text-xs sm:text-sm" onClick={onBet} disabled={disabled}>Bet ${minRaise}</button>
          ) : (
            <button className="casino-btn-neutral text-xs sm:text-sm" onClick={onRaise} disabled={disabled}>Raise ${minRaise}</button>
          )}
          <button className="casino-btn text-xs sm:text-sm" onClick={onAllIn} disabled={disabled}>All-In</button>
        </div>
      )}
    </div>
  </motion.div>
);

export default ActionButtons;
