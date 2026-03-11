/**
 * Rake (commission) system for Liberty Poker.
 *
 * House rake: 5% from every pot (capped).
 *
 * The 5% rake is then split:
 *   - Affiliate share: 30% of rake (from referred players)
 *   - Hoster share:    10% of rake (table organizer)
 *   - House revenue:   remaining 60% of rake
 *
 * Tier-based TOURNAMENT ENTRANCE fees (separate from pot rake):
 *   Human → 11%
 *   Rat   → 7%
 *   Cat   → 6%
 *   Dog   → 5%
 */

export type PlayerTier = 'human' | 'rat' | 'cat' | 'dog';

// ── Pot Rake (per hand) ──────────────────────────────────
const HOUSE_RAKE_PERCENT = 5;
const MAX_RAKE_CAP = 50; // max rake per pot in chips

// Rake split percentages (of the rake amount)
const AFFILIATE_SHARE_PERCENT = 30;
const HOSTER_SHARE_PERCENT = 10;

export interface RakeBreakdown {
  totalRake: number;       // total taken from pot
  affiliateShare: number;  // 30% of rake
  hosterShare: number;     // 10% of rake
  houseRevenue: number;    // 60% of rake
  netPot: number;          // pot after rake
  rakePercent: number;     // always 5
}

/**
 * Calculate the rake and its breakdown for a given pot.
 * @param pot  Total pot before rake
 * @param cap  Max rake cap (defaults to MAX_RAKE_CAP)
 */
export function calculateRake(pot: number, cap: number = MAX_RAKE_CAP): RakeBreakdown {
  const rawRake = Math.floor(pot * HOUSE_RAKE_PERCENT / 100);
  const totalRake = Math.min(rawRake, cap);
  const affiliateShare = Math.floor(totalRake * AFFILIATE_SHARE_PERCENT / 100);
  const hosterShare = Math.floor(totalRake * HOSTER_SHARE_PERCENT / 100);
  const houseRevenue = totalRake - affiliateShare - hosterShare;

  return {
    totalRake,
    affiliateShare,
    hosterShare,
    houseRevenue,
    netPot: pot - totalRake,
    rakePercent: HOUSE_RAKE_PERCENT,
  };
}

// ── Tournament Entrance Fees ─────────────────────────────
const TIER_ENTRANCE_PERCENT: Record<PlayerTier, number> = {
  human: 11,
  rat: 7,
  cat: 6,
  dog: 5,
};

export interface EntranceFeeResult {
  feeAmount: number;
  netBuyIn: number;
  feePercent: number;
}

/**
 * Calculate tournament entrance fee based on tier.
 * This is deducted from the buy-in BEFORE adding to table chips.
 */
export function calculateEntranceFee(buyIn: number, tier: PlayerTier = 'human'): EntranceFeeResult {
  const feePercent = TIER_ENTRANCE_PERCENT[tier];
  const feeAmount = Math.floor(buyIn * feePercent / 100);
  return {
    feeAmount,
    netBuyIn: buyIn - feeAmount,
    feePercent,
  };
}
