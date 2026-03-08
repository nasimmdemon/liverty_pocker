import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import pokerRoomBg from '@/assets/poker-room-bg.png';

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    const timer = setTimeout(() => {
      onComplete();
    }, 5000);

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
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Spinning chip */}
        <motion.div
          className="w-20 h-20 rounded-full border-4 flex items-center justify-center"
          style={{
            borderColor: '#F2D27A',
            background: 'radial-gradient(circle, #8B1A1A 0%, #4a0e0e 100%)',
            boxShadow: '0 0 20px rgba(242, 210, 122, 0.3)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <span style={{ color: '#F2D27A', fontFamily: "'Bebas Neue', 'Cinzel', serif", fontSize: '24px' }}>♠</span>
        </motion.div>

        {/* Loading text */}
        <div className="text-center">
          <h2
            className="text-3xl md:text-4xl tracking-[0.15em]"
            style={{
              fontFamily: "'Bebas Neue', 'Cinzel', serif",
              color: '#F2D27A',
              textShadow: '0 2px 10px rgba(242, 210, 122, 0.4)',
              minWidth: '320px',
            }}
          >
            ENTERING TABLE{dots}
          </h2>
        </div>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;
