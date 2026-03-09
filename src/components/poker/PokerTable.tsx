import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Settings } from 'lucide-react';
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
import pokerRoomBg from '@/assets/poker-room-bg.png';
import pokerTable from '@/assets/poker-table.png';
import PlayerSeat from './PlayerSeat';
import Card from './Card';
import PotDisplay from './PotDisplay';
import ActionButtons from './ActionButtons';
import PlayerPopup from './PlayerPopup';
import ChipAnimation, { type ChipBet } from './ChipAnimation';

// Viewport-unit based positions for 8 seats around the oval table
const SEAT_POSITIONS: Record<string, string>[] = [
  { bottom: '11vh', left: '50vw', transform: 'translateX(-50%)' },   // 0: Bottom center (user)
  { bottom: '26vh', left: '8vw' },                                    // 1: Bottom left
  { top: '30vh', left: '4vw' },                                       // 2: Left
  { top: '8vh', left: '16vw' },                                       // 3: Top left
  { top: '4vh', left: '50vw', transform: 'translateX(-50%)' },        // 4: Top center
  { top: '8vh', right: '16vw' },                                      // 5: Top right
  { top: '30vh', right: '4vw' },                                      // 6: Right
  { bottom: '26vh', right: '8vw' },                                   // 7: Bottom right
];

const TURN_DURATION = 30;
const BOT_DELAY = 1500;
const SHOWDOWN_DELAY = 4000;

interface PokerTableProps {
  initialBuyIn?: number;
}

