import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listMatchmakingPoolCatalog, type PoolCatalogRow } from '@/lib/matchmakingPoolCatalog';
import { saveBotFallbackDisabledPools, subscribeBotFallbackDisabledPools } from '@/lib/monitorSettings';
import { createMonitorMatchmakingOpenTable } from '@/lib/multiplayer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, PlusCircle, Table2, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

const CATALOG = listMatchmakingPoolCatalog();

export default function MonitorLiveOperations() {
  const { user: fbUser } = useAuth();
  const [disabledPools, setDisabledPools] = useState<Set<string>>(new Set());
  const [toggleSaving, setToggleSaving] = useState<string | null>(null);
  const [selectedPoolId, setSelectedPoolId] = useState<string>(CATALOG[0]?.poolId ?? '');
  const [buyIn, setBuyIn] = useState('1');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsub = subscribeBotFallbackDisabledPools(setDisabledPools);
    return unsub;
  }, []);

  const selectedRow = useMemo(
    () => CATALOG.find((r) => r.poolId === selectedPoolId) ?? CATALOG[0],
    [selectedPoolId]
  );

  const onBotToggle = useCallback(
    async (poolId: string, pauseBotFill: boolean) => {
      setToggleSaving(poolId);
      const next = new Set(disabledPools);
      if (pauseBotFill) next.add(poolId);
      else next.delete(poolId);
      try {
        await saveBotFallbackDisabledPools([...next]);
        setDisabledPools(next);
      } catch {
        toast.error('Could not save. Sign in to the game in this browser (Firebase) to change settings.');
      } finally {
        setToggleSaving(null);
      }
    },
    [disabledPools]
  );

  const handleAddTable = async () => {
    if (!fbUser) {
      toast.error('Sign in to Liberty Poker in this browser first — tables are created under your account.');
      return;
    }
    const row = selectedRow;
    if (!row) return;
    const buy = parseFloat(buyIn);
    if (!Number.isFinite(buy) || buy <= 0) {
      toast.error('Enter a valid buy-in amount.');
      return;
    }
    setCreating(true);
    try {
      await createMonitorMatchmakingOpenTable(
        fbUser.uid,
        fbUser.displayName || fbUser.email?.split('@')[0] || 'Host',
        fbUser.photoURL ?? null,
        {
          tierKey: row.tierKey,
          gameMode: row.gameMode,
          buyIn: buy,
          smallBlind: row.smallBlind,
          bigBlind: row.bigBlind,
        }
      );
      toast.success('Open table created. It appears in the live list for the same pool.');
    } catch {
      toast.error('Failed to create table. Check Firestore rules and network.');
    } finally {
      setCreating(false);
    }
  };

  const grouped = useMemo(() => {
    const m = new Map<string, PoolCatalogRow[]>();
    for (const row of CATALOG) {
      const k = `${row.tierLabel} · ${row.gameMode === 'sit-and-go' ? 'Sit & Go' : 'Tournament'}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(row);
    }
    return [...m.entries()];
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldOff className="h-4 w-4 text-amber-500" />
            Bot table fill (matchmaking)
          </CardTitle>
          <CardDescription>
            When paused for a tier and stake, players who wait the full queue timer will not get an auto-filled
            table with a bot. They are refunded. Requires Firebase sign-in to save.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[min(420px,50vh)] overflow-y-auto space-y-4 pr-1">
          {!fbUser && (
            <p className="text-xs text-amber-500/90 border border-amber-500/30 rounded-md px-3 py-2 bg-amber-500/5">
              You are not signed in to the game — toggles may fail on save. Open the main app and log in, then refresh this page.
            </p>
          )}
          {grouped.map(([label, rows]) => (
            <div key={label} className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
              <div className="space-y-2 pl-0">
                {rows.map((row) => {
                  const paused = disabledPools.has(row.poolId);
                  return (
                    <div
                      key={row.poolId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          Sub {row.subTierIndex + 1}: {row.stakesLabel}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground/70 truncate">{row.poolId}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {toggleSaving === row.poolId && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        <Label htmlFor={`bot-${row.poolId}`} className="text-xs text-muted-foreground whitespace-nowrap">
                          Pause bot fill
                        </Label>
                        <Switch
                          id={`bot-${row.poolId}`}
                          checked={paused}
                          disabled={toggleSaving !== null}
                          onCheckedChange={(c) => onBotToggle(row.poolId, c)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-emerald-500" />
            Add table / Close table
          </CardTitle>
          <CardDescription>
            Add table creates an open matchmaking room (you as host only) for the selected pool. Use Close on a row
            in Table Details below to end a live game.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pool (tier · mode · stake)</Label>
            <Select value={selectedPoolId} onValueChange={setSelectedPoolId}>
              <SelectTrigger className="w-full font-mono text-xs">
                <SelectValue placeholder="Select pool" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {CATALOG.map((row) => (
                  <SelectItem key={row.poolId} value={row.poolId} className="text-xs">
                    {row.tierLabel} · {row.gameMode === 'sit-and-go' ? 'S&G' : 'TR'} · {row.stakesLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mon-buyin">Starting stack / buy-in ($)</Label>
            <Input
              id="mon-buyin"
              type="number"
              step="0.01"
              min="0.01"
              value={buyIn}
              onChange={(e) => setBuyIn(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={handleAddTable} disabled={creating || !selectedRow}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <Table2 className="h-4 w-4 mr-2 opacity-80" />
                Add open table
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
