import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, UserPlus, Lock } from 'lucide-react';
import { hapticLight, hapticMedium, hapticHeavy } from '@/lib/haptics';
import { useAuth } from '@/contexts/AuthContext';
import CreateGameModal from '@/components/multiplayer/CreateGameModal';
import JoinGameModal from '@/components/multiplayer/JoinGameModal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatChips } from '@/lib/formatChips';
import pokerTableBg from '@/assets/poker-table-bg.png';
import joinTableChip from '@/assets/join-table-chip.png';

// ── Tier data ──────────────────────────────────────────────
type TierKey = 'human' | 'rat' | 'cat' | 'dog';

interface TierData {
  key: TierKey;
  label: string;
  emoji: string;
  commission: string;        // Sit & Go commission %
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
    commission: '5.0%', tournamentEntrance: '11%', organizerProfit: 0, affiliateShare: 30,
    sitAndGoOptions: ['FREE 0.01-0.02', '0.08-0.16', '0.24-0.48', '0.48-0.72'],
    tournamentOptions: ['FREE $0.15', '$1.20', '$3.60', '$6.50'],
    color: '200 60% 50%',
  },
  {
    key: 'rat', label: 'RAT', emoji: '🐀',
    commission: '3.5%', tournamentEntrance: '7%', organizerProfit: 7, affiliateShare: 30,
    sitAndGoOptions: ['0.02-0.04', '0.16-0.32', '0.32-0.64', '0.50-0.80'],
    tournamentOptions: ['$0.30', '$2.40', '$4.80', '$6.50'],
    color: '120 50% 45%',
  },
  {
    key: 'cat', label: 'CAT', emoji: '🐱',
    commission: '2.5%', tournamentEntrance: '6%', organizerProfit: 8, affiliateShare: 30,
    sitAndGoOptions: ['0.04-0.08', '0.24-0.48', '0.48-0.72', '0.60-0.90'],
    tournamentOptions: ['$0.60', '$3.60', '$6.00', '$7.50'],
    color: '280 55% 55%',
  },
  {
    key: 'dog', label: 'DOG', emoji: '🐕',
    commission: '2.0%', tournamentEntrance: '5%', organizerProfit: 10, affiliateShare: 30,
    sitAndGoOptions: ['0.08-0.16', '0.32-0.64', '0.50-0.80', '0.70-1.00'],
    tournamentOptions: ['$1.20', '$4.80', '$6.50', '$8.50'],
    color: '40 80% 50%',
  },
];

// Free play option (always visible under Public)
const FREE_SIT_AND_GO = { small: 0.01, big: 0.02, label: '0.01 / 0.02' };

// Card backs: Sit & Go = card 1, Tournament = card 2
const CARD_BACK_SIT_AND_GO = '/card_bg_1.png';
const CARD_BACK_TOURNAMENT = '/card_bg_2.png';

// ── Types ──────────────────────────────────────────────────
type GameMode = 'tournament' | 'sit-and-go';
type TableType = 'public' | 'private';

const BOT_MATCHES_REQUIRED = 3;

interface SitAndGoScreenProps {
  onJoinTable: (buyIn: number, smallBlind: number, bigBlind: number, gameMode?: 'tournament' | 'sit-and-go', cardBack?: string) => void;
  onBack: () => void;
  onTestingMode?: () => void;
  canInviteFriends?: boolean;
  botMatchesPlayed?: number;
  onMultiplayerCreate?: (room: import('@/lib/multiplayer').GameRoom) => void;
  onMultiplayerJoin?: (gameId: string, room?: any) => void;
  joinCodeFromUrl?: string | null;
  funds?: number;
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
      className="fixed inset-0 z-50 flex items-center justify-center px-3 py-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        className="relative z-10 w-full max-w-md max-h-[95vh] rounded-2xl border-2 border-primary/60 overflow-hidden flex flex-col"
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
            className="w-9 h-9 rounded-full border border-primary/40 flex items-center justify-center hover:bg-primary/20 transition-colors touch-manipulation shrink-0"
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

