import { describe, it, expect } from 'vitest';
import {
  calculateRake,
  calculateRakeWithContext,
  calculateEntranceFee,
  MIN_POT_FOR_RAKE,
  type RakeContext,
} from '@/lib/rake';
import type { Player } from '@/lib/gameTypes';

// Helper to create a minimal player
function makePlayer(id: number, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name: `Player ${id}`,
    chips: 1000,
    avatar: '',
    cards: [],
    isActive: true,
    isTurn: false,
    isUser: id === 0,
    hasFolded: false,
    isAllIn: false,
    currentBet: 0,
    totalRoundBet: 0,
    totalHandBet: 100,
    status: 'active',
    ...overrides,
  };
}

// ─── Basic calculateRake ────────────────────────────────────

describe('calculateRake (legacy)', () => {
  it('takes 5% of pot', () => {
    const r = calculateRake(200);
    expect(r.totalRake).toBe(10); // floor(200 * 0.05) = 10
    expect(r.netPot).toBe(190);
    expect(r.rakePercent).toBe(5);
  });

  it('caps rake at 50', () => {
    const r = calculateRake(5000);
    expect(r.totalRake).toBe(50); // floor(5000*0.05)=250 → capped 50
    expect(r.netPot).toBe(4950);
  });

  it('floors fractional rake', () => {
    const r = calculateRake(61); // floor(61*0.05) = floor(3.05) = 3
    expect(r.totalRake).toBe(3);
  });

  it('sum of shares equals totalRake', () => {
    const r = calculateRake(500);
    expect(r.affiliateShare + r.hosterShare + r.inviterShare + r.houseRevenue).toBe(r.totalRake);
  });
});

// ─── calculateRakeWithContext ───────────────────────────────

describe('calculateRakeWithContext', () => {
  it('returns zero rake when pot < MIN_POT_FOR_RAKE', () => {
    const ctx: RakeContext = {
      pot: MIN_POT_FOR_RAKE - 1,
      winnerIds: [0],
      playersInHand: [makePlayer(0), makePlayer(1)],
      affiliateId: null,
      affiliateAtTable: false,
      hostId: null,
      hostAtTable: false,
      inviterId: null,
      isPrivateTable: false,
    };
    const r = calculateRakeWithContext(ctx);
    expect(r.totalRake).toBe(0);
    expect(r.netPot).toBe(ctx.pot);
  });

  it('applies 5% rake on qualifying pot', () => {
    const ctx: RakeContext = {
      pot: 100,
      winnerIds: [0],
      playersInHand: [makePlayer(0), makePlayer(1)],
      affiliateId: null,
      affiliateAtTable: false,
      hostId: null,
      hostAtTable: false,
      inviterId: null,
      isPrivateTable: false,
    };
    const r = calculateRakeWithContext(ctx);
    expect(r.totalRake).toBe(5); // floor(100 * 0.05)
    expect(r.netPot).toBe(95);
  });

  it('all shares sum to totalRake', () => {
    const ctx: RakeContext = {
      pot: 200,
      winnerIds: [0],
      playersInHand: [
        makePlayer(0, { referredBy: 'aff-uid-1' }),
        makePlayer(1),
      ],
      affiliateId: 'aff-uid-1',
      affiliateAtTable: false,
      hostId: 'host-uid',
      hostAtTable: true,
      inviterId: 'inv-uid',
      isPrivateTable: true,
    };
    const r = calculateRakeWithContext(ctx);
    expect(r.affiliateShare + r.hosterShare + r.inviterShare + r.houseRevenue).toBe(r.totalRake);
  });
});

// ─── Affiliate > Host (Rule A) ──────────────────────────────

