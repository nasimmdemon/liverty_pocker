import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { PlayingCard as CardType } from '@/lib/gameTypes';
import { isRedSuit } from '@/lib/gameLogic';

interface CardProps {
  card: CardType;
  delay?: number;
  index?: number;
  isPlayerCard?: boolean;
  onReveal?: () => void;
  isHighlighted?: boolean; // highlight when part of winning hand
}

const SUIT_SYMBOLS: Record<string, string> = {
  '♠': '♠',
  '♥': '♥',
  '♦': '♦',
  '♣': '♣',
};

const Card = ({ card, delay = 0, isPlayerCard = false, onReveal, isHighlighted = false }: CardProps) => {
  // Play reveal sound when card flips to face-up (at animation start)
  useEffect(() => {
    if (card.faceUp && onReveal) {
      const t = setTimeout(() => onReveal(), delay * 1000);
      return () => clearTimeout(t);
    }
  }, [card.faceUp, delay, onReveal]);

  if (!card.faceUp) {
    return (
      <motion.div
        initial={{ scale: 0, rotateY: 180, rotateZ: -180, opacity: 0 }}
        animate={{ scale: 1, rotateY: 0, rotateZ: 0, opacity: 1 }}
        transition={{ delay, duration: 0.7, type: 'spring', stiffness: 120, damping: 14 }}
        className="w-10 h-[56px] sm:w-[48px] sm:h-[66px] rounded-lg border border-border/60 flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--casino-red)), hsl(0 50% 25%))',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          transformStyle: 'preserve-3d',
          perspective: '600px',
        }}
      >
        <div className="w-6 h-8 sm:w-7 sm:h-10 border border-primary/20 rounded-sm flex items-center justify-center">
          <span className="font-display text-primary/30 text-[8px] sm:text-[10px] font-bold tracking-wider">LP</span>
        </div>
      </motion.div>
    );
  }

  const red = isRedSuit(card.suit);
  const colorClass = red ? 'text-red-600' : 'text-gray-900';
  const suit = SUIT_SYMBOLS[card.suit] || card.suit;

  // Community cards: flip one by one; player cards: deal flip
  const initialAnim = isPlayerCard
    ? { rotateY: 180, scale: 0.3, opacity: 0 }
    : { rotateY: 180, scale: 0.2, opacity: 0 };
  
  const animateAnim = { rotateY: 0, rotateZ: 0, scale: 1, opacity: 1 };

  return (
    <motion.div
      initial={initialAnim}
      animate={animateAnim}
      transition={{ delay, duration: 0.6, type: 'spring', stiffness: 120, damping: 14 }}
      className={`w-10 h-[56px] sm:w-[48px] sm:h-[66px] rounded-lg border relative overflow-hidden select-none ${isHighlighted ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-gray-300'}`}
      style={{
        background: isHighlighted ? 'linear-gradient(180deg, #fef9e7 0%, #f5e6c8 40%, #e8d4a8 100%)' : 'linear-gradient(180deg, #fefefe 0%, #f0ebe0 40%, #e8e0d0 100%)',
        boxShadow: isHighlighted
          ? '0 0 24px hsl(var(--casino-gold) / 0.8), 0 0 12px hsl(var(--casino-gold) / 0.5), 0 4px 14px rgba(0,0,0,0.35)'
          : '0 4px 14px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.2)',
        transformStyle: 'preserve-3d',
        perspective: '800px',
      }}
    >
      {/* Top-left rank + suit */}
      <div className={`absolute top-0.5 left-0.5 flex flex-col items-center leading-none ${colorClass}`}>
        <span className="text-[9px] sm:text-[11px] font-extrabold">{card.rank}</span>
        <span className="text-[8px] sm:text-[10px] -mt-0.5">{suit}</span>
      </div>

      {/* Center suit */}
      <div className={`absolute inset-0 flex items-center justify-center ${colorClass}`}>
        <span className="text-lg sm:text-xl opacity-90">{suit}</span>
      </div>

      {/* Bottom-right rank + suit (mirrored) */}
      <div className={`absolute bottom-0.5 right-0.5 flex flex-col items-center leading-none rotate-180 ${colorClass}`}>
        <span className="text-[9px] sm:text-[11px] font-extrabold">{card.rank}</span>
        <span className="text-[8px] sm:text-[10px] -mt-0.5">{suit}</span>
      </div>

      {/* Subtle inner border */}
      <div className="absolute inset-[2px] rounded-md border border-gray-200/50 pointer-events-none" />
    </motion.div>
  );
};

export default Card;
