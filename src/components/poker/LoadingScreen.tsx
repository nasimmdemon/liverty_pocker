import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  onComplete: () => void;
  isPublic?: boolean;
}

const LOADING_DURATION = 24;
const FRAME_DURATION = 6;

type CharacterPosition = 'left' | 'center' | 'right';

/** Order: 1) dog2 left, 2) cat middle, 3) rat right, 4) cat_2 middle */
const LOADING_SCREENS: { background: string; character: string; position: CharacterPosition }[] = [
  { background: '/loading_screen/loading_bg5.jpg', character: '/loading_screen/dog2.png', position: 'left' },
  { background: '/loading_screen/loading_bg_3.jpg', character: '/loading_screen/cat_loading_carecter.png', position: 'center' },
  { background: '/loading_screen/loading_bg4.jpg', character: '/loading_screen/rat_loading_carecter.png', position: 'right' },
  { background: '/loading_screen/loadin_bg6.jpg', character: '/loading_screen/cat_2.png', position: 'center' },
];

/** Position classes for each character placement */
const POSITION_CLASSES: Record<CharacterPosition, string> = {
  left: 'justify-start pl-2 sm:pl-4',
  center: 'justify-center',
  right: 'justify-end pr-2 sm:pr-4',
};

function CharacterOverlay({ screen }: { screen: (typeof LOADING_SCREENS)[0] }) {
  const posClass = POSITION_CLASSES[screen.position];

  return (
    <motion.div
      className={`absolute inset-0 flex items-end pointer-events-none ${posClass}`}
    >
      <motion.img
        key={screen.character}
        src={screen.character}
        alt=""
        className="h-[95vh] max-h-[800px] w-auto object-contain object-bottom block"
        loading="eager"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: 1,
          scale: 1.08,
        }}
        transition={{
          opacity: { duration: 1, ease: 'easeOut' },
          scale: { duration: 5, ease: 'easeInOut' },
        }}
      />
    </motion.div>
  );
}

/** Preload all images so they display immediately when frame switches */
function preloadLoadingImages() {
  LOADING_SCREENS.forEach(({ background, character }) => {
    const bgImg = new Image();
    bgImg.src = background;
    const charImg = new Image();
    charImg.src = character;
  });
}

const LOADING_MESSAGES = [
  'Earn 30% commission for life from every hand your invited players play.',
  'Host private tables and earn 10% of the total rake from your games.',
  'The best poker players fold 70–80% of their hands. Patience pays.',
  'Position matters — late position gives you more information and control.',
  'A Royal Flush has a 1 in 649,739 chance of being dealt.',
  'Texas Hold\'em became popular after the 2003 World Series of Poker.',
  'Reading your opponents is often more valuable than reading the cards.',
  'Invite friends to play and earn a share of every pot they rake.',
  'The pot grows from small blind, big blind, and all bets and calls.',
  'House rake is 5% of each pot. Affiliates earn 30%, hosts earn 10%.',
];

const LoadingScreen = ({ onComplete, isPublic = true }: LoadingScreenProps) => {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    preloadLoadingImages();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => onComplete(), LOADING_DURATION * 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  // Cycle through 4 frames every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame((p) => (p + 1) % LOADING_SCREENS.length);
    }, FRAME_DURATION * 1000);
    return () => clearInterval(interval);
  }, []);

  // Cycle messages one by one at bottom (every ~2.5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((p) => (p + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const screen = LOADING_SCREENS[currentFrame];

  return (
    <motion.div
      className="fixed inset-0 flex flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Background + character: cycle every 5 seconds with crossfade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentFrame}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Background with slow zoom-in (per frame) */}
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${screen.background})` }}
            animate={{
              scale: [1, 1.15],
            }}
            transition={{
              duration: FRAME_DURATION,
              ease: 'easeInOut',
            }}
          />
          {/* Character overlay - position varies per frame, rich animation */}
          <CharacterOverlay screen={screen} />
        </motion.div>
      </AnimatePresence>
      {/* Dark gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/70 pointer-events-none" />

      {/* Content area - title + loading bar grouped, clearly separated from messages */}
      <div className="relative z-10 flex flex-col items-center justify-end min-h-full pb-[180px] sm:pb-[200px] px-4">
        <div className="w-full max-w-xl mx-auto space-y-5">
          {/* Title */}
          <motion.h2
            className="text-xl sm:text-2xl md:text-3xl tracking-[0.2em] text-center"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              color: '#F2D27A',
              textShadow: '0 2px 20px rgba(0,0,0,0.8)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {isPublic ? 'FINDING TABLE FOR YOU' : 'CREATING TABLE FOR YOU'}
          </motion.h2>

          {/* Progress bar - clearly above messages */}
          <div className="w-full max-w-sm mx-auto">
            <div
              className="relative h-2 rounded-full overflow-hidden"
              style={{
                background: 'rgba(0,0,0,0.7)',
                border: '1px solid rgba(242, 210, 122, 0.5)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
              }}
            >
              <motion.div
                className="absolute top-0 left-0 bottom-0 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #C9A227, #F2D27A)',
                  boxShadow: '0 0 10px rgba(242, 210, 122, 0.5)',
                }}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: LOADING_DURATION, ease: 'linear' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Message strip - separate at very bottom, animated style */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 py-6 sm:py-8 px-6 sm:px-10"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
        }}
      >
        <div className="w-full max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentMessage}
              className="text-center text-white/95 text-sm sm:text-base leading-relaxed max-w-xl mx-auto"
              style={{
                fontFamily: "'Cinzel', serif",
                fontStyle: 'italic',
                letterSpacing: '0.1em',
                textShadow: '0 2px 20px rgba(0,0,0,0.95), 0 0 40px rgba(242,210,122,0.15)',
              }}
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.5 }}
            >
              {LOADING_MESSAGES[currentMessage]}
            </motion.p>
          </AnimatePresence>
          <motion.div
            className="h-px w-16 sm:w-24 mx-auto mt-4 opacity-60"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(242,210,122,0.8), transparent)' }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;
