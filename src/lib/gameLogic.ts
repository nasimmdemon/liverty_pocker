import { GameState, Player, PlayingCard, Suit, Rank, GamePhase } from './gameTypes';
import { determineWinners } from './handEvaluator';
import { calculateRake } from './rake';
import avatar1 from '@/assets/avatar-1.png';
import avatar2 from '@/assets/avatar-2.png';
import avatar3 from '@/assets/avatar-3.png';
import avatar4 from '@/assets/avatar-4.png';
import avatar5 from '@/assets/avatar-5.png';
import avatar6 from '@/assets/avatar-6.png';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const avatars = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6];

const PLAYER_NAMES = ['THE_HUSTLER', 'LADY_LUCK', 'IRON_RAT', 'SHADOW', 'SLICK', 'SMOKE'];
const RANKS_LIST = ['HUMEN', 'RAT KING', 'SHARP', 'WHALE', 'GRINDER', 'LEGEND'];

export function createDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, faceUp: false });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function createInitialGameState(buyIn: number = 1500, botCount: number = 5, smallBlind: number = 5, bigBlind: number = 10): GameState {
  const totalPlayers = Math.min(botCount + 1, 6); // user + bots, max 6
  const players: Player[] = [];
  for (let i = 0; i < totalPlayers; i++) {
    players.push({
      id: i,
      name: PLAYER_NAMES[i] ?? `BOT_${i}`,
      chips: buyIn, // ALL players (user + bots) get the same entrance amount
      avatar: avatars[i % avatars.length],
      cards: [],
      isActive: true,
      isTurn: false,
      isUser: i === 0,
      hasFolded: false,
      isAllIn: false,
      currentBet: 0,
      totalRoundBet: 0,
      totalHandBet: 0,
      status: 'active',
      rank: RANKS_LIST[i] ?? 'HUMEN',
      netWorth: Math.round(50 + Math.random() * 200),
      invitedBy: i > 0 ? PLAYER_NAMES[Math.floor(Math.random() * i)] : undefined,
    });
  }

  return {
    players,
    communityCards: [],
    pot: 0,
    sidePots: [],
    currentPlayerIndex: 0,
    phase: 'preflop',
    tableId: '4XGHE',
    dealerIndex: 0,
    smallBlindIndex: 0,
    bigBlindIndex: 0,
    smallBlind,
    bigBlind,
    currentBet: 0,
    minRaise: 10,
    deck: [],
    roundNumber: 0,
    winnerId: null,
    winnerIds: [],
    winnerHandDescription: '',
    showdown: false,
    bettingRoundComplete: false,
    firstActorIndex: 0,
    actedCount: 0,
    rakeAmount: 0,
    totalRake: 0,
  };
}

function getNextSeatIndex(fromIndex: number, players: Player[], skipFolded = true): number {
  let idx = (fromIndex + 1) % players.length;
  let attempts = 0;
  while (attempts < players.length) {
    const p = players[idx];
    if (p.isActive && (!skipFolded || (!p.hasFolded && !p.isAllIn))) return idx;
    idx = (idx + 1) % players.length;
    attempts++;
  }
  return fromIndex;
}

