import { motion } from 'framer-motion';
import { PlayingCard as CardType, isRedSuit, cardToString } from '@/lib/gameLogic';

interface CardProps {
  card: CardType;
  delay?: number;
  index?: number;
}

const Card = ({ card, delay = 0, index = 0 }: CardProps) => {
  if (!card.faceUp) {
    return (
      <motion.div
        initial={{ scale: 0, y: -100, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ delay, duration: 0.4, type: 'spring', stiffness: 200 }}
        className="w-10 h-14 sm:w-12 sm:h-16 rounded-lg border-2 border-border flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--casino-red)), hsl(0 50% 28%))',
        }}
      >
        <div className="w-6 h-8 sm:w-8 sm:h-10 border border-primary/30 rounded-sm flex items-center justify-center">
          <span className="font-display text-primary/40 text-[8px] sm:text-xs font-bold">LP</span>
        </div>
      </motion.div>
    );
  }

  const red = isRedSuit(card.suit);

  return (
    <motion.div
      initial={{ rotateY: 180, scale: 0.8 }}
      animate={{ rotateY: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, type: 'spring' }}
      className="w-10 h-14 sm:w-12 sm:h-16 rounded-lg border border-border flex flex-col items-center justify-center gap-0 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #f5f0e8 0%, #e8e0d0 100%)' }}
    >
      <span className={`text-xs sm:text-sm font-bold leading-none ${red ? 'text-red-600' : 'text-gray-900'}`}>
        {card.rank}
      </span>
      <span className={`text-sm sm:text-base leading-none ${red ? 'text-red-600' : 'text-gray-900'}`}>
        {card.suit}
      </span>
    </motion.div>
  );
};

export default Card;
