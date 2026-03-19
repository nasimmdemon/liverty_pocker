import { motion } from 'framer-motion';
import { calculateRake } from '@/lib/rake';
import { formatChips } from '@/lib/formatChips';

interface PotDisplayProps {
  pot: number;
  rakeAmount?: number;
  smallBlind?: number;
  bigBlind?: number;
}

const PotDisplay = ({ pot, rakeAmount = 0, smallBlind, bigBlind }: PotDisplayProps) => {
  const liveRake = pot > 0 ? calculateRake(pot) : null;

  return (
    <motion.div
      className="flex flex-col items-center justify-center rounded-xl px-4 py-1.5 sm:py-2 border border-primary/40"
      style={{
        background: 'linear-gradient(180deg, hsl(120 22% 14% / 0.8) 0%, hsl(120 20% 10% / 0.9) 100%)',
        boxShadow: 'inset 0 0 16px rgba(0,0,0,0.3), 0 0 12px hsl(var(--casino-gold) / 0.15)',
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Blinds row — compact, inside the pot card */}
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
      {rakeAmount > 0 ? (
        <span className="text-destructive text-[8px] sm:text-[9px] uppercase tracking-wider mt-0.5">
          Rake: ${formatChips(rakeAmount)} (5%)
        </span>
      ) : liveRake && pot > 0 ? (
        <span className="text-muted-foreground/60 text-[7px] sm:text-[8px] uppercase tracking-wider mt-0.5">
          Est. rake: ${formatChips(liveRake.totalRake)}
        </span>
      ) : null}
    </motion.div>
  );
};

export default PotDisplay;
