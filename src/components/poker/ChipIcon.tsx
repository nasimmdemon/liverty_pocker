interface ChipIconProps {
  size?: number;
  className?: string;
}

const ChipIcon = ({ size = 56, className = '' }: ChipIconProps) => (
  <svg
    viewBox="0 0 56 56"
    className={`drop-shadow-lg shrink-0 ${className}`}
    style={{ width: size, height: size }}
    fill="none"
  >
    <defs>
      <linearGradient id="chip-face" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(45 85% 55%)" />
        <stop offset="25%" stopColor="hsl(42 78% 52%)" />
        <stop offset="50%" stopColor="hsl(38 72% 48%)" />
        <stop offset="75%" stopColor="hsl(35 65% 42%)" />
        <stop offset="100%" stopColor="hsl(32 60% 35%)" />
      </linearGradient>
      <linearGradient id="chip-edge" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="hsl(40 50% 45%)" />
        <stop offset="50%" stopColor="hsl(35 45% 35%)" />
        <stop offset="100%" stopColor="hsl(30 40% 28%)" />
      </linearGradient>
      <filter id="chip-shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.5" />
      </filter>
    </defs>
    {/* Edge notches - realistic poker chip look */}
    {Array.from({ length: 24 }).map((_, i) => {
      const angle = (i / 24) * 360;
      const rad = (angle * Math.PI) / 180;
      const x1 = 28 + 22 * Math.cos(rad);
      const y1 = 28 + 22 * Math.sin(rad);
      const x2 = 28 + 26 * Math.cos(rad);
      const y2 = 28 + 26 * Math.sin(rad);
      return (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="url(#chip-edge)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      );
    })}
    {/* Main face */}
    <circle
      cx="28"
      cy="28"
      r="22"
      fill="url(#chip-face)"
      stroke="hsl(30 45% 25%)"
      strokeWidth="1.5"
      filter="url(#chip-shadow)"
    />
    {/* Inner rings */}
    <circle cx="28" cy="28" r="18" fill="none" stroke="hsl(35 50% 30%)" strokeWidth="1" opacity="0.7" />
    <circle cx="28" cy="28" r="12" fill="none" stroke="hsl(35 50% 30%)" strokeWidth="0.8" opacity="0.5" />
    <circle cx="28" cy="28" r="5" fill="hsl(35 45% 28% / 0.6)" />
  </svg>
);

export default ChipIcon;