        {/* Options list - scrollable */}
        <div className="px-4 py-3 overflow-y-auto flex-1 min-h-0">
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
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-primary/30 hover:border-primary/70 transition-all touch-manipulation min-h-[48px]"
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
const SitAndGoScreen = ({
  onJoinTable,
  onBack,
  onTestingMode,
  canInviteFriends = false,
  botMatchesPlayed = 0,
  onMultiplayerCreate,
  onMultiplayerJoin,
  joinCodeFromUrl,
  funds: fundsProp = 9,
}: SitAndGoScreenProps) => {
  const { user, profile } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(!!joinCodeFromUrl);
  const [gameMode, setGameMode] = useState<GameMode>('tournament');
  const [tableType, setTableType] = useState<TableType | null>(null);
  const [selectedTierPopup, setSelectedTierPopup] = useState<TierData | null>(null);
  const [expandedTier, setExpandedTier] = useState<TierData | null>(null);
  const [selectedStake, setSelectedStake] = useState<{ small: number; big: number } | null>(null);
  const [showPromotion, setShowPromotion] = useState<TierKey | null>(null);

  // Tier progression: 100 hands per tier to unlock next
  const HANDS_PER_TIER = 100;
  const handsPlayed = profile?.handsPlayed ?? 0;
  const tierOrder: TierKey[] = ['human', 'rat', 'cat', 'dog'];
  const unlockedTierIndex = Math.min(Math.floor(handsPlayed / HANDS_PER_TIER) + 1, tierOrder.length); // +1 because human is always unlocked
  const unlockedTiers = new Set(tierOrder.slice(0, unlockedTierIndex));
  const currentTierIndex = unlockedTierIndex - 1;
  const handsInCurrentTier = handsPlayed % HANDS_PER_TIER;
  const nextTier = currentTierIndex < tierOrder.length - 1 ? TIERS[currentTierIndex + 1] : null;
  const funds = fundsProp;
  // Buy-in range correlates to player funds
  const minEntrance = Math.max(1, Math.floor(funds * 0.1 * 10) / 10);
  const maxEntrance = Math.max(minEntrance + 1, funds);
  const [entranceAmount, setEntranceAmount] = useState(Math.round((minEntrance + maxEntrance) / 2 * 10) / 10);

  const handleJoin = () => {
    hapticHeavy();
    const stake = selectedStake ?? FREE_SIT_AND_GO;
    const cardBack = gameMode === 'sit-and-go' ? CARD_BACK_SIT_AND_GO : CARD_BACK_TOURNAMENT;
    onJoinTable(entranceAmount, stake.small, stake.big, gameMode, cardBack);
  };

  const handleTierSelect = (small: number, big: number) => {
    hapticMedium();
    setSelectedStake({ small, big });
    setSelectedTierPopup(null);
  };

  const tabBtnClass = (active: boolean) =>
    `px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-sm font-bold tracking-wider transition-all border-2 ${
      active
        ? 'border-primary shadow-[0_0_15px_hsl(var(--casino-gold)/0.4)]'
        : 'border-primary/30 hover:border-primary/60'
    }`;

  const tabBtnStyle = (isTournament: boolean, active: boolean) => {
    if (active) {
      return {
        fontFamily: "'Bebas Neue', sans-serif" as const,
        background: isTournament
          ? 'linear-gradient(180deg, hsl(350 55% 32%) 0%, hsl(350 50% 20%) 100%)'
          : 'linear-gradient(180deg, hsl(140 45% 32%) 0%, hsl(140 40% 22%) 100%)',
        color: 'hsl(var(--casino-gold))',
        boxShadow: isTournament
          ? '0 0 20px hsl(350 50% 45% / 0.4)'
          : '0 0 20px hsl(140 50% 45% / 0.4)',
      };
    }
    return {
      fontFamily: "'Bebas Neue', sans-serif" as const,
      background: 'linear-gradient(180deg, hsl(0 20% 18%) 0%, hsl(0 15% 12%) 100%)',
      color: 'hsl(var(--casino-gold))',
    };
  };

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
            className="casino-btn text-[10px] sm:text-xs px-3 sm:px-4 py-2 sm:py-2 min-h-[40px] touch-manipulation"
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
              className="casino-btn text-[10px] sm:text-xs px-3 sm:px-4 py-2 sm:py-2 min-h-[40px] touch-manipulation"
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
            className="group flex flex-col items-center gap-2 sm:gap-3 px-8 sm:px-14 py-6 sm:py-10 rounded-2xl border-2 border-primary/40 hover:border-primary transition-all touch-manipulation"
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
            className="group flex flex-col items-center gap-2 sm:gap-3 px-8 sm:px-14 py-6 sm:py-10 rounded-2xl border-2 border-primary/40 hover:border-primary transition-all touch-manipulation"
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
      <div className="relative z-10 w-full flex-shrink-0 flex justify-between items-center px-3 sm:px-6 py-3 sm:py-4">
        <motion.button
          className="casino-btn text-[10px] sm:text-xs px-3 sm:px-4 py-2 sm:py-2 min-h-[40px] shrink-0 touch-manipulation"
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
            className="casino-btn text-[10px] sm:text-xs px-3 sm:px-4 py-2 sm:py-2 min-h-[40px] shrink-0 touch-manipulation"
            onClick={onTestingMode}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🧪 TEST
          </motion.button>
        )}
      </div>

      {/* Game Mode Tabs — distinct separation: Tournament (purple) vs Sit & Go (green) */}
      {tableType === 'public' && (
        <>
          <motion.div
            className="relative z-10 flex items-center gap-2 sm:gap-3 mt-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <button
              className={tabBtnClass(gameMode === 'tournament')}
              style={tabBtnStyle(true, gameMode === 'tournament')}
              onClick={() => setGameMode('tournament')}
            >
              🏆 TOURNAMENT
            </button>
            <button
              className={tabBtnClass(gameMode === 'sit-and-go')}
              style={tabBtnStyle(false, gameMode === 'sit-and-go')}
              onClick={() => setGameMode('sit-and-go')}
            >
              🎰 SIT & GO
            </button>
          </motion.div>
          <div
            className="relative z-10 w-[85%] sm:w-[70%] max-w-lg h-px my-3 sm:my-4"
            style={{
              background: gameMode === 'tournament'
                ? 'linear-gradient(90deg, transparent, hsl(350 50% 45% / 0.5), transparent)'
                : 'linear-gradient(90deg, transparent, hsl(140 50% 45% / 0.5), transparent)',
            }}
          />
        </>
      )}

      {/* PUBLIC: Tier cards with inline expansion */}
      {tableType === 'public' && (
        <motion.div
          className="relative z-10 flex flex-col items-center gap-2 px-4 w-full max-w-2xl"
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

          {/* Tier cards — horizontal row */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3 w-full">
            {TIERS.map((tier) => {
              const isSelected = expandedTier?.key === tier.key;
              const isLocked = !unlockedTiers.has(tier.key);
              return (
                <motion.button
                  key={tier.key}
                  className={`relative flex flex-col items-center gap-1 px-2 py-2 sm:py-3 rounded-xl border-2 transition-all overflow-hidden touch-manipulation ${
                    isLocked
                      ? 'border-muted/30 cursor-not-allowed'
                      : isSelected
                        ? 'border-primary shadow-[0_0_20px_hsl(var(--casino-gold)/0.3)]'
                        : 'border-primary/20 hover:border-primary/50'
                  }`}
                  style={{
                    background: isLocked
                      ? 'linear-gradient(180deg, hsl(0 0% 8% / 0.9) 0%, hsl(0 0% 4%) 100%)'
                      : isSelected
                        ? `linear-gradient(180deg, hsl(${tier.color} / 0.25) 0%, hsl(0 0% 6%) 100%)`
                        : `linear-gradient(180deg, hsl(${tier.color} / 0.1) 0%, hsl(0 0% 6%) 100%)`,
                    fontFamily: "'Bebas Neue', sans-serif",
                    opacity: isLocked ? 0.5 : 1,
                  }}
                  onClick={() => { if (!isLocked) { hapticLight(); setExpandedTier(isSelected ? null : tier); } }}
                  whileTap={isLocked ? {} : { scale: 0.96 }}
                >
                  {isSelected && (
                    <motion.div
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{ boxShadow: `inset 0 0 30px hsl(${tier.color} / 0.15)` }}
                      layoutId="tier-glow"
                    />
                  )}
                  {/* Lock overlay for Cat & Dog */}
                  {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 rounded-xl">
                      <Lock size={20} className="text-muted-foreground" />
                    </div>
                  )}
                  <span className={`text-2xl sm:text-3xl ${isLocked ? 'grayscale' : ''}`}>{tier.emoji}</span>
                  <span className="text-xs sm:text-sm tracking-wider leading-tight" style={{ color: isLocked ? 'hsl(var(--muted-foreground))' : `hsl(${tier.color})` }}>
                    {tier.label}
                  </span>
                  <span className="text-muted-foreground text-[8px] sm:text-[9px] leading-tight">
                    {tier.key === 'human' ? 'FREE • ' : ''}{tier.tournamentEntrance} fee
                  </span>
                  {isSelected && (
                    <motion.div
                      className="w-6 h-0.5 rounded-full mt-0.5"
                      style={{ background: `hsl(${tier.color})` }}
                      layoutId="tier-indicator"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Expanded tier options — inline below cards */}
          <AnimatePresence mode="wait">
            {expandedTier && (
              <motion.div
                key={expandedTier.key}
                className="w-full rounded-xl border border-primary/30 overflow-hidden"
                style={{
                  background: `linear-gradient(180deg, hsl(${expandedTier.color} / 0.08) 0%, hsl(0 0% 6%) 100%)`,
                }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                {/* Promotion progress bar to next tier */}
                {nextTier ? (
                  <div className="px-3 py-2.5 border-b border-primary/15">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                        Next: {nextTier.emoji} {nextTier.label}
                      </span>
                      <span className="text-[10px] text-primary font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                        {handsInCurrentTier} / {HANDS_PER_TIER}
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'hsl(0 0% 10%)', border: '1px solid hsl(var(--casino-gold) / 0.3)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, hsl(${expandedTier.color}), hsl(var(--casino-gold)))`,
                          boxShadow: `0 0 8px hsl(${expandedTier.color} / 0.5)`,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(handsInCurrentTier / HANDS_PER_TIER) * 100}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[8px] text-muted-foreground/60 mt-1 block text-center">
                      Play {HANDS_PER_TIER - handsInCurrentTier} more public hands to unlock {nextTier.label}
                    </span>
                  </div>
                ) : (
                  <div className="px-3 py-2 border-b border-primary/15 text-center">
                    <span className="text-[9px] uppercase tracking-widest text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                      🏆 Max Tier Reached
                    </span>
                  </div>
                )}

                {/* Stake label */}
                <div className="px-3 pt-2 pb-1">
                  <span className="text-muted-foreground text-[9px] uppercase tracking-widest" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    {gameMode === 'sit-and-go' ? 'Small / Big Blind' : 'Buy-in Options'}
                  </span>
                </div>

                {/* Stake options */}
                <div className="px-3 pb-2 flex flex-wrap gap-1.5 sm:gap-2">
                  {(gameMode === 'sit-and-go' ? expandedTier.sitAndGoOptions : expandedTier.tournamentOptions).map((opt, i) => {
                    const isFree = opt.startsWith('FREE ');
                    const cleanOpt = isFree ? opt.replace('FREE ', '') : opt;
                    // Remove $ from data since we add it in display
                    const rawOpt = cleanOpt.replace(/\$/g, '');
                    const parts = rawOpt.split('-');
                    const small = parseFloat(parts[0]);
                    const big = parts.length > 1 ? parseFloat(parts[1]) : small;
                    const isActive = selectedStake?.small === small && selectedStake?.big === big;

                    // Display label
                    const displayLabel = gameMode === 'sit-and-go'
                      ? `${small} / ${big}`
                      : `$${small.toFixed(2)}`;

                    return (
                      <motion.button
                        key={i}
                        className={`flex-1 min-w-[100px] flex items-center justify-between px-3 py-2 rounded-lg border transition-all touch-manipulation ${
                          isActive
                            ? 'border-primary bg-primary/15 shadow-[0_0_12px_hsl(var(--casino-gold)/0.2)]'
                            : isFree
                              ? 'border-green-500/40 hover:border-green-500/70'
                              : 'border-primary/20 hover:border-primary/50'
                        }`}
                        style={{
                          background: isActive
                            ? undefined
                            : isFree
                              ? 'linear-gradient(180deg, hsl(120 25% 14%) 0%, hsl(120 20% 8%) 100%)'
                              : 'linear-gradient(180deg, hsl(0 0% 12%) 0%, hsl(0 0% 8%) 100%)',
                          fontFamily: "'Bebas Neue', sans-serif",
                        }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleTierSelect(small, big)}
                      >
                        <span className="text-foreground text-xs sm:text-sm tracking-wider flex items-center gap-1.5">
                          {isFree && <span className="text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/20">FREE</span>}
                          {displayLabel}
                        </span>
                        {isActive && (
                          <span className="text-primary text-[10px]">✓</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Selected stake display */}
          {selectedStake && !expandedTier && (
            <motion.div
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-primary/5"
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

      {/* PRIVATE: Create or Join table — centered in middle of screen */}
      {tableType === 'private' && (
        <motion.div
          className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4 px-4 w-full max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2
            className="text-lg sm:text-2xl tracking-wider"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
          >
            CREATE OR JOIN TABLE
          </h2>
          <p className="text-muted-foreground text-[10px] sm:text-xs text-center max-w-sm mb-2">
            Create your own table or join an existing game with a code.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full max-w-md">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    className="group flex flex-col items-center gap-3 px-8 sm:px-12 py-6 sm:py-8 rounded-2xl border-2 border-primary/40 hover:border-primary transition-all w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(180deg, hsl(220 55% 18%) 0%, hsl(220 50% 10%) 100%)",
                    }}
                    onClick={() => canInviteFriends && setShowCreateModal(true)}
                    disabled={!canInviteFriends}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    whileHover={{ scale: 1.03, boxShadow: '0 0 24px hsl(var(--casino-gold) / 0.25)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Users className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                    <span
                      className="text-xl sm:text-2xl tracking-wider"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
                    >
                      CREATE GAME
                    </span>
                    <span className="text-muted-foreground text-[10px] sm:text-xs max-w-[140px] text-center">
                      Host a table and invite friends with a link
                    </span>
                    {!canInviteFriends && (
                      <span className="text-[10px] text-primary/80 mt-1">
                        ({botMatchesPlayed}/{BOT_MATCHES_REQUIRED} bot matches to unlock)
                      </span>
                    )}
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>
                  {canInviteFriends
                    ? 'Create a game and invite friends'
                    : `Play ${BOT_MATCHES_REQUIRED} bot matches to unlock`}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    className="group flex flex-col items-center gap-3 px-8 sm:px-12 py-6 sm:py-8 rounded-2xl border-2 border-primary/40 hover:border-primary transition-all w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(180deg, hsl(140 55% 18%) 0%, hsl(140 50% 10%) 100%)",
                    }}
                    onClick={() => canInviteFriends && setShowJoinModal(true)}
                    disabled={!canInviteFriends}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: 1.03, boxShadow: '0 0 24px hsl(var(--casino-gold) / 0.25)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <UserPlus className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                    <span
                      className="text-xl sm:text-2xl tracking-wider"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
                    >
                      JOIN GAME
                    </span>
                    <span className="text-muted-foreground text-[10px] sm:text-xs max-w-[140px] text-center">
                      Enter a code to join an existing table
                    </span>
                    {!canInviteFriends && (
                      <span className="text-[10px] text-primary/80 mt-1">
                        ({botMatchesPlayed}/{BOT_MATCHES_REQUIRED} bot matches to unlock)
                      </span>
                    )}
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>
                  {canInviteFriends
                    ? 'Join a game with invite code'
                    : `Play ${BOT_MATCHES_REQUIRED} bot matches to unlock`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.div>
      )}

      {/* Buy-in + Join — compact row for public */}
      {tableType === 'public' && (
        <motion.div
          className="relative z-10 flex flex-col items-center gap-2 w-full max-w-2xl px-4 mt-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div
            className="w-full rounded-xl border border-primary/25 px-4 py-3"
            style={{ background: 'linear-gradient(180deg, hsl(0 0% 8% / 0.9) 0%, hsl(0 0% 5% / 0.9) 100%)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className="text-sm sm:text-base tracking-wider"
                style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
              >
                {gameMode === 'tournament' ? 'BUY-IN' : 'ENTRANCE'}
              </h3>
              <span
                className="text-lg sm:text-xl tracking-wider font-bold"
                style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
              >
                ${formatChips(entranceAmount)}
              </span>
            </div>
            <div className="w-full flex items-center gap-3">
              <span className="text-muted-foreground text-[10px]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                ${formatChips(minEntrance)}
              </span>
              <input
                type="range"
                min={minEntrance}
                max={maxEntrance}
                step={500}
                value={entranceAmount}
                onChange={(e) => setEntranceAmount(Number(e.target.value))}
                className="bet-amount-slider flex-1 h-4 rounded-full appearance-none cursor-pointer touch-manipulation"
              />
              <span className="text-muted-foreground text-[10px]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                ${formatChips(maxEntrance)}
              </span>
            </div>
          </div>

          {/* Join button */}
          <motion.button
            className="group mt-1 mb-4"
            onClick={handleJoin}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            <img
              src={joinTableChip}
              alt="Join Table"
              className="w-16 h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_8px_32px_hsl(var(--casino-gold)/0.4)] transition-all duration-300"
            />
          </motion.button>
        </motion.div>
      )}

      {/* Create/Join modals — for private */}
      {tableType === 'private' && (
        <>
          <CreateGameModal
            open={showCreateModal}
            onOpenChange={setShowCreateModal}
            hostId={user?.uid ?? ''}
            hostName={user?.displayName || user?.email?.split('@')[0] || 'Player'}
            hostPhotoURL={user?.photoURL ?? null}
            onCreated={(room) => onMultiplayerCreate?.(room)}
            inviterId={profile?.referredBy}
            isPrivateTable={true}
          />
          <JoinGameModal
            open={showJoinModal}
            onOpenChange={setShowJoinModal}
            onJoined={(gameId, room) => onMultiplayerJoin?.(gameId, room)}
            initialCode={joinCodeFromUrl ?? undefined}
            currentUserId={user?.uid}
            currentUserName={user?.displayName || user?.email?.split('@')[0]}
            currentUserPhoto={user?.photoURL}
          />
        </>
      )}

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

      {/* Promotion Screen Modal */}
      <AnimatePresence>
        {showPromotion && (() => {
          const promoTier = TIERS.find(t => t.key === showPromotion);
          if (!promoTier) return null;
          return (
            <motion.div
              key="promotion-overlay"
              className="fixed inset-0 z-[200] flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPromotion(null)} />
              
              {/* Promotion card */}
              <motion.div
                className="relative z-10 flex flex-col items-center gap-4 px-8 py-8 sm:px-12 sm:py-10 rounded-2xl max-w-sm mx-4"
                style={{
                  background: `linear-gradient(180deg, hsl(${promoTier.color} / 0.2) 0%, hsl(0 0% 6%) 60%, hsl(0 0% 4%) 100%)`,
                  border: `2px solid hsl(${promoTier.color} / 0.6)`,
                  boxShadow: `0 0 60px hsl(${promoTier.color} / 0.3), inset 0 0 40px hsl(${promoTier.color} / 0.1)`,
                }}
                initial={{ scale: 0.3, y: 50, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.5, y: 50, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              >
                {/* Sparkle ring */}
                <motion.div
                  className="absolute -top-6 left-1/2 -translate-x-1/2"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: [0, 1.3, 1], rotate: 0 }}
                  transition={{ delay: 0.3, duration: 0.6, type: 'spring' }}
                >
                  <span className="text-5xl sm:text-6xl drop-shadow-lg">{promoTier.emoji}</span>
                </motion.div>

                <motion.div
                  className="mt-8 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h2 className="text-2xl sm:text-3xl tracking-[0.2em] mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif", color: `hsl(${promoTier.color})` }}>
                    🎉 PROMOTED!
                  </h2>
                  <p className="text-primary text-lg sm:text-xl tracking-wider" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    {promoTier.label} TIER UNLOCKED
                  </p>
                </motion.div>

                <motion.div
                  className="flex flex-col items-center gap-1.5 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <span className="text-muted-foreground text-xs">New stakes and lower fees await!</span>
                  <div className="flex gap-3 mt-1">
                    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg" style={{ background: 'hsl(0 0% 8%)', border: '1px solid hsl(var(--casino-gold) / 0.3)' }}>
                      <span className="text-primary text-sm font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                        {promoTier.commission}
                      </span>
                      <span className="text-muted-foreground text-[8px] uppercase">Commission</span>
                    </div>
                    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg" style={{ background: 'hsl(0 0% 8%)', border: '1px solid hsl(var(--casino-gold) / 0.3)' }}>
                      <span className="text-primary text-sm font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                        {promoTier.tournamentEntrance}
                      </span>
                      <span className="text-muted-foreground text-[8px] uppercase">Entrance</span>
                    </div>
                  </div>
                </motion.div>

                <motion.button
                  className="mt-3 px-8 py-2.5 rounded-xl font-bold tracking-wider text-sm"
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    background: `linear-gradient(180deg, hsl(${promoTier.color}) 0%, hsl(${promoTier.color} / 0.7) 100%)`,
                    color: 'hsl(0 0% 5%)',
                    boxShadow: `0 0 20px hsl(${promoTier.color} / 0.4)`,
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    hapticSuccess();
                    setShowPromotion(null);
                    // Auto-expand the newly unlocked tier
                    setExpandedTier(promoTier);
                  }}
                >
                  LET'S GO! 🚀
                </motion.button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
};

export default SitAndGoScreen;
