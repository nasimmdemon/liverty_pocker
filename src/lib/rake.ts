/**
 * Rake (commission) system for Liberty Poker.
 *
 * Tier-based rake:
 *   Human  → 10%
 *   Cat    → 12.5%
 *   Rat    → 15%
 *   Dog    → 20%
 *
 * For now we default to the Human tier (10%) for single-player / bot games.
 * The rake is taken from the pot before awarding to winner(s).
 */

export type PlayerTier = 'human' | 'cat' | 'rat' | 'dog';

const TIER_RAKE_PERCENT: Record<PlayerTier, number> = {
  human: 10,
  cat: 12.5,
  rat: 15,
  dog: 20,
};

/** Max rake cap per pot (in chips). Prevents absurd rakes on huge pots. */
const MAX_RAKE_CAP = 50;

export interface RakeResult {
  rakeAmount: number;
  netPot: number;
  rakePercent: number;
}

/**
 * Calculate the rake for a given pot.
 * @param pot       Total pot before rake
 * @param tier      Player's tier (defaults to 'human')
 * @param cap       Max rake cap (defaults to MAX_RAKE_CAP)
 */
export function calculateRake(pot: number, tier: PlayerTier = 'human', cap: number = MAX_RAKE_CAP): RakeResult {
  const rakePercent = TIER_RAKE_PERCENT[tier];
  const rawRake = Math.floor(pot * rakePercent / 100);
  const rakeAmount = Math.min(rawRake, cap);
  return {
    rakeAmount,
    netPot: pot - rakeAmount,
    rakePercent,
  };
}
