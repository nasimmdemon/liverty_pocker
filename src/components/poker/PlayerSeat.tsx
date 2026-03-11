import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '@/lib/gameTypes';
import Card from './Card';
import { ChatBubble } from './GameChat';
import { playCardRevealSound } from '@/lib/sounds';

interface PlayerSeatProps {
  player: Player;
  seatIndex: number;
  onClickAvatar: (player: Player) => void;
  timerProgress?: number;
  isDealer?: boolean;
  isWinner?: boolean;
  isMobile?: boolean;
  chatBubble?: { id: number; text: string; playerName: string } | null;
}

const NamePlate = ({ player, isTopSeat }: { player: Player; isTopSeat: boolean }) => (
  <div
    className="absolute left-1/2 px-1.5 py-0.5 sm:px-2 rounded-md flex flex-col items-center whitespace-nowrap"
    style={{
      background: 'hsl(var(--casino-dark) / 0.92)',
      transform: 'translateX(-50%)',
      zIndex: 20,
      ...(isTopSeat ? { bottom: 'calc(100% + 30px)' } : { top: 'calc(100% + 6px)' }),
    }}
  >
    <span
      className="text-foreground text-[8px] sm:text-[10px] font-semibold truncate max-w-[64px] sm:max-w-[88px] tracking-wider"
      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
    >
      {player.name}
    </span>
    <span
      className="text-primary text-[8px] sm:text-[10px] font-bold"
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
);

// PlayerSeat renders INSIDE player-position-zone. The avatar is a direct child of the zone.
const PlayerSeat = ({
  player, seatIndex, onClickAvatar,
  timerProgress = 0, isDealer = false, isWinner = false, isMobile = false,
  chatBubble = null,
}: PlayerSeatProps) => {
  const isTurn = player.isTurn;
  const hasFolded = player.hasFolded;
  const isUser = player.isUser;
  // Show cards for all players: user sees own face-up; others see closed until showdown
  const showCards = player.cards.length > 0 && !hasFolded;
  const isTopSeat = seatIndex >= 2 && seatIndex <= 4;

  // Avatar 2x bigger: was 56/72 (user) and 46/60 (others)
  const avatarSizePx = isUser
    ? (isMobile ? 112 : 144)
    : (isMobile ? 92 : 120);

  const borderClass = isWinner
    ? 'border-primary glow-gold'
    : isUser
      ? 'border-primary glow-gold'
      : isTurn
        ? 'border-primary glow-turn'
        : hasFolded
          ? 'border-muted opacity-50'
          : 'border-primary/60';

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      data-seat-index={seatIndex}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, delay: seatIndex * 0.08, type: 'spring' }}
    >
      {/* Hole cards — user: 50% behind avatar on both mobile & desktop. Others: above avatar. */}
      {showCards && !isTopSeat && (
        <div
          className="absolute"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            perspective: 600,
            zIndex: isUser ? 5 : 15, // User: below avatar so 50% goes behind; others: above
            // User: show more of cards — less overlap behind avatar
            ...(isUser
              ? {
                  bottom: '100%',
                  marginBottom: isMobile ? -18 : -32, // ~25% behind avatar so more card visible
                  width: isMobile ? 150 : 240,
                  height: isMobile ? 88 : 128,
                }
              : {
                  bottom: '100%',
                  marginBottom: 8,
                  width: isMobile ? 86 : 112,
                  height: isMobile ? 48 : 60,
                }),
          }}
        >
          {player.cards.map((card, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: '50%',
                bottom: 0,
                transformOrigin: 'bottom center',
                transform: `translateX(${i === 0 ? '-68%' : '-28%'}) rotate(${i === 0 ? -18 : 18}deg) scale(${isUser ? (isMobile ? 1.28 : 1.58) : (isMobile ? 0.58 : 0.72)})`,
                zIndex: i,
              }}
            >
              <Card card={card} delay={0.2 + 0.2 * i} index={i} isPlayerCard onReveal={playCardRevealSound} />
            </div>
          ))}
        </div>
      )}

      {/* Chat bubble above avatar */}
      <AnimatePresence>
        {chatBubble && (
          <div key={chatBubble.id} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30" style={{ pointerEvents: 'none' }}>
            <ChatBubble text={chatBubble.text} playerName={chatBubble.playerName} />
          </div>
        )}
      </AnimatePresence>

      {/* Avatar — z-index above user's cards so 50% overlap appears behind */}
      <div
        className="relative cursor-pointer group"
        style={{ zIndex: 10 }}
        onClick={() => onClickAvatar(player)}
      >
        {isDealer && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center z-20 border border-border shadow-lg">
            D
          </div>
        )}

        {isTurn && (
          <svg
            className="absolute"
            style={{ inset: -7, width: 'calc(100% + 14px)', height: 'calc(100% + 14px)', zIndex: 5 }}
            viewBox="0 0 100 100"
          >
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
          className={`rounded-full overflow-hidden border-[2.5px] transition-all duration-300 group-hover:brightness-110 ${borderClass}`}
          style={{
            width: avatarSizePx,
            height: avatarSizePx,
            boxShadow: isUser && !isWinner
              ? '0 0 20px hsla(40,70%,45%,0.4), 0 4px 12px rgba(0,0,0,0.5)'
              : !isWinner ? '0 4px 12px rgba(0,0,0,0.5)' : undefined,
          }}
        >
          <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" loading="lazy" />
        </div>
      </div>

      {/* Name plate */}
      <NamePlate player={player} isTopSeat={isTopSeat} />

      {/* Hole cards below avatar for top seats */}
      {showCards && isTopSeat && (
        <div
          className="absolute flex gap-0.5"
          style={{ top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8, zIndex: 5 }}
        >
          {player.cards.map((card, i) => (
            <div key={i} style={{ transform: `scale(${isUser ? (isMobile ? 1.5 : 1.86) : (isMobile ? 0.5 : 0.62)})`, transformOrigin: 'top center' }}>
              <Card card={card} delay={0.2 + 0.2 * i} index={i} isPlayerCard onReveal={playCardRevealSound} />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default PlayerSeat;
