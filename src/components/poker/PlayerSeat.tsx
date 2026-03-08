import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '@/lib/gameTypes';
import Card from './Card';

interface PlayerSeatProps {
  player: Player;
  position: { top?: string; bottom?: string; left?: string; right?: string };
  onClickAvatar: (player: Player) => void;
  timerProgress?: number;
}

const PlayerSeat = ({ player, position, onClickAvatar, timerProgress = 0 }: PlayerSeatProps) => {
  const isTurn = player.isTurn;
  const hasFolded = player.hasFolded;

  return (
    <motion.div
      className="absolute flex flex-col items-center z-10"
      style={position}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
    >
      {/* Cards behind avatar */}
      {player.cards.length > 0 && !hasFolded && (
        <div className="flex gap-0.5 mb-[-8px] z-0">
          {player.cards.map((card, i) => (
            <div key={i} className="scale-75 sm:scale-90">
              <Card card={card} delay={0.1 * i} index={i} />
            </div>
          ))}
        </div>
      )}

      {/* Avatar with timer ring */}
      <div className="relative cursor-pointer" onClick={() => onClickAvatar(player)}>
        {isTurn && (
          <svg className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--casino-gold))" strokeWidth="3" opacity="0.2" />
            <motion.circle
              cx="50" cy="50" r="46" fill="none"
              stroke="hsl(var(--casino-gold))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 46}`}
              strokeDashoffset={`${2 * Math.PI * 46 * (1 - timerProgress)}`}
              transform="rotate(-90 50 50)"
            />
          </svg>
        )}
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 transition-all duration-300 ${
            isTurn ? 'border-primary glow-turn' : hasFolded ? 'border-muted opacity-50' : 'border-border'
          }`}
        >
          <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Name & Chips label */}
      <div className="mt-1 px-3 py-1 rounded-md flex flex-col items-center" style={{ background: 'hsl(var(--casino-dark) / 0.85)' }}>
        <span className="text-foreground text-[10px] sm:text-xs font-semibold truncate max-w-[80px]">
          {player.name}
        </span>
        <span className="text-primary text-[10px] sm:text-xs font-bold">
          ${player.chips.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
};

export default PlayerSeat;