export function startNewRound(state: GameState): GameState {
  const deck = createDeck();
  // Texas Hold'em: dealer button moves to next active player each round
  const dealerIndex = state.roundNumber === 0
    ? 0
    : getNextSeatIndex(state.dealerIndex, state.players, false);
  const sbIndex = getNextSeatIndex(dealerIndex, state.players, false);
  const bbIndex = getNextSeatIndex(sbIndex, state.players, false);

  let cardIndex = 0;
  const players = state.players.map((p, i) => {
    if (!p.isActive || p.chips <= 0) {
      return { ...p, cards: [], hasFolded: true, isAllIn: false, currentBet: 0, totalRoundBet: 0, totalHandBet: 0, isActive: false, status: 'sitting-out' as const, lastAction: undefined, isTurn: false };
    }
    const cards: PlayingCard[] = [
      { ...deck[cardIndex++], faceUp: p.isUser },
      { ...deck[cardIndex++], faceUp: p.isUser },
    ];
    let chips = p.chips;
    let currentBet = 0;
    let isAllIn = false;
    let lastAction: string | undefined;

    if (i === sbIndex) {
      const sb = Math.min(state.smallBlind, chips);
      chips -= sb;
      currentBet = sb;
      lastAction = 'SB';
      if (chips === 0) isAllIn = true;
    } else if (i === bbIndex) {
      const bb = Math.min(state.bigBlind, chips);
      chips -= bb;
      currentBet = bb;
      lastAction = 'BB';
      if (chips === 0) isAllIn = true;
    }

    return {
      ...p,
      cards,
      chips,
      currentBet,
      totalRoundBet: currentBet,
      totalHandBet: 0, // Accumulated in advancePhase before each new street
      hasFolded: false,
      isAllIn,
      isTurn: false,
      status: isAllIn ? 'all-in' as const : 'active' as const,
      lastAction,
    };
  });

  // Community cards pre-dealt but hidden
  const communityCards: PlayingCard[] = [];
  for (let i = 0; i < 5; i++) {
    communityCards.push({ ...deck[cardIndex++], faceUp: false });
  }

  const pot = players.reduce((sum, p) => sum + p.currentBet, 0);
  const firstToAct = getNextSeatIndex(bbIndex, players);

  return {
    ...state,
    players,
    communityCards,
    pot,
    sidePots: [],
    deck: deck.slice(cardIndex),
    dealerIndex,
    smallBlindIndex: sbIndex,
    bigBlindIndex: bbIndex,
    phase: 'preflop',
    currentBet: state.bigBlind,
    minRaise: state.bigBlind,
    currentPlayerIndex: firstToAct,
    roundNumber: state.roundNumber + 1,
    winnerId: null,
    winnerIds: [],
    winnerHandDescription: '',
    showdown: false,
    bettingRoundComplete: false,
    firstActorIndex: firstToAct,
    actedCount: 0,
    rakeAmount: 0,
    totalRake: state.totalRake ?? 0,
  };
}

export function getActivePlayers(state: GameState): Player[] {
  return state.players.filter(p => p.isActive && !p.hasFolded && !p.isAllIn);
}

export function getActiveAndAllInPlayers(state: GameState): Player[] {
  return state.players.filter(p => p.isActive && !p.hasFolded);
}

/** Players who have chips and are still at the table */
export function getPlayersWithChips(state: GameState): Player[] {
  return state.players.filter(p => p.isActive && p.chips > 0);
}

export function isBettingRoundComplete(state: GameState): boolean {
  const active = getActivePlayers(state);
  if (active.length === 0) return true;
  if (active.length === 1 && getActiveAndAllInPlayers(state).length <= 1) return true;
  
  // All active (non-allin, non-folded) players must have matched the current bet
  // and everyone must have had a chance to act
  const allMatched = active.every(p => p.currentBet === state.currentBet);
  return allMatched && state.actedCount >= active.length;
}

export function advancePhase(state: GameState): GameState {
  const phases: GamePhase[] = ['preflop', 'flop', 'turn', 'river', 'showdown'];
  const currentIdx = phases.indexOf(state.phase);
  if (currentIdx >= phases.length - 1) return state;

  const nextPhase = phases[currentIdx + 1];
  const communityCards = state.communityCards.map((c, i) => {
    if (nextPhase === 'flop' && i < 3) return { ...c, faceUp: true };
    if (nextPhase === 'turn' && i < 4) return { ...c, faceUp: true };
    if (nextPhase === 'river' || nextPhase === 'showdown') return { ...c, faceUp: true };
    return c;
  });

  // Reset bets for new betting round (flop/turn/river); accumulate totalHandBet for side pots
  const players = state.players.map(p => ({
    ...p,
    currentBet: 0,
    totalHandBet: (p.totalHandBet ?? 0) + p.totalRoundBet,
    totalRoundBet: 0,
  }));

  // Texas Hold'em: post-flop, first to act is first active player to the left of the dealer (button)
  const firstToAct = getNextSeatIndex(state.dealerIndex, players);

  if (nextPhase === 'showdown') {
    return handleShowdown({ ...state, phase: nextPhase, communityCards, players, currentBet: 0, minRaise: state.bigBlind, currentPlayerIndex: firstToAct, actedCount: 0 });
  }

  return {
    ...state,
    phase: nextPhase,
    communityCards,
    players,
    currentBet: 0,
    minRaise: state.bigBlind,
    currentPlayerIndex: firstToAct,
    bettingRoundComplete: false,
    firstActorIndex: firstToAct,
    actedCount: 0,
  };
}