describe('Rule A: Affiliate overrides Host', () => {
  it('gives affiliate share, NOT host share, for player with referredBy', () => {
    // Both players contribute equally (100 each), pot = 200
    const players = [
      makePlayer(0, { referredBy: 'affiliate-1', totalHandBet: 100 }),
      makePlayer(1, { totalHandBet: 100 }),
    ];
    const ctx: RakeContext = {
      pot: 200,
      winnerIds: [0],
      playersInHand: players,
      affiliateId: 'affiliate-1',
      affiliateAtTable: false,
      hostId: 'host-1',
      hostAtTable: true,
      inviterId: null,
      isPrivateTable: false,
    };
    const r = calculateRakeWithContext(ctx);
    // totalRake = 10, each player's share = 5
    // Player 0: has affiliate → 30% of 5 = 1.5 → affiliate gets floor(1.5) = 1
    //           host gets 0 for this player (Rule A)
    // Player 1: no affiliate → host gets 10% of 5 = 0.5 → floor = 0
    expect(r.affiliateShare).toBeGreaterThan(0);
    // Host only gets share from players WITHOUT affiliate
    expect(r.affiliateShare + r.hosterShare + r.inviterShare + r.houseRevenue).toBe(r.totalRake);
  });

  it('host gets share from non-affiliate players', () => {
    const players = [
      makePlayer(0, { referredBy: 'aff-1', totalHandBet: 500 }),
      makePlayer(1, { totalHandBet: 500 }),
    ];
    const ctx: RakeContext = {
      pot: 1000,
      winnerIds: [0],
      playersInHand: players,
      affiliateId: 'aff-1',
      affiliateAtTable: false,
      hostId: 'host-1',
      hostAtTable: true,
      inviterId: null,
      isPrivateTable: false,
    };
    const r = calculateRakeWithContext(ctx);
    // totalRake = 50 (capped), each player's share = 25
    // Player 0: affiliate → 30% of 25 = 7.5 → 7, host 0
    // Player 1: no affiliate → host 10% of 25 = 2.5 → 2
    expect(r.affiliateShare).toBe(7);
    expect(r.hosterShare).toBe(2);
  });
});

// ─── Inviter only on private tables (Rule B) ────────────────

describe('Rule B: Inviter only on private tables', () => {
  it('inviter gets 10% on private table', () => {
    const players = [makePlayer(0, { totalHandBet: 100 }), makePlayer(1, { totalHandBet: 100 })];
    const ctx: RakeContext = {
      pot: 200,
      winnerIds: [0],
      playersInHand: players,
      affiliateId: null,
      affiliateAtTable: false,
      hostId: null,
      hostAtTable: false,
      inviterId: 'inv-1',
      isPrivateTable: true,
    };
    const r = calculateRakeWithContext(ctx);
    expect(r.inviterShare).toBeGreaterThan(0);
  });

  it('inviter gets 0 on public/sit-and-go table', () => {
    const players = [makePlayer(0, { totalHandBet: 100 }), makePlayer(1, { totalHandBet: 100 })];
    const ctx: RakeContext = {
      pot: 200,
      winnerIds: [0],
      playersInHand: players,
      affiliateId: null,
      affiliateAtTable: false,
      hostId: null,
      hostAtTable: false,
      inviterId: 'inv-1',
      isPrivateTable: false,
    };
    const r = calculateRakeWithContext(ctx);
    expect(r.inviterShare).toBe(0);
  });
});

// ─── Missing roles → house (Rule E/F) ──────────────────────

describe('Rule F: Missing roles go to house', () => {
  it('no affiliate, no host, no inviter → all rake to house', () => {
    const players = [makePlayer(0, { totalHandBet: 100 }), makePlayer(1, { totalHandBet: 100 })];
    const ctx: RakeContext = {
      pot: 200,
      winnerIds: [0],
      playersInHand: players,
      affiliateId: null,
      affiliateAtTable: false,
      hostId: null,
      hostAtTable: false,
      inviterId: null,
      isPrivateTable: false,
    };
    const r = calculateRakeWithContext(ctx);
    expect(r.houseRevenue).toBe(r.totalRake);
    expect(r.affiliateShare).toBe(0);
    expect(r.hosterShare).toBe(0);
    expect(r.inviterShare).toBe(0);
  });
});

// ─── Affiliate at table → no affiliate share ───────────────

describe('Affiliate at table edge case', () => {
  it('affiliate sitting at table gets 0 share (goes to house)', () => {
    const players = [
      makePlayer(0, { referredBy: 'player-1-uid', totalHandBet: 100, userId: 'p0-uid' }),
      makePlayer(1, { totalHandBet: 100, userId: 'player-1-uid' }), // affiliate is Player 1
    ];
    const ctx: RakeContext = {
      pot: 200,
      winnerIds: [0],
      playersInHand: players,
      affiliateId: 'player-1-uid',
      affiliateAtTable: true,
      hostId: null,
      hostAtTable: false,
      inviterId: null,
      isPrivateTable: false,
    };
    const r = calculateRakeWithContext(ctx);
    // Affiliate is at the table → share goes to house
    expect(r.affiliateShare).toBe(0);
    expect(r.houseRevenue).toBe(r.totalRake);
  });
});

// ─── Creator as both inviter + host (Rule D stacking) ──────