const PokerTable = ({ initialBuyIn = 1500 }: PokerTableProps) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [timer, setTimer] = useState(TURN_DURATION);
  const [chipBets, setChipBets] = useState<ChipBet[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-start game
  useEffect(() => {
    const initial = createInitialGameState(initialBuyIn);
    const round = startNewRound(initial);
    setGameState(round);
    setTimer(TURN_DURATION);
  }, [initialBuyIn]);

  const triggerChipAnimation = useCallback((playerIndex: number, amount: number) => {
    // Approximate position based on seat index
    const seatEl = document.querySelector(`[data-seat-index="${playerIndex}"]`);
    if (seatEl) {
      const rect = seatEl.getBoundingClientRect();
      const bet: ChipBet = {
        id: `${Date.now()}-${playerIndex}`,
        fromX: rect.left + rect.width / 2 - 20,
        fromY: rect.top + rect.height / 2,
        amount,
      };
      setChipBets(prev => [...prev, bet]);
    }
  }, []);

  const handleChipAnimComplete = useCallback((id: string) => {
    setChipBets(prev => prev.filter(b => b.id !== id));
  }, []);

  const advanceTurn = useCallback((state: GameState): GameState => {
    if (state.showdown) return state;

    if (isBettingRoundComplete(state)) {
      if (state.phase === 'river') {
        return advancePhase({ ...state, phase: 'river' });
      }
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

  // Bot turn automation
  useEffect(() => {
    if (!gameState) return;

    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    if (gameState.showdown) {
      botTimeoutRef.current = setTimeout(() => {
        setGameState(prev => {
          if (!prev) return prev;
          return startNewRound(prev);
        });
        setTimer(TURN_DURATION);
      }, SHOWDOWN_DELAY);
      return () => { if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current); };
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.hasFolded || currentPlayer.isAllIn) {
      setGameState(prev => prev ? advanceTurn(prev) : prev);
      return;
    }

    const isUserTurn = currentPlayer.isUser;

    setTimer(TURN_DURATION);
    timerRef.current = setInterval(() => {
      setTimer(prev => (prev <= 0 ? 0 : prev - 0.1));
    }, 100);

    if (!isUserTurn) {
      botTimeoutRef.current = setTimeout(() => {
        setGameState(prev => {
          if (!prev) return prev;
          const { state: afterBot } = simulateBotAction(prev);
          const betAmount = afterBot.players[prev.currentPlayerIndex].currentBet - prev.players[prev.currentPlayerIndex].currentBet;
          if (betAmount > 0) {
            triggerChipAnimation(prev.currentPlayerIndex, betAmount);
          }
          return advanceTurn(afterBot);
        });
      }, BOT_DELAY + Math.random() * 1000);
    } else {
      botTimeoutRef.current = setTimeout(() => {
        setGameState(prev => {
          if (!prev) return prev;
          const afterFold = playerAction(prev, prev.currentPlayerIndex, 'fold');
          return advanceTurn(afterFold);
        });
      }, TURN_DURATION * 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, [gameState?.currentPlayerIndex, gameState?.phase, gameState?.showdown, gameState?.roundNumber, advanceTurn, triggerChipAnimation]);

  const handleUserAction = useCallback((action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in', amount?: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      const current = prev.players[prev.currentPlayerIndex];
      if (!current?.isUser) return prev;
      const afterAction = playerAction(prev, prev.currentPlayerIndex, action, amount);
      const betAmount = afterAction.players[prev.currentPlayerIndex].currentBet - prev.players[prev.currentPlayerIndex].currentBet;
      if (betAmount > 0) {
        triggerChipAnimation(prev.currentPlayerIndex, betAmount);
      }
      return advanceTurn(afterAction);
    });
  }, [advanceTurn, triggerChipAnimation]);

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
    <div className="relative w-full h-screen overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${pokerRoomBg})` }} />
      <div className="absolute inset-0 bg-black/40" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3">
        <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-primary flex items-center justify-center bg-secondary">
          <ArrowLeft size={20} className="text-primary" />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs uppercase tracking-wider">Table ID:</span>
          <span className="text-foreground font-bold text-sm">{gameState.tableId}</span>
          <span className="text-muted-foreground text-xs">|</span>
          <span className="text-muted-foreground text-xs uppercase">Round {gameState.roundNumber}</span>
          <span className="text-muted-foreground text-xs">|</span>
          <span className="text-primary text-xs font-bold uppercase">{gameState.phase}</span>
        </div>
        <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-primary flex items-center justify-center" style={{ background: 'hsl(var(--casino-dark))' }}>
          <Settings size={20} className="text-primary" />
        </button>
      </div>

      {/* Blinds info */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex gap-3">
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">SB: ${gameState.smallBlind}</span>
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">BB: ${gameState.bigBlind}</span>
      </div>

      {/* Poker Table Image */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img src={pokerTable} alt="Poker Table" className="w-[88%] sm:w-[72%] max-w-[820px] object-contain drop-shadow-2xl" loading="lazy" />
      </div>

      {/* Pot */}
      <PotDisplay pot={gameState.pot} />

      {/* Chip animations */}
      <ChipAnimation bets={chipBets} onComplete={handleChipAnimComplete} />

      {/* Winner announcement */}
      <AnimatePresence>
        {gameState.showdown && gameState.winnerId !== null && (
          <motion.div
            className="absolute top-[30%] left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <div className="bg-primary/20 border-2 border-primary rounded-xl px-6 py-3 text-center">
              <div className="text-primary font-display text-lg sm:text-xl tracking-wider">
                {gameState.players.find(p => p.id === gameState.winnerId)?.name} WINS!
              </div>
              <div className="text-muted-foreground text-xs sm:text-sm mt-1">{gameState.winnerHandDescription}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Community Cards */}
      <div className="absolute top-[38%] sm:top-[42%] left-1/2 -translate-x-1/2 flex gap-1 sm:gap-2 z-20">
        {gameState.communityCards.map((card, i) => (
          <Card key={`${gameState.roundNumber}-${i}`} card={card} delay={0.15 * i} index={i} />
        ))}
      </div>

      {/* Player seats */}
      {playersWithTurn.map((player, i) => (
        <PlayerSeat
          key={player.id}
          player={player}
          position={SEAT_POSITIONS[i]}
          seatIndex={i}
          onClickAvatar={setSelectedPlayer}
          timerProgress={player.isTurn ? timerProgress : 0}
          isDealer={i === gameState.dealerIndex}
          isWinner={gameState.showdown && player.id === gameState.winnerId}
        />
      ))}

      {/* Action Buttons */}
      <ActionButtons
        chipCount={userPlayer?.chips ?? 0}
        onFold={() => handleUserAction('fold')}
        onCheck={() => handleUserAction('check')}
        onCall={() => handleUserAction('call')}
        onBet={() => handleUserAction('bet', gameState.bigBlind)}
        onRaise={() => handleUserAction('raise', getMinRaiseTotal(gameState))}
        onAllIn={() => handleUserAction('all-in')}
        disabled={!isUserTurn}
        callAmount={callAmount}
        canCheck={canCheck}
        minRaise={getMinRaiseTotal(gameState) - (userPlayer?.currentBet ?? 0)}
      />

      {/* Player Popup */}
      <PlayerPopup player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
};

export default PokerTable;
