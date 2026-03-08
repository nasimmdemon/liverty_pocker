import { motion } from 'framer-motion';
import { Player } from '@/lib/gameTypes';
import Card from './Card';

interface PlayerSeatProps {
  player: Player;
  position: { top?: string; bottom?: string; left?: string; right?: string; transform?: string };
  onClickAvatar: (player: Player) => void;
  timerProgress?: number;
}

const PlayerSeat = ({ player, position, onClickAvatar, timerProgress = 0 }: PlayerSeatProps) => {
  const isTurn = player.isTurn;
  const hasFolded = player.hasFolded;
  const isUser = player.isUser;
  const showCards = isUser && player.cards.length > 0 && !hasFolded;

  // Larger avatar for current user
  const avatarSize = isUser
    ? 'w-[120px] h-[120px] sm:w-[140px] sm:h-[140px]'
    : 'w-[90px] h-[90px] sm:w-[110px] sm:h-[110px] lg:w-[120px] lg:h-[120px]';

  return (
    <motion.div
      className="absolute flex flex-col items-center z-10"
      style={position}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
    >
      {/* Cards only for the user player - above avatar */}
      {showCards && (
        <div className="flex gap-0.5 mb-[-8px] z-0">
          {player.cards.map((card, i) => (
            <div key={i} className="scale-[0.6] sm:scale-[0.7]">
              <Card card={card} delay={0.1 * i} index={i} />
            </div>
          ))}
        </div>
      )}

      {/* Avatar with timer ring */}
      <div className="relative cursor-pointer group" onClick={() => onClickAvatar(player)}>
        {isTurn && (
          <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--casino-gold))" strokeWidth="2.5" opacity="0.2" />
            <motion.circle
              cx="50" cy="50" r="46" fill="none"
              stroke="hsl(var(--casino-gold))"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 46}`}
              strokeDashoffset={`${2 * Math.PI * 46 * (1 - timerProgress)}`}
              transform="rotate(-90 50 50)"
            />
          </svg>
        )}
        <div
          className={`${avatarSize} rounded-full overflow-hidden border-[3px] transition-all duration-300 group-hover:brightness-110 ${
            isUser
              ? 'border-primary shadow-[0_0_20px_hsl(var(--casino-gold)/0.4)]'
              : isTurn
                ? 'border-primary glow-turn'
                : hasFolded
                  ? 'border-muted opacity-50'
                  : 'border-primary/60'
          }`}
          style={{
            boxShadow: isUser
              ? '0 0 25px hsla(40, 70%, 45%, 0.4), 0 4px 15px rgba(0,0,0,0.5)'
              : isTurn ? undefined : '0 4px 15px rgba(0,0,0,0.5)',
          }}
        >
          <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" loading="lazy" />
        </div>
      </div>

      {/* Name & Chips label */}
      <div className="mt-1.5 px-3 py-1 rounded-lg flex flex-col items-center" style={{ background: 'hsl(var(--casino-dark) / 0.9)' }}>
        <span className="text-foreground text-xs sm:text-sm font-display font-semibold truncate max-w-[100px] tracking-wide">
          {player.name}
        </span>
        <span className="text-primary text-xs sm:text-sm font-display font-bold">
          ${player.chips.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
};

export default PlayerSeat;
