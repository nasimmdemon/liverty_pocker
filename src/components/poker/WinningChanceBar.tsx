import { motion } from 'framer-motion';

interface WinningChanceBarProps {
  percent: number;
  isMobile?: boolean;
  isLandscapeMobile?: boolean;
}

export default function WinningChanceBar({ percent, isMobile = false, isLandscapeMobile = false }: WinningChanceBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  // Position below avatar + name plate: responsive offsets
  const topOffset = isLandscapeMobile ? 44 : isMobile ? 52 : 72;
  const barWidth = isLandscapeMobile ? 48 : isMobile ? 60 : 80;
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5"
      style={{
        top: `calc(100% + ${topOffset}px)`,
        width: barWidth,
        zIndex: 15,
      }}
    >
      <span className="text-[7px] sm:text-[8px] uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        Win
      </span>
      <div
        className="w-full h-1.5 sm:h-2 rounded-full overflow-hidden border border-primary/40"
        style={{ background: 'hsl(var(--casino-dark) / 0.9)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            width: `${clamped}%`,
            background: 'linear-gradient(90deg, hsl(var(--casino-gold) / 0.6), hsl(var(--casino-gold))',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[8px] sm:text-[9px] font-bold text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        {clamped}%
      </span>
    </div>
  );
}
