import { motion } from 'framer-motion';
import { PlayingCard as CardType } from '@/lib/gameTypes';
import { isRedSuit } from '@/lib/gameLogic';

interface CardProps {
  card: CardType;
  delay?: number;
  index?: number;
}

const SUIT_SYMBOLS: Record<string, string> = {
  '♠': '♠',
  '♥': '♥',
  '♦': '♦',
  '♣': '♣',
};

const Card = ({ card, delay = 0 }: CardProps) => {
  if (!card.faceUp) {
    return (
      <motion.div
        initial={{ scale: 0, rotateY: 180, opacity: 0 }}
        animate={{ scale: 1, rotateY: 0, opacity: 1 }}
        transition={{ delay, duration: 0.5, type: 'spring', stiffness: 180 }}
        className="w-11 h-[62px] sm:w-[52px] sm:h-[72px] rounded-lg border border-border/60 flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--casino-red)), hsl(0 50% 25%))',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        <div className="w-7 h-9 sm:w-8 sm:h-11 border border-primary/20 rounded-sm flex items-center justify-center">
          <span className="font-display text-primary/30 text-[9px] sm:text-xs font-bold tracking-wider">LP</span>
        </div>
      </motion.div>
    );
  }

  const red = isRedSuit(card.suit);
  const colorClass = red ? 'text-red-600' : 'text-gray-900';
  const suit = SUIT_SYMBOLS[card.suit] || card.suit;

  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.7, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      transition={{ delay, duration: 0.6, type: 'spring', stiffness: 150 }}
      className="w-11 h-[62px] sm:w-[52px] sm:h-[72px] rounded-lg border border-gray-300 relative overflow-hidden select-none"
      style={{
        background: 'linear-gradient(180deg, #fefefe 0%, #f0ebe0 40%, #e8e0d0 100%)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.2)',
      }}
    >
      {/* Top-left rank + suit */}
      <div className={`absolute top-0.5 left-1 flex flex-col items-center leading-none ${colorClass}`}>
        <span className="text-[10px] sm:text-xs font-extrabold">{card.rank}</span>
        <span className="text-[9px] sm:text-[11px] -mt-0.5">{suit}</span>
      </div>

      {/* Center suit */}
      <div className={`absolute inset-0 flex items-center justify-center ${colorClass}`}>
        <span className="text-xl sm:text-2xl opacity-90">{suit}</span>
      </div>

      {/* Bottom-right rank + suit (mirrored) */}
      <div className={`absolute bottom-0.5 right-1 flex flex-col items-center leading-none rotate-180 ${colorClass}`}>
        <span className="text-[10px] sm:text-xs font-extrabold">{card.rank}</span>
        <span className="text-[9px] sm:text-[11px] -mt-0.5">{suit}</span>
      </div>

      {/* Subtle inner border for realism */}
      <div className="absolute inset-[2px] rounded-md border border-gray-200/50 pointer-events-none" />
    </motion.div>
  );
};

export default Card;
