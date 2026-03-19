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

type MessagePart = { text: string; highlight?: boolean };

const LOADING_MESSAGES: MessagePart[][] = [
  [
    { text: 'Earn ' },
    { text: '30%', highlight: true },
    { text: ' from invited players — ' },
    { text: 'for life.', highlight: true },
  ],
  [
    { text: 'Host games. Earn ' },
    { text: '10%', highlight: true },
    { text: ' of rake.' },
  ],
  [
    { text: 'Invite friends. Earn ' },
    { text: '10%', highlight: true },
    { text: ' bonuses.' },
  ],
  [
    { text: 'Auto payouts — ' },
    { text: 'every week.', highlight: true },
  ],
  [
    { text: 'The best players fold ' },
    { text: '70–80%', highlight: true },
    { text: ' of their hands.' },
  ],
  [
    { text: 'House rake is ' },
    { text: '5%', highlight: true },
    { text: ' of each pot.' },
  ],
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

  // Cycle messages every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((p) => (p + 1) % LOADING_MESSAGES.length);
    }, 4000);
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

      {/* Content area - title + message + loading bar grouped */}
      <div className="relative z-10 flex flex-col items-center justify-end min-h-full pb-[120px] sm:pb-[140px] px-4">
        <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-5">
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

          {/* Rotating message - non-highlighted text below title */}
          <div className="w-full max-w-md mx-auto min-h-[24px] flex items-center justify-center -mt-2">
            <AnimatePresence mode="wait">
              <motion.p
                key={`msg-${currentMessage}`}
                className="text-center text-white/80 text-sm sm:text-base leading-relaxed"
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontStyle: 'italic',
                  letterSpacing: '0.1em',
                  textShadow: '0 2px 20px rgba(0,0,0,0.95)',
                }}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.5 }}
              >
                {LOADING_MESSAGES[currentMessage].filter(p => !p.highlight).map((part, i) => (
                  <span key={i}>{part.text}</span>
                ))}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
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

          {/* Highlighted text below progress bar */}
          <div className="w-full max-w-md mx-auto min-h-[24px] flex items-center justify-center -mt-1">
            <AnimatePresence mode="wait">
              <motion.p
                key={`hl-${currentMessage}`}
                className="text-center text-sm sm:text-base leading-relaxed"
                style={{
                  fontFamily: "'Cinzel', serif",
                  color: '#F2D27A',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textShadow: '0 0 30px rgba(242,210,122,0.3)',
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                {LOADING_MESSAGES[currentMessage].filter(p => p.highlight).map((part, i) => (
                  <span key={i}>{part.text} </span>
                ))}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Decorative divider */}
          <motion.div
            className="h-px w-16 sm:w-24 opacity-60"
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
