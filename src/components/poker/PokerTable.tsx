import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Settings } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Player, GameState } from '@/lib/gameTypes';
import {
  createInitialGameState,
  startNewRound,
  advancePhase,
  getNextActivePlayerIndex,
  simulateBotAction,
  isBettingRoundComplete,
  playerAction,
  getCallAmount,
  getMinRaiseTotal,
  getPlayersWithChips,
} from '@/lib/gameLogic';
import PlayerSeat from './PlayerSeat';
import Card from './Card';
import PotDisplay from './PotDisplay';
import ActionButtons from './ActionButtons';
import PlayerPopup from './PlayerPopup';
import ChipAnimation, { type ChipBet } from './ChipAnimation';
import WinChipAnimation from './WinChipAnimation';
import { BOT_CHAT_MESSAGES } from './GameChat';
import { useIsMobile } from '@/hooks/use-mobile';
import { playFoldSound, playWinSound, playCardRevealSound, playYourTurnSound, playCheckSound, unlockAudio } from '@/lib/sounds';
import { runAntiCheatOnExit } from '@/lib/antiCheat';
import { toast } from '@/hooks/use-toast';

// 6-player positions — zones and seats use IDENTICAL positions so avatars sit inside circles
const SEAT_POSITIONS_DESKTOP = [
  { top: '95%', left: '50%' },   // 0: Bottom center (user)
  { top: '80%', left: '10%' },   // 1: Bottom left
  { top: '20%', left: '10%' },   // 2: Top left
  { top: '8%', left: '50%' },    // 3: Top center
  { top: '20%', left: '90%' },   // 4: Top right
  { top: '80%', left: '90%' },   // 5: Bottom right
];

const SEAT_POSITIONS_MOBILE = [
  { top: '97%', left: '50%' },
  { top: '82%', left: '8%' },
  { top: '18%', left: '8%' },
  { top: '6%', left: '50%' },
  { top: '18%', left: '92%' },
  { top: '82%', left: '92%' },
];

// Multiplayer: 2 players opposite each other (user bottom, opponent top)
const MP_2_DESKTOP = [
  { top: '95%', left: '50%', isTopSeat: false },
  { top: '8%', left: '50%', isTopSeat: true },
];
const MP_2_MOBILE = [
  { top: '97%', left: '50%', isTopSeat: false },
  { top: '6%', left: '50%', isTopSeat: true },
];

// Multiplayer: 3 players — user bottom, others left and top
const MP_3_DESKTOP = [
  { top: '95%', left: '50%', isTopSeat: false },
  { top: '80%', left: '10%', isTopSeat: false },
  { top: '8%', left: '50%', isTopSeat: true },
];
const MP_3_MOBILE = [
  { top: '97%', left: '50%', isTopSeat: false },
  { top: '82%', left: '8%', isTopSeat: false },
  { top: '6%', left: '50%', isTopSeat: true },
];

// Multiplayer: 4 players — corners
const MP_4_DESKTOP = [
  { top: '95%', left: '50%', isTopSeat: false },
  { top: '80%', left: '10%', isTopSeat: false },
  { top: '8%', left: '50%', isTopSeat: true },
  { top: '80%', left: '90%', isTopSeat: false },
];
const MP_4_MOBILE = [
  { top: '97%', left: '50%', isTopSeat: false },
  { top: '82%', left: '8%', isTopSeat: false },
  { top: '6%', left: '50%', isTopSeat: true },
  { top: '82%', left: '92%', isTopSeat: false },
];

const DEFAULT_TURN_DURATION = 10;
const BOT_DELAY = 1500;
const SHOWDOWN_DELAY = 5000;

interface MultiplayerConfig {
  gameId: string;
  currentUserId: string;
  isHost: boolean;
  gameState: GameState | null;
  onUpdate: (state: GameState) => void;
}

interface PokerTableProps {
  initialBuyIn?: number;
  botCount?: number;
  smallBlind?: number;
  bigBlind?: number;
  turnTimer?: number;
  isTestingTable?: boolean;
  onExit?: () => void;
  seatAnchorOverrides?: {
    desktop?: { top: string; left: string }[];
    mobile?: { top: string; left: string }[];
  };
  multiplayer?: MultiplayerConfig;
}

