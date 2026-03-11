import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import charactersBg from '@/assets/characters-bg.png';

interface LoadingScreenProps {
  onComplete: () => void;
}

const LOADING_DURATION = 5; // seconds
const MESSAGE_INTERVAL_MIN = 15; // seconds
const MESSAGE_INTERVAL_MAX = 30; // seconds — random between 15–30s per message

const ROTATING_MESSAGES = [
  '30% rake from each hand your recruit play',
  '10% rake from each hand played on self hosted server',
  'we use Anti Cheat system which returns money to those who played against cheaters',
];

const shuffle = <T,>(arr: T[]): T[] => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const getRandomIntervalMs = () => {
  const sec = MESSAGE_INTERVAL_MIN + Math.random() * (MESSAGE_INTERVAL_MAX - MESSAGE_INTERVAL_MIN);
  return sec * 1000;
};

const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [messages] = useState(() => shuffle(ROTATING_MESSAGES));
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, LOADING_DURATION * 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [onComplete]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      timeoutId = setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % messages.length);
        scheduleNext();
      }, getRandomIntervalMs());
    };

    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [messages.length]);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-end overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Characters background - full bleed */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${charactersBg})` }}
      />
      {/* Dark gradient from bottom for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

      {/* Content at bottom */}
      <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-4 mb-[12vh] sm:mb-[15vh] w-full px-4 sm:px-8">
        {/* Loading text */}
        <h2
          className="text-xl sm:text-2xl md:text-3xl tracking-[0.1em] sm:tracking-[0.15em] text-center"
          style={{
            fontFamily: "'Bebas Neue', 'Cinzel', serif",
            color: '#F2D27A',
            textShadow: '0 2px 10px rgba(242, 210, 122, 0.4)',
            minWidth: 'min(280px, 90vw)',
          }}
        >
          CREATING TABLE FOR YOU
        </h2>

        {/* Horizontal loading bar */}
        <div
          className="relative w-full max-w-md h-2.5 sm:h-3 md:h-4 rounded-full overflow-hidden"
          style={{
            border: '1px solid hsl(var(--casino-gold) / 0.5)',
            background: 'hsl(var(--casino-dark) / 0.6)',
          }}
        >
          <motion.div
            className="absolute top-0 left-0 bottom-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, hsl(var(--casino-gold)), hsl(45 80% 65%))',
              boxShadow: '0 0 12px rgba(242, 210, 122, 0.5)',
            }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: LOADING_DURATION, ease: 'linear' }}
          />
        </div>

        {/* Rotating messages — change every 15–30 seconds */}
        <div className="min-h-[2.5em] sm:min-h-[3em] flex items-center justify-center mt-2 sm:mt-4 px-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              className="text-sm sm:text-lg md:text-2xl lg:text-3xl tracking-[0.06em] sm:tracking-[0.08em] text-center"
              style={{
                fontFamily: "'Bebas Neue', 'Cinzel', serif",
                color: '#F2D27A',
                textShadow: '0 2px 8px rgba(0,0,0,0.6)',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
            >
              {messages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;
