import { motion } from 'framer-motion';

interface WinningChanceBarProps {
  percent: number;
  isMobile?: boolean;
  isLandscapeMobile?: boolean;
  /** When true, bar is positioned on avatar (bottom edge) */
  onAvatar?: boolean;
}

/** Convert 0–100% to a 1–5 level (5 = best, 1 = very low) */
function percentToLevel(percent: number): number {
  const p = Math.min(100, Math.max(0, percent));
  if (p <= 20) return 1;
  if (p <= 40) return 2;
  if (p <= 60) return 3;
  if (p <= 80) return 4;
  return 5;
}

/** Color for each level: red (1) → green (5) with gradient in between */
const LEVEL_COLORS: Record<number, string> = {
  1: '#ef4444',   // red
  2: '#f97316',   // orange
  3: '#eab308',   // yellow/amber
  4: '#84cc16',   // lime
  5: '#22c55e',   // green
};

export default function WinningChanceBar({ percent, isMobile = false, isLandscapeMobile = false, onAvatar = true }: WinningChanceBarProps) {
  const level = percentToLevel(percent);
  const segmentGap = isLandscapeMobile ? 3 : isMobile ? 4 : 6;
  const segmentHeight = isLandscapeMobile ? 6 : isMobile ? 8 : 10;
  const segmentWidth = isLandscapeMobile ? 12 : isMobile ? 14 : 20;
  const totalWidth = 5 * segmentWidth + 4 * segmentGap;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
      style={{
        bottom: onAvatar ? -segmentHeight - 10 : undefined,
        top: onAvatar ? undefined : `calc(100% + ${isLandscapeMobile ? 48 : isMobile ? 56 : 76}px)`,
        width: totalWidth,
        zIndex: 20,
      }}
    >
      {!onAvatar && (
        <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-muted-foreground/90 mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          Win
        </span>
      )}
      <div
        className="flex items-center rounded-full overflow-hidden"
        style={{
          gap: segmentGap,
          padding: segmentGap + 2,
          background: onAvatar ? 'hsl(var(--casino-dark) / 0.98)' : 'transparent',
          border: onAvatar ? '2px solid hsl(var(--casino-gold) / 0.4)' : 'none',
          boxShadow: onAvatar ? '0 2px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.2)' : 'none',
        }}
      >
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= level;
          const color = filled ? LEVEL_COLORS[i] : 'hsl(0 0% 25% / 0.5)';
          return (
            <motion.div
              key={i}
              className="rounded-sm"
              style={{
                width: segmentWidth,
                height: segmentHeight,
                background: color,
                boxShadow: filled ? `0 0 6px ${color}40` : 'none',
              }}
              initial={{ scaleX: 0.3, opacity: 0.6 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: i * 0.03, ease: 'easeOut' }}
            />
          );
        })}
      </div>
    </div>
  );
}
