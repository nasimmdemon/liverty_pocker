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

const TURN_DURATION = 10;
const BOT_DELAY = 1500;
const SHOWDOWN_DELAY = 4000;

interface PokerTableProps {
  initialBuyIn?: number;
  onExit?: () => void;
  seatAnchorOverrides?: {
    desktop?: { top: string; left: string }[];
    mobile?: { top: string; left: string }[];
  };
}

const PokerTable = ({ initialBuyIn = 1500, onExit, seatAnchorOverrides }: PokerTableProps) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
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

  useEffect(() => {
    const initial = createInitialGameState(initialBuyIn);
    const round = startNewRound(initial);
    setGameState(round);
    setTimer(TURN_DURATION);
  }, [initialBuyIn]);

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
  const chatBubbleIdRef = useRef(0);
  gameStateRef.current = gameState;

  const [winAnimation, setWinAnimation] = useState<{ winnerSeatIndex: number; amount: number } | null>(null);
  const [showWinDisplay, setShowWinDisplay] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (gameState?.showdown && gameState.winnerId !== null && prevGameStateRef.current && !prevGameStateRef.current.showdown) {
      const winnerSeatIndex = gameState.players.findIndex(p => p.id === gameState.winnerId);
      const winnerCount = gameState.winnerIds?.length ?? 1;
      const amountPerWinner = Math.floor(prevGameStateRef.current.pot / winnerCount);
      if (winnerSeatIndex >= 0 && amountPerWinner > 0) {
        const id = setTimeout(() => {
          setWinAnimation({ winnerSeatIndex, amount: amountPerWinner });
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

    if (gameState.showdown) {
      botTimeoutRef.current = setTimeout(() => {
        setGameState(prev => prev ? startNewRound(prev) : prev);
        setTimer(TURN_DURATION);
      }, SHOWDOWN_DELAY);
      return () => { if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current); };
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.hasFolded || currentPlayer.isAllIn) {
      if (isBettingRoundComplete(gameState)) {
        phaseAdvanceTimeoutRef.current = setTimeout(() => {
          setGameState(prev => prev ? advancePhase(prev) : prev);
          phaseAdvanceTimeoutRef.current = null;
        }, 1000);
        return () => {
          if (phaseAdvanceTimeoutRef.current) clearTimeout(phaseAdvanceTimeoutRef.current);
        };
      }
      setGameState(prev => prev ? advanceTurn(prev) : prev);
      return;
    }

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
  }, [gameState?.currentPlayerIndex, gameState?.phase, gameState?.showdown, gameState?.roundNumber, advanceTurn, triggerChipAnimation, showChatBubble]);

  const handleUserAction = useCallback((action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in', amount?: number) => {
    if (!audioUnlockedRef.current) {
      audioUnlockedRef.current = true;
      unlockAudio();
    }
    if (action === 'fold') playFoldSound();
    if (action === 'check') playCheckSound();
    setGameState(prev => {
      if (!prev) return prev;
      const current = prev.players[prev.currentPlayerIndex];
      if (!current?.isUser) return prev;
      const afterAction = playerAction(prev, prev.currentPlayerIndex, action, amount);
      const betAmount = afterAction.players[prev.currentPlayerIndex].currentBet - prev.players[prev.currentPlayerIndex].currentBet;
      if (betAmount > 0) triggerChipAnimation(prev.currentPlayerIndex, betAmount);
      return advanceTurn(afterAction);
    });
  }, [advanceTurn, triggerChipAnimation]);

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
          onClick={() => setShowLeaveConfirm(true)}
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
            amount={winAnimation?.amount ?? 0}
            onComplete={() => setWinAnimation(null)}
          />

          {/* player-position-zone = circle border; avatar goes INSIDE it */}
          {seatPositions.map((pos, i) => {
            const player = playersWithTurn[i];
            if (!player) return null;
            return (
              <div
                key={`seat-${i}`}
                className="player-position-zone absolute"
                style={{ top: pos.top, left: pos.left }}
                data-player-zone={i}
                data-is-user={player.isUser ? 'true' : undefined}
              >
                <PlayerSeat
                  player={player}
                  seatIndex={i}
                  onClickAvatar={setSelectedPlayer}
                  timerProgress={player.isTurn ? timerProgress : 0}
                  isDealer={i === gameState.dealerIndex}
                  isSmallBlind={i === gameState.smallBlindIndex}
                  isBigBlind={i === gameState.bigBlindIndex}
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
    </div>
  );
};

export default PokerTable;
