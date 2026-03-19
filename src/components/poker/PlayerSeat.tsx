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
  /** Show countdown ring only for main player in last 10 seconds */
  showTimerRing?: boolean;
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

const NamePlate = ({ player, isTopSeat, hasWinningBar, displayChips, isLandscapeMobile }: { player: Player; isTopSeat: boolean; hasWinningBar?: boolean; displayChips?: number; isLandscapeMobile?: boolean }) => {
  const hasLeft = !player.isActive && player.chips <= 0;
  // Push name plates further from avatar to avoid collision with pot/cards
  const topOffset = isLandscapeMobile ? (hasWinningBar ? 14 : 2) : (hasWinningBar ? 32 : 6);
  const bottomOffset = isLandscapeMobile ? (hasWinningBar ? 18 : 12) : (hasWinningBar ? 42 : 34);
  return (
  <div
    className="player-name-plate absolute left-1/2 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md flex flex-col items-center whitespace-nowrap transition-all duration-300"
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
  timerProgress = 0, showTimerRing = false, isDealer = false, isSmallBlind = false, isBigBlind = false,
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
      {/* Hole cards — all players: half visible (50% behind avatar) for compact layout */}
      {showCards && !isTopSeat && (
        <div
          className="absolute"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            perspective: 600,
            zIndex: 5, // Below avatar so cards overlap and appear half-visible
            bottom: '100%',
            marginBottom: isUser
              ? (isLandscapeMobile ? -10 : isMobile ? -12 : -32)
              : (isLandscapeMobile ? -6 : isMobile ? -2 : -8), // Others: more visible; top seats get extra in isTopSeat branch
            width: isLandscapeMobile ? (isUser ? 48 : 44) : isMobile ? (isUser ? 110 : 56) : (isUser ? 240 : 112),
            height: isLandscapeMobile ? (isUser ? 28 : 26) : isMobile ? (isUser ? 64 : 32) : (isUser ? 128 : 60),
          }}
        >
          {player.cards.map((card, i) => {
            // User: overlapping fan; others: tighter translateX so cards are very close together
            const tx0 = isUser ? '-68%' : '-58%';
            const tx1 = isUser ? '-28%' : '-42%';
            return (
            <div
              key={i}
              className="absolute"
              style={{
                left: '50%',
                bottom: 0,
                transformOrigin: 'bottom center',
                transform: `translateX(${i === 0 ? tx0 : tx1}) rotate(${i === 0 ? -18 : 18}deg) scale(${isUser ? (isLandscapeMobile ? 0.5 : isMobile ? 1 : 1.58) : (isLandscapeMobile ? 0.38 : isMobile ? 0.5 : 0.72)})`,
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
          );
          })}
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

        {showTimerRing && (
          <svg
            className="absolute drop-shadow-[0_0_8px_hsl(var(--casino-gold)/0.6)]"
            style={{ inset: isMobile ? -2 : -8, width: isMobile ? 'calc(100% + 4px)' : 'calc(100% + 16px)', height: isMobile ? 'calc(100% + 4px)' : 'calc(100% + 16px)', zIndex: 5 }}
            viewBox="0 0 100 100"
          >
            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--casino-gold) / 0.35)" strokeWidth="4" />
            <motion.circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="hsl(var(--casino-gold))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - timerProgress)}`}
              transform="rotate(-90 50 50)"
              style={{ filter: 'drop-shadow(0 0 4px hsl(var(--casino-gold) / 0.8))' }}
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
      <NamePlate player={player} isTopSeat={isTopSeat} hasWinningBar={isUser && winChance != null && !hasFolded && !hasLeft} displayChips={displayChips} isLandscapeMobile={isLandscapeMobile} />

      {/* Hole cards below avatar for top seats — half visible (overlap avatar) like main player */}
      {showCards && isTopSeat && (
        <div
          className="absolute"
          style={{
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: isLandscapeMobile ? -6 : isMobile ? -4 : -6, // Top 3: more visible (less overlap)
            perspective: 600,
            zIndex: 5,
            width: isLandscapeMobile ? 44 : isMobile ? 80 : 160,
            height: isLandscapeMobile ? 26 : isMobile ? 48 : 96,
          }}
        >
          {player.cards.map((card, i) => {
            const tx0 = isUser ? '-68%' : '-58%';
            const tx1 = isUser ? '-28%' : '-42%';
            return (
            <div
              key={i}
              className="absolute"
              style={{
                left: '50%',
                top: 0,
                transformOrigin: 'top center',
                transform: `translateX(${i === 0 ? tx0 : tx1}) rotate(${i === 0 ? 18 : -18}deg) scale(${isUser ? (isLandscapeMobile ? 0.6 : isMobile ? 0.9 : 1.5) : (isLandscapeMobile ? 0.35 : isMobile ? 0.4 : 0.6)})`,
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
          );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default PlayerSeat;