/** Build main pot + side pots. Each pot: { amount, eligiblePlayerIds }.
 * Eligible = players who contributed to that pot and didn't fold.
 * When a big stack all-in beats a short stack, the short stack wins main pot;
 * the big stack gets their uncalled portion back (wins the side pot they're alone in). */
function buildSidePots(players: Player[]): { amount: number; eligibleIds: number[] }[] {
  const inHand = players.filter(p => p.isActive && !p.hasFolded);
  if (inHand.length === 0) return [];

  const totalBet = (p: Player) => (p.totalHandBet ?? 0) + p.totalRoundBet;
  const levels = [...new Set(inHand.map(totalBet))].sort((a, b) => a - b);
  const pots: { amount: number; eligibleIds: number[] }[] = [];
  let prevLevel = 0;

  for (const level of levels) {
    const contributed = players.filter(p => totalBet(p) >= level && p.isActive && !p.hasFolded);
    if (contributed.length === 0) continue;
    const amount = (level - prevLevel) * contributed.length;
    if (amount <= 0) continue;
    pots.push({
      amount,
      eligibleIds: contributed.map(p => p.id),
    });
    prevLevel = level;
  }
  return pots;
}

function handleShowdown(state: GameState): GameState {
  const visibleCommunity = state.communityCards.map(c => ({ ...c, faceUp: true }));
  // Reveal all remaining players' cards
  const players = state.players.map(p => {
    if (p.hasFolded || !p.isActive) return p;
    return { ...p, cards: p.cards.map(c => ({ ...c, faceUp: true })) };
  });

  const inHand = players.filter(p => p.isActive && !p.hasFolded && p.cards.length === 2);
  if (inHand.length === 0) return { ...state, players, communityCards: visibleCommunity, showdown: true };

  const pots = buildSidePots(players);
  if (pots.length === 0) return { ...state, players, communityCards: visibleCommunity, showdown: true };

  const chipGains = new Map<number, number>();
  for (const p of players) chipGains.set(p.id, 0);

  let primaryWinnerId: number | null = null;
  let primaryWinnerBestCards: PlayingCard[] = [];
  const winnerIds: number[] = [];
  let winnerHandDescription = '';

  for (const pot of pots) {
    const eligible = players.filter(p => pot.eligibleIds.includes(p.id) && !p.hasFolded && p.cards.length === 2);
    if (eligible.length === 0) continue;

    const potWinners = determineWinners(eligible, visibleCommunity);
    if (potWinners.length === 0) continue;

    if (!winnerHandDescription) winnerHandDescription = potWinners[0].hand.description;
    if (!primaryWinnerId) {
      primaryWinnerId = potWinners[0].winnerId;
      primaryWinnerBestCards = potWinners[0].hand.bestCards ?? [];
    }

    const potPerWinner = Math.floor(pot.amount / potWinners.length);
    const remainder = pot.amount - potPerWinner * potWinners.length;

    for (let i = 0; i < potWinners.length; i++) {
      const wid = potWinners[i].winnerId;
      const extra = i < remainder ? 1 : 0;
      chipGains.set(wid, (chipGains.get(wid) ?? 0) + potPerWinner + extra);
      if (!primaryWinnerId) primaryWinnerId = wid;
      if (!winnerIds.includes(wid)) winnerIds.push(wid);
    }
  }

  // Apply rake to total winnings (5% house rake)
  const totalWinnings = Array.from(chipGains.values()).reduce((a, b) => a + b, 0);
  const { totalRake: rakeAmount } = calculateRake(totalWinnings);
  
  // Distribute rake proportionally from winners
  let rakeRemaining = rakeAmount;
  const adjustedGains = new Map(chipGains);
  for (const wid of winnerIds) {
    const gain = adjustedGains.get(wid) ?? 0;
    if (gain <= 0) continue;
    const share = Math.min(Math.floor(rakeAmount * gain / totalWinnings), rakeRemaining);
    adjustedGains.set(wid, gain - share);
    rakeRemaining -= share;
  }
  // Remainder from rounding
  if (rakeRemaining > 0 && winnerIds.length > 0) {
    const firstWin = winnerIds[0];
    adjustedGains.set(firstWin, (adjustedGains.get(firstWin) ?? 0) - rakeRemaining);
  }

  const finalPlayers = players.map(p => {
    const gain = adjustedGains.get(p.id) ?? 0;
    if (gain <= 0) return p;
    return { ...p, chips: p.chips + gain, lastAction: '🏆 WINNER' };
  });

  const desc = winnerIds.length > 1
    ? `Split pot (${winnerIds.length} winners)`
    : winnerHandDescription || 'Winner';

  const primaryWinner = primaryWinnerId ?? winnerIds[0];

  return {
    ...state,
    players: finalPlayers,
    communityCards: visibleCommunity,
    winnerId: primaryWinner ?? null,
    winnerIds: winnerIds.length > 0 ? winnerIds : (primaryWinner != null ? [primaryWinner] : []),
    winnerHandDescription: desc,
    winnerBestCards: primaryWinnerBestCards,
    showdown: true,
    pot: 0,
    rakeAmount,
    totalRake: (state.totalRake ?? 0) + rakeAmount,
  };
}

