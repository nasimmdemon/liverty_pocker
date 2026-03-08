export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface PlayingCard {
  rank: Rank;
  suit: Suit;
  faceUp: boolean;
}

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
  currentBet: number;
  rank?: string;
  netWorth?: number;
  invitedBy?: string;
}

export type GamePhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface GameState {
  players: Player[];
  communityCards: PlayingCard[];
  pot: number;
  currentPlayerIndex: number;
  phase: GamePhase;
  tableId: string;
  dealerIndex: number;
}
