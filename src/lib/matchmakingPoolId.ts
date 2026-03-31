/** Shared pool id builder — used by matchmaking, catalog, and monitor without import cycles. */

export type MatchmakingTierKey = 'human' | 'rat' | 'cat' | 'dog';

function roundMoney(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export function buildMatchmakingPoolId(
  tierKey: MatchmakingTierKey,
  gameMode: 'tournament' | 'sit-and-go',
  smallBlind: number,
  bigBlind: number
): string {
  const sb = roundMoney(smallBlind);
  const bb = roundMoney(bigBlind);
  return `${tierKey}_${gameMode}_sb${sb}_bb${bb}`;
}