const PokerTable = ({ initialBuyIn = 1500, botCount = 5, smallBlind = 5, bigBlind = 10, turnTimer: turnTimerProp, isTestingTable = false, onExit, seatAnchorOverrides, multiplayer }: PokerTableProps) => {
  const TURN_DURATION = turnTimerProp ?? DEFAULT_TURN_DURATION;
  const isMultiplayer = !!multiplayer;
  const [internalGameState, setInternalGameState] = useState<GameState | null>(null);
  const gameState = isMultiplayer ? multiplayer!.gameState : internalGameState;
  const setGameState = useCallback((updater: GameState | ((prev: GameState | null) => GameState | null)) => {
    if (isMultiplayer && multiplayer) {
      const next = typeof updater === 'function' ? updater(multiplayer.gameState) : updater;
      if (next) multiplayer.onUpdate(next);
    } else {
      setInternalGameState(updater as GameState | ((prev: GameState | null) => GameState | null));
    }
  }, [isMultiplayer, multiplayer]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [timer, setTimer] = useState(TURN_DURATION);
  const [chipBets, setChipBets] = useState<ChipBet[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const seatPositions = (
    isMobile
      ? seatAnchorOverrides?.mobile ?? SEAT_POSITIONS_MOBILE
      : seatAnchorOverrides?.desktop ?? SEAT_POSITIONS_DESKTOP
  );

  // Multiplayer: active players only, user always at bottom center, dynamic positions
  const getMultiplayerDisplay = useCallback((state: GameState) => {
    const active = state.players.filter(p => p.isActive && p.chips > 0);
    if (active.length === 0) return { displayPlayers: [], displayPositions: [] };
    const userIdx = active.findIndex(p => p.isUser);
    const rotated = userIdx >= 0
      ? [...active.slice(userIdx), ...active.slice(0, userIdx)]
      : active;
    const n = rotated.length;
    let positions: { top: string; left: string; isTopSeat?: boolean }[];
    if (n === 2) positions = isMobile ? MP_2_MOBILE : MP_2_DESKTOP;
    else if (n === 3) positions = isMobile ? MP_3_MOBILE : MP_3_DESKTOP;
    else if (n === 4) positions = isMobile ? MP_4_MOBILE : MP_4_DESKTOP;
    else {
      const base = isMobile ? SEAT_POSITIONS_MOBILE : SEAT_POSITIONS_DESKTOP;
      positions = base.slice(0, n).map((p, i) => ({ ...p, isTopSeat: i >= 2 && i <= 4 }));
    }
    return { displayPlayers: rotated, displayPositions: positions };
  }, [isMobile]);

  useEffect(() => {
    if (isMultiplayer) return;
    const initial = createInitialGameState(initialBuyIn, botCount, smallBlind, bigBlind);
    const round = startNewRound(initial);
    setInternalGameState(round);
    setTimer(TURN_DURATION);
  }, [initialBuyIn, botCount, smallBlind, bigBlind, TURN_DURATION, isMultiplayer]);

  const chipsAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const phaseAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIsUserTurnRef = useRef(false);

  const playChipsSound = useCallback(() => {
    try {
      const audio = new Audio('/chips_sound_effect.mp3');
      audio.volume = 0.8;
      audio.play().catch(() => {});
    } catch (_) {}
  }, []);

  useEffect(() => {
    const audio = new Audio('/chips_sound_effect.mp3');
    audio.preload = 'auto';
    audio.load();
  }, []);

  const triggerChipAnimation = useCallback((playerIndex: number, amount: number) => {
    playChipsSound();

    const seatEl = document.querySelector(`[data-seat-index="${playerIndex}"]`);
    const potEl = document.querySelector('[data-pot-display]');
    if (seatEl && potEl) {
      const seatRect = seatEl.getBoundingClientRect();
      const bet: ChipBet = {
        id: `${Date.now()}-${playerIndex}`,
        fromX: seatRect.left + seatRect.width / 2 - 28,
        fromY: seatRect.top + seatRect.height / 2,
        amount,
      };
      setChipBets(prev => [...prev, bet]);
    }
  }, [playChipsSound]);

  const handleChipAnimComplete = useCallback((id: string) => {
    setChipBets(prev => prev.filter(b => b.id !== id));
  }, []);

  const advanceTurn = useCallback((state: GameState): GameState => {
    if (state.showdown) return state;
    if (isBettingRoundComplete(state)) {
      return advancePhase(state);
    }
    const nextIdx = getNextActivePlayerIndex(state);
    if (nextIdx === -1) {
      let s = state;
      while (s.phase !== 'showdown') {
        s = advancePhase(s);
      }
      return s;
    }
    return { ...state, currentPlayerIndex: nextIdx };
  }, []);

  const [chatBubbles, setChatBubbles] = useState<Record<number, { id: number; text: string; playerName: string }>>({});
  const chatBubbleTimeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const gameStateRef = useRef<GameState | null>(null);
  const prevGameStateRef = useRef<GameState | null>(null);
  const prevForBetDetectionRef = useRef<GameState | null>(null);
  const chatBubbleIdRef = useRef(0);
  gameStateRef.current = gameState;

  const [winAnimation, setWinAnimation] = useState<{ winnerSeatIndex: number; winnerPlayerId: number; amount: number } | null>(null);
  const [showWinDisplay, setShowWinDisplay] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [eliminatedPlayer, setEliminatedPlayer] = useState<{ name: string; id: number; isUser: boolean } | null>(null);
  const [markedCheaters, setMarkedCheaters] = useState<Set<number>>(new Set());
  const [userAlone, setUserAlone] = useState(false);

  useEffect(() => {
    if (gameState?.showdown && gameState.winnerId !== null && prevGameStateRef.current && !prevGameStateRef.current.showdown) {
      const winnerSeatIndex = gameState.players.findIndex(p => p.id === gameState.winnerId);
      const winnerCount = gameState.winnerIds?.length ?? 1;
      const amountPerWinner = Math.floor(prevGameStateRef.current.pot / winnerCount);
      if (winnerSeatIndex >= 0 && gameState.winnerId != null && amountPerWinner > 0) {
        const id = setTimeout(() => {
          setWinAnimation({ winnerSeatIndex, winnerPlayerId: gameState.winnerId!, amount: amountPerWinner });
          setShowWinDisplay(true);
          playWinSound();
        }, 1500);
        return () => clearTimeout(id);
      }
    }
    if (!gameState?.showdown) setShowWinDisplay(false);
    prevGameStateRef.current = gameState ?? null;
  }, [gameState]);

  useEffect(() => {
    const isUserTurn = !!(
      gameState?.players[gameState.currentPlayerIndex]?.isUser &&
      !gameState.players[gameState.currentPlayerIndex].hasFolded &&
      !gameState.players[gameState.currentPlayerIndex].isAllIn &&
      !gameState.showdown
    );
    if (isUserTurn && !prevIsUserTurnRef.current) playYourTurnSound();
    prevIsUserTurnRef.current = isUserTurn;
  }, [gameState?.currentPlayerIndex, gameState?.showdown, gameState?.players]);

  // Chip animation + sound when other players bet (multiplayer: receive remote state)
  useEffect(() => {
    if (!gameState || !isMultiplayer) return;
    const prev = prevForBetDetectionRef.current;
    prevForBetDetectionRef.current = gameState;
    if (!prev) return;
    if (prev.roundNumber !== gameState.roundNumber || prev.phase !== gameState.phase) return;
    for (let i = 0; i < gameState.players.length; i++) {
      const p = gameState.players[i];
      const prevP = prev.players[i];
      if (!p || !prevP || p.isUser) continue;
      const betDelta = p.currentBet - prevP.currentBet;
      if (betDelta > 0) {
        triggerChipAnimation(p.id, betDelta);
        break;
      }
    }
  }, [gameState, isMultiplayer, triggerChipAnimation]);

  const showChatBubble = useCallback((playerId: number, text: string, playerName: string) => {
    chatBubbleIdRef.current += 1;
    const id = chatBubbleIdRef.current;
    setChatBubbles(prev => ({ ...prev, [playerId]: { id, text, playerName } }));
    if (chatBubbleTimeoutsRef.current[playerId]) clearTimeout(chatBubbleTimeoutsRef.current[playerId]);
    chatBubbleTimeoutsRef.current[playerId] = setTimeout(() => {
      setChatBubbles(prev => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
      delete chatBubbleTimeoutsRef.current[playerId];
    }, 5000);
  }, []);

  useEffect(() => {
    if (!gameState) return;
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    if (userAlone) return;

    if (isMultiplayer && !multiplayer!.isHost) return;

    if (gameState.showdown) {
      // Check for eliminated players (0 chips) after showdown
      const eliminated = gameState.players.filter(p => p.isActive && p.chips <= 0 && !eliminatedPlayer);
      if (eliminated.length > 0) {
        const first = eliminated[0];
        setTimeout(() => setEliminatedPlayer({ name: first.name, id: first.id, isUser: first.isUser }), 2000);
      }
      const userPlayer = gameState.players.find(p => p.isUser);
      if (userPlayer && userPlayer.chips <= 0 && !eliminatedPlayer) {
        setTimeout(() => setEliminatedPlayer({ name: userPlayer.name, id: userPlayer.id, isUser: true }), 2000);
      }

      botTimeoutRef.current = setTimeout(() => {
        setGameState(prev => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            players: prev.players.map(p =>
              p.chips <= 0 ? { ...p, isActive: false, status: 'sitting-out' as const } : p
            ),
          };
          const activePlayers = updated.players.filter(p => p.isActive && p.chips > 0);
          if (activePlayers.length <= 1) {
            return updated;
          }
          const next = startNewRound(updated);
          const withChips = getPlayersWithChips(next);
          setUserAlone(withChips.length <= 1);
          return next;
        });
        setTimer(TURN_DURATION);
      }, SHOWDOWN_DELAY);
      return () => {
        if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
      };
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.hasFolded || currentPlayer.isAllIn) {
      if (isBettingRoundComplete(gameState)) {
        phaseAdvanceTimeoutRef.current = setTimeout(() => {
          const state = gameStateRef.current;
          if (!state) return;
          const next = advancePhase(state);
          if (isMultiplayer && multiplayer) {
            multiplayer.onUpdate(next);
          } else {
            setInternalGameState(next);
          }
          phaseAdvanceTimeoutRef.current = null;
        }, 1000);
        return () => {
          if (phaseAdvanceTimeoutRef.current) clearTimeout(phaseAdvanceTimeoutRef.current);
        };
      }
      const state = gameStateRef.current;
      if (!state) return;
      const next = advanceTurn(state);
      if (isMultiplayer && multiplayer) {
        multiplayer.onUpdate(next);
      } else {
        setInternalGameState(next);
      }
      return;
    }

    if (isMultiplayer && !currentPlayer.isUser) return;

    setTimer(TURN_DURATION);
    timerRef.current = setInterval(() => {
      setTimer(prev => (prev <= 0 ? 0 : prev - 0.1));
    }, 100);

    if (!currentPlayer.isUser) {
      botTimeoutRef.current = setTimeout(() => {
        setGameState(prev => {
          if (!prev) return prev;
          const { state: afterBot, action: botAction } = simulateBotAction(prev);
          if (botAction === 'fold') playFoldSound();
          if (botAction === 'check') playCheckSound();
          const betAmount = afterBot.players[prev.currentPlayerIndex].currentBet - prev.players[prev.currentPlayerIndex].currentBet;
          if (betAmount > 0) triggerChipAnimation(prev.currentPlayerIndex, betAmount);
          // Randomly show bot chat bubble (~20% chance)
          if (Math.random() < 0.2) {
            const bot = prev.players[prev.currentPlayerIndex];
            const msg = BOT_CHAT_MESSAGES[Math.floor(Math.random() * BOT_CHAT_MESSAGES.length)];
            showChatBubble(bot.id, msg, bot.name);
          }
          return advanceTurn(afterBot);
        });
      }, BOT_DELAY + Math.random() * 1000);
    } else {
      botTimeoutRef.current = setTimeout(() => {
        playFoldSound();
        setGameState(prev => {
          if (!prev) return prev;
          return advanceTurn(playerAction(prev, prev.currentPlayerIndex, 'fold'));
        });
      }, TURN_DURATION * 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
      if (phaseAdvanceTimeoutRef.current) clearTimeout(phaseAdvanceTimeoutRef.current);
    };
  }, [gameState?.currentPlayerIndex, gameState?.phase, gameState?.showdown, gameState?.roundNumber, userAlone, isMultiplayer, multiplayer, advanceTurn, triggerChipAnimation, showChatBubble]);

  const handleUserAction = useCallback((action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in', amount?: number) => {
    if (!audioUnlockedRef.current) {
      audioUnlockedRef.current = true;
      unlockAudio();
    }
    if (action === 'fold') playFoldSound();
    if (action === 'check') playCheckSound();
    const prev = gameStateRef.current;
    if (!prev) return;
    const current = prev.players[prev.currentPlayerIndex];
    if (!current?.isUser) return;
    const afterAction = playerAction(prev, prev.currentPlayerIndex, action, amount);
    const betAmount = afterAction.players[prev.currentPlayerIndex].currentBet - prev.players[prev.currentPlayerIndex].currentBet;
    if (betAmount > 0) triggerChipAnimation(prev.currentPlayerIndex, betAmount);
    const next = advanceTurn(afterAction);
    if (isMultiplayer && multiplayer) {
      multiplayer.onUpdate(next);
    } else {
      setInternalGameState(next);
    }
  }, [advanceTurn, triggerChipAnimation, isMultiplayer, multiplayer]);

  const handleSendMessage = useCallback((text: string) => {
    const state = gameStateRef.current;
    const userPlayer = state?.players.find(p => p.isUser);
    if (userPlayer) showChatBubble(userPlayer.id, text, userPlayer.name);
  }, [showChatBubble]);

  const handleTableClick = useCallback(() => {
    if (!audioUnlockedRef.current) {
      audioUnlockedRef.current = true;
      unlockAudio();
    }
  }, []);

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isUserTurn = currentPlayer?.isUser && !currentPlayer.hasFolded && !currentPlayer.isAllIn && !gameState.showdown;
  const userPlayer = gameState.players.find(p => p.isUser);
  const callAmount = userPlayer ? getCallAmount(gameState, userPlayer.id) : 0;
  const canCheck = callAmount === 0;
  const timerProgress = Math.max(0, timer / TURN_DURATION);

  const playersWithTurn = gameState.players.map((p, i) => ({
    ...p,
    isTurn: i === gameState.currentPlayerIndex && !p.hasFolded && !p.isAllIn && !gameState.showdown,
  }));

  const { displayPlayers, displayPositions } = isMultiplayer
    ? getMultiplayerDisplay(gameState)
    : { displayPlayers: playersWithTurn, displayPositions: seatPositions };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background" onClick={handleTableClick}>
      {/* Premium room background — warm ambient lighting */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 50% 40%, hsl(120 25% 14%) 0%, transparent 50%),
            radial-gradient(ellipse 80% 60% at 50% 50%, hsl(40 30% 8%) 0%, transparent 60%),
            radial-gradient(ellipse at center, hsl(0 0% 4%) 0%, hsl(0 0% 2%) 100%)
          `,
          boxShadow: 'inset 0 0 120px rgba(0,0,0,0.3)',
        }}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-2 lg:px-4 lg:py-3">
        <button
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 border-primary flex items-center justify-center bg-secondary hover:bg-primary/20 transition-colors"
          onClick={() => {
            const canLeaveNoPenalty = userAlone || gameState?.showdown;
            if (canLeaveNoPenalty) {
              onExit?.();
            } else {
              setShowLeaveConfirm(true);
            }
          }}
        >
          <ArrowLeft size={18} className="text-primary" />
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-muted-foreground text-[10px] sm:text-xs uppercase tracking-wider">Table:</span>
          <span className="text-foreground font-bold text-xs sm:text-sm">{gameState.tableId}</span>
          <span className="text-muted-foreground text-[10px] sm:text-xs">|</span>
          <span className="text-muted-foreground text-[10px] sm:text-xs uppercase">R{gameState.roundNumber}</span>
          <span className="text-muted-foreground text-[10px] sm:text-xs">|</span>
          <span className="text-primary text-[10px] sm:text-xs font-bold uppercase">{gameState.phase}</span>
        </div>
        <button className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 border-primary flex items-center justify-center" style={{ background: 'hsl(var(--casino-dark))' }}>
          <Settings size={18} className="text-primary" />
        </button>
      </div>

      {/* User alone overlay */}
      <AnimatePresence>
        {userAlone && (
          <motion.div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-background/95 border-2 border-primary rounded-2xl px-8 py-6 text-center max-w-sm mx-4">
              <p className="text-primary font-display text-xl sm:text-2xl mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                You&apos;re the only player
              </p>
              <p className="text-muted-foreground text-sm mb-4">
                All other players have left the table. You can leave without any penalty.
              </p>
              <button
                className="casino-btn px-6 py-3"
                onClick={() => onExit?.()}
              >
                Leave Table
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blinds info */}
      <div className="absolute top-11 sm:top-14 left-1/2 -translate-x-1/2 z-30 flex gap-2 sm:gap-3">
        <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">SB: ${gameState.smallBlind}</span>
        <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">BB: ${gameState.bigBlind}</span>
      </div>

      {/* Table area — centered with padding for seats that overflow */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: isMobile ? '110px' : '90px', paddingTop: isMobile ? '55px' : '60px' }}>
        <div
          ref={tableRef}
          className="poker-table-felt relative"
        >
          {/* Inner playing surface */}
          <div className="poker-table-inner" />


          {/* Community cards — floating on felt with subtle shadow */}
          <div className="community-cards-area absolute top-[42%] left-1/2 -translate-x-1/2 z-20 flex items-center justify-center gap-1.5 sm:gap-2">
            {gameState.communityCards.map((card, i) => (
              <Card
                key={`${gameState.roundNumber}-${i}-${card.faceUp}`}
                card={card}
                delay={0.25 * i}
                index={i}
                onReveal={playCardRevealSound}
              />
            ))}
          </div>

          {/* Pot zone — above cards */}
          <div className="absolute top-[26%] left-1/2 -translate-x-1/2 z-20" data-pot-display>
            <PotDisplay pot={gameState.pot} rakeAmount={gameState.rakeAmount} />
          </div>

          {/* Winner announcement: between pot and cards */}
          <AnimatePresence>
            {showWinDisplay && gameState.showdown && gameState.winnerId !== null && (
              <motion.div
                className="absolute top-[58%] left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-0.5"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <div className="bg-background/80 backdrop-blur-sm border-2 border-primary rounded-xl px-3 sm:px-5 py-1.5 sm:py-2 text-center whitespace-nowrap">
                  <div className="text-primary font-display text-xs sm:text-base tracking-wider">
                    {(gameState.winnerIds?.length ?? 1) > 1
                      ? `${gameState.winnerIds?.length} WINNERS - SPLIT POT!`
                      : `${gameState.players.find(p => p.id === gameState.winnerId)?.name} WINS!`}
                  </div>
                  <div className="text-muted-foreground text-[8px] sm:text-xs mt-0.5">{gameState.winnerHandDescription}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Win chip animation - inside table so chips fly BEHIND player avatars (z-5 < z-10) */}
          <WinChipAnimation
            winnerSeatIndex={winAnimation?.winnerSeatIndex ?? null}
            winnerPlayerId={winAnimation?.winnerPlayerId ?? null}
            amount={winAnimation?.amount ?? 0}
            onComplete={() => setWinAnimation(null)}
          />

          {/* player-position-zone = circle border; avatar goes INSIDE it */}
          {displayPositions.map((pos, i) => {
            const player = displayPlayers[i];
            if (!player) return null;
            return (
              <div
                key={`seat-${player.id}`}
                className="player-position-zone absolute"
                style={{ top: pos.top, left: pos.left }}
                data-seat-index={player.id}
                data-player-zone={player.id}
                data-is-user={player.isUser ? 'true' : undefined}
              >
                <PlayerSeat
                  player={player}
                  seatIndex={'isTopSeat' in pos && pos.isTopSeat ? 3 : i}
                  onClickAvatar={setSelectedPlayer}
                  timerProgress={player.isTurn ? timerProgress : 0}
                  isDealer={player.id === gameState.dealerIndex}
                  isSmallBlind={player.id === gameState.smallBlindIndex}
                  isBigBlind={player.id === gameState.bigBlindIndex}
                  isWinner={gameState.showdown && (gameState.winnerIds?.includes(player.id) ?? player.id === gameState.winnerId)}
                  isMobile={isMobile}
                  isShowdown={gameState.showdown}
                  chatBubble={chatBubbles[player.id] ?? null}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Chip animations */}
      <ChipAnimation bets={chipBets} onComplete={handleChipAnimComplete} />

      {/* Action Buttons — disabled when not user's turn */}
      <ActionButtons
        chipCount={userPlayer?.chips ?? 0}
        pot={gameState.pot}
        currentBet={userPlayer?.currentBet ?? 0}
        bigBlind={gameState.bigBlind}
        onFold={() => handleUserAction('fold')}
        onCheck={() => handleUserAction('check')}
        onCall={() => handleUserAction('call')}
        onBet={(amount) => handleUserAction('bet', amount)}
        onRaise={(amount) => handleUserAction('raise', amount)}
        onAllIn={() => handleUserAction('all-in')}
        onSendMessage={handleSendMessage}
        disabled={!isUserTurn}
        callAmount={callAmount}
        canCheck={canCheck}
        minRaise={getMinRaiseTotal(gameState) - (userPlayer?.currentBet ?? 0)}
        isMobile={isMobile}
      />

      {/* Player Popup */}
      <PlayerPopup player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />

      {/* Leave / Back confirmation */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave the table?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave? If you leave during an active hand without folding, a penalty will be applied and your chips will be returned to the players you played against.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const result = runAntiCheatOnExit(gameState);
                if (result.triggered) {
                  toast({
                    title: 'Anti-Cheat: Penalty Applied',
                    description: `You left during an active hand. $${result.penaltyAmount.toLocaleString()} has been returned to ${result.recipientNames.join(', ')}. They have been notified.`,
                    variant: 'destructive',
                  });
                }
                onExit?.();
              }}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Elimination / Anti-Cheat Dialog */}
      <AlertDialog open={!!eliminatedPlayer} onOpenChange={(open) => { if (!open) setEliminatedPlayer(null); }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">
              {eliminatedPlayer?.isUser ? (
                <span className="text-destructive">💀 YOU HAVE BEEN ELIMINATED</span>
              ) : (
                <span>🚫 {eliminatedPlayer?.name} ELIMINATED</span>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-2">
              <span className="block">
                {eliminatedPlayer?.isUser
                  ? 'You ran out of chips. Better luck next time!'
                  : `${eliminatedPlayer?.name} has lost all their chips and is out of the game.`}
              </span>
              {isTestingTable && !eliminatedPlayer?.isUser && (
                <span className="block text-muted-foreground text-xs mt-2 border-t border-border pt-2">
                  🧪 <strong>Testing Mode:</strong> You can flag this player for anti-cheat review.
                  {markedCheaters.has(eliminatedPlayer?.id ?? -1) && (
                    <span className="block text-destructive font-bold mt-1">⚠️ Already marked as suspected cheater</span>
                  )}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            {isTestingTable && !eliminatedPlayer?.isUser && !markedCheaters.has(eliminatedPlayer?.id ?? -1) && (
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (eliminatedPlayer) {
                    setMarkedCheaters(prev => new Set(prev).add(eliminatedPlayer.id));
                    toast({
                      title: '🚨 Anti-Cheat Flag',
                      description: `${eliminatedPlayer.name} has been marked as a suspected cheater. This will be reviewed.`,
                      variant: 'destructive',
                    });
                  }
                  setEliminatedPlayer(null);
                }}
              >
                🚨 Mark as Cheater
              </AlertDialogAction>
            )}
            <AlertDialogAction
              onClick={() => {
                if (eliminatedPlayer?.isUser) {
                  onExit?.();
                }
                setEliminatedPlayer(null);
              }}
            >
              {eliminatedPlayer?.isUser ? 'Leave Table' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Game Over overlay — only user left or user eliminated */}
      {gameState && !gameState.showdown && (() => {
        const activePlayers = gameState.players.filter(p => p.isActive && p.chips > 0);
        const user = gameState.players.find(p => p.isUser);
        if (activePlayers.length <= 1 && activePlayers[0]?.isUser) {
          return (
            <motion.div
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-primary" style={{ background: 'hsl(0 0% 8%)' }}>
                <span className="text-4xl">🏆</span>
                <h2 className="text-2xl text-primary font-display tracking-wider" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  YOU WON THE GAME!
                </h2>
                <p className="text-muted-foreground text-sm">All opponents have been eliminated.</p>
                <p className="text-primary font-bold text-xl" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  Final chips: ${user?.chips.toLocaleString()}
                </p>
                <button
                  className="casino-btn px-6 py-2 rounded-xl font-bold"
                  onClick={() => onExit?.()}
                >
                  Exit to Lobby
                </button>
              </div>
            </motion.div>
          );
        }
        return null;
      })()}
    </div>
  );
};

export default PokerTable;
