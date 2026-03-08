import { motion } from 'framer-motion';

interface PlayButtonProps {
  onClick: () => void;
}

const PlayButton = ({ onClick }: PlayButtonProps) => {
  return (
    <motion.button
      onClick={onClick}
      className="relative px-16 py-6 text-4xl md:text-5xl font-display tracking-wider uppercase rounded-2xl border-3 cursor-pointer select-none"
      style={{
        fontFamily: "'Bebas Neue', 'Cinzel', serif",
        background: 'linear-gradient(180deg, #C0392B 0%, #8B1A1A 50%, #6B1010 100%)',
        border: '3px solid #F2D27A',
        color: '#F2D27A',
        boxShadow: '0 0 30px rgba(242, 210, 122, 0.4), 0 8px 20px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.15)',
        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
      }}
      whileHover={{
        scale: 1.08,
        boxShadow: '0 0 50px rgba(242, 210, 122, 0.6), 0 0 80px rgba(242, 210, 122, 0.3), 0 12px 30px rgba(0,0,0,0.7)',
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      PLAY NOW
    </motion.button>
  );
};

export default PlayButton;
