import { motion } from 'framer-motion';
import { Player } from '@/lib/gameTypes';
import Card from './Card';

interface PlayerSeatProps {
  player: Player;
  position: { top: string; left: string };
  seatIndex: number;
  onClickAvatar: (player: Player) => void;
  timerProgress?: number;
  isDealer?: boolean;
  isWinner?: boolean;
  isMobile?: boolean;
}

const PlayerSeat = ({ player, position, seatIndex, onClickAvatar, timerProgress = 0, isDealer = false, isWinner = false, isMobile = false }: PlayerSeatProps) => {
  const isTurn = player.isTurn;
  const hasFolded = player.hasFolded;
  const isUser = player.isUser;
  const showCards = isUser && player.cards.length > 0 && !hasFolded;

  // User seat (index 0) is at bottom - cards go above avatar
  // Top seats (2,3,4) - cards go below avatar
  const isTopSeat = seatIndex >= 2 && seatIndex <= 4;

  // Avatar sizes
  const avatarSize = isUser
    ? isMobile ? 'w-[60px] h-[60px]' : 'w-[80px] h-[80px] lg:w-[100px] lg:h-[100px]'
    : isMobile ? 'w-[44px] h-[44px]' : 'w-[60px] h-[60px] lg:w-[80px] lg:h-[80px]';

  return (
    <motion.div
      className="absolute flex flex-col items-center z-10"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -50%)',
      }}
      data-seat-index={seatIndex}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, delay: seatIndex * 0.08, type: 'spring' }}
    >
      {/* Cards above avatar for user/bottom seats */}
      {showCards && !isTopSeat && (
        <div className="flex gap-0.5 mb-[-4px] z-0">
          {player.cards.map((card, i) => (
            <div key={i} className={isMobile ? 'scale-[0.5]' : 'scale-[0.6] sm:scale-[0.7]'}>
              <Card card={card} delay={0.3 + 0.15 * i} index={i} isPlayerCard />
            </div>
          ))}
        </div>
      )}

      <div className="relative cursor-pointer group" onClick={() => onClickAvatar(player)}>
        {isDealer && (
          <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary text-primary-foreground text-[8px] sm:text-[9px] font-bold flex items-center justify-center z-20 border border-border shadow-md">
            D
          </div>
        )}

        {isTurn && (
          <svg className="absolute -inset-1 sm:-inset-1.5 w-[calc(100%+8px)] h-[calc(100%+8px)] sm:w-[calc(100%+12px)] sm:h-[calc(100%+12px)]" viewBox="0 0 100 100">
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

        {isWinner && (
          <motion.div
            className="absolute -inset-2 rounded-full"
            style={{ boxShadow: '0 0 25px hsl(var(--casino-gold) / 0.8), 0 0 50px hsl(var(--casino-gold) / 0.4)' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        <div
          className={`rounded-full overflow-hidden border-[2px] sm:border-[3px] transition-all duration-300 group-hover:brightness-110 ${avatarSize} ${
            isWinner
              ? 'border-primary glow-gold'
              : isUser
                ? 'border-primary glow-gold'
                : isTurn
                  ? 'border-primary glow-turn'
                  : hasFolded
                    ? 'border-muted opacity-50'
                    : 'border-primary/60'
          }`}
          style={{
            boxShadow: isUser && !isWinner
              ? '0 0 20px hsla(40, 70%, 45%, 0.4), 0 4px 12px rgba(0,0,0,0.5)'
              : !isWinner ? '0 4px 12px rgba(0,0,0,0.5)' : undefined,
          }}
        >
          <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" loading="lazy" />
        </div>
      </div>

      {/* Cards below avatar for top seats */}
      {showCards && isTopSeat && (
        <div className="flex gap-0.5 mt-[-4px] z-0">
          {player.cards.map((card, i) => (
            <div key={i} className={isMobile ? 'scale-[0.5]' : 'scale-[0.6] sm:scale-[0.7]'}>
              <Card card={card} delay={0.3 + 0.15 * i} index={i} isPlayerCard />
            </div>
          ))}
        </div>
      )}

      {/* Name plate */}
      <div
        className="mt-0.5 px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 rounded-md flex flex-col items-center"
        style={{ background: 'hsl(var(--casino-dark) / 0.9)' }}
      >
        <span
          className="text-foreground text-[8px] sm:text-[10px] lg:text-xs font-semibold truncate max-w-[50px] sm:max-w-[80px] tracking-wider"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {player.name}
        </span>
        <span
          className="text-primary text-[8px] sm:text-[10px] lg:text-xs font-bold"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          ${player.chips.toLocaleString()}
        </span>
        {player.lastAction && (
          <span className={`text-[7px] sm:text-[9px] font-bold tracking-wider ${
            player.lastAction.includes('WINNER') ? 'text-primary' :
            player.lastAction === 'FOLD' ? 'text-destructive' :
            'text-muted-foreground'
          }`}>
            {player.lastAction}
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default PlayerSeat;
