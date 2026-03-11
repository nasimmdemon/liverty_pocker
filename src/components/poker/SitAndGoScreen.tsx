import { useState } from 'react';
import { motion } from 'framer-motion';
import pokerTableBg from '@/assets/poker-table-bg.png';
import joinTableChip from '@/assets/join-table-chip.png';

type GameMode = 'tournament' | 'sit-and-go';
type TableType = 'public' | 'private';

interface StakeOption {
  small: number;
  big: number;
  label: string;
  isFree?: boolean;
}

const STAKE_OPTIONS: StakeOption[] = [
  { small: 0.2, big: 0.4, label: '0.2 / 0.4', isFree: true },
  { small: 0.5, big: 1, label: '0.5 / 1' },
  { small: 1, big: 2, label: '1 / 2' },
  { small: 2, big: 5, label: '2 / 5' },
];

interface SitAndGoScreenProps {
  onJoinTable: (buyIn: number, smallBlind: number, bigBlind: number) => void;
  onBack: () => void;
  onTestingMode?: () => void;
}

const SitAndGoScreen = ({ onJoinTable, onBack, onTestingMode }: SitAndGoScreenProps) => {
  const [gameMode, setGameMode] = useState<GameMode>('tournament');
  const [tableType, setTableType] = useState<TableType>('public');
  const [selectedStake, setSelectedStake] = useState(0);
  const [entranceAmount, setEntranceAmount] = useState(5000);
  const funds = 9;
  const minEntrance = 1000;
  const maxEntrance = 10000;

  const handleJoin = () => {
    const stake = STAKE_OPTIONS[selectedStake];
    onJoinTable(entranceAmount, stake.small, stake.big);
  };

  const tabBtnClass = (active: boolean) =>
    `px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-sm font-bold tracking-wider transition-all border-2 ${
      active
        ? 'border-primary shadow-[0_0_15px_hsl(var(--casino-gold)/0.4)]'
        : 'border-primary/30 hover:border-primary/60'
    }`;

  const tabBtnStyle = (active: boolean) => ({
    fontFamily: "'Bebas Neue', sans-serif",
    background: active
      ? 'linear-gradient(180deg, hsl(var(--casino-red)) 0%, hsl(0 50% 25%) 100%)'
      : 'linear-gradient(180deg, hsl(0 20% 18%) 0%, hsl(0 15% 12%) 100%)',
    color: 'hsl(var(--casino-gold))',
  });

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center overflow-y-auto overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${pokerTableBg})` }} />
      <div className="absolute inset-0 bg-black/60" />

      {/* Top bar */}
      <div className="relative z-10 w-full flex justify-between items-center px-3 sm:px-6 py-3 sm:py-4">
        <motion.button
          className="casino-btn text-[10px] sm:text-xs px-2 sm:px-4 py-1.5 sm:py-2 shrink-0"
          onClick={onBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ← BACK
        </motion.button>

        <div className="flex items-center gap-2 sm:gap-3">
          <span
            className="text-xl sm:text-2xl tracking-wider"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
          >
            FUNDS: {funds} $
          </span>
        </div>

        {onTestingMode && (
          <motion.button
            className="casino-btn text-[10px] sm:text-xs px-2 sm:px-4 py-1.5 sm:py-2 shrink-0"
            onClick={onTestingMode}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🧪 TEST
          </motion.button>
        )}
      </div>

      {/* Game Mode Tabs: Tournament (main) | Sit & Go */}
      <motion.div
        className="relative z-10 flex items-center gap-2 sm:gap-3 mt-1"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <button className={tabBtnClass(gameMode === 'tournament')} style={tabBtnStyle(gameMode === 'tournament')} onClick={() => setGameMode('tournament')}>
          🏆 TOURNAMENT
        </button>
        <button className={tabBtnClass(gameMode === 'sit-and-go')} style={tabBtnStyle(gameMode === 'sit-and-go')} onClick={() => setGameMode('sit-and-go')}>
          🎰 SIT & GO
        </button>
      </motion.div>

      {/* Table Type Tabs: Public | Private */}
      <motion.div
        className="relative z-10 flex items-center gap-2 sm:gap-3 mt-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <button className={tabBtnClass(tableType === 'public')} style={tabBtnStyle(tableType === 'public')} onClick={() => setTableType('public')}>
          🌐 PUBLIC
        </button>
        <button className={tabBtnClass(tableType === 'private')} style={tabBtnStyle(tableType === 'private')} onClick={() => setTableType('private')}>
          🔒 PRIVATE
        </button>
      </motion.div>

      {/* Mode description */}
      <motion.p
        className="relative z-10 text-muted-foreground text-[10px] sm:text-xs text-center mt-2 px-4 max-w-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {gameMode === 'tournament'
          ? tableType === 'public'
            ? 'Join a public tournament. Hands count toward tier promotion.'
            : 'Create a private tournament. Share a link for friends to join.'
          : tableType === 'public'
            ? 'Join a public cash game. Hands count toward tier promotion.'
            : 'Create a private cash table with custom stakes.'}
      </motion.p>

      {/* Divider */}
      <div className="relative z-10 w-[80%] sm:w-[60%] max-w-md h-px bg-primary/30 my-3 sm:my-4" />

      {/* Stake Options */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <h2
          className="text-lg sm:text-2xl tracking-wider"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
        >
          STAKE OPTIONS
        </h2>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {STAKE_OPTIONS.map((stake, i) => (
            <motion.button
              key={i}
              className={`relative px-3 sm:px-5 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all border-2 ${
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
              <span className="flex items-center gap-1.5">
                <span className="text-base">🎰</span>
                {stake.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Divider */}
      <div className="relative z-10 w-[80%] sm:w-[60%] max-w-md h-px bg-primary/30 my-3 sm:my-4" />

      {/* Entrance Amount */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 w-[95%] sm:w-[80%] max-w-sm px-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <h2
          className="text-lg sm:text-2xl tracking-wider"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
        >
          ENTRANCE AMOUNT
        </h2>

        <div className="w-full flex items-center gap-2 sm:gap-4">
          <span className="text-muted-foreground text-xs" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            ${minEntrance.toLocaleString()}
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
          <span className="text-muted-foreground text-xs" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            ${maxEntrance.toLocaleString()}
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
        className="relative z-10 mt-4 sm:mt-6 group mb-6"
        onClick={handleJoin}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.55, type: 'spring' }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        <img
          src={joinTableChip}
          alt="Join Table"
          className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_8px_32px_hsl(var(--casino-gold)/0.4)] transition-all duration-300"
        />
      </motion.button>
    </motion.div>
  );
};

export default SitAndGoScreen;
