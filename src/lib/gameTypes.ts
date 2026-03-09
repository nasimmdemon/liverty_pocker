export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface PlayingCard {
  rank: Rank;
  suit: Suit;
  faceUp: boolean;
}

export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'sitting-out' | 'waiting';

export interface Player {
  id: number;
  name: string;
  chips: number;
  avatar: string;
  cards: PlayingCard[];
  isActive: boolean;
  isTurn: boolean;
  isUser: boolean;
  hasFolded: boolean;
  isAllIn: boolean;
  currentBet: number;
  totalRoundBet: number;
  status: PlayerStatus;
  rank?: string;
  netWorth?: number;
  invitedBy?: string;
  lastAction?: string;
}

export type GamePhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type GameScreen = 'buy-in' | 'playing' | 'between-rounds';

export interface GameState {
  players: Player[];
  communityCards: PlayingCard[];
  pot: number;
  sidePots: { amount: number; eligible: number[] }[];
  currentPlayerIndex: number;
  phase: GamePhase;
  tableId: string;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  currentBet: number; // the current highest bet to match
  minRaise: number;
  deck: PlayingCard[];
  roundNumber: number;
  winnerId: number | null;
  winnerHandDescription: string;
  showdown: boolean;
  bettingRoundComplete: boolean;
  firstActorIndex: number; // first to act in current betting round
  actedCount: number; // how many have acted since last raise
}
