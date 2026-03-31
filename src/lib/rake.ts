/**
 * Rake (commission) system for Liberty Poker.
 *
 * Tier-based Sit & Go commission (pot rake %):
 *   Human → 5.0%
 *   Rat   → 3.5%
 *   Cat   → 2.5%
 *   Dog   → 2.0%
 *
 * Min pot for rake to apply: 60 chips.
 *
 * The rake is then split PER-PLAYER based on their role attribution:
 *
 * For each player's contribution to rake:
 *   1. If player has affiliate → 30% to affiliate (affiliate overrides host)
 *   2. If player was invited by table creator AND table is private → 10% to inviter
 *   3. If player has host AND player does NOT have affiliate → 10% to host
 *   4. Remainder → house
 *
 * Conflict Rules:
 *   A. Affiliate > Host (no double counting)
 *   B. Inviter = 0 for Sit & Go / Tournament (only private tables)
 *   C. Host gets nothing for players who have an affiliate
 *   D. Creator can be both inviter + host (stacks: 10% + 10% = 20%)
 *   E. Missing roles → share goes to house
 *
 * Affiliate share: 30% of commission for ALL tiers.
 *
 * Tier-based TOURNAMENT ENTRANCE fees (separate from pot rake):
 *   Human → 11%
 *   Rat   → 7%
 *   Cat   → 6%
 *   Dog   → 5%
 *
 * Organizer Profit PT:
 *   Human → 0
 *   Rat   → 7
 *   Cat   → 8
 *   Dog   → 10
 */

import type { Player } from './gameTypes';

export type PlayerTier = 'human' | 'rat' | 'cat' | 'dog';

// ── Pot Rake (per hand) ──────────────────────────────────
/** Default/fallback Sit & Go commission — matches Human tier */
const HOUSE_RAKE_PERCENT = 5;
export const MIN_POT_FOR_RAKE = 60;
const MAX_RAKE_CAP = 50; // max rake per pot in chips

/** Tier-based Sit & Go commission percentages */
export const TIER_SITANDGO_PERCENT: Record<PlayerTier, number> = {
  human: 5.0,
  rat:   3.5,
  cat:   2.5,
  dog:   2.0,
};

/** Organizer Profit PT per tier */
export const TIER_ORGANIZER_PROFIT: Record<PlayerTier, number> = {
  human: 0,
  rat:   7,
  cat:   8,
  dog:   10,
};

// Rake split percentages (of the rake amount, applied per-player)
const AFFILIATE_SHARE_PERCENT = 30; // 30% for ALL tiers
const HOSTER_SHARE_PERCENT = 10;
const INVITER_SHARE_PERCENT = 10;

export interface RakeBreakdown {
  totalRake: number;       // total taken from pot
  affiliateShare: number;  // sum of affiliate shares across all players
  hosterShare: number;     // sum of host shares across all players
  inviterShare: number;    // sum of inviter shares (private only)
  houseRevenue: number;    // remainder
  netPot: number;          // pot after rake
  rakePercent: number;     // tier-based: Human 5%, Rat 3.5%, Cat 2.5%, Dog 2%
}

export interface RakeContext {
  pot: number;
  winnerIds: number[];
  playersInHand: Player[];
  affiliateId: string | null;       // DEPRECATED — kept for backward compat
  affiliateAtTable: boolean;        // DEPRECATED
  hostId: string | null;
  hostAtTable: boolean;
  inviterId: string | null;
  isPrivateTable: boolean;
}

/**
 * Calculate the rake and its breakdown for a given pot.
 * Pass an optional tier to apply the correct Sit & Go commission rate.
 */
export function calculateRake(pot: number, cap: number = MAX_RAKE_CAP, tier: PlayerTier = 'human'): RakeBreakdown {
  const rakePercent = TIER_SITANDGO_PERCENT[tier] ?? HOUSE_RAKE_PERCENT;
  const rawRake = Math.floor(pot * rakePercent / 100);
  const totalRake = Math.min(rawRake, cap);
  const affiliateShare = Math.floor(totalRake * AFFILIATE_SHARE_PERCENT / 100);
  const hosterShare = Math.floor(totalRake * HOSTER_SHARE_PERCENT / 100);
  const inviterShare = 0;
  const houseRevenue = totalRake - affiliateShare - hosterShare - inviterShare;

  return {
    totalRake,
    affiliateShare,
    hosterShare,
    inviterShare,
    houseRevenue,
    netPot: pot - totalRake,
    rakePercent,
  };
}

