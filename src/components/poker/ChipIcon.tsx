import { useId } from 'react';

interface ChipIconProps {
  size?: number;
  className?: string;
  /** Chip color variant: red (default), blue, green, black */
  variant?: 'red' | 'blue' | 'green' | 'black';
}

const CHIP_COLORS = {
  red: {
    face: ['hsl(0 65% 45%)', 'hsl(0 70% 38%)', 'hsl(0 75% 32%)'],
    edge: ['hsl(0 50% 35%)', 'hsl(0 45% 28%)'],
    center: 'hsl(0 30% 95%)',
  },
  blue: {
    face: ['hsl(220 65% 45%)', 'hsl(220 70% 38%)', 'hsl(220 75% 32%)'],
    edge: ['hsl(220 50% 35%)', 'hsl(220 45% 28%)'],
    center: 'hsl(220 30% 95%)',
  },
  green: {
    face: ['hsl(140 50% 40%)', 'hsl(140 55% 33%)', 'hsl(140 60% 27%)'],
    edge: ['hsl(140 45% 30%)', 'hsl(140 40% 22%)'],
    center: 'hsl(140 25% 92%)',
  },
  black: {
    face: ['hsl(0 0% 28%)', 'hsl(0 0% 20%)', 'hsl(0 0% 14%)'],
    edge: ['hsl(0 0% 22%)', 'hsl(0 0% 12%)'],
    center: 'hsl(0 0% 88%)',
  },
};

const ChipIcon = ({ size = 56, className = '', variant = 'red' }: ChipIconProps) => {
  const uid = useId();
  const c = CHIP_COLORS[variant];
  const id = `chip-${variant}-${size}-${uid.replace(/:/g, '')}`;
  return (
    <svg
      viewBox="0 0 56 56"
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
      fill="none"
    >
      <defs>
        <linearGradient id={`${id}-face`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.face[0]} />
          <stop offset="50%" stopColor={c.face[1]} />
          <stop offset="100%" stopColor={c.face[2]} />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={c.edge[0]} />
          <stop offset="100%" stopColor={c.edge[1]} />
        </linearGradient>
        <linearGradient id={`${id}-center`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.center} />
          <stop offset="100%" stopColor={c.center} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {/* Edge ridges - realistic poker chip grooves */}
      {Array.from({ length: 32 }).map((_, i) => {
        const angle = (i / 32) * 360;
        const rad = (angle * Math.PI) / 180;
        const x1 = 28 + 21 * Math.cos(rad);
        const y1 = 28 + 21 * Math.sin(rad);
        const x2 = 28 + 26 * Math.cos(rad);
        const y2 = 28 + 26 * Math.sin(rad);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={`url(#${id}-edge)`}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        );
      })}
      {/* Main face */}
      <circle
        cx="28"
        cy="28"
        r="21"
        fill={`url(#${id}-face)`}
        stroke={c.edge[1]}
        strokeWidth="1"
      />
      {/* Center band (white/cream stripe like real chips) */}
      <circle
        cx="28"
        cy="28"
        r="14"
        fill="none"
        stroke={`url(#${id}-center)`}
        strokeWidth="4"
        opacity="0.95"
      />
      {/* Inner center */}
      <circle cx="28" cy="28" r="8" fill={`url(#${id}-center)`} opacity="0.9" />
    </svg>
  );
};

export default ChipIcon;
