import { describe, it, expect } from 'vitest';
import {
  canPairOpponents,
  pickQueueIndicesForTable,
  OPPONENT_REMATCH_GAP_MATCHES,
} from '@/lib/matchmaking';

describe('canPairOpponents', () => {
  it('allows unknown pairs', () => {
    expect(canPairOpponents('a', 'b', {}, {})).toBe(true);
  });

  it('blocks until both seq meet pair block minimums', () => {
    const blocks = {
      'a__b': { minSeqLow: 4, minSeqHigh: 4 },
    };
    expect(canPairOpponents('a', 'b', { a: 1, b: 1 }, blocks)).toBe(false);
    expect(canPairOpponents('a', 'b', { a: 4, b: 3 }, blocks)).toBe(false);
    expect(canPairOpponents('a', 'b', { a: 4, b: 4 }, blocks)).toBe(true);
  });

  it('uses sorted key for block lookup', () => {
    const blocks = {
      'a__b': { minSeqLow: 2, minSeqHigh: 2 },
    };
    expect(canPairOpponents('b', 'a', { a: 2, b: 2 }, blocks)).toBe(true);
  });
});

describe('pickQueueIndicesForTable', () => {
  const now = 1_000_000;
  const q = [
    { userId: 'a', ts: 100 },
    { userId: 'b', ts: 101 },
    { userId: 'c', ts: 102 },
  ];

  it('returns null when cooldown blocks everyone', () => {
    const cooldown = { a: now + 10_000, b: now + 10_000, c: now + 10_000 };
    expect(pickQueueIndicesForTable(q, 2, {}, {}, cooldown, now)).toBe(null);
  });

  it('pairs first two when allowed', () => {
    expect(pickQueueIndicesForTable(q, 2, {}, {}, {}, now)).toEqual([0, 1]);
  });

  it('skips blocked head-to-head and uses next valid pair', () => {
    const blocks = {
      'a__b': { minSeqLow: 99, minSeqHigh: 99 },
    };
    const picked = pickQueueIndicesForTable(q, 2, { a: 0, b: 0, c: 0 }, blocks, {}, now);
    expect(picked).toEqual([0, 2]);
  });

  it('exports rematch gap of 3', () => {
    expect(OPPONENT_REMATCH_GAP_MATCHES).toBe(3);
  });
});
