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
  totalHandBet: number; // Total contributed this hand (for side pots)
  status: PlayerStatus;
  rank?: string;
  netWorth?: number;
  invitedBy?: string;
  referredBy?: string;  // UID of affiliate who referred this user (from users/{uid}.referredBy)
  lastAction?: string;
  userId?: string; // Firebase UID for multiplayer
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
  smallBlindIndex: number;
  bigBlindIndex: number;
  smallBlind: number;
  bigBlind: number;
  currentBet: number; // the current highest bet to match
  minRaise: number;
  deck: PlayingCard[];
  roundNumber: number;
  winnerId: number | null;
  winnerIds: number[]; // All winners (for split pot)
  winnerHandDescription: string;
  showdown: boolean;
  bettingRoundComplete: boolean;
  firstActorIndex: number; // first to act in current betting round
  actedCount: number; // how many have acted since last raise
  rakeAmount: number; // rake taken from pot this round
  totalRake: number; // total rake accumulated across rounds
  chatBubbles?: Record<number, { text: string; playerName: string; timestamp: number }>;
  winnerBestCards?: PlayingCard[]; // 5 cards that form the winning hand (for overlay highlight)
  hostId?: string;           // Firebase UID of game creator (from GameRoom)
  inviterId?: string;        // UID of who invited table creator (private tables only)
  isPrivateTable?: boolean;  // true = private, false = Sit & Go / Tournament
  rakeBreakdown?: import('./rake').RakeBreakdown; // breakdown for UI when hand ends
}
