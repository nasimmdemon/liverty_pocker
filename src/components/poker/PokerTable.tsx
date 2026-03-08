import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings } from 'lucide-react';
import { Player } from '@/lib/gameTypes';
import {
  createInitialGameState,
  dealCards,
  advancePhase,
  getNextActivePlayer,
  simulateBotAction,
} from '@/lib/gameLogic';
import pokerTable from '@/assets/poker-table.png';
import PlayerSeat from './PlayerSeat';
import Card from './Card';
import PotDisplay from './PotDisplay';
import ActionButtons from './ActionButtons';
import PlayerPopup from './PlayerPopup';

// Seat positions (percentage-based for responsiveness)
const SEAT_POSITIONS = [
  { bottom: '8%', left: '50%', transform: 'translateX(-50%)' },  // 0 - user (bottom center)
  { bottom: '22%', left: '8%' },   // 1 - bottom left
  { top: '38%', left: '3%' },      // 2 - mid left
  { top: '8%', left: '18%' },      // 3 - top left
  { top: '2%', left: '50%', transform: 'translateX(-50%)' },  // 4 - top center
  { top: '8%', right: '18%' },     // 5 - top right
  { top: '38%', right: '3%' },     // 6 - mid right
  { bottom: '22%', right: '8%' },  // 7 - bottom right
];

const TURN_DURATION = 5; // seconds for demo speed

const PokerTable = () => {
  const [gameState, setGameState] = useState(() => {
    const initial = createInitialGameState();
    return dealCards(initial);
  });
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [timer, setTimer] = useState(TURN_DURATION);
  const [isUserTurn, setIsUserTurn] = useState(false);

  // Mark current player's turn
  const playersWithTurn = gameState.players.map((p, i) => ({
    ...p,
    isTurn: i === gameState.currentPlayerIndex && !p.hasFolded,
  }));

  const advanceTurn = useCallback(() => {
    setGameState(prev => {
      // Check if we've gone around (simple: every 8 turns advance phase)
      const activePlayers = prev.players.filter(p => !p.hasFolded && p.isActive);
      if (activePlayers.length <= 1) {
        // Reset game
        const fresh = createInitialGameState();
        return dealCards(fresh);
      }

      const nextIdx = getNextActivePlayer(prev);
      
      // If we've looped, advance phase
      if (nextIdx <= prev.currentPlayerIndex && prev.phase !== 'showdown') {
        const advanced = advancePhase(prev);
        if (advanced.phase === 'showdown') {
          // After showdown, restart
          setTimeout(() => {
            setGameState(() => {
              const fresh = createInitialGameState();
              return dealCards(fresh);
            });
          }, 3000);
          return { ...advanced, currentPlayerIndex: nextIdx };
        }
        return { ...advanced, currentPlayerIndex: nextIdx };
      }

      return { ...prev, currentPlayerIndex: nextIdx };
    });
    setTimer(TURN_DURATION);
  }, []);

  // Bot auto-play & timer
  useEffect(() => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const userTurn = currentPlayer?.isUser && !currentPlayer.hasFolded;
    setIsUserTurn(userTurn);

    if (currentPlayer?.hasFolded) {
      advanceTurn();
      return;
    }

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 0) return 0;
        return prev - 0.1;
      });
    }, 100);

    const timeout = setTimeout(() => {
      if (!userTurn) {
        // Bot action
        setGameState(prev => simulateBotAction(prev));
      }
      advanceTurn();
    }, TURN_DURATION * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [gameState.currentPlayerIndex, advanceTurn]);

  const handleUserAction = (action: string) => {
    if (!isUserTurn) return;
    setGameState(prev => {
      const userIdx = prev.currentPlayerIndex;
      const newPlayers = prev.players.map((p, i) => {
        if (i !== userIdx) return p;
        switch (action) {
          case 'fold': return { ...p, hasFolded: true };
          case 'bet': return { ...p, chips: p.chips - 100, currentBet: p.currentBet + 100 };
          case 'raise': return { ...p, chips: p.chips - 200, currentBet: p.currentBet + 200 };
          default: return p;
        }
      });
      const addedPot = action === 'bet' ? 100 : action === 'raise' ? 200 : 0;
      return { ...prev, players: newPlayers, pot: prev.pot + addedPot };
    });
    advanceTurn();
  };

  const timerProgress = Math.max(0, timer / TURN_DURATION);
  const userPlayer = gameState.players.find(p => p.isUser);

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, hsl(var(--muted)), hsl(var(--casino-dark)))' }}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3">
        <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-secondary flex items-center justify-center" style={{ background: 'hsl(var(--secondary))' }}>
          <ArrowLeft size={20} className="text-primary" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs uppercase tracking-wider">Table ID:</span>
          <span className="text-foreground font-bold text-sm">{gameState.tableId}</span>
        </div>
        <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-primary flex items-center justify-center" style={{ background: 'hsl(var(--casino-dark))' }}>
          <Settings size={20} className="text-primary" />
        </button>
      </div>

      {/* Poker Table Image */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src={pokerTable}
          alt="Poker Table"
          className="w-[85%] sm:w-[70%] max-w-[800px] object-contain drop-shadow-2xl"
        />
      </div>

      {/* Pot */}
      <PotDisplay pot={gameState.pot} />

      {/* Community Cards */}
      <div className="absolute top-[38%] sm:top-[42%] left-1/2 -translate-x-1/2 flex gap-1 sm:gap-2 z-20">
        {gameState.communityCards.map((card, i) => (
          <Card key={i} card={card} delay={0.15 * i} index={i} />
        ))}
      </div>

      {/* Player Seats */}
      {playersWithTurn.map((player, i) => (
        <PlayerSeat
          key={player.id}
          player={player}
          position={SEAT_POSITIONS[i]}
          onClickAvatar={setSelectedPlayer}
          timerProgress={player.isTurn ? timerProgress : 0}
        />
      ))}

      {/* Action Buttons */}
      <ActionButtons
        chipCount={userPlayer?.chips ?? 0}
        onFold={() => handleUserAction('fold')}
        onCheck={() => handleUserAction('check')}
        onBet={() => handleUserAction('bet')}
        onRaise={() => handleUserAction('raise')}
        onAway={() => {}}
        disabled={!isUserTurn}
      />

      {/* Player Popup */}
      <PlayerPopup player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
};

export default PokerTable;
