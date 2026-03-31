import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listMatchmakingPoolCatalog } from '@/lib/matchmakingPoolCatalog';
import type { MatchmakingTierKey } from '@/lib/matchmakingPoolId';
import {
  subscribeMonitorControls,
  saveMonitorTimingAndReserve,
  saveBotFallbackDisabledPools,
  type MonitorControlsSnapshot,
  type MonitorTierReserve,
  isTierAllBotFallbackDisabled,
} from '@/lib/monitorSettings';
import {
  subscribeMatchmakingLobbyMetrics,
  maxPressureForTierMode,
  visibleLobbyStakeOptionCount,
  type LobbyMetricsSnapshot,
} from '@/lib/matchmakingLobbyMetrics';
import {
  subscribeMonitorEconomy,
  saveMonitorEconomyTotals,
  type MonitorEconomySnapshot,
} from '@/lib/monitorEconomy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Timer,
  Wallet,
  Activity,
  Infinity as InfinityIcon,
  BotOff,
  DollarSign,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';

const TIER_ORDER: {
  key: MatchmakingTierKey;
  label: string;
  /** What “current / reserve filled” represents for operators (Human vs animal tiers differ). */
  reserveFilledMeaning: string;
}[] = [
  {
    key: 'human',
    label: 'Human',
    reserveFilledMeaning:
      'Reserve here = funds given to bots plus any free credits / promo value players received (combined).',
  },
  {
    key: 'rat',
    label: 'Rat',
    reserveFilledMeaning:
      'Reserve here = money allocated to bots to play against people (table bot bankroll).',
  },
  {
    key: 'cat',
    label: 'Cat',
    reserveFilledMeaning:
      'Reserve here = money allocated to bots to play against people (table bot bankroll).',
  },
  {
    key: 'dog',
    label: 'Dog',
    reserveFilledMeaning:
      'Reserve here = money the bot received to play against a person (stake / float for that lane).',
  },
];

function emptyReserve(): MonitorTierReserve {
  return { maxUsd: 0, allocatedUsd: 0, currentUsd: 0 };
}

