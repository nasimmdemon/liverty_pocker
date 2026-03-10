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
import PlayerSeat from './PlayerSeat';
import Card from './Card';
import PotDisplay from './PotDisplay';
import ActionButtons from './ActionButtons';
import PlayerPopup from './PlayerPopup';
import ChipAnimation, { type ChipBet } from './ChipAnimation';

// 6-player seat positions (percentage-based, relative to table container)
const SEAT_POSITIONS = [
  { top: '88%', left: '50%' },   // 0: Bottom center (user)
  { top: '70%', left: '8%' },    // 1: Bottom left
  { top: '18%', left: '12%' },   // 2: Top left
  { top: '5%', left: '50%' },    // 3: Top center
  { top: '18%', left: '88%' },   // 4: Top right
  { top: '70%', left: '92%' },   // 5: Bottom right
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
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initial = createInitialGameState(initialBuyIn);
    const round = startNewRound(initial);
    setGameState(round);
    setTimer(TURN_DURATION);
  }, [initialBuyIn]);

  const triggerChipAnimation = useCallback((playerIndex: number) => {
    const seatEl = document.querySelector(`[data-seat-index="${playerIndex}"]`);
    const potEl = document.querySelector('[data-pot-display]');
    if (seatEl && potEl) {
      const seatRect = seatEl.getBoundingClientRect();
      const bet: ChipBet = {
        id: `${Date.now()}-${playerIndex}`,
        fromX: seatRect.left + seatRect.width / 2 - 28,
        fromY: seatRect.top + seatRect.height / 2,
        amount: 0,
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
          const { state: afterBot } = simulateBotAction(prev);
          const betAmount = afterBot.players[prev.currentPlayerIndex].currentBet - prev.players[prev.currentPlayerIndex].currentBet;
          if (betAmount > 0) triggerChipAnimation(prev.currentPlayerIndex);
          return advanceTurn(afterBot);
        });
      }, BOT_DELAY + Math.random() * 1000);
    } else {
      botTimeoutRef.current = setTimeout(() => {
        setGameState(prev => {
          if (!prev) return prev;
          return advanceTurn(playerAction(prev, prev.currentPlayerIndex, 'fold'));
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
      if (betAmount > 0) triggerChipAnimation(prev.currentPlayerIndex);
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
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Dark room background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(120 20% 10%) 0%, hsl(0 0% 5%) 70%, hsl(0 0% 3%) 100%)',
        }}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-2 lg:px-4 lg:py-3">
        <button className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 border-primary flex items-center justify-center bg-secondary">
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

      {/* Table container — centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          ref={tableRef}
          className="poker-table-felt relative"
          style={{
            width: 'min(70vw, 820px)',
            height: 'min(42vh, 380px)',
          }}
        >
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

          {/* Pot */}
          <div className="absolute top-[28%] left-1/2 -translate-x-1/2 z-20" data-pot-display>
            <PotDisplay pot={gameState.pot} />
          </div>

          {/* Community Cards */}
          <div className="absolute top-[44%] left-1/2 -translate-x-1/2 flex gap-1 sm:gap-2 z-20">
            {gameState.communityCards.map((card, i) => (
              <Card key={`${gameState.roundNumber}-${i}`} card={card} delay={0.15 * i} index={i} />
            ))}
          </div>

          {/* Winner announcement */}
          <AnimatePresence>
            {gameState.showdown && gameState.winnerId !== null && (
              <motion.div
                className="absolute top-[14%] left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <div className="bg-primary/20 border-2 border-primary rounded-xl px-4 sm:px-6 py-2 sm:py-3 text-center whitespace-nowrap">
                  <div className="text-primary font-display text-sm sm:text-lg tracking-wider">
                    {gameState.players.find(p => p.id === gameState.winnerId)?.name} WINS!
                  </div>
                  <div className="text-muted-foreground text-[10px] sm:text-sm mt-0.5">{gameState.winnerHandDescription}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Chip animations */}
      <ChipAnimation bets={chipBets} onComplete={handleChipAnimComplete} />

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