describe('Rule D: Creator can be both inviter + host', () => {
  it('stacks inviter + host on private table for non-affiliate player', () => {
    const players = [makePlayer(0, { totalHandBet: 500 }), makePlayer(1, { totalHandBet: 500 })];
    const ctx: RakeContext = {
      pot: 1000,
      winnerIds: [0],
      playersInHand: players,
      affiliateId: null,
      affiliateAtTable: false,
      hostId: 'creator-uid',
      hostAtTable: true,
      inviterId: 'creator-uid', // same person
      isPrivateTable: true,
    };
    const r = calculateRakeWithContext(ctx);
    // totalRake = 50, each player share = 25
    // inviter: 10% of 25 = 2 (per player, total 4–5)
    // host:    10% of 25 = 2 (per player, total 4–5)
    expect(r.inviterShare).toBeGreaterThan(0);
    expect(r.hosterShare).toBeGreaterThan(0);
    // Combined should be ~20% of totalRake
    const combined = r.inviterShare + r.hosterShare;
    expect(combined).toBeGreaterThanOrEqual(Math.floor(r.totalRake * 0.18)); // floor rounding
    expect(combined).toBeLessThanOrEqual(Math.ceil(r.totalRake * 0.22));
  });
});

// ─── Tournament entrance fees ───────────────────────────────

describe('Tournament entrance fees', () => {
  it('human tier: 11% fee', () => {
    const r = calculateEntranceFee(100, 'human');
    expect(r.feePercent).toBe(11);
    expect(r.feeAmount).toBe(11);
    expect(r.netBuyIn).toBe(89);
  });

  it('rat tier: 7% fee', () => {
    const r = calculateEntranceFee(100, 'rat');
    expect(r.feePercent).toBe(7);
    expect(r.feeAmount).toBe(7);
    expect(r.netBuyIn).toBe(93);
  });

  it('cat tier: 6% fee', () => {
    const r = calculateEntranceFee(100, 'cat');
    expect(r.feePercent).toBe(6);
    expect(r.feeAmount).toBe(6);
    expect(r.netBuyIn).toBe(94);
  });

  it('dog tier: 5% fee', () => {
    const r = calculateEntranceFee(100, 'dog');
    expect(r.feePercent).toBe(5);
    expect(r.feeAmount).toBe(5);
    expect(r.netBuyIn).toBe(95);
  });

  it('floors fractional fee', () => {
    const r = calculateEntranceFee(33, 'human'); // floor(33 * 0.11) = floor(3.63) = 3
    expect(r.feeAmount).toBe(3);
    expect(r.netBuyIn).toBe(30);
  });
});

// ─── Conservation: shares always sum to totalRake ───────────

describe('Chip conservation across all scenarios', () => {
  const scenarios: { name: string; ctx: RakeContext }[] = [
    {
      name: 'all roles present, private table',
      ctx: {
        pot: 600,
        winnerIds: [0],
        playersInHand: [
          makePlayer(0, { referredBy: 'aff-1', totalHandBet: 200 }),
          makePlayer(1, { totalHandBet: 200 }),
          makePlayer(2, { totalHandBet: 200 }),
        ],
        affiliateId: 'aff-1',
        affiliateAtTable: false,
        hostId: 'host-1',
        hostAtTable: true,
        inviterId: 'inv-1',
        isPrivateTable: true,
      },
    },
    {
      name: 'large pot, capped rake',
      ctx: {
        pot: 5000,
        winnerIds: [0, 1],
        playersInHand: [
          makePlayer(0, { referredBy: 'aff-1', totalHandBet: 2500 }),
          makePlayer(1, { totalHandBet: 2500 }),
        ],
        affiliateId: 'aff-1',
        affiliateAtTable: false,
        hostId: 'host-1',
        hostAtTable: true,
        inviterId: null,
        isPrivateTable: false,
      },
    },
    {
      name: 'minimum qualifying pot',
      ctx: {
        pot: 60,
        winnerIds: [0],
        playersInHand: [
          makePlayer(0, { totalHandBet: 30 }),
          makePlayer(1, { totalHandBet: 30 }),
        ],
        affiliateId: null,
        affiliateAtTable: false,
        hostId: null,
        hostAtTable: false,
        inviterId: null,
        isPrivateTable: false,
      },
    },
  ];

  scenarios.forEach(({ name, ctx }) => {
    it(`shares sum to totalRake: ${name}`, () => {
      const r = calculateRakeWithContext(ctx);
      expect(r.affiliateShare + r.hosterShare + r.inviterShare + r.houseRevenue).toBe(r.totalRake);
      expect(r.netPot).toBe(ctx.pot - r.totalRake);
    });
  });
});
