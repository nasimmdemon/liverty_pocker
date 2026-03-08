import { GameState, Player, PlayingCard, Suit, Rank, GamePhase } from './gameTypes';
import avatar1 from '@/assets/avatar-1.png';
import avatar2 from '@/assets/avatar-2.png';
import avatar3 from '@/assets/avatar-3.png';
import avatar4 from '@/assets/avatar-4.png';
import avatar5 from '@/assets/avatar-5.png';
import avatar6 from '@/assets/avatar-6.png';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const avatars = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6];

const PLAYER_NAMES = [
  'THE_HUSTLER', 'LADY_LUCK', 'IRON_RAT', 'SHADOW', 
  'SLICK', 'THE_BOSS', 'DUCHESS', 'SMOKE'
];

const RANKS_LIST = ['HUMEN', 'RAT KING', 'SHARP', 'WHALE', 'GRINDER', 'ROOKIE', 'VIP', 'LEGEND'];

export function createDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, faceUp: false });
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function createInitialGameState(): GameState {
  const players: Player[] = PLAYER_NAMES.map((name, i) => ({
    id: i,
    name,
    chips: 1500,
    avatar: avatars[i % avatars.length],
    cards: [],
    isActive: true,
    isTurn: false,
    isUser: i === 0,
    hasFolded: false,
    currentBet: 0,
    rank: RANKS_LIST[i],
    netWorth: Math.round(50 + Math.random() * 200),
    invitedBy: i > 0 ? PLAYER_NAMES[Math.floor(Math.random() * i)] : undefined,
  }));

  return {
    players,
    communityCards: [],
    pot: 0,
    currentPlayerIndex: 2,
    phase: 'preflop',
    tableId: '4XGHE',
    dealerIndex: 0,
  };
}

export function dealCards(state: GameState): GameState {
  const deck = createDeck();
  let cardIndex = 0;
  const players = state.players.map(p => {
    if (!p.isActive) return p;
    const cards: PlayingCard[] = [
      { ...deck[cardIndex++], faceUp: p.isUser },
      { ...deck[cardIndex++], faceUp: p.isUser },
    ];
    return { ...p, cards };
  });

  // Community cards pre-dealt but hidden
  const communityCards: PlayingCard[] = [];
  for (let i = 0; i < 5; i++) {
    communityCards.push({ ...deck[cardIndex++], faceUp: false });
  }

  return { ...state, players, communityCards, pot: 150 };
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

  return { ...state, phase: nextPhase, communityCards };
}

export function getNextActivePlayer(state: GameState): number {
  let idx = (state.currentPlayerIndex + 1) % state.players.length;
  let attempts = 0;
  while (attempts < state.players.length) {
    if (state.players[idx].isActive && !state.players[idx].hasFolded) return idx;
    idx = (idx + 1) % state.players.length;
    attempts++;
  }
  return state.currentPlayerIndex;
}

export function simulateBotAction(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  if (!player || player.isUser || player.hasFolded) return state;

  const actions = ['call', 'raise', 'fold', 'check'];
  const weights = [0.4, 0.2, 0.15, 0.25];
  let r = Math.random();
  let action = 'check';
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) { action = actions[i]; break; }
  }

  const betAmount = action === 'raise' ? 50 + Math.floor(Math.random() * 100) : (action === 'call' ? 50 : 0);
  const newPlayers = state.players.map((p, i) => {
    if (i !== state.currentPlayerIndex) return p;
    if (action === 'fold') return { ...p, hasFolded: true };
    return { ...p, chips: p.chips - betAmount, currentBet: p.currentBet + betAmount };
  });

  return {
    ...state,
    players: newPlayers,
    pot: state.pot + betAmount,
  };
}

export function cardToString(card: PlayingCard): string {
  return `${card.rank}${card.suit}`;
}

export function isRedSuit(suit: Suit): boolean {
  return suit === '♥' || suit === '♦';
}
