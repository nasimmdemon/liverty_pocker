import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsLandscapeMobile } from '@/hooks/use-orientation';
import { X, Users, UserPlus, Lock, Sparkles } from 'lucide-react';
import { hapticLight, hapticMedium, hapticHeavy, hapticSuccess } from '@/lib/haptics';
import { useAuth } from '@/contexts/AuthContext';
import CreateGameModal from '@/components/multiplayer/CreateGameModal';
import JoinGameModal from '@/components/multiplayer/JoinGameModal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatChips, formatFunds } from '@/lib/formatChips';
import LoadingScreen from '@/components/poker/LoadingScreen';
import {
  runMatchmakingUntilSeated,
  MATCHMAKING_POST_MATCH_COUNTDOWN_SEC,
  MATCHMAKING_WAIT_MS,
  type MatchmakingTierKey,
} from '@/lib/matchmaking';
import {
  subscribeMatchmakingLobbyMetrics,
  maxPressureForTierMode,
  visibleLobbyStakeOptionCount,
  type LobbyMetricsSnapshot,
} from '@/lib/matchmakingLobbyMetrics';
import {
  fetchMonitorMatchmakingTiming,
  fetchBotFallbackDisabledPools,
  isTierAllBotFallbackDisabled,
} from '@/lib/monitorSettings';
import {
  startGame,
  getGameRoomById,
  isMatchmakingBotUserId,
  type GameRoom,
  type GameRoomPlayer,
} from '@/lib/multiplayer';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
    sitAndGoOptions: ['0.01-0.02', '0.02-0.04', '0.04-0.08', '0.08-0.16'],
    tournamentOptions: ['$0.15', '$0.30', '$0.60', '$1.20'],
    color: '200 60% 50%',
  },
  {
    key: 'rat', label: 'RAT', emoji: '🐀',
    commission: '3.5%', tournamentEntrance: '7%', organizerProfit: 7, affiliateShare: 30,
    sitAndGoOptions: ['0.08-0.16', '0.16-0.32', '0.24-0.48', '0.32-0.64'],
    tournamentOptions: ['$1.20', '$2.40', '$3.60', '$4.80'],
    color: '120 50% 45%',
  },
  {
    key: 'cat', label: 'CAT', emoji: '🐱',
    commission: '2.5%', tournamentEntrance: '6%', organizerProfit: 8, affiliateShare: 30,
    sitAndGoOptions: ['0.24-0.48', '0.32-0.64', '0.48-0.72', '0.50-0.80'],
    tournamentOptions: ['$3.60', '$4.80', '$6.00', '$6.50'],
    color: '280 55% 55%',
  },
  {
    key: 'dog', label: 'DOG', emoji: '🐕',
    commission: '2.0%', tournamentEntrance: '5%', organizerProfit: 10, affiliateShare: 30,
    sitAndGoOptions: ['0.48-0.72', '0.50-0.80', '0.60-0.90', '0.70-1.00'],
    tournamentOptions: ['$6.00', '$6.50', '$7.50', '$8.50'],
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
  /** Public matchmaking: deduct before search, refund on failure */
  deductFunds?: (amount: number) => Promise<void>;
  addFunds?: (amount: number) => Promise<void>;
  onMatchmakingComplete?: (room: GameRoom) => void;
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
  onSelect: (small: number, big: number, subTierIndex: number) => void;
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
                  onClick={() => onSelect(small, big, i)}
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
  deductFunds,
  addFunds,
  onMatchmakingComplete,
}: SitAndGoScreenProps) => {
  const { user, profile } = useAuth();
  const isLandscapeMobile = useIsLandscapeMobile();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(!!joinCodeFromUrl);
  const [gameMode, setGameMode] = useState<GameMode>('tournament');
  const [tableType, setTableType] = useState<TableType | null>(null);
  const [selectedTierPopup, setSelectedTierPopup] = useState<TierData | null>(null);
  const [expandedTier, setExpandedTier] = useState<TierData | null>(null);
  /** Tier used for stakes + matchmaking after details are collapsed (kept when expandedTier is null). */
  const [matchmakingTier, setMatchmakingTier] = useState<TierData | null>(null);
  const [selectedStake, setSelectedStake] = useState<{ small: number; big: number } | null>(null);
  const [showPromotion, setShowPromotion] = useState<TierKey | null>(null);
  const [selectedSubTierIndex, setSelectedSubTierIndex] = useState(0);
  const [matchmakingBusy, setMatchmakingBusy] = useState(false);
  /** GTA loader only while `runMatchmakingUntilSeated` is in flight — not after a room is returned. */
  const [mmSearching, setMmSearching] = useState(false);
  /** Progress bar length for matchmaking loader (synced to monitor “await time”, longer when tier is human-only). */
  const [mmMatchmakingBarSec, setMmMatchmakingBarSec] = useState(MATCHMAKING_WAIT_MS / 1000);
  const [matchPostCountdown, setMatchPostCountdown] = useState<number | null>(null);
  const [matchedOpponents, setMatchedOpponents] = useState<GameRoomPlayer[]>([]);
  const mmAbortRef = useRef<AbortController | null>(null);

  const [lobbyMetrics, setLobbyMetrics] = useState<LobbyMetricsSnapshot | null>(null);
  const [lobbyMetricsReady, setLobbyMetricsReady] = useState(false);
  const [lobbyMetricsFailed, setLobbyMetricsFailed] = useState(false);

  useEffect(() => {
    const unsub = subscribeMatchmakingLobbyMetrics(
      (snap) => {
        setLobbyMetrics(snap);
        setLobbyMetricsReady(true);
      },
      () => setLobbyMetricsFailed(true)
    );
    return () => unsub();
  }, []);

  const tierForStakes = expandedTier ?? matchmakingTier;

  const visibleStakeButtonCount = useMemo(() => {
    if (!tierForStakes) return 4;
    if (lobbyMetricsFailed || !lobbyMetricsReady) return 4;
    const maxP = maxPressureForTierMode(lobbyMetrics, tierForStakes.key as MatchmakingTierKey, gameMode);
    return visibleLobbyStakeOptionCount(maxP, true);
  }, [tierForStakes, gameMode, lobbyMetrics, lobbyMetricsReady, lobbyMetricsFailed]);

  const selectedStakeRef = useRef(selectedStake);
  selectedStakeRef.current = selectedStake;

  useEffect(() => {
    setSelectedSubTierIndex(0);
  }, [tierForStakes?.key]);

  /** Keep selected stake inside visible tier options when demand hides higher stakes. */
  useEffect(() => {
    if (!tierForStakes) return;
    const opts = gameMode === 'sit-and-go' ? tierForStakes.sitAndGoOptions : tierForStakes.tournamentOptions;
    if (opts.length === 0) return;
    const n = Math.min(visibleStakeButtonCount, opts.length);
    const parseOne = (opt: string) => {
      const isFree = opt.startsWith('FREE ');
      const cleanOpt = isFree ? opt.replace('FREE ', '') : opt;
      const rawOpt = cleanOpt.replace(/\$/g, '');
      const parts = rawOpt.split('-');
      const small = parseFloat(parts[0]);
      const big = parts.length > 1 ? parseFloat(parts[1]) : small;
      return { small, big };
    };
    const firstN = opts.slice(0, n).map((opt, subIdx) => ({ ...parseOne(opt), subIdx }));
    if (firstN.length === 0) return;

    const cur = selectedStakeRef.current;
    let pick = firstN[0];
    if (cur) {
      const hit = firstN.find((x) => x.small === cur.small && x.big === cur.big);
      if (hit) pick = hit;
    }

    setSelectedStake((prev) => {
      if (prev && prev.small === pick.small && prev.big === pick.big) return prev;
      return { small: pick.small, big: pick.big };
    });
    setSelectedSubTierIndex((prev) => (prev === pick.subIdx ? prev : pick.subIdx));
  }, [tierForStakes, gameMode, visibleStakeButtonCount]);

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
  // Sit & Go: allowed entrance is between (SB+BB)/2×20 and (SB+BB)×20 for the selected stakes.
  // Tournament: buy-in range still scales with player funds.
  const minEntrance = useMemo(() => {
    if (gameMode === 'sit-and-go') {
      const stake = selectedStake ?? FREE_SIT_AND_GO;
      const sum = stake.small + stake.big;
      return Math.round(((sum / 2) * 20) * 100) / 100;
    }
    return Math.max(0.1, Math.round(funds * 0.1 * 10) / 10);
  }, [gameMode, selectedStake, funds]);

  const maxEntrance = useMemo(() => {
    if (gameMode === 'sit-and-go') {
      const stake = selectedStake ?? FREE_SIT_AND_GO;
      const sum = stake.small + stake.big;
      return Math.round((sum * 20) * 100) / 100;
    }
    return Math.round(Math.max(minEntrance + 0.5, funds) * 10) / 10;
  }, [gameMode, selectedStake, funds, minEntrance]);
  const stepSize = useMemo(
    () => (maxEntrance <= 5 ? 0.1 : maxEntrance <= 50 ? 0.5 : 1),
    [maxEntrance]
  );

  const clampEntrance = useCallback(
    (v: number) => {
      const clamped = Math.min(Math.max(v, minEntrance), maxEntrance);
      const snapped = Math.round(clamped / stepSize) * stepSize;
      return Math.round(snapped * 100) / 100;
    },
    [minEntrance, maxEntrance, stepSize]
  );

  const [entranceAmount, setEntranceAmount] = useState(0.5);
  /** After deductFunds for matchmaking, wallet `funds` already excludes this; add back for display math so header ≠ double-count. */
  const [buyInHeldForMatchmaking, setBuyInHeldForMatchmaking] = useState(0);
  const [amountInputFocused, setAmountInputFocused] = useState(false);
  const [entranceDraft, setEntranceDraft] = useState('');

  /** Public lobby: show wallet minus selected buy-in; during matchmaking after deduct, offset by held amount so it stays correct. */
  const headerFundsDisplay = useMemo(() => {
    if (tableType !== 'public') return funds;
    return Math.max(0, Math.round((funds + buyInHeldForMatchmaking - entranceAmount) * 100) / 100);
  }, [tableType, funds, buyInHeldForMatchmaking, entranceAmount]);

  useEffect(() => {
    setEntranceAmount((prev) => clampEntrance(prev));
  }, [clampEntrance]);

  useEffect(() => {
    if (!amountInputFocused) setEntranceDraft(entranceAmount.toFixed(2));
  }, [entranceAmount, amountInputFocused]);

  const handleJoin = () => {
    hapticHeavy();
    const stake = selectedStake ?? FREE_SIT_AND_GO;
    const cardBack = gameMode === 'sit-and-go' ? CARD_BACK_SIT_AND_GO : CARD_BACK_TOURNAMENT;
    onJoinTable(entranceAmount, stake.small, stake.big, gameMode, cardBack);
  };

  const handleTierSelect = (small: number, big: number, subTierIndex?: number) => {
    hapticMedium();
    if (expandedTier) setMatchmakingTier(expandedTier);
    setSelectedStake({ small, big });
    if (typeof subTierIndex === 'number') setSelectedSubTierIndex(subTierIndex);
    setSelectedTierPopup(null);
    setExpandedTier(null);
  };

  const handleQuickMatch = async () => {
    if (!matchmakingTier || !selectedStake || !user || !deductFunds || !addFunds || !onMatchmakingComplete) {
      toast.error('Select a tier and a stake first, or matchmaking is unavailable.');
      return;
    }
    if (entranceAmount > funds + 1e-6) {
      toast.error('Not enough funds for this entrance.');
      return;
    }
    hapticHeavy();
    mmAbortRef.current = new AbortController();
    try {
      const timing = await fetchMonitorMatchmakingTiming();
      const disabled = await fetchBotFallbackDisabledPools();
      const tierHumanOnly = isTierAllBotFallbackDisabled(
        matchmakingTier.key as MatchmakingTierKey,
        disabled
      );
      const sec = Math.max(5, Math.ceil(timing.waitMs / 1000));
      setMmMatchmakingBarSec(tierHumanOnly ? Math.max(sec, 120) : sec);
      if (tierHumanOnly) {
        toast.info('Human-only tier: no bot fallback until ops re-enable bot fill.');
      }
    } catch {
      setMmMatchmakingBarSec(MATCHMAKING_WAIT_MS / 1000);
    }
    setMatchmakingBusy(true);
    setMmSearching(true);
    try {
      await deductFunds(entranceAmount);
      setBuyInHeldForMatchmaking(entranceAmount);
    } catch {
      toast.error('Could not update your balance. Try again.');
      setMatchmakingBusy(false);
      setMmSearching(false);
      mmAbortRef.current = null;
      return;
    }
    const abortSignal = mmAbortRef.current.signal;
    try {
      const room = await runMatchmakingUntilSeated(
        {
          userId: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Player',
          photoURL: user.photoURL ?? null,
          tierKey: matchmakingTier.key as MatchmakingTierKey,
          subTierIndex: selectedSubTierIndex,
          gameMode,
          buyIn: entranceAmount,
          smallBlind: selectedStake.small,
          bigBlind: selectedStake.big,
        },
        { signal: abortSignal }
      );

      setMmSearching(false);

      const opponentsForUi = room.players.filter((p) => p.userId !== user.uid);
      const showSeatFoundUi =
        room.status === 'waiting' && room.players.length >= 2 && opponentsForUi.length >= 1;

      let roomToOpen: GameRoom = room;

      if (showSeatFoundUi) {
        hapticSuccess();
        setMatchedOpponents(opponentsForUi);
        try {
          for (let s = MATCHMAKING_POST_MATCH_COUNTDOWN_SEC; s >= 1; s--) {
            if (abortSignal.aborted) throw new DOMException('Aborted', 'AbortError');
            setMatchPostCountdown(s);
            await new Promise<void>((resolve, reject) => {
              const id = window.setTimeout(resolve, 1000);
              const onAbort = () => {
                window.clearTimeout(id);
                reject(new DOMException('Aborted', 'AbortError'));
              };
              abortSignal.addEventListener('abort', onAbort, { once: true });
            });
          }
        } finally {
          setMatchPostCountdown(null);
          setMatchedOpponents([]);
        }
        if (abortSignal.aborted) throw new DOMException('Aborted', 'AbortError');

        const allHuman =
          room.players.length >= 2 &&
          room.players.every((p) => !isMatchmakingBotUserId(p.userId));
        if (allHuman) {
          await startGame(room.id);
          roomToOpen = (await getGameRoomById(room.id)) ?? room;
        }
      }

      onMatchmakingComplete(roomToOpen);
    } catch (e) {
      setMmSearching(false);
      await addFunds(entranceAmount);
      if ((e as Error).name !== 'AbortError') {
        if (e instanceof Error && e.message === 'MATCHMAKING_BOT_DISABLED') {
          toast.error(
            'No opponent found in time and automatic table fill is off for this stake. Funds were restored.'
          );
        } else {
          const code =
            e && typeof e === 'object' && 'code' in e ? String((e as { code?: string }).code) : '';
          toast.error(
            code
              ? `Matchmaking failed (${code}). Funds were restored.`
              : 'Matchmaking failed. Funds were restored.'
          );
        }
      }
    } finally {
      setBuyInHeldForMatchmaking(0);
      setMatchmakingBusy(false);
      setMmSearching(false);
      setMatchPostCountdown(null);
      setMatchedOpponents([]);
      mmAbortRef.current = null;
    }
  };

  const handleBackFromTierChoice = () => {
    if (matchmakingBusy) mmAbortRef.current?.abort();
    onBack();
  };

  const handleBackFromLobby = () => {
    if (matchmakingBusy) mmAbortRef.current?.abort();
    setTableType(null);
  };

  // ── Public/Private selection screen ──
  if (tableType === null) {
    return (
      <motion.div
        className="sitandgo-screen fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${pokerTableBg})` }} />
        <div className="absolute inset-0 bg-black/70" />

        {/* Back button */}
        <div className="choose-header absolute top-3 left-3 z-10">
          <motion.button
            className="back-btn casino-btn text-[10px] sm:text-xs px-3 sm:px-4 py-2 sm:py-2 min-h-[40px] touch-manipulation"
            onClick={handleBackFromTierChoice}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ← BACK
          </motion.button>
        </div>

        {onTestingMode && (
          <div className="choose-header absolute top-3 right-3 z-10">
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
          className="relative z-10 text-3xl sm:text-5xl md:text-6xl tracking-[0.15em] text-center mb-2 choose-title"
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          CHOOSE YOUR TABLE
        </motion.h1>

        <motion.p
          className="subtitle relative z-10 text-muted-foreground text-xs sm:text-sm mb-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Select how you want to play
        </motion.p>

        <div className="choose-cards relative z-10 flex flex-col sm:flex-row gap-4 sm:gap-6">
          {/* Public */}
          <motion.button
            className="choose-card group flex flex-col items-center gap-2 sm:gap-3 px-8 sm:px-14 py-6 sm:py-10 rounded-2xl border-2 border-primary/40 hover:border-primary transition-all touch-manipulation"
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
            <span className="choose-icon text-4xl sm:text-5xl">🌐</span>
            <span
              className="choose-title text-2xl sm:text-3xl tracking-wider"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
            >
              PUBLIC
            </span>
            <span className="choose-desc text-muted-foreground text-[10px] sm:text-xs max-w-[160px] text-center">
              Join open tables. Hands count toward tier promotion.
            </span>
          </motion.button>

          {/* Private */}
          <motion.button
            className="choose-card group flex flex-col items-center gap-2 sm:gap-3 px-8 sm:px-14 py-6 sm:py-10 rounded-2xl border-2 border-primary/40 hover:border-primary transition-all touch-manipulation"
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
            <span className="choose-icon text-4xl sm:text-5xl">🔒</span>
            <span
              className="choose-title text-2xl sm:text-3xl tracking-wider"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
            >
              PRIVATE
            </span>
            <span className="choose-desc text-muted-foreground text-[10px] sm:text-xs max-w-[160px] text-center">
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
      className={cn(
        'sitandgo-screen fixed inset-0 flex flex-col items-center overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden',
        matchmakingBusy && 'overflow-hidden'
      )}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as CSSProperties}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${pokerTableBg})` }} />
      <div className="absolute inset-0 bg-black/60" />

      {/* Top bar */}
      <div className="lobby-header relative z-10 w-full flex-shrink-0 flex justify-between items-center gap-2 px-2 sm:px-6 py-2 sm:py-4 min-w-0">
        <motion.button
          className="lobby-back casino-btn text-[10px] sm:text-xs px-2 sm:px-4 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[40px] shrink-0 touch-manipulation"
          onClick={handleBackFromLobby}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ← BACK
        </motion.button>

        <div className="flex items-center min-w-0 flex-1 justify-center overflow-hidden px-1">
          <span
            className="text-base sm:text-2xl md:text-3xl tracking-wider truncate text-center"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
            title={
              tableType === 'public'
                ? `Wallet $${formatFunds(funds)} · Buy-in $${formatFunds(entranceAmount)} · Shown: balance after this buy-in`
                : `FUNDS: $${formatFunds(funds)}`
            }
          >
            FUNDS: ${formatFunds(headerFundsDisplay)}
          </span>
        </div>

        {onTestingMode && (
          <motion.button
            className="casino-btn text-[10px] sm:text-xs px-2 sm:px-4 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[40px] shrink-0 touch-manipulation"
            onClick={onTestingMode}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🧪 TEST
          </motion.button>
        )}
      </div>

      {/* Unified content column — scrollable; justify-start so scroll works in landscape */}
      {tableType === 'public' && (
        <div
          className={cn(
            'lobby-content relative z-10 flex-1 flex flex-col items-center w-full max-w-[680px] px-4 py-4 overflow-y-auto overflow-x-hidden min-h-0 overscroll-contain [&::-webkit-scrollbar]:hidden',
            matchmakingBusy && 'pointer-events-none select-none'
          )}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as CSSProperties}
        >
          <div className="flex flex-col items-center w-full gap-4 sm:gap-5 py-2">
          {/* Game mode — segmented control */}
          <motion.div
            className="inline-flex p-1 rounded-full border border-white/10 bg-black/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            role="tablist"
            aria-label="Game mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={gameMode === 'tournament'}
              className={cn(
                'rounded-full px-4 sm:px-7 py-2 sm:py-2.5 text-[10px] sm:text-sm font-bold tracking-wider transition-all duration-200 touch-manipulation min-h-[40px] sm:min-h-[44px]',
                gameMode === 'tournament'
                  ? 'text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-100'
              )}
              style={
                gameMode === 'tournament'
                  ? {
                      fontFamily: "'Bebas Neue', sans-serif",
                      background: 'linear-gradient(180deg, hsl(350 62% 58%) 0%, hsl(350 52% 42%) 100%)',
                      boxShadow: '0 4px 24px hsl(350 50% 40% / 0.35)',
                    }
                  : { fontFamily: "'Bebas Neue', sans-serif" }
              }
              onClick={() => setGameMode('tournament')}
            >
              🏆 Tournament
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={gameMode === 'sit-and-go'}
              className={cn(
                'rounded-full px-4 sm:px-7 py-2 sm:py-2.5 text-[10px] sm:text-sm font-bold tracking-wider transition-all duration-200 touch-manipulation min-h-[40px] sm:min-h-[44px]',
                gameMode === 'sit-and-go'
                  ? 'text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-100'
              )}
              style={
                gameMode === 'sit-and-go'
                  ? {
                      fontFamily: "'Bebas Neue', sans-serif",
                      background: 'linear-gradient(180deg, hsl(152 48% 46%) 0%, hsl(152 42% 32%) 100%)',
                      boxShadow: '0 4px 24px hsl(140 45% 35% / 0.35)',
                    }
                  : { fontFamily: "'Bebas Neue', sans-serif" }
              }
              onClick={() => setGameMode('sit-and-go')}
            >
              🎰 Sit & Go
            </button>
          </motion.div>

          <div
            className="w-full max-w-md h-px opacity-60"
            style={{
              background: gameMode === 'tournament'
                ? 'linear-gradient(90deg, transparent, hsl(350 50% 50% / 0.45), transparent)'
                : 'linear-gradient(90deg, transparent, hsl(152 45% 42% / 0.45), transparent)',
            }}
          />

          <motion.div
            className="flex flex-col items-center gap-1.5 w-full"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.32em] text-muted-foreground/75 font-medium">
              🌐 Public — matchmaking
            </span>
            <h2
              className="lobby-select-tier text-2xl sm:text-4xl tracking-[0.18em] text-center bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500/85 bg-clip-text text-transparent drop-shadow-sm"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              SELECT TIER
            </h2>
            <div
              className="h-0.5 w-20 rounded-full opacity-90"
              style={{
                background: gameMode === 'tournament'
                  ? 'linear-gradient(90deg, transparent, hsl(350 55% 55%), transparent)'
                  : 'linear-gradient(90deg, transparent, hsl(152 45% 45%), transparent)',
              }}
            />
          </motion.div>

          {/* Tier cards — full width row, larger */}
          <motion.div
            className="tier-cards grid grid-cols-4 gap-2 sm:gap-3 w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {TIERS.map((tier) => {
              const isExpandedPanel = expandedTier?.key === tier.key;
              const isCommittedTier = matchmakingTier?.key === tier.key && selectedStake != null;
              const showTierActive = isExpandedPanel || isCommittedTier;
              const isLocked = !unlockedTiers.has(tier.key);
              return (
                <motion.button
                  key={tier.key}
                  className={cn(
                    'tier-card relative flex flex-col items-center gap-1.5 px-2.5 py-3 sm:py-4 rounded-2xl border transition-all overflow-hidden touch-manipulation backdrop-blur-sm',
                    isLocked && 'border-white/10 cursor-not-allowed',
                    !isLocked &&
                      !showTierActive &&
                      'border-white/10 hover:border-white/25 hover:bg-white/[0.03]',
                    !isLocked &&
                      showTierActive &&
                      'border-primary ring-2 ring-primary/50 ring-offset-2 ring-offset-black/40 shadow-[0_0_28px_hsl(var(--casino-gold)/0.22)]'
                  )}
                  style={{
                    background: isLocked
                      ? 'linear-gradient(160deg, hsl(0 0% 10% / 0.95) 0%, hsl(0 0% 4%) 100%)'
                      : showTierActive
                        ? `linear-gradient(160deg, hsl(${tier.color} / 0.28) 0%, hsl(0 0% 5%) 100%)`
                        : `linear-gradient(160deg, hsl(${tier.color} / 0.12) 0%, hsl(0 0% 6%) 100%)`,
                    fontFamily: "'Bebas Neue', sans-serif",
                    opacity: isLocked ? 0.5 : 1,
                  }}
                  onClick={() => {
                    if (isLocked) return;
                    hapticLight();
                    if (isExpandedPanel) {
                      setExpandedTier(null);
                    } else {
                      setExpandedTier(tier);
                      setMatchmakingTier(tier);
                    }
                  }}
                  whileTap={isLocked ? {} : { scale: 0.97 }}
                >
                  {showTierActive && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{ boxShadow: `inset 0 0 36px hsl(${tier.color} / 0.2)` }}
                      layoutId={`tier-glow-${tier.key}`}
                    />
                  )}
                  {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/45 rounded-2xl backdrop-blur-[2px]">
                      <Lock size={24} className="text-muted-foreground" />
                    </div>
                  )}
                  <span className={`tier-emoji text-3xl sm:text-4xl ${isLocked ? 'grayscale' : ''}`}>{tier.emoji}</span>
                  <span className="tier-label text-sm sm:text-base tracking-wider leading-tight" style={{ color: isLocked ? 'hsl(var(--muted-foreground))' : `hsl(${tier.color})` }}>
                    {tier.label}
                  </span>
                  <span className="tier-fee text-muted-foreground text-[10px] sm:text-xs leading-tight">
                    {gameMode === 'sit-and-go' ? `${tier.commission} commission` : `${tier.tournamentEntrance} fee`}
                  </span>
                  {showTierActive && (
                    <motion.div
                      className="w-6 h-0.5 rounded-full mt-0.5"
                      style={{ background: `hsl(${tier.color})` }}
                      layoutId={`tier-indicator-${tier.key}`}
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>

          {/* Expanded tier options — full width */}
          <AnimatePresence mode="wait">
            {expandedTier && (
              <motion.div
                key={expandedTier.key}
                className="lobby-expanded-tier w-full rounded-2xl border border-white/10 overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl"
                style={{
                  background: `linear-gradient(165deg, hsl(${expandedTier.color} / 0.14) 0%, hsl(0 0% 5% / 0.92) 55%, hsl(0 0% 4%) 100%)`,
                }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                {/* Promotion progress bar */}
                {nextTier ? (
                  <div className="lobby-progress px-5 py-3.5 border-b border-primary/15">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm uppercase tracking-widest text-muted-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                        Next: {nextTier.emoji} {nextTier.label}
                      </span>
                      <span className="text-sm text-primary font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                        {handsInCurrentTier} / {HANDS_PER_TIER}
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'hsl(0 0% 10%)', border: '1px solid hsl(var(--casino-gold) / 0.3)' }}>
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
                    <span className="text-[10px] sm:text-xs text-muted-foreground/60 mt-1.5 block text-center">
                      Play {HANDS_PER_TIER - handsInCurrentTier} more public hands to unlock {nextTier.label}
                    </span>
                  </div>
                ) : (
                  <div className="px-5 py-3 border-b border-primary/15 text-center">
                    <span className="text-xs sm:text-sm uppercase tracking-widest text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                      🏆 Max Tier Reached
                    </span>
                  </div>
                )}

                <div className="px-5 pt-4 pb-2 flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70 font-medium">
                    {gameMode === 'sit-and-go' ? 'Stakes' : 'Entry'}
                  </span>
                  <span className="text-foreground/95 text-sm sm:text-base tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    {gameMode === 'sit-and-go' ? 'Small blind / Big blind' : 'Tournament buy-in'}
                  </span>
                </div>

                <div className="lobby-stake-options px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {(gameMode === 'sit-and-go' ? expandedTier.sitAndGoOptions : expandedTier.tournamentOptions)
                    .slice(0, visibleStakeButtonCount)
                    .map((opt, i) => {
                    const isFree = opt.startsWith('FREE ');
                    const cleanOpt = isFree ? opt.replace('FREE ', '') : opt;
                    const rawOpt = cleanOpt.replace(/\$/g, '');
                    const parts = rawOpt.split('-');
                    const small = parseFloat(parts[0]);
                    const big = parts.length > 1 ? parseFloat(parts[1]) : small;
                    const isActive = selectedStake?.small === small && selectedStake?.big === big;

                    const displayLabel = gameMode === 'sit-and-go'
                      ? `${small} / ${big}`
                      : `$${small.toFixed(2)}`;

                    return (
                      <motion.button
                        key={i}
                        type="button"
                        className={cn(
                          'flex min-h-[52px] items-center justify-between gap-2 px-3.5 py-3 rounded-xl border text-left transition-all touch-manipulation',
                          isActive &&
                            'border-primary bg-primary/12 shadow-[0_0_0_1px_hsl(var(--casino-gold)/0.25),0_8px_24px_rgba(0,0,0,0.25)]',
                          !isActive &&
                            isFree &&
                            'border-emerald-500/35 hover:border-emerald-400/55 hover:bg-emerald-500/5',
                          !isActive &&
                            !isFree &&
                            'border-white/10 hover:border-white/25 hover:bg-white/[0.04]'
                        )}
                        style={{
                          background: isActive
                            ? undefined
                            : isFree
                              ? 'linear-gradient(165deg, hsl(145 28% 14%) 0%, hsl(145 22% 8%) 100%)'
                              : 'linear-gradient(165deg, hsl(0 0% 14%) 0%, hsl(0 0% 8%) 100%)',
                          fontFamily: "'Bebas Neue', sans-serif",
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTierSelect(small, big, i)}
                      >
                        <span className="text-foreground text-sm sm:text-[15px] tracking-wide flex items-center gap-2">
                          {isFree && (
                            <span className="text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30">
                              FREE
                            </span>
                          )}
                          {displayLabel}
                        </span>
                        {isActive && <span className="text-primary text-base shrink-0" aria-hidden>✓</span>}
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
              className="w-full flex flex-wrap items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 rounded-full border border-primary/50 bg-black/35 shadow-[0_0_0_1px_hsl(var(--casino-gold)/0.2)]"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="text-muted-foreground text-xs sm:text-sm font-semibold tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                SELECTED:
              </span>
              <span className="text-primary text-sm sm:text-base font-bold tracking-wide" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                {gameMode === 'sit-and-go'
                  ? `${selectedStake.small} / ${selectedStake.big} (SB/BB)`
                  : `$${selectedStake.small} Buy-in`}
              </span>
            </motion.div>
          )}

          <div
            className="buyin-panel w-full rounded-2xl border border-white/10 px-4 sm:px-5 py-4 sm:py-5 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl"
            style={{
              background: 'linear-gradient(165deg, hsl(0 0% 12% / 0.88) 0%, hsl(0 0% 5% / 0.94) 100%)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70 mb-1 font-medium">
                  {gameMode === 'tournament' ? 'Tournament' : 'Sit & Go'}
                </p>
                <h3
                  className="buyin-label text-lg sm:text-xl tracking-wider"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
                >
                  {gameMode === 'tournament' ? 'Buy-in amount' : 'Entrance amount'}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button
                  type="button"
                  className="rounded-lg border border-white/15 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors touch-manipulation"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  onClick={() => setEntranceAmount(clampEntrance(minEntrance))}
                >
                  Min
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-white/15 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors touch-manipulation"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  onClick={() =>
                    setEntranceAmount(clampEntrance((minEntrance + maxEntrance) / 2))
                  }
                >
                  Mid
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-white/15 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors touch-manipulation"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  onClick={() => setEntranceAmount(clampEntrance(maxEntrance))}
                >
                  Max
                </button>
              </div>
            </div>

            <div className="relative mb-4 flex items-center gap-2">
              <span
                className="pointer-events-none absolute left-3 z-[1] text-muted-foreground text-sm font-semibold"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                aria-hidden
              >
                $
              </span>
              <Input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                aria-label={gameMode === 'tournament' ? 'Buy-in dollars' : 'Entrance dollars'}
                className="h-11 sm:h-12 pl-7 text-lg sm:text-xl font-bold tabular-nums border-white/15 bg-black/40 text-primary focus-visible:ring-primary/50"
                style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
                value={amountInputFocused ? entranceDraft : entranceAmount.toFixed(2)}
                onFocus={() => {
                  setAmountInputFocused(true);
                  setEntranceDraft(entranceAmount.toFixed(2));
                }}
                onBlur={() => {
                  const v = parseFloat(entranceDraft.replace(/,/g, ''));
                  const next = Number.isFinite(v) ? clampEntrance(v) : entranceAmount;
                  setEntranceAmount(next);
                  setEntranceDraft(next.toFixed(2));
                  setAmountInputFocused(false);
                }}
                onChange={(e) => {
                  const s = e.target.value;
                  setEntranceDraft(s);
                  const v = parseFloat(s.replace(/,/g, ''));
                  if (Number.isFinite(v)) setEntranceAmount(clampEntrance(v));
                }}
              />
            </div>

            <div className="w-full flex items-center gap-3 sm:gap-4">
              <span
                className="text-muted-foreground text-[11px] sm:text-xs tabular-nums w-12 sm:w-14 shrink-0 text-right"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                ${formatFunds(minEntrance)}
              </span>
              <input
                type="range"
                min={minEntrance}
                max={maxEntrance}
                step={stepSize}
                value={Math.min(Math.max(entranceAmount, minEntrance), maxEntrance)}
                onChange={(e) => setEntranceAmount(clampEntrance(Number(e.target.value)))}
                className="bet-amount-slider flex-1 h-5 sm:h-6 rounded-full appearance-none cursor-pointer touch-manipulation"
                style={{ transition: 'none' }}
                aria-label="Adjust amount with slider"
              />
              <span
                className="text-muted-foreground text-[11px] sm:text-xs tabular-nums w-12 sm:w-14 shrink-0"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                ${formatFunds(maxEntrance)}
              </span>
            </div>
          </div>

          {/* Join chip → directly starts real-people matchmaking */}
          <p className="text-[10px] sm:text-xs text-muted-foreground text-center max-w-xs -mb-1">
            Tap the chip to <span className="text-primary">find a table</span> with real players.
          </p>
          <motion.button
            className="join-btn group mt-2 mb-2"
            onClick={() => void handleQuickMatch()}
            disabled={matchmakingBusy || !onMatchmakingComplete}
            whileHover={matchmakingBusy ? {} : { scale: 1.08 }}
            whileTap={matchmakingBusy ? {} : { scale: 0.95 }}
            style={{ opacity: matchmakingBusy || !onMatchmakingComplete ? 0.55 : 1 }}
          >
            <img
              src={joinTableChip}
              alt="Find a table"
              className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_8px_32px_hsl(var(--casino-gold)/0.4)] transition-all duration-300"
            />
          </motion.button>
          </div>
        </div>
      )}

      {/* Private: Create or Join table */}
      {tableType === 'private' && (
        <motion.div
          className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 px-4 pb-8 max-w-lg mx-auto w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.32em] text-muted-foreground/75 font-medium">
            🔒 Private tables
          </span>
          <h2
            className="text-lg sm:text-2xl tracking-wider"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
          >
            CREATE OR JOIN TABLE
          </h2>
          <p className="text-muted-foreground text-[10px] sm:text-xs text-center max-w-sm mb-2">
            Create your own table or join an existing game with a code.
          </p>

          <div className={`flex gap-4 sm:gap-6 w-full max-w-md ${isLandscapeMobile ? 'flex-row justify-center items-center' : 'flex-col sm:flex-row'}`}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    className="group flex flex-col items-center gap-3 px-8 sm:px-12 py-6 sm:py-8 rounded-2xl border-2 border-primary/40 hover:border-primary transition-all w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    style={{
                      background: 'linear-gradient(180deg, hsl(220 55% 18%) 0%, hsl(220 50% 10%) 100%)',
                    }}
                    onClick={() => canInviteFriends && setShowCreateModal(true)}
                    disabled={!canInviteFriends}
                    whileHover={canInviteFriends ? { scale: 1.03 } : {}}
                    whileTap={canInviteFriends ? { scale: 0.98 } : {}}
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
                    className="group flex flex-col items-center gap-3 px-8 sm:px-12 py-6 sm:py-8 rounded-2xl border-2 border-primary/40 hover:border-primary transition-all w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    style={{
                      background: 'linear-gradient(180deg, hsl(140 55% 18%) 0%, hsl(140 50% 10%) 100%)',
                    }}
                    onClick={() => canInviteFriends && setShowJoinModal(true)}
                    disabled={!canInviteFriends}
                    whileHover={canInviteFriends ? { scale: 1.03 } : {}}
                    whileTap={canInviteFriends ? { scale: 0.98 } : {}}
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
            onSelect={(s, b, idx) => handleTierSelect(s, b, idx)}
          />
        )}
      </AnimatePresence>

      {matchmakingBusy && mmSearching && (
        <div className="fixed inset-0 z-[260] bg-black">
          <LoadingScreen
            key="matchmaking-gta"
            suppressAutoComplete
            durationSec={mmMatchmakingBarSec}
            isPublic
          />
        </div>
      )}

      {matchmakingBusy && matchPostCountdown != null && (
        <div className="fixed inset-0 z-[261] flex items-center justify-center bg-black/80 px-4">
          <div className="rounded-2xl border border-primary/40 bg-background/95 px-8 py-6 text-center max-w-md w-full">
            <motion.div
              className="flex justify-center mb-4"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            >
              <Sparkles className="h-12 w-12 text-primary drop-shadow-[0_0_12px_hsl(var(--casino-gold)/0.6)]" />
            </motion.div>
            <p
              className="text-primary font-bold tracking-wider text-lg mb-1"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              {matchedOpponents.some((p) => isMatchmakingBotUserId(p.userId)) ? 'Table ready' : 'Match found'}
            </p>
            <p className="text-muted-foreground text-xs mb-4">
              {matchedOpponents.some((p) => isMatchmakingBotUserId(p.userId))
                ? 'You’ll play with a table bot until more players join.'
                : 'Real players at your table'}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-5">
              {matchedOpponents.map((p, i) => (
                <motion.div
                  key={p.userId}
                  className="flex flex-col items-center gap-1"
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.08 * i, type: 'spring', stiffness: 200, damping: 16 }}
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/60 shadow-[0_0_12px_hsl(var(--casino-gold)/0.25)]">
                    {isMatchmakingBotUserId(p.userId) ? (
                      <div className="w-full h-full bg-muted flex items-center justify-center text-2xl" aria-hidden>
                        🤖
                      </div>
                    ) : p.photoURL ? (
                      <img src={p.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full bg-primary/35 flex items-center justify-center text-primary text-lg font-bold"
                        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                      >
                        {p.displayName[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-foreground max-w-[88px] truncate font-medium">{p.displayName}</span>
                </motion.div>
              ))}
            </div>
            <motion.div
              key={matchPostCountdown}
              className="text-5xl font-bold text-primary tabular-nums mb-2"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              initial={{ scale: 1.35, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              {matchPostCountdown}
            </motion.div>
            <p className="text-muted-foreground text-xs tracking-wide">Continuing…</p>
          </div>
        </div>
      )}

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
