import { PlayingCard, Rank, Suit } from './gameTypes';

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export type HandRank =
  | 'High Card'
  | 'Pair'
  | 'Two Pair'
  | 'Three of a Kind'
  | 'Straight'
  | 'Flush'
  | 'Full House'
  | 'Four of a Kind'
  | 'Straight Flush';

const HAND_RANK_VALUES: Record<HandRank, number> = {
  'High Card': 1,
  'Pair': 2,
  'Two Pair': 3,
  'Three of a Kind': 4,
  'Straight': 5,
  'Flush': 6,
  'Full House': 7,
  'Four of a Kind': 8,
  'Straight Flush': 9,
};

export interface HandResult {
  rank: HandRank;
  rankValue: number;
  tiebreakers: number[]; // sorted high to low for comparison
  description: string;
  bestCards: PlayingCard[];
}

function getCombinations(cards: PlayingCard[], size: number): PlayingCard[][] {
  if (size === 0) return [[]];
  if (cards.length < size) return [];
  const result: PlayingCard[][] = [];
  for (let i = 0; i <= cards.length - size; i++) {
    const rest = getCombinations(cards.slice(i + 1), size - 1);
    for (const combo of rest) {
      result.push([cards[i], ...combo]);
    }
  }
  return result;
}

function evaluateFiveCards(cards: PlayingCard[]): HandResult {
  const values = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  
  const isFlush = suits.every(s => s === suits[0]);
  
  // Check straight
  let isStraight = false;
  let straightHigh = 0;
  const uniqueVals = [...new Set(values)].sort((a, b) => b - a);
  
  if (uniqueVals.length >= 5) {
    // Normal straight
    for (let i = 0; i <= uniqueVals.length - 5; i++) {
      if (uniqueVals[i] - uniqueVals[i + 4] === 4) {
        const slice = uniqueVals.slice(i, i + 5);
        if (slice.length === 5 && slice[0] - slice[4] === 4) {
          isStraight = true;
          straightHigh = slice[0];
          break;
        }
      }
    }
    // Ace-low straight (A-2-3-4-5)
    if (!isStraight && uniqueVals.includes(14) && uniqueVals.includes(2) && uniqueVals.includes(3) && uniqueVals.includes(4) && uniqueVals.includes(5)) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  // Count ranks
  const counts: Record<number, number> = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  const groups = Object.entries(counts)
    .map(([val, cnt]) => ({ val: Number(val), cnt }))
    .sort((a, b) => b.cnt - a.cnt || b.val - a.val);

  if (isFlush && isStraight) {
    return { rank: 'Straight Flush', rankValue: 9, tiebreakers: [straightHigh], description: `Straight Flush, ${rankName(straightHigh)} high`, bestCards: cards };
  }
  if (groups[0].cnt === 4) {
    const kicker = groups.find(g => g.cnt !== 4)!;
    return { rank: 'Four of a Kind', rankValue: 8, tiebreakers: [groups[0].val, kicker.val], description: `Four ${rankName(groups[0].val)}s`, bestCards: cards };
  }
  if (groups[0].cnt === 3 && groups[1]?.cnt === 2) {
    return { rank: 'Full House', rankValue: 7, tiebreakers: [groups[0].val, groups[1].val], description: `Full House, ${rankName(groups[0].val)}s full of ${rankName(groups[1].val)}s`, bestCards: cards };
  }
  if (isFlush) {
    return { rank: 'Flush', rankValue: 6, tiebreakers: values, description: `Flush, ${rankName(values[0])} high`, bestCards: cards };
  }
  if (isStraight) {
    return { rank: 'Straight', rankValue: 5, tiebreakers: [straightHigh], description: `Straight, ${rankName(straightHigh)} high`, bestCards: cards };
  }
  if (groups[0].cnt === 3) {
    const kickers = groups.filter(g => g.cnt !== 3).map(g => g.val).sort((a, b) => b - a);
    return { rank: 'Three of a Kind', rankValue: 4, tiebreakers: [groups[0].val, ...kickers], description: `Three ${rankName(groups[0].val)}s`, bestCards: cards };
  }
  if (groups[0].cnt === 2 && groups[1]?.cnt === 2) {
    const pairs = groups.filter(g => g.cnt === 2).map(g => g.val).sort((a, b) => b - a);
    const kicker = groups.find(g => g.cnt === 1)!;
    return { rank: 'Two Pair', rankValue: 3, tiebreakers: [...pairs, kicker.val], description: `Two Pair, ${rankName(pairs[0])}s and ${rankName(pairs[1])}s`, bestCards: cards };
  }
  if (groups[0].cnt === 2) {
    const kickers = groups.filter(g => g.cnt !== 2).map(g => g.val).sort((a, b) => b - a);
    return { rank: 'Pair', rankValue: 2, tiebreakers: [groups[0].val, ...kickers], description: `Pair of ${rankName(groups[0].val)}s`, bestCards: cards };
  }
  return { rank: 'High Card', rankValue: 1, tiebreakers: values, description: `${rankName(values[0])} high`, bestCards: cards };
}

function rankName(val: number): string {
  const names: Record<number, string> = { 14: 'Ace', 13: 'King', 12: 'Queen', 11: 'Jack', 10: 'Ten', 9: 'Nine', 8: 'Eight', 7: 'Seven', 6: 'Six', 5: 'Five', 4: 'Four', 3: 'Three', 2: 'Two' };
  return names[val] || String(val);
}

export function evaluateHand(holeCards: PlayingCard[], communityCards: PlayingCard[]): HandResult {
  const allCards = [...holeCards, ...communityCards];
  const combos = getCombinations(allCards, 5);
  let best: HandResult | null = null;
  for (const combo of combos) {
    const result = evaluateFiveCards(combo);
    if (!best || compareHands(result, best) > 0) {
      best = result;
    }
  }
  return best!;
}

export function compareHands(a: HandResult, b: HandResult): number {
  if (a.rankValue !== b.rankValue) return a.rankValue - b.rankValue;
  for (let i = 0; i < Math.min(a.tiebreakers.length, b.tiebreakers.length); i++) {
    if (a.tiebreakers[i] !== b.tiebreakers[i]) return a.tiebreakers[i] - b.tiebreakers[i];
  }
  return 0;
}

export function determineWinners(
  players: { id: number; cards: PlayingCard[]; hasFolded: boolean; isActive: boolean }[],
  communityCards: PlayingCard[]
): { winnerId: number; hand: HandResult }[] {
  const activePlayers = players.filter(p => !p.hasFolded && p.isActive && p.cards.length === 2);
  if (activePlayers.length === 0) return [];
  if (activePlayers.length === 1) {
    return [{ winnerId: activePlayers[0].id, hand: evaluateHand(activePlayers[0].cards, communityCards) }];
  }

  const results = activePlayers.map(p => ({
    winnerId: p.id,
    hand: evaluateHand(p.cards, communityCards),
  }));

  results.sort((a, b) => compareHands(b.hand, a.hand));
  const bestHand = results[0].hand;
  
  // Return all tied winners
  return results.filter(r => compareHands(r.hand, bestHand) === 0);
}
