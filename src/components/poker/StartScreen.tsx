import { motion } from 'framer-motion';
import PlayButton from './PlayButton';
import charactersBg from '@/assets/characters-alt.png';
import pokerRoomBg from '@/assets/poker-room-bg.png';

interface StartScreenProps {
  onPlay: () => void;
}

const StartScreen = ({ onPlay }: StartScreenProps) => {
  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Dark poker room background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${pokerRoomBg})` }}
      />

      {/* Characters overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${charactersBg})`, backgroundPosition: 'center 60%' }}
      />

      {/* Dark gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-start px-6 py-5 z-10">
        <h1
          className="text-2xl md:text-3xl tracking-wider"
          style={{ fontFamily: "'Bebas Neue', 'Cinzel', serif", color: '#F2D27A' }}
        >
          LIBERTY POKER
        </h1>
        <span
          className="text-xl md:text-2xl tracking-wider"
          style={{ fontFamily: "'Bebas Neue', 'Cinzel', serif", color: '#F2D27A' }}
        >
          FUNDS: 999$
        </span>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-8 mt-16">
        <motion.h2
          className="text-3xl md:text-4xl lg:text-5xl tracking-[0.2em] text-center"
          style={{ fontFamily: "'Bebas Neue', 'Cinzel', serif", color: '#F2D27A', textShadow: '0 3px 10px rgba(0,0,0,0.7)' }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          WELCOME TO LIBERTY POKER
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5, type: 'spring' }}
        >
          <PlayButton onClick={onPlay} />
        </motion.div>
      </div>

      {/* Bottom icons row */}
      <div className="absolute bottom-6 right-6 flex items-center gap-3 z-10">
        {['◁', 'ⓘ', '☺', '⚙', '⇥'].map((icon, i) => (
          <button
            key={i}
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: '#F2D27A', border: '1px solid rgba(242, 210, 122, 0.3)' }}
          >
            {icon}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default StartScreen;
