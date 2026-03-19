import { motion, AnimatePresence } from 'framer-motion';
import { calculateRake, type RakeBreakdown } from '@/lib/rake';
import { formatChips } from '@/lib/formatChips';

interface PotDisplayProps {
  pot: number;
  rakeAmount?: number;
  smallBlind?: number;
  bigBlind?: number;
  rakeBreakdown?: RakeBreakdown | null;
  showdown?: boolean;
  isCompact?: boolean;
}

const PotDisplay = ({ pot, rakeAmount = 0, smallBlind, bigBlind, rakeBreakdown, showdown, isCompact = false }: PotDisplayProps) => {
  const liveRake = pot > 0 ? calculateRake(pot) : null;
  const showBreakdown = showdown && rakeBreakdown && rakeBreakdown.totalRake > 0;

  return (
    <motion.div
      className={`flex flex-col items-center justify-center rounded-xl ${isCompact ? 'px-2 py-1' : 'px-4 py-1.5 sm:py-2'} border border-primary/40`}
      style={{
        background: 'linear-gradient(180deg, hsl(120 22% 14% / 0.8) 0%, hsl(120 20% 10% / 0.9) 100%)',
        boxShadow: 'inset 0 0 16px rgba(0,0,0,0.3), 0 0 12px hsl(var(--casino-gold) / 0.15)',
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Blinds row */}
      {smallBlind != null && bigBlind != null && (
        <div className="flex gap-2 mb-0.5">
          <span className="text-muted-foreground text-[8px] sm:text-[9px] bg-muted/40 px-1.5 py-0.5 rounded">
            SB: ${formatChips(smallBlind)}
          </span>
          <span className="text-muted-foreground text-[8px] sm:text-[9px] bg-muted/40 px-1.5 py-0.5 rounded">
            BB: ${formatChips(bigBlind)}
          </span>
        </div>
      )}

      <span className="text-primary font-display text-sm sm:text-base lg:text-xl font-bold drop-shadow-lg tracking-wider">
        ${formatChips(pot)}
      </span>
      <span className="text-muted-foreground text-[9px] sm:text-[10px] uppercase tracking-widest">Pot</span>

      {/* Rake line */}
      {rakeAmount > 0 && !showBreakdown ? (
        <span className="text-destructive text-[8px] sm:text-[9px] uppercase tracking-wider mt-0.5">
          Rake: ${formatChips(rakeAmount)} (5%)
        </span>
      ) : !showBreakdown && liveRake && pot > 0 ? (
        <span className="text-muted-foreground/60 text-[7px] sm:text-[8px] uppercase tracking-wider mt-0.5">
          Est. rake: ${formatChips(liveRake.totalRake)}
        </span>
      ) : null}

      {/* Animated rake breakdown on showdown */}
      <AnimatePresence>
        {showBreakdown && rakeBreakdown && (
          <motion.div
            className="flex flex-col items-center gap-0.5 mt-1 pt-1 border-t border-primary/20 w-full"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <span className="text-destructive text-[8px] sm:text-[9px] uppercase tracking-wider font-bold">
              Rake: ${formatChips(rakeBreakdown.totalRake)}
            </span>
            <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5">
              {rakeBreakdown.affiliateShare > 0 && (
                <motion.span
                  className="text-[7px] sm:text-[8px] text-blue-400 uppercase tracking-wider"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  🤝 Affiliate: ${formatChips(rakeBreakdown.affiliateShare)}
                </motion.span>
              )}
              {rakeBreakdown.hosterShare > 0 && (
                <motion.span
                  className="text-[7px] sm:text-[8px] text-green-400 uppercase tracking-wider"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                >
                  👑 Host: ${formatChips(rakeBreakdown.hosterShare)}
                </motion.span>
              )}
              {rakeBreakdown.inviterShare > 0 && (
                <motion.span
                  className="text-[7px] sm:text-[8px] text-purple-400 uppercase tracking-wider"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  📨 Inviter: ${formatChips(rakeBreakdown.inviterShare)}
                </motion.span>
              )}
              <motion.span
                className="text-[7px] sm:text-[8px] text-muted-foreground uppercase tracking-wider"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.95 }}
              >
                🏠 House: ${formatChips(rakeBreakdown.houseRevenue)}
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PotDisplay;
