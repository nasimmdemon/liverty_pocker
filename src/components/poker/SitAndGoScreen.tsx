import { useState } from 'react';
import { motion } from 'framer-motion';
import pokerTableBg from '@/assets/poker-table-bg.png';
import joinTableChip from '@/assets/join-table-chip.png';

interface StakeOption {
  small: number;
  big: number;
  label: string;
  isFree?: boolean;
}

const STAKE_OPTIONS: StakeOption[] = [
  { small: 0.2, big: 0.4, label: '0.2 Small | 0.4 Big $', isFree: true },
  { small: 0.01, big: 0.02, label: '0.01 Small | 0.02 Big $' },
  { small: 0.4, big: 1, label: '0.4 Small | 1 Big $' },
];

interface SitAndGoScreenProps {
  onJoinTable: (buyIn: number, smallBlind: number, bigBlind: number) => void;
  onBack: () => void;
}

const SitAndGoScreen = ({ onJoinTable, onBack }: SitAndGoScreenProps) => {
  const [selectedStake, setSelectedStake] = useState(0);
  const [entranceAmount, setEntranceAmount] = useState(5000);
  const funds = 9;
  const minEntrance = 1000;
  const maxEntrance = 10000;

  const handleJoin = () => {
    const stake = STAKE_OPTIONS[selectedStake];
    onJoinTable(entranceAmount, stake.small, stake.big);
  };

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${pokerTableBg})` }} />
      <div className="absolute inset-0 bg-black/60" />

      {/* Top bar */}
      <div className="relative z-10 w-full flex justify-between items-start px-3 sm:px-6 py-3 sm:py-5 gap-2">
        <motion.button
          className="casino-btn text-[10px] sm:text-xs px-2 sm:px-4 py-1.5 sm:py-2 leading-tight text-center shrink-0"
          onClick={onBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          PRIVATE<br/>TABLE
        </motion.button>

        <motion.h1
          className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl tracking-[0.1em] sm:tracking-[0.15em] text-center flex-1 min-w-0"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          SIT & GO
        </motion.h1>

        <motion.button
          className="casino-btn text-[10px] sm:text-xs px-2 sm:px-4 py-1.5 sm:py-2 leading-tight text-center shrink-0"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          TOUR<br/>NAMENT
        </motion.button>
      </div>

      {/* Funds */}
      <motion.div
        className="relative z-10 mt-1 sm:mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <span
          className="text-xl sm:text-2xl md:text-3xl tracking-wider"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
        >
          FUNDS: {funds} $
        </span>
      </motion.div>

      {/* Divider */}
      <div className="relative z-10 w-[80%] sm:w-[60%] max-w-md h-px bg-primary/30 my-2 sm:my-4" />

      {/* Stake Options */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2
          className="text-xl sm:text-2xl md:text-3xl tracking-wider mb-1 sm:mb-2"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
        >
          STAKE OPTIONS
        </h2>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {STAKE_OPTIONS.map((stake, i) => (
            <motion.button
              key={i}
              className={`relative px-3 sm:px-5 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all duration-200 border-2 ${
                selectedStake === i
                  ? 'border-primary shadow-[0_0_20px_hsl(var(--casino-gold)/0.5)]'
                  : 'border-primary/40 hover:border-primary/70'
              }`}
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                background: selectedStake === i
                  ? 'linear-gradient(180deg, hsl(var(--casino-red)) 0%, hsl(0 50% 25%) 100%)'
                  : 'linear-gradient(180deg, hsl(0 40% 30%) 0%, hsl(0 40% 20%) 100%)',
                color: 'hsl(var(--casino-gold))',
              }}
              onClick={() => setSelectedStake(i)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {stake.isFree && (
                <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  FREE
                </span>
              )}
              <span className="flex items-center gap-2">
                <span className="text-base">🎰</span>
                {stake.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Divider */}
      <div className="relative z-10 w-[80%] sm:w-[60%] max-w-md h-px bg-primary/30 my-3 sm:my-5" />

      {/* Entrance Amount */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-2 sm:gap-4 w-[95%] sm:w-[80%] max-w-sm px-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2
          className="text-xl sm:text-2xl md:text-3xl tracking-wider"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
        >
          ENTRANCE AMOUNT
        </h2>

        <div className="w-full flex items-center gap-2 sm:gap-4">
          <span className="text-muted-foreground text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Min ${minEntrance.toLocaleString()}
          </span>
          <input
            type="range"
            min={minEntrance}
            max={maxEntrance}
            step={500}
            value={entranceAmount}
            onChange={(e) => setEntranceAmount(Number(e.target.value))}
            className="flex-1 accent-[hsl(var(--casino-gold))] h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, hsl(var(--casino-gold)) 0%, hsl(var(--casino-gold)) ${((entranceAmount - minEntrance) / (maxEntrance - minEntrance)) * 100}%, hsl(var(--muted)) ${((entranceAmount - minEntrance) / (maxEntrance - minEntrance)) * 100}%, hsl(var(--muted)) 100%)`,
            }}
          />
          <span className="text-muted-foreground text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Max ${maxEntrance.toLocaleString()}
          </span>
        </div>

        <span
          className="text-2xl sm:text-3xl tracking-wider"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
        >
          ${entranceAmount.toLocaleString()}
        </span>
      </motion.div>

      {/* Join Table Button */}
      <motion.button
        className="relative z-10 mt-4 sm:mt-8 group"
        onClick={handleJoin}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: 'spring' }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        <img
          src={joinTableChip}
          alt="Join Table"
          className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_8px_32px_hsl(var(--casino-gold)/0.4)] transition-all duration-300"
        />
      </motion.button>
    </motion.div>
  );
};

export default SitAndGoScreen;
