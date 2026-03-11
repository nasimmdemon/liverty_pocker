import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import pokerTableBg from '@/assets/poker-table-bg.png';
import joinTableChip from '@/assets/join-table-chip.png';

// ── Tier data ──────────────────────────────────────────────
type TierKey = 'human' | 'rat' | 'cat' | 'dog';

interface TierData {
  key: TierKey;
  label: string;
  emoji: string;
  tournamentEntrance: string;
  organizerProfit: number;
  affiliateShare: number;
  sitAndGoOptions: string[];
  tournamentOptions: string[];
  color: string; // accent hsl
}

const TIERS: TierData[] = [
  {
    key: 'human', label: 'HUMAN', emoji: '🧑',
    tournamentEntrance: '11%', organizerProfit: 0, affiliateShare: 30,
    sitAndGoOptions: ['FREE 0.01-0.02', '0.02-0.04', '0.04-0.08', '0.08-0.16'],
    tournamentOptions: ['FREE $0.15', '$0.30', '$0.60', '$1.20'],
    color: '200 60% 50%',
  },
  {
    key: 'rat', label: 'RAT', emoji: '🐀',
    tournamentEntrance: '7%', organizerProfit: 7, affiliateShare: 30,
    sitAndGoOptions: ['0.08-0.16', '0.16-0.32', '0.24-0.48', '0.32-0.64'],
    tournamentOptions: ['$1.20', '$2.40', '$3.60', '$4.80'],
    color: '120 50% 45%',
  },
  {
    key: 'cat', label: 'CAT', emoji: '🐱',
    tournamentEntrance: '6%', organizerProfit: 8, affiliateShare: 30,
    sitAndGoOptions: ['0.24-0.48', '0.32-0.64', '0.48-0.72', '0.50-0.80'],
    tournamentOptions: ['$3.60', '$4.80', '$6.00', '$6.50'],
    color: '280 55% 55%',
  },
  {
    key: 'dog', label: 'DOG', emoji: '🐕',
    tournamentEntrance: '5%', organizerProfit: 10, affiliateShare: 30,
    sitAndGoOptions: ['0.48-0.72', '0.50-0.80', '0.60-0.90', '0.70-1.00'],
    tournamentOptions: ['$6.00', '$6.50', '$7.50', '$8.50'],
    color: '40 80% 50%',
  },
];

// Free play option (always visible under Public)
const FREE_SIT_AND_GO = { small: 0.01, big: 0.02, label: '0.01 / 0.02' };

// ── Types ──────────────────────────────────────────────────
type GameMode = 'tournament' | 'sit-and-go';
type TableType = 'public' | 'private';

interface SitAndGoScreenProps {
  onJoinTable: (buyIn: number, smallBlind: number, bigBlind: number) => void;
  onBack: () => void;
  onTestingMode?: () => void;
}

