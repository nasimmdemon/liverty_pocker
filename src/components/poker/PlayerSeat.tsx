import { motion } from 'framer-motion';
import { Player } from '@/lib/gameTypes';
import Card from './Card';

interface PlayerSeatProps {
  player: Player;
  position: Record<string, string>;
  seatIndex: number;
  onClickAvatar: (player: Player) => void;
  timerProgress?: number;
  isDealer?: boolean;
  isWinner?: boolean;
}

const PlayerSeat = ({ player, position, seatIndex, onClickAvatar, timerProgress = 0, isDealer = false, isWinner = false }: PlayerSeatProps) => {
  const isTurn = player.isTurn;
  const hasFolded = player.hasFolded;
  const isUser = player.isUser;
  const showCards = isUser && player.cards.length > 0 && !hasFolded;

  const avatarSize = isUser
    ? 'w-[130px] h-[130px] sm:w-[150px] sm:h-[150px]'
    : 'w-[110px] h-[110px] sm:w-[120px] sm:h-[120px]';

  return (
    <motion.div
      className="absolute flex flex-col items-center z-10"
      style={position}
      data-seat-index={seatIndex}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
    >
      {showCards && (
        <div className="flex gap-0.5 mb-[-8px] z-0">
          {player.cards.map((card, i) => (
            <div key={i} className="scale-[0.6] sm:scale-[0.7]">
              <Card card={card} delay={0.1 * i} index={i} />
            </div>
          ))}
        </div>
      )}

      <div className="relative cursor-pointer group" onClick={() => onClickAvatar(player)}>
        {/* Dealer button */}
        {isDealer && (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center z-20 border border-border shadow-md">
            D
          </div>
        )}

        {/* Timer ring */}
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

        {/* Winner glow */}
        {isWinner && (
          <motion.div
            className="absolute -inset-3 rounded-full"
            style={{ boxShadow: '0 0 30px hsl(var(--casino-gold) / 0.8), 0 0 60px hsl(var(--casino-gold) / 0.4)' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        <div
          className={`${avatarSize} rounded-full overflow-hidden border-[3px] transition-all duration-300 group-hover:brightness-110 ${
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
              ? '0 0 25px hsla(40, 70%, 45%, 0.4), 0 4px 15px rgba(0,0,0,0.5)'
              : !isWinner ? '0 4px 15px rgba(0,0,0,0.5)' : undefined,
          }}
        >
          <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" loading="lazy" />
        </div>
      </div>

      {/* Name, chips, last action */}
      <div className="mt-1.5 px-3 py-1 rounded-lg flex flex-col items-center" style={{ background: 'hsl(var(--casino-dark) / 0.9)' }}>
        <span
          className="text-foreground text-xs sm:text-sm font-semibold truncate max-w-[100px] tracking-wider"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {player.name}
        </span>
        <span
          className="text-primary text-xs sm:text-sm font-bold"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          ${player.chips.toLocaleString()}
        </span>
        {player.lastAction && (
          <span className={`text-[10px] font-bold tracking-wider mt-0.5 ${
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
