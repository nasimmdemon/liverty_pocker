import { motion, AnimatePresence } from 'framer-motion';
import { calculateRake, type RakeBreakdown } from '@/lib/rake';
import { formatChips } from '@/lib/formatChips';
import type { Player } from '@/lib/gameTypes';

interface PotDisplayProps {
  pot: number;
  rakeAmount?: number;
  smallBlind?: number;
  bigBlind?: number;
  rakeBreakdown?: RakeBreakdown | null;
  showdown?: boolean;
  isCompact?: boolean;
  isLandscape?: boolean;
  /** Dynamic Island expansion: winner info when showdown */
  winnerHandDescription?: string;
  winnerId?: number | null;
  winnerIds?: number[];
  players?: Player[];
}

const PotDisplay = ({
  pot, rakeAmount = 0, smallBlind, bigBlind, rakeBreakdown, showdown, isCompact = false, isLandscape = false,
  winnerHandDescription, winnerId, winnerIds, players = [],
}: PotDisplayProps) => {
  const liveRake = pot > 0 ? calculateRake(pot) : null;
  const showBreakdown = showdown && rakeBreakdown && rakeBreakdown.totalRake > 0;
  const isExpanded = !!(showdown && (winnerId != null || (winnerIds?.length ?? 0) > 0));
  const isLandscapeMobile = isLandscape && isCompact;

  const winnerNames = (winnerIds?.length ? winnerIds : winnerId != null ? [winnerId] : [])
    .map(id => players.find(p => p.id === id)?.name ?? 'Winner')
    .join(', ');

  // Landscape/horizontal bar — Dynamic Island: expands on win to show winner + rake
  if (isLandscape) {
    return (
      <motion.div
        layout
        className={`flex flex-row items-center justify-center border border-primary/40 overflow-hidden transition-shadow duration-300 ${isLandscapeMobile ? `rounded-lg min-w-[140px] ${isExpanded ? 'px-2.5 py-1.5 max-w-[min(88vw,400px)]' : 'px-2.5 py-1'}` : `rounded-2xl min-w-[200px] ${isExpanded ? 'px-5 py-2.5 sm:px-6 sm:py-3 max-w-[min(92vw,640px)]' : `px-4 py-1.5 sm:px-5 sm:py-2 ${!isCompact ? 'sm:px-6' : ''}`}`}`}
        style={{
          background: 'linear-gradient(180deg, hsl(120 22% 14% / 0.92) 0%, hsl(120 20% 10% / 0.96) 100%)',
          boxShadow: isExpanded ? 'inset 0 0 20px rgba(0,0,0,0.3), 0 0 24px hsl(var(--casino-gold) / 0.25)' : 'inset 0 0 16px rgba(0,0,0,0.3), 0 0 12px hsl(var(--casino-gold) / 0.15)',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ layout: { type: 'spring', stiffness: 260, damping: 24 } }}
      >
        {isExpanded ? (
          <motion.div
            layout
            className={`flex items-center justify-center w-full ${isLandscapeMobile ? 'flex-row gap-1.5' : 'flex-col sm:flex-row gap-2 sm:gap-4'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.25 }}
          >
            <div className={`flex items-center min-w-0 shrink ${isLandscapeMobile ? 'gap-1' : 'gap-2 sm:gap-3'}`}>
              <motion.span
                className={`shrink-0 ${isLandscapeMobile ? 'text-base' : 'text-2xl sm:text-3xl'}`}
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                🏆
              </motion.span>
              <div className="flex flex-col items-start min-w-0">
                <p
                  className={`text-primary font-bold leading-tight tracking-wide truncate max-w-full ${isLandscapeMobile ? 'text-[10px]' : 'text-sm sm:text-base'}`}
                  style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
                >
                  {winnerHandDescription ?? 'Winner'}
                </p>
                <span className={`text-muted-foreground ${isLandscapeMobile ? 'text-[8px]' : 'text-[10px] sm:text-xs'}`} style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {winnerNames}
                  {rakeBreakdown && (
                    <span className={isLandscapeMobile ? 'ml-1 text-primary' : 'ml-1.5 text-primary'}>· ${formatChips(rakeBreakdown.netPot)}</span>
                  )}
                </span>
              </div>
            </div>
            {showBreakdown && rakeBreakdown && (
              <motion.div
                layout
                className={`flex flex-wrap items-center justify-center border-primary/20 ${isLandscapeMobile ? 'gap-x-1.5 gap-y-0 border-l pl-1.5' : 'gap-x-3 gap-y-1 sm:gap-x-4 border-t sm:border-t-0 sm:border-l pt-2 sm:pt-0 sm:pl-4'}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.2 }}
              >
                <span className={`text-destructive font-bold uppercase ${isLandscapeMobile ? 'text-[7px]' : 'text-[9px] sm:text-[10px]'}`}>Rake: ${formatChips(rakeBreakdown.totalRake)}</span>
                {rakeBreakdown.affiliateShare > 0 && (
                  <span className={isLandscapeMobile ? 'text-[6px] text-blue-400' : 'text-[8px] sm:text-[9px] text-blue-400'}>🤝 ${formatChips(rakeBreakdown.affiliateShare)}</span>
                )}
                {rakeBreakdown.hosterShare > 0 && (
                  <span className={isLandscapeMobile ? 'text-[6px] text-green-400' : 'text-[8px] sm:text-[9px] text-green-400'}>👑 ${formatChips(rakeBreakdown.hosterShare)}</span>
                )}
                {rakeBreakdown.inviterShare > 0 && (
                  <span className={isLandscapeMobile ? 'text-[6px] text-purple-400' : 'text-[8px] sm:text-[9px] text-purple-400'}>📨 ${formatChips(rakeBreakdown.inviterShare)}</span>
                )}
                <span className={isLandscapeMobile ? 'text-[6px] text-muted-foreground' : 'text-[8px] sm:text-[9px] text-muted-foreground'}>🏠 ${formatChips(rakeBreakdown.houseRevenue)}</span>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <div className={`flex flex-row items-center ${isLandscapeMobile ? 'gap-1.5' : `gap-3 sm:gap-5 ${!isCompact ? 'sm:gap-5' : ''}`}`}>
            {smallBlind != null && bigBlind != null && (
              <span className={`text-muted-foreground whitespace-nowrap ${isLandscapeMobile ? 'text-[7px]' : isCompact ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>
                SB: ${formatChips(smallBlind)} BB: ${formatChips(bigBlind)}
              </span>
            )}
            <span className={`text-primary font-display font-bold drop-shadow-lg ${isLandscapeMobile ? 'text-xs' : isCompact ? 'text-sm' : 'text-base sm:text-lg'}`}>${formatChips(pot)}</span>
            <span className={`text-muted-foreground uppercase ${isLandscapeMobile ? 'text-[7px]' : isCompact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'}`}>Pot</span>
            {!showBreakdown && liveRake && pot > 0 && (
              <span className={`text-muted-foreground/60 whitespace-nowrap ${isLandscapeMobile ? 'text-[7px]' : isCompact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'}`}>Rake: ${formatChips(liveRake.totalRake)}</span>
            )}
          </div>
        )}
      </motion.div>
    );
  }

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

      <span className={`text-primary font-display ${isCompact ? 'text-xs' : 'text-sm sm:text-base lg:text-xl'} font-bold drop-shadow-lg tracking-wider`}>
        ${formatChips(pot)}
      </span>
      <span className={`text-muted-foreground ${isCompact ? 'text-[7px]' : 'text-[9px] sm:text-[10px]'} uppercase tracking-widest`}>Pot</span>

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
