import { motion, AnimatePresence } from 'framer-motion';
import { Player, PlayingCard } from '@/lib/gameTypes';
import { formatChips } from '@/lib/formatChips';
import Card from './Card';
import { ChatBubble } from './GameChat';
import WinningChanceBar from './WinningChanceBar';

interface PlayerSeatProps {
  player: Player;
  seatIndex: number;
  onClickAvatar: (player: Player) => void;
  timerProgress?: number;
  isDealer?: boolean;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
  isWinner?: boolean;
  isMobile?: boolean;
  isLandscapeMobile?: boolean;
  isShowdown?: boolean;
  chatBubble?: { id: number; text: string; playerName: string } | null;
  winChance?: number;
  winnerBestCards?: PlayingCard[];
  /** Override chips display (e.g. pre-win balance during chip fly animation) */
  displayChips?: number;
  /** Face-down card back image */
  cardBack?: string;
}

const NamePlate = ({ player, isTopSeat, hasWinningBar, displayChips }: { player: Player; isTopSeat: boolean; hasWinningBar?: boolean; displayChips?: number }) => {
  const hasLeft = !player.isActive && player.chips <= 0;
  // Push name plates further from avatar to avoid collision with pot/cards
  const topOffset = hasWinningBar ? 32 : 6;
  const bottomOffset = hasWinningBar ? 42 : 34;
  return (
  <div
    className="absolute left-1/2 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md flex flex-col items-center whitespace-nowrap transition-all duration-300"
    style={{
      background: 'hsl(var(--casino-dark) / 0.92)',
      transform: 'translateX(-50%)',
      zIndex: 20,
      ...(isTopSeat ? { bottom: `calc(100% + ${bottomOffset}px)` } : { top: `calc(100% + ${topOffset}px)` }),
    }}
  >
    <span
      className={`text-[10px] sm:text-[12px] font-semibold truncate max-w-[72px] sm:max-w-[100px] tracking-wide ${hasLeft ? 'text-muted-foreground' : 'text-foreground'}`}
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {hasLeft ? 'LEFT' : player.name}
    </span>
    <span
      className={`text-[10px] sm:text-[12px] font-bold ${hasLeft ? 'text-muted-foreground' : 'text-primary'}`}
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {hasLeft ? '—' : `$${formatChips(displayChips ?? player.chips)}`}
    </span>
    {!hasLeft && player.lastAction && (
      <span
        className={`text-[9px] sm:text-[11px] font-bold tracking-wide ${
          player.lastAction.includes('WINNER') ? 'text-primary' :
          player.lastAction === 'FOLD' ? 'text-destructive' :
          'text-muted-foreground'
        }`}
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {player.lastAction}
      </span>
    )}
  </div>
  );
};