/**
 * Per-player rake distribution with conflict resolution.
 *
 * For each player's proportional share of the rake:
 *   - Rule A: if player.referredBy exists → 30% → affiliate, host gets 0 for this player
 *   - Rule B: if table is private AND player.invitedBy exists → 10% → inviter
 *   - Rule C: Sit & Go / Tournament → inviter = 0 always
 *   - Rule D: if player has NO affiliate AND hostId at table → 10% → host
 *   - Rule E: remainder → house
 */
export function calculateRakeWithContext(
  ctx: RakeContext,
  cap: number = MAX_RAKE_CAP,
  tier: PlayerTier = 'human'
): RakeBreakdown {
  const rakePercent = TIER_SITANDGO_PERCENT[tier] ?? HOUSE_RAKE_PERCENT;

  if (ctx.pot < MIN_POT_FOR_RAKE) {
    return {
      totalRake: 0,
      affiliateShare: 0,
      hosterShare: 0,
      inviterShare: 0,
      houseRevenue: 0,
      netPot: ctx.pot,
      rakePercent,
    };
  }

  const rawRake = Math.floor(ctx.pot * rakePercent / 100);
  const totalRake = Math.min(rawRake, cap);

  if (totalRake === 0) {
    return {
      totalRake: 0,
      affiliateShare: 0,
      hosterShare: 0,
      inviterShare: 0,
      houseRevenue: 0,
      netPot: ctx.pot,
      rakePercent,
    };
  }

  const players = ctx.playersInHand;
  const playerCount = players.length;

  if (playerCount === 0) {
    return {
      totalRake,
      affiliateShare: 0,
      hosterShare: 0,
      inviterShare: 0,
      houseRevenue: totalRake,
      netPot: ctx.pot - totalRake,
      rakePercent,
    };
  }

  // Calculate each player's proportional contribution to the pot
  // Use totalHandBet + totalRoundBet as contribution weight
  const contributions = players.map(p => (p.totalHandBet ?? 0) + (p.totalRoundBet ?? 0));
  const totalContributions = contributions.reduce((a, b) => a + b, 0);

  // If no contributions tracked, split evenly
  const weights = totalContributions > 0
    ? contributions.map(c => c / totalContributions)
    : contributions.map(() => 1 / playerCount);

  let affiliateShareTotal = 0;
  let hosterShareTotal = 0;
  let inviterShareTotal = 0;

  const hostId = ctx.hostId;
  const hostAtTable = ctx.hostAtTable;
  const isPrivate = ctx.isPrivateTable;
  const inviterId = ctx.inviterId;

  // Set of player userIds at table (to check if affiliate is at table)
  const tableUserIds = new Set(players.map(p => p.userId).filter(Boolean));

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const playerRakeShare = totalRake * weights[i]; // this player's portion of the rake

    const hasAffiliate = !!player.referredBy;
    // Affiliate is at table → their share goes to house (Rule: affiliate NOT at table)
    const affiliateIsAtTable = hasAffiliate && tableUserIds.has(player.referredBy!);
    const affiliateValid = hasAffiliate && !affiliateIsAtTable;

    // Rule A: Affiliate gets 30% of this player's rake share
    if (affiliateValid) {
      affiliateShareTotal += playerRakeShare * AFFILIATE_SHARE_PERCENT / 100;
    }

    // Rule B: Inviter gets 10% only on private tables
    if (isPrivate && inviterId) {
      inviterShareTotal += playerRakeShare * INVITER_SHARE_PERCENT / 100;
    }

    // Rule D: Host gets 10% ONLY if player has NO affiliate (Affiliate > Host)
    if (hostAtTable && hostId && !affiliateValid) {
      hosterShareTotal += playerRakeShare * HOSTER_SHARE_PERCENT / 100;
    }
  }

  // Floor all values to prevent floating point overshoot
  const affiliateShare = Math.floor(affiliateShareTotal);
  const hosterShare = Math.floor(hosterShareTotal);
  const inviterShare = Math.floor(inviterShareTotal);
  const houseRevenue = totalRake - affiliateShare - hosterShare - inviterShare;

  return {
    totalRake,
    affiliateShare,
    hosterShare,
    inviterShare,
    houseRevenue,
    netPot: ctx.pot - totalRake,
    rakePercent,
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