// ── Tier Detail Popup ──────────────────────────────────────
const TierPopup = ({
  tier,
  gameMode,
  onClose,
  onSelect,
}: {
  tier: TierData;
  gameMode: GameMode;
  onClose: () => void;
  onSelect: (small: number, big: number) => void;
}) => {
  const options = gameMode === 'sit-and-go' ? tier.sitAndGoOptions : tier.tournamentOptions;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        className="relative z-10 w-full max-w-md rounded-2xl border-2 border-primary/60 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, hsl(0 0% 10%) 0%, hsl(0 0% 6%) 100%)',
        }}
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 30 }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-primary/30"
          style={{ background: `linear-gradient(135deg, hsl(${tier.color} / 0.3) 0%, transparent 100%)` }}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">{tier.emoji}</span>
            <h2
              className="text-xl sm:text-2xl tracking-wider"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: `hsl(${tier.color})` }}
            >
              {tier.label} TIER
            </h2>
          </div>
          <button
            className="w-8 h-8 rounded-full border border-primary/40 flex items-center justify-center hover:bg-primary/20 transition-colors"
            onClick={onClose}
          >
            <X size={16} className="text-primary" />
          </button>
        </div>

        {/* Stats */}
        <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-primary/20">
          <div className="flex flex-col items-center">
            <span className="text-primary text-lg font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {tier.tournamentEntrance}
            </span>
            <span className="text-muted-foreground text-[9px] uppercase tracking-wider">Entrance Fee</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-primary text-lg font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {tier.organizerProfit}%
            </span>
            <span className="text-muted-foreground text-[9px] uppercase tracking-wider">Org. Profit</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-primary text-lg font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {tier.affiliateShare}%
            </span>
            <span className="text-muted-foreground text-[9px] uppercase tracking-wider">Affiliate</span>
          </div>
        </div>

        {/* Options list */}
        <div className="px-4 py-3">
          <h3
            className="text-sm tracking-wider mb-2 text-muted-foreground"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            {gameMode === 'sit-and-go' ? 'SIT & GO STAKES' : 'TOURNAMENT BUY-INS'}
          </h3>
          <div className="flex flex-col gap-2">
            {options.map((opt, i) => {
              // Parse the option - handle FREE prefix
              const isFree = opt.startsWith('FREE ');
              const cleanOpt = isFree ? opt.replace('FREE ', '') : opt;
              const parts = cleanOpt.replace('$', '').split('-');
              const small = parseFloat(parts[0]);
              const big = parts.length > 1 ? parseFloat(parts[1]) : small;
              return (
                <motion.button
                  key={i}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border-2 border-primary/30 hover:border-primary/70 transition-all"
                  style={{
                    background: isFree
                      ? 'linear-gradient(180deg, hsl(120 25% 16%) 0%, hsl(120 20% 10%) 100%)'
                      : 'linear-gradient(180deg, hsl(0 0% 14%) 0%, hsl(0 0% 10%) 100%)',
                    fontFamily: "'Bebas Neue', sans-serif",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(small, big)}
                >
                  <span className="text-foreground text-sm tracking-wider flex items-center gap-2">
                    {isFree && <span className="text-lg">🆓</span>}
                    {gameMode === 'sit-and-go' ? `${cleanOpt} (SB/BB)` : `${cleanOpt} Buy-in`}
                  </span>
                  {isFree ? (
                    <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-1 rounded-full">FREE</span>
                  ) : (
                    <span
                      className="text-xs px-3 py-1 rounded-full border border-primary/50"
                      style={{ color: `hsl(${tier.color})` }}
                    >
                      SELECT
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Main Screen ────────────────────────────────────────────
const SitAndGoScreen = ({ onJoinTable, onBack, onTestingMode }: SitAndGoScreenProps) => {
  const [gameMode, setGameMode] = useState<GameMode>('tournament');
  const [tableType, setTableType] = useState<TableType | null>(null);
  const [selectedTierPopup, setSelectedTierPopup] = useState<TierData | null>(null);
  const [entranceAmount, setEntranceAmount] = useState(5000);
  const [selectedStake, setSelectedStake] = useState<{ small: number; big: number } | null>(null);
  const funds = 9;
  const minEntrance = 1000;
  const maxEntrance = 10000;

  const handleJoin = () => {
    const stake = selectedStake ?? FREE_SIT_AND_GO;
    onJoinTable(entranceAmount, stake.small, stake.big);
  };

  const handleTierSelect = (small: number, big: number) => {
    setSelectedStake({ small, big });
    setSelectedTierPopup(null);
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

  // ── Public/Private selection screen ──
  if (tableType === null) {
    return (
      <motion.div
        className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${pokerTableBg})` }} />
        <div className="absolute inset-0 bg-black/70" />

        {/* Back button */}
        <div className="absolute top-3 left-3 z-10">
          <motion.button
            className="casino-btn text-[10px] sm:text-xs px-3 py-1.5"
            onClick={onBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ← BACK
          </motion.button>
        </div>

        {onTestingMode && (
          <div className="absolute top-3 right-3 z-10">
            <motion.button
              className="casino-btn text-[10px] sm:text-xs px-3 py-1.5"
              onClick={onTestingMode}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🧪 TEST
            </motion.button>
          </div>
        )}

        <motion.h1
          className="relative z-10 text-3xl sm:text-5xl md:text-6xl tracking-[0.15em] text-center mb-2"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          CHOOSE YOUR TABLE
        </motion.h1>

        <motion.p
          className="relative z-10 text-muted-foreground text-xs sm:text-sm mb-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Select how you want to play
        </motion.p>

        <div className="relative z-10 flex flex-col sm:flex-row gap-4 sm:gap-6">
          {/* Public */}
          <motion.button
            className="group flex flex-col items-center gap-3 px-10 sm:px-14 py-8 sm:py-10 rounded-2xl border-2 border-primary/40 hover:border-primary transition-all"
            style={{
              background: 'linear-gradient(180deg, hsl(120 20% 12%) 0%, hsl(120 15% 7%) 100%)',
            }}
            onClick={() => setTableType('public')}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.04, boxShadow: '0 0 30px hsl(var(--casino-gold) / 0.3)' }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="text-4xl sm:text-5xl">🌐</span>
            <span
              className="text-2xl sm:text-3xl tracking-wider"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
            >
              PUBLIC
            </span>
            <span className="text-muted-foreground text-[10px] sm:text-xs max-w-[160px] text-center">
              Join open tables. Hands count toward tier promotion.
            </span>
          </motion.button>

          {/* Private */}
          <motion.button
            className="group flex flex-col items-center gap-3 px-10 sm:px-14 py-8 sm:py-10 rounded-2xl border-2 border-primary/40 hover:border-primary transition-all"
            style={{
              background: 'linear-gradient(180deg, hsl(0 20% 12%) 0%, hsl(0 15% 7%) 100%)',
            }}
            onClick={() => setTableType('private')}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            whileHover={{ scale: 1.04, boxShadow: '0 0 30px hsl(var(--casino-gold) / 0.3)' }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="text-4xl sm:text-5xl">🔒</span>
            <span
              className="text-2xl sm:text-3xl tracking-wider"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
            >
              PRIVATE
            </span>
            <span className="text-muted-foreground text-[10px] sm:text-xs max-w-[160px] text-center">
              Create your own table. Invite friends with a link.
            </span>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // ── Main lobby (after choosing Public/Private) ──
  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center overflow-y-auto overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${pokerTableBg})` }} />
      <div className="absolute inset-0 bg-black/60" />

      {/* Top bar */}
      <div className="relative z-10 w-full flex justify-between items-center px-3 sm:px-6 py-3 sm:py-4">
        <motion.button
          className="casino-btn text-[10px] sm:text-xs px-2 sm:px-4 py-1.5 sm:py-2 shrink-0"
          onClick={() => setTableType(null)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ← BACK
        </motion.button>

        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-xs px-2 py-1 rounded-full border border-primary/40 text-primary uppercase tracking-wider" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            {tableType === 'public' ? '🌐 Public' : '🔒 Private'}
          </span>
          <span
            className="text-lg sm:text-xl tracking-wider"
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

      {/* Game Mode Tabs */}
      <motion.div
        className="relative z-10 flex items-center gap-2 sm:gap-3 mt-1"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <button className={tabBtnClass(gameMode === 'tournament')} style={tabBtnStyle(gameMode === 'tournament')} onClick={() => setGameMode('tournament')}>
          🏆 TOURNAMENT
        </button>
        <button className={tabBtnClass(gameMode === 'sit-and-go')} style={tabBtnStyle(gameMode === 'sit-and-go')} onClick={() => setGameMode('sit-and-go')}>
          🎰 SIT & GO
        </button>
      </motion.div>

      {/* Divider */}
      <div className="relative z-10 w-[85%] sm:w-[70%] max-w-lg h-px bg-primary/30 my-3 sm:my-4" />

      {/* PUBLIC: Free + Tier cards */}
      {tableType === 'public' && (
        <motion.div
          className="relative z-10 flex flex-col items-center gap-3 px-4 w-full max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2
            className="text-lg sm:text-2xl tracking-wider"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
          >
            SELECT TIER
          </h2>

          {/* Tier cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full">
            {TIERS.map((tier) => (
              <motion.button
                key={tier.key}
                className="flex flex-col items-center gap-1.5 px-3 py-3 sm:py-4 rounded-xl border-2 border-primary/30 hover:border-primary/60 transition-all"
                style={{
                  background: `linear-gradient(180deg, hsl(${tier.color} / 0.15) 0%, hsl(0 0% 8%) 100%)`,
                  fontFamily: "'Bebas Neue', sans-serif",
                }}
                onClick={() => setSelectedTierPopup(tier)}
                whileHover={{ scale: 1.04, boxShadow: `0 0 20px hsl(${tier.color} / 0.3)` }}
                whileTap={{ scale: 0.96 }}
              >
                <span className="text-2xl sm:text-3xl">{tier.emoji}</span>
                <span className="text-sm sm:text-base tracking-wider" style={{ color: `hsl(${tier.color})` }}>
                  {tier.label}
                </span>
                <span className="text-muted-foreground text-[9px]">
                  {tier.key === 'human' ? 'FREE option • ' : ''}{tier.tournamentEntrance} fee
                </span>
                <span
                  className="text-[9px] px-2 py-0.5 rounded-full border mt-0.5"
                  style={{ borderColor: `hsl(${tier.color} / 0.5)`, color: `hsl(${tier.color})` }}
                >
                  VIEW OPTIONS
                </span>
              </motion.button>
            ))}
          </div>

          {/* Selected stake display */}
          {selectedStake && (
            <motion.div
              className="flex items-center gap-2 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="text-muted-foreground text-xs" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>SELECTED:</span>
              <span className="text-primary text-sm font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                {gameMode === 'sit-and-go'
                  ? `${selectedStake.small} / ${selectedStake.big} (SB/BB)`
                  : `$${selectedStake.small} Buy-in`}
              </span>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* PRIVATE: simpler stake options */}
      {tableType === 'private' && (
        <motion.div
          className="relative z-10 flex flex-col items-center gap-3 px-4 w-full max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2
            className="text-lg sm:text-2xl tracking-wider"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
          >
            SET YOUR STAKES
          </h2>
          <p className="text-muted-foreground text-[10px] sm:text-xs text-center max-w-sm">
            Private tables use custom stakes. Your tier commission rate still applies.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full">
            {TIERS.map((tier) => (
              <motion.button
                key={tier.key}
                className="flex flex-col items-center gap-1.5 px-3 py-3 sm:py-4 rounded-xl border-2 border-primary/30 hover:border-primary/60 transition-all"
                style={{
                  background: `linear-gradient(180deg, hsl(${tier.color} / 0.15) 0%, hsl(0 0% 8%) 100%)`,
                  fontFamily: "'Bebas Neue', sans-serif",
                }}
                onClick={() => setSelectedTierPopup(tier)}
                whileHover={{ scale: 1.04, boxShadow: `0 0 20px hsl(${tier.color} / 0.3)` }}
                whileTap={{ scale: 0.96 }}
              >
                <span className="text-2xl sm:text-3xl">{tier.emoji}</span>
                <span className="text-sm sm:text-base tracking-wider" style={{ color: `hsl(${tier.color})` }}>
                  {tier.label}
                </span>
                <span className="text-muted-foreground text-[9px]">{tier.organizerProfit}% org profit</span>
                <span
                  className="text-[9px] px-2 py-0.5 rounded-full border mt-0.5"
                  style={{ borderColor: `hsl(${tier.color} / 0.5)`, color: `hsl(${tier.color})` }}
                >
                  VIEW OPTIONS
                </span>
              </motion.button>
            ))}
          </div>

          {selectedStake && (
            <motion.div
              className="flex items-center gap-2 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="text-muted-foreground text-xs" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>SELECTED:</span>
              <span className="text-primary text-sm font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                {selectedStake.small} / {selectedStake.big}
              </span>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Divider */}
      <div className="relative z-10 w-[85%] sm:w-[70%] max-w-lg h-px bg-primary/30 my-3 sm:my-4" />

      {/* Entrance Amount */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 w-[95%] sm:w-[80%] max-w-sm px-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
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

      {/* Join Button */}
      <motion.button
        className="relative z-10 mt-4 sm:mt-6 group mb-6"
        onClick={handleJoin}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.45, type: 'spring' }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        <img
          src={joinTableChip}
          alt="Join Table"
          className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_8px_32px_hsl(var(--casino-gold)/0.4)] transition-all duration-300"
        />
      </motion.button>

      {/* Tier detail popup */}
      <AnimatePresence>
        {selectedTierPopup && (
          <TierPopup
            tier={selectedTierPopup}
            gameMode={gameMode}
            onClose={() => setSelectedTierPopup(null)}
            onSelect={handleTierSelect}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SitAndGoScreen;