export function playerAction(
  state: GameState,
  playerIndex: number,
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in',
  amount?: number
): GameState {
  const player = state.players[playerIndex];
  if (!player || player.hasFolded || player.isAllIn) return state;

  let newPlayers = [...state.players];
  let pot = state.pot;
  let currentBet = state.currentBet;
  let minRaise = state.minRaise;
  // actedCount: only count actions by players who remain active (can still act)
  // Fold: no increment (player leaves). All-in: no increment (player leaves active set).
  // Check/call: increment. Bet/raise: reset to 1.
  let actedCount = state.actedCount;

  switch (action) {
    case 'fold': {
      newPlayers[playerIndex] = { ...player, hasFolded: true, status: 'folded', lastAction: 'FOLD' };
      // Check if only one player remains
      const remaining = newPlayers.filter(p => p.isActive && !p.hasFolded);
      if (remaining.length === 1) {
        const winner = remaining[0];
        // Apply 5% house rake even on fold-win
        const { totalRake: rakeAmount, netPot } = calculateRake(pot);
        newPlayers = newPlayers.map(p => 
          p.id === winner.id 
            ? { ...p, chips: p.chips + netPot, lastAction: '🏆 WINNER' }
            : p
        );
        return { ...state, players: newPlayers, pot: 0, winnerId: winner.id, winnerIds: [winner.id], winnerHandDescription: 'Last player standing', winnerBestCards: winner.cards, showdown: true, actedCount, rakeAmount, totalRake: (state.totalRake ?? 0) + rakeAmount };
      }
      break;
    }
    case 'check': {
      newPlayers[playerIndex] = { ...player, lastAction: 'CHECK' };
      actedCount += 1;
      break;
    }
    case 'call': {
      const callAmount = Math.min(currentBet - player.currentBet, player.chips);
      const isAllIn = callAmount >= player.chips;
      newPlayers[playerIndex] = {
        ...player,
        chips: player.chips - callAmount,
        currentBet: player.currentBet + callAmount,
        totalRoundBet: player.totalRoundBet + callAmount,
        isAllIn,
        status: isAllIn ? 'all-in' : 'active',
        lastAction: isAllIn ? 'ALL-IN' : 'CALL',
      };
      pot += callAmount;
      actedCount += 1;
      break;
    }
    case 'bet':
    case 'raise': {
      const betAmount = amount || (action === 'bet' ? state.bigBlind : currentBet * 2);
      const totalNeeded = Math.min(betAmount - player.currentBet, player.chips);
      const isAllIn = totalNeeded >= player.chips;
      const actualBet = player.currentBet + totalNeeded;
      
      const raiseSize = actualBet - currentBet;
      if (raiseSize > minRaise || isAllIn) {
        minRaise = raiseSize;
      }
      
      newPlayers[playerIndex] = {
        ...player,
        chips: player.chips - totalNeeded,
        currentBet: actualBet,
        totalRoundBet: player.totalRoundBet + totalNeeded,
        isAllIn,
        status: isAllIn ? 'all-in' : 'active',
        lastAction: isAllIn ? 'ALL-IN' : action === 'bet' ? `BET $${totalNeeded}` : `RAISE $${totalNeeded}`,
      };
      pot += totalNeeded;
      currentBet = actualBet;
      actedCount = 1; // reset — everyone needs to respond to the raise
      break;
    }
    case 'all-in': {
      const allInAmount = player.chips;
      const newBet = player.currentBet + allInAmount;
      if (newBet > currentBet) {
        const raiseSize = newBet - currentBet;
        if (raiseSize >= minRaise) {
          minRaise = raiseSize;
          actedCount = 1; // All-in raise: everyone must act again
        }
        currentBet = newBet;
      }
      // If all-in was a call (didn't raise), actedCount unchanged — all-in player leaves active set
      newPlayers[playerIndex] = {
        ...player,
        chips: 0,
        currentBet: newBet,
        totalRoundBet: player.totalRoundBet + allInAmount,
        isAllIn: true,
        status: 'all-in',
        lastAction: `ALL-IN $${allInAmount}`,
      };
      pot += allInAmount;
      break;
    }
  }

  const result = { ...state, players: newPlayers, pot, currentBet, minRaise, actedCount };
  
  // ── Chip conservation check (debug mode) ──
  // Total = sum(player.chips) + pot. currentBet is NOT added because
  // those chips are already deducted from player.chips and included in pot.
  if (typeof window !== 'undefined' && (window as any).__POKER_DEBUG__) {
    const totalChips = result.players.reduce((s, p) => s + p.chips, 0) + result.pot;
    console.log(`[CHIP CHECK] Action=${action} | Total=${totalChips} | Pot=${result.pot} | PlayerChips=${result.players.map(p => p.chips).join(',')}`);
  }
  
  return result;
}