export default function MonitorOperationsExtended() {
  const { user: fbUser } = useAuth();
  const [controls, setControls] = useState<MonitorControlsSnapshot | null>(null);
  const [lobbySnap, setLobbySnap] = useState<LobbyMetricsSnapshot | null>(null);
  const [lobbyReady, setLobbyReady] = useState(false);
  const [economy, setEconomy] = useState<MonitorEconomySnapshot | null>(null);

  const [waitSec, setWaitSec] = useState('30');
  const [cooldownSec, setCooldownSec] = useState('25');
  const [reserveTotal, setReserveTotal] = useState('0');
  const [tierRows, setTierRows] = useState<Record<MatchmakingTierKey, MonitorTierReserve>>(() => ({
    human: emptyReserve(),
    rat: emptyReserve(),
    cat: emptyReserve(),
    dog: emptyReserve(),
  }));

  const [ecoVideo, setEcoVideo] = useState('0');
  const [ecoWins, setEcoWins] = useState('0');
  const [ecoLoss, setEcoLoss] = useState('0');
  const [ecoExpired, setEcoExpired] = useState('0');

  const [savingTiming, setSavingTiming] = useState(false);
  const [savingEco, setSavingEco] = useState(false);
  const [tierBusy, setTierBusy] = useState<MatchmakingTierKey | null>(null);

  useEffect(() => {
    const u = subscribeMonitorControls((s) => setControls(s));
    return u;
  }, []);

  useEffect(() => {
    const u = subscribeMatchmakingLobbyMetrics(
      (snap) => {
        setLobbySnap(snap);
        setLobbyReady(true);
      },
      () => setLobbyReady(false)
    );
    return u;
  }, []);

  useEffect(() => {
    const u = subscribeMonitorEconomy((e) => setEconomy(e));
    return u;
  }, []);

  useEffect(() => {
    if (!controls) return;
    setWaitSec(String(Math.round(controls.matchmakingWaitMs / 1000)));
    setCooldownSec(String(Math.round(controls.matchmakingPostMatchCooldownMs / 1000)));
    setReserveTotal(String(controls.reserveMaxTotalUsd ?? 0));
    const next: Record<MatchmakingTierKey, MonitorTierReserve> = {
      human: { ...emptyReserve(), ...controls.reserveByTier?.human },
      rat: { ...emptyReserve(), ...controls.reserveByTier?.rat },
      cat: { ...emptyReserve(), ...controls.reserveByTier?.cat },
      dog: { ...emptyReserve(), ...controls.reserveByTier?.dog },
    };
    setTierRows(next);
  }, [controls]);

  useEffect(() => {
    if (!economy) return;
    setEcoVideo(String(economy.videoPayoutsTotal));
    setEcoWins(String(economy.winsVsBotsTotal));
    setEcoLoss(String(economy.lossesToBotsTotal));
    setEcoExpired(String(economy.expiredFundsTotal));
  }, [economy]);

  const disabledSet = useMemo(
    () => new Set(controls?.botFallbackDisabledPoolIds ?? []),
    [controls?.botFallbackDisabledPoolIds]
  );

  const evenSplit = useMemo(() => {
    const t = parseFloat(reserveTotal);
    if (!Number.isFinite(t) || t <= 0) return 0;
    return Math.round((t / 4) * 100) / 100;
  }, [reserveTotal]);

  const saveTimingReserve = useCallback(async () => {
    if (!fbUser) {
      toast.error('Sign in to the game in this browser to save.');
      return;
    }
    const w = parseFloat(waitSec);
    const c = parseFloat(cooldownSec);
    const r = parseFloat(reserveTotal);
    if (!Number.isFinite(w) || w < 5 || w > 600) {
      toast.error('Matchmaking wait must be between 5 and 600 seconds.');
      return;
    }
    if (!Number.isFinite(c) || c < 0 || c > 600) {
      toast.error('Player cooldown must be 0–600 seconds.');
      return;
    }
    if (!Number.isFinite(r) || r < 0) {
      toast.error('Reserve total must be a non-negative number.');
      return;
    }
    setSavingTiming(true);
    try {
      await saveMonitorTimingAndReserve({
        matchmakingWaitMs: Math.round(w * 1000),
        matchmakingPostMatchCooldownMs: Math.round(c * 1000),
        reserveMaxTotalUsd: r,
        reserveByTier: tierRows,
      });
      toast.success('Timing, cooldown, and reserve saved.');
    } catch {
      toast.error('Save failed. Check Firestore rules and network.');
    } finally {
      setSavingTiming(false);
    }
  }, [fbUser, waitSec, cooldownSec, reserveTotal, tierRows]);

  const saveEconomy = useCallback(async () => {
    if (!fbUser) {
      toast.error('Sign in to the game in this browser to save.');
      return;
    }
    const parse = (s: string) => {
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : 0;
    };
    setSavingEco(true);
    try {
      await saveMonitorEconomyTotals({
        videoPayoutsTotal: parse(ecoVideo),
        winsVsBotsTotal: parse(ecoWins),
        lossesToBotsTotal: parse(ecoLoss),
        expiredFundsTotal: parse(ecoExpired),
      });
      toast.success('Economy totals saved.');
    } catch {
      toast.error('Could not save economy doc.');
    } finally {
      setSavingEco(false);
    }
  }, [fbUser, ecoVideo, ecoWins, ecoLoss, ecoExpired]);

  const toggleTierAllBots = useCallback(
    async (tierKey: MatchmakingTierKey, pause: boolean) => {
      if (!fbUser) {
        toast.error('Sign in to save bot toggles.');
        return;
      }
      const poolIds = listMatchmakingPoolCatalog()
        .filter((r) => r.tierKey === tierKey)
        .map((r) => r.poolId);
      const next = new Set(disabledSet);
      for (const id of poolIds) {
        if (pause) next.add(id);
        else next.delete(id);
      }
      setTierBusy(tierKey);
      try {
        await saveBotFallbackDisabledPools([...next]);
        toast.success(pause ? `All ${tierKey} pools: bot fill paused` : `All ${tierKey} pools: bot fill on`);
      } catch {
        toast.error('Could not save.');
      } finally {
        setTierBusy(null);
      }
    },
    [fbUser, disabledSet]
  );

  const updateTierReserve = (key: MatchmakingTierKey, field: keyof MonitorTierReserve, raw: string) => {
    const n = parseFloat(raw);
    const v = Number.isFinite(n) ? n : 0;
    setTierRows((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: v },
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/25 bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Reserve &amp; DB record semantics
          </CardTitle>
          <CardDescription>Operator definitions (wireframes: dbRecord / withdraw / reserve / expiry).</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Global signals</p>
              <ul className="list-disc pl-4 space-y-1 text-xs leading-relaxed">
                <li>
                  <span className="text-destructive font-medium">Withdraw</span> — reserve <strong>shrank</strong>{' '}
                  (cash or liability left the tier pool).
                </li>
                <li>
                  <span className="text-foreground font-medium">DB record size ↑</span> — house / bot{' '}
                  <strong>lost</strong> (to a player or to another player); liability or paid-out edge grew.
                </li>
                <li>
                  <span className="text-foreground font-medium">Expiry</span> —{' '}
                  <strong>pre-withdrawn</strong> / scheduled: not in active play reserve (e.g. 3d vs 14d buckets).
                </li>
              </ul>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                “Reserve filled” by tier
              </p>
              <ul className="space-y-2 text-xs leading-relaxed">
                <li>
                  <Badge variant="outline" className="mr-1.5 text-[10px]">
                    Human
                  </Badge>
                  Bot subsidies <strong>+</strong> free / promo value to players — both count toward reserve in this
                  lane.
                </li>
                <li>
                  <Badge variant="outline" className="mr-1.5 text-[10px]">
                    Dog · Rat · Cat
                  </Badge>
                  Money the <strong>bot got</strong> to sit vs humans (narrower than Human).
                </li>
              </ul>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/90 border-t border-border/50 pt-3">
            Use <span className="font-mono text-foreground">Current $</span> in the table below as your live “reserve
            filled” input per tier; meanings above explain how to interpret Human vs Dog rows on the same card.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="h-4 w-4 text-sky-400" />
              Matchmaking timing & player cooldown
            </CardTitle>
            <CardDescription>
              Client apps read these from Firestore. Wait = seconds before bot fallback (per pool, unless tier is fully
              paused — then humans-only indefinitely). Cooldown = seconds after a finished match before a player can be
              paired again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!fbUser && (
              <p className="text-xs text-amber-500/90 border border-amber-500/30 rounded-md px-2 py-1.5 bg-amber-500/5">
                Sign in to Liberty Poker in this browser to persist changes.
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mon-wait">Await time (seconds)</Label>
                <Input id="mon-wait" type="number" min={5} max={600} value={waitSec} onChange={(e) => setWaitSec(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mon-cd">Player re-pair cooldown (seconds)</Label>
                <Input id="mon-cd" type="number" min={0} max={600} value={cooldownSec} onChange={(e) => setCooldownSec(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-amber-400" />
              Reserve (planning)
            </CardTitle>
            <CardDescription>
              Operational caps — not enforced in game logic yet. <strong>Even split (÷4 tiers):</strong>{' '}
              <span className="text-primary font-mono">${evenSplit.toFixed(2)}</span> per tier if you divide the max
              evenly. <strong>Current</strong> = reserve filled (see glossary: Human vs Dog differ).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="mon-res-total">Reserve max (total $)</Label>
              <Input id="mon-res-total" type="number" step="0.01" min={0} value={reserveTotal} onChange={(e) => setReserveTotal(e.target.value)} />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Tier / reserve meaning</TableHead>
                  <TableHead className="text-right">Max $</TableHead>
                  <TableHead className="text-right">Allocated $</TableHead>
                  <TableHead className="text-right">
                    <span className="text-emerald-600/90 dark:text-emerald-400/90">Current</span>
                    <span className="block text-[10px] font-normal text-muted-foreground">
                      (= reserve filled)
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TIER_ORDER.map(({ key, label, reserveFilledMeaning }) => (
                  <TableRow key={key}>
                    <TableCell className="align-top py-2">
                      <div className="font-medium text-foreground">{label}</div>
                      <p className="text-[10px] text-muted-foreground leading-snug mt-1 max-w-[240px]">
                        {reserveFilledMeaning}
                      </p>
                    </TableCell>
                    <TableCell className="text-right p-1">
                      <Input
                        className="h-8 text-right font-mono text-xs"
                        type="number"
                        step="0.01"
                        value={tierRows[key].maxUsd}
                        onChange={(e) => updateTierReserve(key, 'maxUsd', e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right p-1">
                      <Input
                        className="h-8 text-right font-mono text-xs"
                        type="number"
                        step="0.01"
                        value={tierRows[key].allocatedUsd}
                        onChange={(e) => updateTierReserve(key, 'allocatedUsd', e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right p-1">
                      <Input
                        className="h-8 text-right font-mono text-xs"
                        type="number"
                        step="0.01"
                        value={tierRows[key].currentUsd}
                        onChange={(e) => updateTierReserve(key, 'currentUsd', e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button className="w-full" onClick={saveTimingReserve} disabled={savingTiming || !controls}>
              {savingTiming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save timing, cooldown & reserve'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            Tier flow, lobby stake options & bot fill
          </CardTitle>
          <CardDescription>
            Flow ≈ max(queue, last-60s events) per tier (Sit & Go vs Tournament shown separately). Open stakes = lobby
            button count (1–4). When <strong>all</strong> pools in a tier have “pause bot fill”, matchmaking never falls
            back to bots for that tier (infinite human wait). Use per-pool toggles below or pause entire tier here.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Flow S&amp;G</TableHead>
                <TableHead className="text-right">Open S&amp;G</TableHead>
                <TableHead className="text-right">Flow TR</TableHead>
                <TableHead className="text-right">Open TR</TableHead>
                <TableHead>Bots</TableHead>
                <TableHead className="w-[200px]">Tier bot fill</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TIER_ORDER.map(({ key, label }) => {
                const sg = lobbySnap
                  ? maxPressureForTierMode(lobbySnap, key, 'sit-and-go')
                  : 0;
                const tr = lobbySnap
                  ? maxPressureForTierMode(lobbySnap, key, 'tournament')
                  : 0;
                const openSg = lobbyReady ? visibleLobbyStakeOptionCount(sg, true) : null;
                const openTr = lobbyReady ? visibleLobbyStakeOptionCount(tr, true) : null;
                const infinite = isTierAllBotFallbackDisabled(key, disabledSet);
                const busy = tierBusy === key;
                return (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{label}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{lobbyReady ? sg : '—'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{openSg ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{lobbyReady ? tr : '—'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{openTr ?? '—'}</TableCell>
                    <TableCell>
                      {infinite ? (
                        <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-200">
                          <InfinityIcon className="h-3 w-3" /> Human-only
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Bot fallback on
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px]"
                          disabled={busy || infinite}
                          onClick={() => void toggleTierAllBots(key, true)}
                        >
                          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                            <>
                              <BotOff className="h-3 w-3 mr-1" /> Pause tier
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-[10px]"
                          disabled={busy || !infinite}
                          onClick={() => void toggleTierAllBots(key, false)}
                        >
                          Enable tier
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-400" />
            Economy ledger (outflows & losses)
          </CardTitle>
          <CardDescription>
            <strong>Video / rewards</strong> increments when players claim Watch &amp; Earn. <strong>Wins vs bots</strong>{' '}
            / <strong>losses vs bots</strong> track realized P&amp;L vs bot tables. Totals align with{' '}
            <strong className="text-destructive">withdraw</strong> (reserve shrink) in the glossary.{' '}
            <strong>Expired (14d)</strong> = pre-withdrawn / policy removals — manual or job until automated expiry ships.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>Video &amp; promo paid out ($)</Label>
              <Input value={ecoVideo} onChange={(e) => setEcoVideo(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Wins vs bots ($)</Label>
              <Input value={ecoWins} onChange={(e) => setEcoWins(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Losses vs bots ($)</Label>
              <Input value={ecoLoss} onChange={(e) => setEcoLoss(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Expired / removed funds ($)</Label>
              <Input value={ecoExpired} onChange={(e) => setEcoExpired(e.target.value)} className="font-mono" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>
              Auto total withdrawn (video + wins):{' '}
              <strong className="text-foreground font-mono">
                $
                {(
                  (parseFloat(ecoVideo) || 0) + (parseFloat(ecoWins) || 0)
                ).toFixed(2)}
              </strong>
            </span>
          </div>
          <Button variant="secondary" onClick={saveEconomy} disabled={savingEco}>
            {savingEco ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save economy totals'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
