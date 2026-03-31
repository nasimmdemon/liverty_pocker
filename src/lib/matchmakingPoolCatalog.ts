import { buildMatchmakingPoolId, type MatchmakingTierKey } from '@/lib/matchmakingPoolId';

const TIER_ROWS: {
  key: MatchmakingTierKey;
  label: string;
  sitAndGoOptions: string[];
  tournamentOptions: string[];
}[] = [
  {
    key: 'human',
    label: 'Human',
    sitAndGoOptions: ['0.01-0.02', '0.02-0.04', '0.04-0.08', '0.08-0.16'],
    tournamentOptions: ['$0.15', '$0.30', '$0.60', '$1.20'],
  },
  {
    key: 'rat',
    label: 'Rat',
    sitAndGoOptions: ['0.08-0.16', '0.16-0.32', '0.24-0.48', '0.32-0.64'],
    tournamentOptions: ['$1.20', '$2.40', '$3.60', '$4.80'],
  },
  {
    key: 'cat',
    label: 'Cat',
    sitAndGoOptions: ['0.24-0.48', '0.32-0.64', '0.48-0.72', '0.50-0.80'],
    tournamentOptions: ['$3.60', '$4.80', '$6.00', '$6.50'],
  },
  {
    key: 'dog',
    label: 'Dog',
    sitAndGoOptions: ['0.48-0.72', '0.50-0.80', '0.60-0.90', '0.70-1.00'],
    tournamentOptions: ['$6.00', '$6.50', '$7.50', '$8.50'],
  },
];

function parseSitAndGoStakes(opt: string): { small: number; big: number } {
  const raw = opt.replace(/\$/g, '');
  const parts = raw.split('-').map((x) => parseFloat(x.trim()));
  const small = parts[0];
  const big = parts.length > 1 ? parts[1] : small;
  return { small, big };
}

function parseTournamentStakes(opt: string): { small: number; big: number } {
  const n = parseFloat(opt.replace(/\$/g, ''));
  return { small: n, big: n };
}

export type PoolCatalogRow = {
  poolId: string;
  tierKey: MatchmakingTierKey;
  tierLabel: string;
  gameMode: 'sit-and-go' | 'tournament';
  subTierIndex: number;
  stakesLabel: string;
  smallBlind: number;
  bigBlind: number;
};

/** Every tier × sub-tier × mode pool id (matches lobby UI). */
export function listMatchmakingPoolCatalog(): PoolCatalogRow[] {
  const out: PoolCatalogRow[] = [];
  for (const row of TIER_ROWS) {
    row.sitAndGoOptions.forEach((opt, i) => {
      const { small, big } = parseSitAndGoStakes(opt);
      out.push({
        poolId: buildMatchmakingPoolId(row.key, 'sit-and-go', small, big),
        tierKey: row.key,
        tierLabel: row.label,
        gameMode: 'sit-and-go',
        subTierIndex: i,
        stakesLabel: opt,
        smallBlind: small,
        bigBlind: big,
      });
    });
    row.tournamentOptions.forEach((opt, i) => {
      const { small, big } = parseTournamentStakes(opt);
      out.push({
        poolId: buildMatchmakingPoolId(row.key, 'tournament', small, big),
        tierKey: row.key,
        tierLabel: row.label,
        gameMode: 'tournament',
        subTierIndex: i,
        stakesLabel: opt,
        smallBlind: small,
        bigBlind: big,
      });
    });
  }
  return out;
}