export function getNextActivePlayerIndex(state: GameState): number {
  let idx = (state.currentPlayerIndex + 1) % state.players.length;
  let attempts = 0;
  while (attempts < state.players.length) {
    const p = state.players[idx];
    if (p.isActive && !p.hasFolded && !p.isAllIn) return idx;
    idx = (idx + 1) % state.players.length;
    attempts++;
  }
  return -1; // no active player
}

export function simulateBotAction(state: GameState): { state: GameState; action: string } {
  const player = state.players[state.currentPlayerIndex];
  if (!player || player.isUser || player.hasFolded || player.isAllIn) {
    return { state, action: '' };
  }

  const callAmount = state.currentBet - player.currentBet;
  const canCheck = callAmount === 0;
  
  // Simple bot strategy
  const r = Math.random();
  let action: 'fold' | 'check' | 'call' | 'raise';
  
  if (canCheck) {
    if (r < 0.6) action = 'check';
    else if (r < 0.85) action = 'raise';
    else action = 'fold'; // rare check-fold (for variety)
  } else {
    if (r < 0.3) action = 'fold';
    else if (r < 0.7) action = 'call';
    else action = 'raise';
  }

  // Don't raise if chips are too low
  if (action === 'raise' && player.chips < state.currentBet * 2) {
    action = canCheck ? 'check' : 'call';
  }

  let raiseAmount: number | undefined;
  if (action === 'raise') {
    const minTotal = state.currentBet + state.minRaise;
    const maxTotal = player.currentBet + player.chips;
    raiseAmount = Math.min(minTotal + Math.floor(Math.random() * state.bigBlind * 3), maxTotal);
  }

  const newState = playerAction(state, state.currentPlayerIndex, action, raiseAmount);
  return { state: newState, action };
}

export function getCallAmount(state: GameState, playerIndex: number): number {
  return Math.min(state.currentBet - state.players[playerIndex].currentBet, state.players[playerIndex].chips);
}

export function getMinRaiseTotal(state: GameState): number {
  return state.currentBet + state.minRaise;
}

export function cardToString(card: PlayingCard): string {
  return `${card.rank}${card.suit}`;
}

export function isRedSuit(suit: Suit): boolean {
  return suit === '♥' || suit === '♦';
}
