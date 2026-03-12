import { PlayingCard, Rank, Suit } from './gameTypes';
import { evaluateHand, compareHands } from './handEvaluator';

const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];

function cardKey(c: PlayingCard): string {
  return `${c.rank}-${c.suit}`;
}

function createDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, faceUp: true });
    }
  }
  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Monte Carlo win probability for the user.
 * @param userHoleCards User's 2 hole cards
 * @param communityCards Visible community cards (face up)
 * @param opponentCount Number of opponents still in hand (not folded)
 * @param trials Number of Monte Carlo trials (default 150)
 */
export function calculateWinProbability(
  userHoleCards: PlayingCard[],
  communityCards: PlayingCard[],
  opponentCount: number,
  trials = 150
): number {
  if (userHoleCards.length !== 2) return 0;
  if (opponentCount < 0) return 0;

  const used = new Set<string>();
  for (const c of userHoleCards) used.add(cardKey(c));
  const visibleCommunity = communityCards.filter(c => c.faceUp);
  for (const c of visibleCommunity) used.add(cardKey(c));
  const needCommunity = 5 - visibleCommunity.length;
  const needOpponentCards = opponentCount * 2;
  const totalNeeded = needCommunity + needOpponentCards;

  if (totalNeeded > 52 - used.size) return opponentCount === 0 ? 100 : 50;

  let wins = 0;
  const deck = createDeck().filter(c => !used.has(cardKey(c)));

  for (let t = 0; t < trials; t++) {
    const shuffled = shuffle(deck);
    const remainingCommunity: PlayingCard[] = [];
    const opponentHands: PlayingCard[][] = [];
    let idx = 0;

    for (let i = 0; i < needCommunity; i++) {
      remainingCommunity.push({ ...shuffled[idx++], faceUp: true });
    }
    for (let o = 0; o < opponentCount; o++) {
      opponentHands.push([
        { ...shuffled[idx++], faceUp: true },
        { ...shuffled[idx++], faceUp: true },
      ]);
    }

    const allCommunity = [...visibleCommunity, ...remainingCommunity];
    const userHand = evaluateHand(userHoleCards, allCommunity);
    let userWins = true;
    for (const opp of opponentHands) {
      const oppHand = evaluateHand(opp, allCommunity);
      if (compareHands(oppHand, userHand) > 0) {
        userWins = false;
        break;
      }
    }
    if (userWins) wins++;
  }

  return Math.round((wins / trials) * 100);
}
