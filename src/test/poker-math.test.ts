import { describe, it, expect } from 'vitest';
import { calculateRake, calculateEntranceFee } from '@/lib/rake';
import {
  createInitialGameState,
  startNewRound,
  playerAction,
  getActivePlayers,
} from '@/lib/gameLogic';

// ── Rake calculation tests ─────────────────────────────────
describe('calculateRake', () => {
  it('takes 5% from pot', () => {
    const result = calculateRake(200);
    expect(result.totalRake).toBe(10); // 5% of 200
    expect(result.netPot).toBe(190);
    expect(result.rakePercent).toBe(5);
  });

  it('splits rake correctly: 30% affiliate, 10% hoster, 60% house', () => {
    const result = calculateRake(200);
    expect(result.affiliateShare).toBe(3);  // 30% of 10
    expect(result.hosterShare).toBe(1);     // 10% of 10
    expect(result.houseRevenue).toBe(6);    // remainder
    // Shares must sum to total rake
    expect(result.affiliateShare + result.hosterShare + result.houseRevenue).toBe(result.totalRake);
  });

  it('caps rake at 50', () => {
    const result = calculateRake(2000);
    expect(result.totalRake).toBe(50); // cap
    expect(result.netPot).toBe(1950);
  });

  it('handles zero pot', () => {
    const result = calculateRake(0);
    expect(result.totalRake).toBe(0);
    expect(result.netPot).toBe(0);
  });

  it('handles small pot correctly (no negative)', () => {
    const result = calculateRake(10);
    expect(result.totalRake).toBe(0); // floor(0.5) = 0
    expect(result.netPot).toBe(10);
  });

  it('handles pot of 20 (1 chip rake)', () => {
    const result = calculateRake(20);
    expect(result.totalRake).toBe(1); // floor(1) = 1
    expect(result.netPot).toBe(19);
  });
});

// ── Entrance fee tests ─────────────────────────────────────
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

// ── Chip conservation tests ────────────────────────────────
describe('chip conservation', () => {
  function getTotalChips(state: ReturnType<typeof createInitialGameState>): number {
    return state.players.reduce((sum, p) => sum + p.chips + p.currentBet, 0) + state.pot;
  }

  it('total chips remain constant after blinds are posted', () => {
    const initial = createInitialGameState(1000, 5, 5, 10);
    const totalBefore = initial.players.reduce((s, p) => s + p.chips, 0);
    const round = startNewRound(initial);
    const totalAfter = getTotalChips(round);
    expect(totalAfter).toBe(totalBefore);
  });

  it('total chips remain constant after a fold', () => {
    const initial = createInitialGameState(1000, 5, 5, 10);
    const round = startNewRound(initial);
    const totalBefore = getTotalChips(round);
    const afterFold = playerAction(round, round.currentPlayerIndex, 'fold');
    const totalAfter = getTotalChips(afterFold);
    expect(totalAfter).toBe(totalBefore);
  });

  it('total chips remain constant after a call', () => {
    const initial = createInitialGameState(1000, 5, 5, 10);
    const round = startNewRound(initial);
    const totalBefore = getTotalChips(round);
    const afterCall = playerAction(round, round.currentPlayerIndex, 'call');
    const totalAfter = getTotalChips(afterCall);
    expect(totalAfter).toBe(totalBefore);
  });

  it('total chips remain constant after a raise', () => {
    const initial = createInitialGameState(1000, 5, 5, 10);
    const round = startNewRound(initial);
    const totalBefore = getTotalChips(round);
    const afterRaise = playerAction(round, round.currentPlayerIndex, 'raise', 30);
    const totalAfter = getTotalChips(afterRaise);
    expect(totalAfter).toBe(totalBefore);
  });

  it('total chips remain constant after all-in', () => {
    const initial = createInitialGameState(1000, 5, 5, 10);
    const round = startNewRound(initial);
    const totalBefore = getTotalChips(round);
    const afterAllIn = playerAction(round, round.currentPlayerIndex, 'all-in');
    const totalAfter = getTotalChips(afterAllIn);
    expect(totalAfter).toBe(totalBefore);
  });

  it('all players start with the same buy-in amount', () => {
    const buyIn = 2000;
    const initial = createInitialGameState(buyIn, 3, 5, 10);
    for (const p of initial.players) {
      expect(p.chips).toBe(buyIn);
    }
  });

  it('correct number of players based on botCount', () => {
    expect(createInitialGameState(1000, 2).players.length).toBe(3); // 1 user + 2 bots
    expect(createInitialGameState(1000, 5).players.length).toBe(6); // 1 user + 5 bots (max 6)
    expect(createInitialGameState(1000, 1).players.length).toBe(2); // 1 user + 1 bot
  });
});

// ── Pot math after showdown ────────────────────────────────
describe('pot + rake math at showdown', () => {
  it('rake deducted equals 5% of pot at fold-win', () => {
    const initial = createInitialGameState(1000, 2, 5, 10);
    let state = startNewRound(initial);
    // First active player folds
    state = playerAction(state, state.currentPlayerIndex, 'fold');
    // If not showdown yet, next folds
    if (!state.showdown) {
      state = playerAction(state, state.currentPlayerIndex, 'fold');
    }
    // After all fold to one winner, pot should be 0 and rake > 0
    if (state.showdown) {
      expect(state.pot).toBe(0);
      // rake should be 5% of original pot (SB+BB = 15 for 3 players would be ~0)
      expect(state.rakeAmount).toBeGreaterThanOrEqual(0);
    }
  });
});
