import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import pokerRoomBg from '@/assets/poker-room-bg.png';

interface LoadingScreenProps {
  onComplete: () => void;
}

const LOADING_DURATION = 5; // seconds

const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    const timer = setTimeout(() => {
      onComplete();
    }, LOADING_DURATION * 1000);

    return () => {
      clearInterval(dotInterval);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${pokerRoomBg})` }}
      />
      <div className="absolute inset-0 bg-black/70" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Title text */}
        <h2
          className="text-3xl md:text-4xl tracking-[0.15em]"
          style={{
            fontFamily: "'Bebas Neue', 'Cinzel', serif",
            color: '#F2D27A',
            textShadow: '0 2px 10px rgba(242, 210, 122, 0.4)',
            minWidth: '280px',
            textAlign: 'center',
          }}
        >
          ENTERING TABLE{dots}
        </h2>

        {/* Vertical loading bar */}
        <div
          className="relative w-10 sm:w-12 rounded-lg overflow-hidden"
          style={{
            height: '200px',
            border: '2px solid hsl(var(--casino-gold))',
            background: 'hsl(var(--casino-dark) / 0.8)',
            boxShadow: '0 0 20px rgba(242, 210, 122, 0.15)',
          }}
        >
          {/* Fill from bottom to top */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 rounded-b-md"
            style={{
              background: 'linear-gradient(0deg, hsl(var(--casino-red)), hsl(var(--casino-gold)))',
              boxShadow: '0 -4px 15px rgba(242, 210, 122, 0.4)',
            }}
            initial={{ height: '0%' }}
            animate={{ height: '100%' }}
            transition={{ duration: LOADING_DURATION, ease: 'linear' }}
          />
          {/* Shine overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
            }}
          />
        </div>

        {/* Percentage text */}
        <motion.span
          className="text-lg tracking-wider"
          style={{
            fontFamily: "'Bebas Neue', 'Cinzel', serif",
            color: '#F2D27A',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          LOADING
        </motion.span>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;
