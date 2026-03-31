import { describe, it, expect } from 'vitest';
import { openOptionsFromPressure } from '@/lib/matchmakingLobbyMetrics';

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
