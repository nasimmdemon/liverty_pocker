/**
 * Rake (commission) system for Liberty Poker.
 *
 * House rake: 5% from every pot (capped), min pot 60 for rake to apply.
 *
 * The rake is then split:
 *   - Affiliate share: 30% (referred player in hand; affiliate NOT at table)
 *   - Hoster share:    10% (host is player at table)
 *   - Inviter share:   10% (private tables only; Sit & Go / Tournament = 0)
 *   - House revenue:   remainder
 *
 * Tier-based TOURNAMENT ENTRANCE fees (separate from pot rake):
 *   Human → 11%
 *   Rat   → 7%
 *   Cat   → 6%
 *   Dog   → 5%
 */

import type { Player } from './gameTypes';

export type PlayerTier = 'human' | 'rat' | 'cat' | 'dog';

// ── Pot Rake (per hand) ──────────────────────────────────
const HOUSE_RAKE_PERCENT = 5;
export const MIN_POT_FOR_RAKE = 60;
const MAX_RAKE_CAP = 50; // max rake per pot in chips

// Rake split percentages (of the rake amount)
const AFFILIATE_SHARE_PERCENT = 30;
const HOSTER_SHARE_PERCENT = 10;
const INVITER_SHARE_PERCENT = 10;

export interface RakeBreakdown {
  totalRake: number;       // total taken from pot
  affiliateShare: number;  // 30% or 0 if affiliate at table
  hosterShare: number;     // 10% or 0 if host not at table
  inviterShare: number;    // 10% or 0 (S&G/tournament or not private)
  houseRevenue: number;    // remainder
  netPot: number;          // pot after rake
  rakePercent: number;     // always 5
}

export interface RakeContext {
  pot: number;
  winnerIds: number[];
  playersInHand: Player[];
  affiliateId: string | null;
  affiliateAtTable: boolean;
  hostId: string | null;
  hostAtTable: boolean;
  inviterId: string | null;
  isPrivateTable: boolean;
}

/**
 * Calculate the rake and its breakdown for a given pot (legacy, no context).
 * @param pot  Total pot before rake
 * @param cap  Max rake cap (defaults to MAX_RAKE_CAP)
 */
export function calculateRake(pot: number, cap: number = MAX_RAKE_CAP): RakeBreakdown {
  const rawRake = Math.floor(pot * HOUSE_RAKE_PERCENT / 100);
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
    rakePercent: HOUSE_RAKE_PERCENT,
  };
}

/**
 * Calculate rake with full context (affiliation, host, inviter).
 * Min pot 60 for rake to apply.
 */
export function calculateRakeWithContext(
  ctx: RakeContext,
  cap: number = MAX_RAKE_CAP
): RakeBreakdown {
  if (ctx.pot < MIN_POT_FOR_RAKE) {
    return {
      totalRake: 0,
      affiliateShare: 0,
      hosterShare: 0,
      inviterShare: 0,
      houseRevenue: 0,
      netPot: ctx.pot,
      rakePercent: HOUSE_RAKE_PERCENT,
    };
  }

  const rawRake = Math.floor(ctx.pot * HOUSE_RAKE_PERCENT / 100);
  const totalRake = Math.min(rawRake, cap);

  const affiliateShare = ctx.affiliateAtTable
    ? 0
    : ctx.affiliateId
      ? Math.floor(totalRake * AFFILIATE_SHARE_PERCENT / 100)
      : 0;

  const hosterShare = ctx.hostAtTable && ctx.hostId
    ? Math.floor(totalRake * HOSTER_SHARE_PERCENT / 100)
    : 0;

  const inviterShare = ctx.isPrivateTable && ctx.inviterId
    ? Math.floor(totalRake * INVITER_SHARE_PERCENT / 100)
    : 0;

  const houseRevenue = totalRake - affiliateShare - hosterShare - inviterShare;

  return {
    totalRake,
    affiliateShare,
    hosterShare,
    inviterShare,
    houseRevenue,
    netPot: ctx.pot - totalRake,
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
