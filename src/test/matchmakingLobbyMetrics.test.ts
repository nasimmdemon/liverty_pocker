import { describe, it, expect } from 'vitest';
import {
  openOptionsFromPressure,
  maxPressureForTierMode,
  visibleLobbyStakeOptionCount,
  type LobbyMetricsSnapshot,
  type PoolLobbyMetrics,
} from '@/lib/matchmakingLobbyMetrics';
import { listMatchmakingPoolCatalog } from '@/lib/matchmakingPoolCatalog';

function emptySnapshot(byPool: Map<string, PoolLobbyMetrics>): LobbyMetricsSnapshot {
  return {
    byPool,
    queuedUserIds: new Set(),
    queuedUserIdsSitAndGo: new Set(),
    queuedUserIdsTournament: new Set(),
  };
}

describe('openOptionsFromPressure', () => {
  it('returns 0 when pressure below 6', () => {
    expect(openOptionsFromPressure(0)).toBe(0);
    expect(openOptionsFromPressure(5)).toBe(0);
  });
  it('6–11 → 1 option', () => {
    expect(openOptionsFromPressure(6)).toBe(1);
    expect(openOptionsFromPressure(11)).toBe(1);
  });
  it('12–17 → 2 options', () => {
    expect(openOptionsFromPressure(12)).toBe(2);
    expect(openOptionsFromPressure(17)).toBe(2);
  });
  it('18–23 → 3 options', () => {
    expect(openOptionsFromPressure(18)).toBe(3);
    expect(openOptionsFromPressure(23)).toBe(3);
  });
  it('24+ → 4 options capped', () => {
    expect(openOptionsFromPressure(24)).toBe(4);
    expect(openOptionsFromPressure(99)).toBe(4);
  });
});

describe('visibleLobbyStakeOptionCount', () => {
  it('shows all 4 before Firestore snapshot', () => {
    expect(visibleLobbyStakeOptionCount(0, false)).toBe(4);
    expect(visibleLobbyStakeOptionCount(99, false)).toBe(4);
  });
  it('0–5 pressure → 1 button; 6–11 → 1; 12–17 → 2; 18–23 → 3; 24+ → 4', () => {
    expect(visibleLobbyStakeOptionCount(0, true)).toBe(1);
    expect(visibleLobbyStakeOptionCount(5, true)).toBe(1);
    expect(visibleLobbyStakeOptionCount(6, true)).toBe(1);
    expect(visibleLobbyStakeOptionCount(11, true)).toBe(1);
    expect(visibleLobbyStakeOptionCount(12, true)).toBe(2);
    expect(visibleLobbyStakeOptionCount(17, true)).toBe(2);
    expect(visibleLobbyStakeOptionCount(18, true)).toBe(3);
    expect(visibleLobbyStakeOptionCount(23, true)).toBe(3);
    expect(visibleLobbyStakeOptionCount(24, true)).toBe(4);
    expect(visibleLobbyStakeOptionCount(100, true)).toBe(4);
  });
});

describe('maxPressureForTierMode', () => {
  it('returns max pressure across pools for that tier and mode only', () => {
    const humanSg = listMatchmakingPoolCatalog().filter((r) => r.tierKey === 'human' && r.gameMode === 'sit-and-go');
    const humanTr = listMatchmakingPoolCatalog().filter((r) => r.tierKey === 'human' && r.gameMode === 'tournament');
    expect(humanSg.length).toBeGreaterThan(1);
    expect(humanTr.length).toBeGreaterThan(0);

    const mk = (poolId: string, pressure: number) =>
      ({
        poolId,
        queueCount: pressure,
        flowLast60: 0,
        pressure,
        openOptions: openOptionsFromPressure(pressure),
      }) as const;

    const byPool = new Map([
      [humanSg[0].poolId, mk(humanSg[0].poolId, 7)],
      [humanSg[1].poolId, mk(humanSg[1].poolId, 20)],
      [humanTr[0].poolId, mk(humanTr[0].poolId, 50)],
    ]);
    const snap = emptySnapshot(byPool);

    expect(maxPressureForTierMode(snap, 'human', 'sit-and-go')).toBe(20);
    expect(maxPressureForTierMode(snap, 'human', 'tournament')).toBe(50);
    expect(maxPressureForTierMode(snap, 'rat', 'sit-and-go')).toBe(0);
  });
});
