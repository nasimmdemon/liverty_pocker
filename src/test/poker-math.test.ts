import { describe, it, expect } from 'vitest';
import { calculateRake, calculateEntranceFee } from '@/lib/rake';
import {
  createInitialGameState,
  startNewRound,
  playerAction,
} from '@/lib/gameLogic';

// ── Rake calculation tests ─────────────────────────────────
describe('calculateRake', () => {
  it('takes 5% from pot', () => {
    const result = calculateRake(200);
    expect(result.totalRake).toBe(10);
    expect(result.netPot).toBe(190);
    expect(result.rakePercent).toBe(5);
  });

  it('splits rake correctly: 30% affiliate, 10% hoster, 10% inviter (0 when no context), remainder house', () => {
    const result = calculateRake(200);
    expect(result.affiliateShare).toBe(3);
    expect(result.hosterShare).toBe(1);
    expect(result.inviterShare).toBe(0);
    expect(result.houseRevenue).toBe(6);
    expect(result.affiliateShare + result.hosterShare + result.inviterShare + result.houseRevenue).toBe(result.totalRake);
  });

  it('caps rake at 50', () => {
    const result = calculateRake(2000);
    expect(result.totalRake).toBe(50);
    expect(result.netPot).toBe(1950);
  });

  it('handles zero pot', () => {
    const result = calculateRake(0);
    expect(result.totalRake).toBe(0);
    expect(result.netPot).toBe(0);
  });

  it('handles pot of 20 (1 chip rake)', () => {
    const result = calculateRake(20);
    expect(result.totalRake).toBe(1);
    expect(result.netPot).toBe(19);
  });
});

describe('calculateEntranceFee', () => {
  it('human tier: 11% entrance fee', () => {
    const result = calculateEntranceFee(1000, 'human');
    expect(result.feeAmount).toBe(110);
    expect(result.netBuyIn).toBe(890);
  });

  it('dog tier: 5% entrance fee', () => {
    const result = calculateEntranceFee(1000, 'dog');
    expect(result.feeAmount).toBe(50);
    expect(result.netBuyIn).toBe(950);
  });
});

// ── Chip conservation ──────────────────────────────────────
// Total chips = sum(player.chips) + pot
// currentBet is a tracking field (how much player bet this round) — those chips
// are already deducted from player.chips and added to pot. So we do NOT add currentBet.
describe('chip conservation', () => {
  function getTotalChips(state: ReturnType<typeof createInitialGameState>): number {
    return state.players.reduce((sum, p) => sum + p.chips, 0) + state.pot;
  }

  it('all players start with the same buy-in', () => {
    const initial = createInitialGameState(1000, 3, 5, 10);
    for (const p of initial.players) {
      expect(p.chips).toBe(1000);
    }
    expect(initial.pot).toBe(0);
  });

  it('total chips constant after blinds posted', () => {
    const initial = createInitialGameState(1000, 5, 5, 10);
    const totalBefore = getTotalChips(initial); // 6 * 1000 = 6000
    const round = startNewRound(initial);
    const totalAfter = getTotalChips(round);
    expect(totalAfter).toBe(totalBefore);
  });

  it('total chips constant after fold', () => {
    const initial = createInitialGameState(1000, 5, 5, 10);
    const round = startNewRound(initial);
    const totalBefore = getTotalChips(round);
    const afterFold = playerAction(round, round.currentPlayerIndex, 'fold');
    expect(getTotalChips(afterFold)).toBe(totalBefore);
  });

  it('total chips constant after call', () => {
    const initial = createInitialGameState(1000, 5, 5, 10);
    const round = startNewRound(initial);
    const totalBefore = getTotalChips(round);
    const afterCall = playerAction(round, round.currentPlayerIndex, 'call');
    expect(getTotalChips(afterCall)).toBe(totalBefore);
  });

  it('total chips constant after raise', () => {
    const initial = createInitialGameState(1000, 5, 5, 10);
    const round = startNewRound(initial);
    const totalBefore = getTotalChips(round);
    const afterRaise = playerAction(round, round.currentPlayerIndex, 'raise', 30);
    expect(getTotalChips(afterRaise)).toBe(totalBefore);
  });

  it('total chips constant after all-in', () => {
    const initial = createInitialGameState(1000, 5, 5, 10);
    const round = startNewRound(initial);
    const totalBefore = getTotalChips(round);
    const afterAllIn = playerAction(round, round.currentPlayerIndex, 'all-in');
    expect(getTotalChips(afterAllIn)).toBe(totalBefore);
  });

  it('correct player count from botCount', () => {
    expect(createInitialGameState(1000, 2).players.length).toBe(3);
    expect(createInitialGameState(1000, 5).players.length).toBe(6);
    expect(createInitialGameState(1000, 1).players.length).toBe(2);
  });
});

// ── Showdown rake ──────────────────────────────────────────
describe('showdown rake', () => {
  it('fold-win: pot=0 after showdown, rake deducted', () => {
    const initial = createInitialGameState(1000, 2, 5, 10);
    let state = startNewRound(initial);
    // Fold both non-user players to trigger fold-win
    state = playerAction(state, state.currentPlayerIndex, 'fold');
    if (!state.showdown) {
      state = playerAction(state, state.currentPlayerIndex, 'fold');
    }
    if (state.showdown) {
      expect(state.pot).toBe(0);
      expect(state.rakeAmount).toBeGreaterThanOrEqual(0);
      // Winner's chips + losers' chips + rake = original total
      const total = state.players.reduce((s, p) => s + p.chips, 0) + state.rakeAmount;
      expect(total).toBe(3000); // 3 players * 1000
    }
  });
});
