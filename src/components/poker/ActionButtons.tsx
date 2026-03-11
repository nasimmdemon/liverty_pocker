import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameChat from './GameChat';
import { Minus, Plus, X } from 'lucide-react';

interface ActionButtonsProps {
  chipCount: number;
  pot: number;
  currentBet: number;
  bigBlind: number;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onBet: (amount: number) => void;
  onRaise: (amount: number) => void;
  onAllIn: () => void;
  onSendMessage: (text: string) => void;
  disabled: boolean;
  callAmount: number;
  canCheck: boolean;
  minRaise: number;
  isMobile?: boolean;
}

const ActionButtons = ({
  chipCount, pot, currentBet, bigBlind, onFold, onCheck, onCall, onBet, onRaise, onAllIn, onSendMessage,
  disabled, callAmount, canCheck, minRaise, isMobile = false,
}: ActionButtonsProps) => {
  const minTotal = canCheck ? minRaise : currentBet + minRaise;
  const [showBetBar, setShowBetBar] = useState(false);
  const [betAmount, setBetAmount] = useState(minTotal);

  useEffect(() => {
    setBetAmount(minTotal);
  }, [minTotal, pot]);

  const handleSet = () => {
    if (disabled) return;
    const amount = Math.min(Math.max(betAmount, minTotal), chipCount);
    if (canCheck) {
      onBet(amount);
    } else {
      onRaise(amount);
    }
    setShowBetBar(false);
    setBetAmount(minTotal);
  };

  const handleBetClick = () => {
    if (disabled) return;
    setBetAmount(minTotal);
    setShowBetBar(true);
  };

  const btnClass = 'casino-btn text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold min-h-[40px] sm:min-h-[44px]';
  const goldBtnClass = 'casino-btn-mobile-gold text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold min-h-[40px] sm:min-h-[44px]';

  return (
    <motion.div
      className={`absolute bottom-0 left-0 right-0 z-30 ${disabled ? 'opacity-75' : ''}`}
      style={{ background: 'linear-gradient(0deg, hsl(var(--casino-dark)) 85%, transparent)' }}
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div className="flex flex-col gap-3 max-w-2xl mx-auto">
          {/* Row 1: Chat, Away, Chips, Fold, Check/Call, Bet, All In */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <GameChat onSendMessage={onSendMessage} isMobile={isMobile} />
            <button
              className="shrink-0 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold border-2 border-primary/50 bg-muted/50 text-muted-foreground uppercase tracking-wider"
              disabled
              title="Away mode"
            >
              Away
            </button>
            <div className="flex flex-col items-center shrink-0 px-2 sm:px-3 py-1.5 rounded-lg bg-background/80 border-2 border-primary/40">
              <span className="text-primary font-display text-sm sm:text-lg font-bold leading-tight">
                ${chipCount.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-[8px] sm:text-[9px] uppercase tracking-wider">Chips</span>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <button className={btnClass} onClick={onFold} disabled={disabled}>
                Fold
              </button>
              {canCheck ? (
                <button className={btnClass} onClick={onCheck} disabled={disabled}>
                  Check
                </button>
              ) : (
                <button className={btnClass} onClick={onCall} disabled={disabled}>
                  Call ${callAmount}
                </button>
              )}
              <button
                className={goldBtnClass}
                onClick={handleBetClick}
                disabled={disabled}
              >
                {canCheck ? 'Bet' : 'Raise'}
              </button>
              <button className={btnClass} onClick={onAllIn} disabled={disabled}>
                All In
              </button>
            </div>
          </div>

          {/* Row 2: Bet amount bar — only when Bet is clicked */}
          <AnimatePresence>
            {showBetBar && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-2 border-t border-primary/20">
                  <div className="flex items-center gap-1 sm:gap-2 border-2 border-primary/40 rounded-xl px-3 py-2 bg-background/80">
                    <button
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border-2 border-primary/50 hover:bg-primary/20 disabled:opacity-50 transition-colors"
                      onClick={() => setBetAmount((a) => Math.max(minTotal, Math.min(a - bigBlind, chipCount)))}
                      disabled={disabled}
                    >
                      <Minus size={16} className="text-primary" />
                    </button>
                    <span className="text-primary font-display font-bold text-sm sm:text-base min-w-[4rem] sm:min-w-[5rem] text-center">
                      ${Math.min(betAmount, chipCount).toLocaleString()}
                    </span>
                    <button
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border-2 border-primary/50 hover:bg-primary/20 disabled:opacity-50 transition-colors"
                      onClick={() => setBetAmount((a) => Math.min(a + bigBlind, chipCount))}
                      disabled={disabled}
                    >
                      <Plus size={16} className="text-primary" />
                    </button>
                  </div>
                  <button
                    className={goldBtnClass}
                    onClick={handleSet}
                    disabled={disabled}
                  >
                    Set
                  </button>
                  <button
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border-2 border-primary/50 hover:bg-primary/20 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowBetBar(false)}
                    title="Cancel"
                  >
                    <X size={18} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default ActionButtons;
