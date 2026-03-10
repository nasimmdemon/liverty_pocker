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
}

const PlayerSeat = ({ player, position, seatIndex, onClickAvatar, timerProgress = 0, isDealer = false, isWinner = false }: PlayerSeatProps) => {
  const isTurn = player.isTurn;
  const hasFolded = player.hasFolded;
  const isUser = player.isUser;
  const showCards = isUser && player.cards.length > 0 && !hasFolded;

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
      transition={{ duration: 0.5, type: 'spring' }}
    >
      {showCards && (
        <div className="flex gap-0.5 mb-[-6px] z-0">
          {player.cards.map((card, i) => (
            <div key={i} className="scale-[0.55] sm:scale-[0.65]">
              <Card card={card} delay={0.1 * i} index={i} />
            </div>
          ))}
        </div>
      )}

      <div className="relative cursor-pointer group" onClick={() => onClickAvatar(player)}>
        {isDealer && (
          <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-primary-foreground text-[9px] sm:text-[10px] font-bold flex items-center justify-center z-20 border border-border shadow-md">
            D
          </div>
        )}

        {isTurn && (
          <svg className="absolute -inset-1.5 sm:-inset-2 w-[calc(100%+12px)] h-[calc(100%+12px)] sm:w-[calc(100%+16px)] sm:h-[calc(100%+16px)]" viewBox="0 0 100 100">
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
            className="absolute -inset-3 rounded-full"
            style={{ boxShadow: '0 0 30px hsl(var(--casino-gold) / 0.8), 0 0 60px hsl(var(--casino-gold) / 0.4)' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        <div
          className={`rounded-full overflow-hidden border-[3px] transition-all duration-300 group-hover:brightness-110 ${
            isUser ? 'w-[80px] h-[80px] sm:w-[110px] sm:h-[110px] lg:w-[130px] lg:h-[130px]' : 'w-[60px] h-[60px] sm:w-[85px] sm:h-[85px] lg:w-[100px] lg:h-[100px]'
          } ${
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

      <div className="mt-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg flex flex-col items-center" style={{ background: 'hsl(var(--casino-dark) / 0.9)' }}>
        <span
          className="text-foreground text-[10px] sm:text-xs lg:text-sm font-semibold truncate max-w-[70px] sm:max-w-[100px] tracking-wider"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {player.name}
        </span>
        <span
          className="text-primary text-[10px] sm:text-xs lg:text-sm font-bold"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          ${player.chips.toLocaleString()}
        </span>
        {player.lastAction && (
          <span className={`text-[8px] sm:text-[10px] font-bold tracking-wider mt-0.5 ${
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