// PlayerSeat renders INSIDE player-position-zone. The avatar is a direct child of the zone.
const PlayerSeat = ({
  player, seatIndex, onClickAvatar,
  timerProgress = 0, isDealer = false, isSmallBlind = false, isBigBlind = false,
  isWinner = false, isMobile = false, isLandscapeMobile = false,
  isShowdown = false, chatBubble = null, winChance, winnerBestCards = [], displayChips, cardBack,
}: PlayerSeatProps) => {
  const isTurn = player.isTurn;
  const hasFolded = player.hasFolded;
  const isUser = player.isUser;
  const isInBestHand = (c: { rank: string; suit: string }) =>
    winnerBestCards.some(b => b.rank === c.rank && b.suit === c.suit);
  const hasLeft = !player.isActive && player.chips <= 0;
  // User sees own cards (face-up). Others: show closed cards during hand, face-up at showdown
  const showCards = player.cards.length > 0 && !hasFolded && !hasLeft;
  const isTopSeat = seatIndex >= 2 && seatIndex <= 4;

  // Avatar sizes: smaller on mobile; extra small in landscape; folded = smaller and darker
  const baseSize = isUser
    ? (isLandscapeMobile ? 40 : isMobile ? 72 : 144)
    : (isLandscapeMobile ? 32 : isMobile ? 56 : 120);
  const avatarSizePx = hasFolded ? Math.round(baseSize * 0.82) : baseSize;

  const borderClass = hasLeft
    ? 'border-muted opacity-30'
    : isWinner
      ? 'border-primary glow-gold'
      : isUser && isTurn
        ? (isMobile ? 'border-2' : 'border-4') + ' border-primary glow-your-turn'
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
                  marginBottom: isLandscapeMobile ? 0 : isMobile ? -12 : -32,
                  width: isLandscapeMobile ? 70 : isMobile ? 110 : 240,
                  height: isLandscapeMobile ? 40 : isMobile ? 64 : 128,
                }
              : {
                  bottom: '100%',
                  marginBottom: isMobile ? 4 : 8,
                  width: isLandscapeMobile ? 44 : isMobile ? 56 : 112,
                  height: isLandscapeMobile ? 26 : isMobile ? 32 : 60,
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
                transform: `translateX(${i === 0 ? '-68%' : '-28%'}) rotate(${i === 0 ? -18 : 18}deg) scale(${isUser ? (isLandscapeMobile ? 0.7 : isMobile ? 1 : 1.58) : (isLandscapeMobile ? 0.38 : isMobile ? 0.5 : 0.72)})`,
                zIndex: i,
              }}
            >
              <Card
                card={card}
                delay={0.2 + 0.2 * i}
                index={i}
                isPlayerCard
                isHighlighted={isWinner && isInBestHand(card)}
                cardBack={cardBack}
              />
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
        {/* Winning chance bar — on avatar bottom edge for main player */}
        {isUser && winChance != null && !hasFolded && !hasLeft && (
          <WinningChanceBar percent={winChance} isMobile={isMobile} isLandscapeMobile={isLandscapeMobile} onAvatar />
        )}
        {isDealer && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center z-20 border border-border shadow-lg">
            D
          </div>
        )}
        {isSmallBlind && !isDealer && (
          <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-blue-500 text-white text-[8px] font-black flex items-center justify-center z-20 border border-border shadow-lg">
            SB
          </div>
        )}
        {isBigBlind && !isDealer && (
          <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center z-20 border border-border shadow-lg">
            BB
          </div>
        )}

        {isTurn && (
          <svg
            className="absolute"
            style={{ inset: isMobile ? -1 : -7, width: isMobile ? 'calc(100% + 2px)' : 'calc(100% + 14px)', height: isMobile ? 'calc(100% + 2px)' : 'calc(100% + 14px)', zIndex: 5 }}
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

        {isUser && isTurn && (
          <motion.div
            className="absolute rounded-full border-2 border-primary pointer-events-none"
            style={{ inset: isMobile ? -1 : -6, zIndex: 4 }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        {isWinner && (
          <motion.div
            className={`absolute rounded-full ${isMobile ? '-inset-0.5' : '-inset-2'}`}
            style={{ boxShadow: '0 0 25px hsl(var(--casino-gold) / 0.8), 0 0 50px hsl(var(--casino-gold) / 0.4)' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}

        <motion.div
          className={`rounded-full overflow-hidden transition-all duration-300 ${hasFolded ? '' : 'group-hover:brightness-110'} ${isMobile ? 'border-[1.5px]' : 'border-[2.5px]'} ${borderClass}`}
          style={{
            width: avatarSizePx,
            height: avatarSizePx,
            filter: hasFolded ? 'brightness(0.55) saturate(0.7)' : undefined,
            boxShadow: isUser && !isWinner
              ? isMobile ? '0 0 8px hsla(40,70%,45%,0.35), 0 2px 8px rgba(0,0,0,0.4)' : '0 0 20px hsla(40,70%,45%,0.4), 0 4px 12px rgba(0,0,0,0.5)'
              : !isWinner ? (isMobile ? '0 2px 8px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.5)') : undefined,
          }}
          animate={!isUser && isTurn ? { scale: [1, 1.04, 1] } : {}}
          transition={!isUser && isTurn ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : {}}
        >
          <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" loading="lazy" />
        </motion.div>
      </div>

      {/* Name plate — extra offset when main player has winning bar for clear separation */}
      <NamePlate player={player} isTopSeat={isTopSeat} hasWinningBar={isUser && winChance != null && !hasFolded && !hasLeft} displayChips={displayChips} />

      {/* Hole cards below avatar for top seats — same rotated fan as bottom seats */}
      {showCards && isTopSeat && (
        <div
          className="absolute"
          style={{
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: isLandscapeMobile ? 2 : isMobile ? 6 : 8,
            perspective: 600,
            zIndex: 5,
            width: isLandscapeMobile ? 44 : isMobile ? 80 : 160,
            height: isLandscapeMobile ? 26 : isMobile ? 48 : 96,
          }}
        >
          {player.cards.map((card, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: '50%',
                top: 0,
                transformOrigin: 'top center',
                transform: `translateX(${i === 0 ? '-68%' : '-28%'}) rotate(${i === 0 ? 18 : -18}deg) scale(${isUser ? (isLandscapeMobile ? 0.75 : isMobile ? 0.9 : 1.5) : (isLandscapeMobile ? 0.5 : isMobile ? 0.4 : 0.6)})`,
                zIndex: i,
              }}
            >
              <Card
                card={card}
                delay={0.2 + 0.2 * i}
                index={i}
                isPlayerCard
                isHighlighted={isWinner && isInBestHand(card)}
                cardBack={cardBack}
              />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default PlayerSeat;
