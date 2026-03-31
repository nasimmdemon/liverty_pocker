import { useEffect, useState, useCallback, useRef } from 'react';
import { getAnalyticsVisits, type AnalyticsVisit } from '@/lib/analytics';
import {
  subscribeToAllActiveGames,
  getEndedGames,
  isMatchmakingBotUserId,
  firestoreTimestampToMs,
  type GameRoom,
} from '@/lib/multiplayer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Gamepad2,
  Monitor,
  MapPin,
  Smartphone,
  Tablet,
  RefreshCw,
  LogOut,
  Mail,
  Lock,
  Loader2,
  BarChart3,
  TrendingUp,
  Bot,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock,
  Table2,
  Wifi,
  History,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { format, startOfDay, subDays, formatDistanceToNow } from 'date-fns';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// ─── Auth ────────────────────────────────────────────────────────────────────
// Client-side monitor gate only (bundle-visible). Optional env overrides / extra account below.
const MONITOR_CREDENTIALS: Record<string, string> = {
  'nasimmdemon@gmail.com': 'Emon4288@',
  'alexywiseman@gmail.com': 'Paradise1@',
};
const MONITOR_LOGIN_EMAIL = (import.meta.env.VITE_MONITOR_LOGIN_EMAIL as string | undefined)?.trim() ?? '';
const MONITOR_LOGIN_PASSWORD = (import.meta.env.VITE_MONITOR_LOGIN_PASSWORD as string | undefined) ?? '';
const STORAGE_KEY = 'monitor_logged_in';

function monitorPasswordForEmail(normalizedEmail: string): string | undefined {
  return MONITOR_CREDENTIALS[normalizedEmail] ?? undefined;
}

function isValidMonitorPassword(normalizedEmail: string, password: string): boolean {
  const fromMap = monitorPasswordForEmail(normalizedEmail);
  if (fromMap && password === fromMap) return true;
  const envEmail = MONITOR_LOGIN_EMAIL.toLowerCase();
  if (envEmail && MONITOR_LOGIN_PASSWORD && normalizedEmail === envEmail && password === MONITOR_LOGIN_PASSWORD) {
    return true;
  }
  return false;
}
const CHART_COLORS = ['hsl(var(--primary))', '#22c55e', '#eab308', '#3b82f6', '#a855f7', '#ec4899'];

// ─── Staleness thresholds ────────────────────────────────────────────────────
//  A "playing" game not updated in >2h is almost certainly a zombie.
//  A "waiting" lobby not updated in >20min means everyone left without ending properly.
const PLAYING_STALE_MS = 2 * 60 * 60 * 1000;   // 2 hours
const WAITING_STALE_MS = 20 * 60 * 1000;         // 20 minutes

/** Last activity time for staleness + sorting (prefers updatedAt, falls back to createdAt). */
function getRoomActivityMs(room: GameRoom): number {
  return Math.max(
    firestoreTimestampToMs(room.updatedAt),
    firestoreTimestampToMs(room.createdAt)
  );
}

function isStale(room: GameRoom): boolean {
  const updatedMs = getRoomActivityMs(room);
  if (updatedMs === 0) return true; // no timestamp → treat as stale
  const age = Date.now() - updatedMs;
  if (room.status === 'playing') return age > PLAYING_STALE_MS;
  if (room.status === 'waiting') return age > WAITING_STALE_MS;
  return false;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface LivePlayerInfo {
  userId: string;
  displayName: string;
  email?: string;
  isBot: boolean;
  /** Live chip stack — read from gameState.players during play, room.players when waiting */
  chips: number;
  /** How much they've bet in the current round (from gameState) */
  currentBet: number;
  seatIndex: number;
  status: string; // active / folded / all-in / sitting-out
}

/** Monitor always shows at least this many table rows (synthetic “open” rows pad shortfalls). */
const MIN_MONITOR_OPEN_TABLES = 3;

interface LiveTableInfo {
  id: string;
  status: 'waiting' | 'playing';
  buyIn: number;
  smallBlind: number;
  bigBlind: number;
  /** Current pot size (from gameState, 0 when waiting) */
  pot: number;
  /** Current highest bet to match (from gameState) */
  currentBet: number;
  /** Game phase: preflop / flop / turn / river / showdown */
  phase: string;
  players: LivePlayerInfo[];
  realPlayers: LivePlayerInfo[];
  bots: LivePlayerInfo[];
  isMatchmaking: boolean;
  updatedAtMs: number;
  /** Synthetic row so the dashboard always lists baseline open tables (not stored in Firestore). */
  isOpenSlot?: boolean;
  /** 1-based label index for open slots */
  openSlotIndex?: number;
}

function buildLiveTable(room: GameRoom, emailMap: Record<string, string>): LiveTableInfo {
  const gs = room.gameState;

  // Build a map from userId → live gameState player for O(1) lookup
  const gsPlayerByUserId = new Map<string, { chips: number; currentBet: number; status: string }>(); 
  if (gs?.players) {
    for (const gsp of gs.players) {
      if (gsp.userId) {
        gsPlayerByUserId.set(gsp.userId, {
          chips: gsp.chips,
          currentBet: gsp.currentBet ?? 0,
          status: gsp.status ?? 'active',
        });
      }
    }
  }

  const players: LivePlayerInfo[] = (room.players || []).map((p) => {
    const isBot = isMatchmakingBotUserId(p.userId);
    // Prefer live gameState chips (updates every action) over room.players chips (static)
    const gsInfo = gsPlayerByUserId.get(p.userId);
    return {
      userId: p.userId,
      displayName: p.displayName,
      email: emailMap[p.userId] || undefined,
      isBot,
      chips: gsInfo ? gsInfo.chips : p.chips,
      currentBet: gsInfo ? gsInfo.currentBet : 0,
      status: gsInfo ? gsInfo.status : 'active',
      seatIndex: p.seatIndex,
    };
  });

  const realPlayers = players.filter((p) => !p.isBot);
  const bots = players.filter((p) => p.isBot);
  return {
    id: room.id,
    status: room.status as 'waiting' | 'playing',
    buyIn: room.buyIn,
    smallBlind: room.smallBlind,
    bigBlind: room.bigBlind,
    pot: gs?.pot ?? 0,
    currentBet: gs?.currentBet ?? 0,
    phase: gs?.phase ?? '',
    players,
    realPlayers,
    bots,
    isMatchmaking: !!room.matchmakingOpen || !!room.matchmakingPoolId,
    updatedAtMs: getRoomActivityMs(room),
  };
}

/** Default stakes for synthetic monitor-only open rows (matches common public table defaults). */
function buildOpenSlotLiveTable(slotIndex: number): LiveTableInfo {
  return {
    id: `__monitor_open_${slotIndex}`,
    status: 'waiting',
    buyIn: 1500,
    smallBlind: 5,
    bigBlind: 10,
    pot: 0,
    currentBet: 0,
    phase: '',
    players: [],
    realPlayers: [],
    bots: [],
    isMatchmaking: false,
    updatedAtMs: Date.now(),
    isOpenSlot: true,
    openSlotIndex: slotIndex,
  };
}

function padTablesToMinimumOpen(realTables: LiveTableInfo[], minimum: number): LiveTableInfo[] {
  const need = Math.max(0, minimum - realTables.length);
  const slots = Array.from({ length: need }, (_, i) => buildOpenSlotLiveTable(i + 1));
  return [...realTables, ...slots];
}

// ─── History Panel ───────────────────────────────────────────────────────────

interface HistoryTableInfo {
  id: string;
  buyIn: number;
  smallBlind: number;
  bigBlind: number;
  playerCount: number;
  realCount: number;
  botCount: number;
  type: string;   // e.g. "Real vs Real", "Real + Bot", "Matchmaking"
  endedAtMs: number;
  players: { userId: string; displayName: string; isBot: boolean }[];
}

function classifyGame(room: GameRoom): string {
  const players = room.players || [];
  const hasBot = players.some((p) => isMatchmakingBotUserId(p.userId));
  const isMatchmaking = !!room.matchmakingOpen || !!room.matchmakingPoolId;
  if (isMatchmaking && hasBot) return 'Matchmaking + Bot';
  if (isMatchmaking) return 'Matchmaking';
  if (hasBot) return 'Real + Bot';
  if ((room as GameRoom & { isPrivateTable?: boolean }).isPrivateTable) return 'Private';
  return 'Real vs Real';
}

function HistoryPanel({ emailMap }: { emailMap: Record<string, string> }) {
  const [historyData, setHistoryData] = useState<HistoryTableInfo[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError, setHistError] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    setHistError('');
    try {
      const rooms = await getEndedGames(60);
      const list: HistoryTableInfo[] = rooms.map((room) => {
        const players = (room.players || []).map((p) => ({
          userId: p.userId,
          displayName: p.displayName,
          isBot: isMatchmakingBotUserId(p.userId),
        }));
        const realCount = players.filter((p) => !p.isBot).length;
        const botCount = players.filter((p) => p.isBot).length;
        return {
          id: room.id,
          buyIn: room.buyIn,
          smallBlind: room.smallBlind,
          bigBlind: room.bigBlind,
          playerCount: players.length,
          realCount,
          botCount,
          type: classifyGame(room),
          endedAtMs: getRoomActivityMs(room),
          players,
        };
      });
      setHistoryData(list);
    } catch (e) {
      setHistError('Failed to load history. Make sure Firestore index on status+updatedAt is deployed.');
      console.error(e);
    } finally {
      setHistLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const typeColor: Record<string, string> = {
    'Real vs Real': 'border-emerald-500/40 text-emerald-400',
    'Real + Bot': 'border-purple-500/40 text-purple-400',
    'Matchmaking': 'border-blue-500/40 text-blue-400',
    'Matchmaking + Bot': 'border-violet-500/40 text-violet-400',
    'Private': 'border-amber-500/40 text-amber-400',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" />
            Game History
          </CardTitle>
          <CardDescription>Last 60 ended games — most recent first</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={loadHistory} disabled={histLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${histLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {histLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-11 rounded" />)}
          </div>
        ) : histError ? (
          <div className="p-6 flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {histError}
          </div>
        ) : historyData.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
            No ended games found yet
          </div>
        ) : (
          <div className="divide-y divide-border">
            {historyData.map((game) => {
              const isExpanded = expandedRow === game.id;
              return (
                <div key={game.id}>
                  <button
                    className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-center gap-3 flex-wrap"
                    onClick={() => setExpandedRow(isExpanded ? null : game.id)}
                  >
                    <span className="text-muted-foreground shrink-0">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>

                    {/* Game type */}
                    <Badge variant="outline" className={`text-xs shrink-0 ${typeColor[game.type] ?? 'border-border text-muted-foreground'}`}>
                      {game.type}
                    </Badge>

                    {/* Table ID */}
                    <span className="font-mono text-xs text-muted-foreground shrink-0 hidden sm:block">
                      #{game.id.slice(0, 8)}
                    </span>

                    {/* Blinds */}
                    <span className="text-xs text-muted-foreground shrink-0">
                      {game.smallBlind}/{game.bigBlind} — Buy‑in {game.buyIn.toLocaleString()}
                    </span>

                    {/* Player summary */}
                    <span className="ml-auto flex items-center gap-3 text-xs shrink-0">
                      {game.realCount > 0 && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {game.realCount} real
                        </span>
                      )}
                      {game.botCount > 0 && (
                        <span className="flex items-center gap-1 text-purple-400">
                          <Bot className="h-3 w-3" />
                          {game.botCount} bot
                        </span>
                      )}
                      {game.endedAtMs > 0 && (
                        <span className="text-muted-foreground/60 hidden md:block">
                          {formatDistanceToNow(new Date(game.endedAtMs), { addSuffix: true })}
                        </span>
                      )}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="bg-muted/20 border-t border-border/50 px-4 py-3">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Players in this game
                        {game.endedAtMs > 0 && (
                          <span className="ml-2 normal-case font-normal text-muted-foreground/60">
                            ended {format(new Date(game.endedAtMs), 'MMM d, HH:mm')}
                          </span>
                        )}
                      </div>
                      <div className="rounded-md border border-border/50 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="text-xs py-2">Name</TableHead>
                              <TableHead className="text-xs py-2">Email</TableHead>
                              <TableHead className="text-xs py-2">Type</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {game.players.map((p) => (
                              <TableRow key={p.userId} className={p.isBot ? 'opacity-50' : ''}>
                                <TableCell className="py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                                      {p.isBot ? '🤖' : p.displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm">{p.displayName}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2 text-xs text-muted-foreground">
                                  {p.isBot ? (
                                    <span className="italic opacity-40">—</span>
                                  ) : emailMap[p.userId] ? (
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3 shrink-0" />
                                      {emailMap[p.userId]}
                                    </span>
                                  ) : (
                                    <span className="opacity-40">No email data</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-2">
                                  {p.isBot ? (
                                    <Badge variant="outline" className="border-purple-500/40 text-purple-400 text-xs">
                                      <Bot className="h-3 w-3 mr-1" />Bot
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-xs">
                                      <Users className="h-3 w-3 mr-1" />Real
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Live Games Section ──────────────────────────────────────────────────────

function LiveGamesSection({ visits }: { visits: AnalyticsVisit[] }) {
  const [tables, setTables] = useState<LiveTableInfo[]>([]);
  const [liveLoaded, setLiveLoaded] = useState(false);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [staleCount, setStaleCount] = useState(0);
  const [liveSubError, setLiveSubError] = useState<string | null>(null);

  // Build userId → email map from analytics visits (unique by userId, email is de‑ duped)
  const emailMap = visits.reduce<Record<string, string>>((acc, v) => {
    if (v.userId && v.userEmail) acc[v.userId] = v.userEmail;
    return acc;
  }, {});

  useEffect(() => {
    const unsub = subscribeToAllActiveGames(
      (rooms: GameRoom[]) => {
        setLiveSubError(null);
        // Filter out stale zombie games
        const fresh = rooms.filter((r) => !isStale(r));
        const stale = rooms.length - fresh.length;
        setStaleCount(stale);

        const processed = fresh.map((room) => buildLiveTable(room, emailMap));
        // Sort: playing first, then most recently updated
        processed.sort((a, b) => {
          if (a.status === 'playing' && b.status !== 'playing') return -1;
          if (b.status === 'playing' && a.status !== 'playing') return 1;
          return b.updatedAtMs - a.updatedAtMs;
        });
        setTables(padTablesToMinimumOpen(processed, MIN_MONITOR_OPEN_TABLES));
        setLiveLoaded(true);
      },
      (err) => {
        setLiveSubError(
          err.code === 'failed-precondition'
            ? 'Firestore query failed (index or rules). Check firestore.rules and the browser console link.'
            : err.message || 'Live subscription failed'
        );
        setTables(padTablesToMinimumOpen([], MIN_MONITOR_OPEN_TABLES));
        setLiveLoaded(true);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const realTablesOnly = tables.filter((t) => !t.isOpenSlot);
  const totalTables = tables.length;
  const playingTables = realTablesOnly.filter((t) => t.status === 'playing');
  const waitingTables = realTablesOnly.filter((t) => t.status === 'waiting');
  const openSlotRows = tables.filter((t) => t.isOpenSlot);
  const tablesWithBots = realTablesOnly.filter((t) => t.bots.length > 0).length;

  // Deduplicate real players by userId across ALL tables
  const playingUserIds = new Set<string>();
  playingTables.forEach((t) => t.realPlayers.forEach((p) => playingUserIds.add(p.userId)));
  const waitingUserIds = new Set<string>();
  waitingTables.forEach((t) => t.realPlayers.forEach((p) => {
    if (!playingUserIds.has(p.userId)) waitingUserIds.add(p.userId);
  }));
  const uniquePlayingCount = playingUserIds.size;
  const uniqueWaitingCount = waitingUserIds.size;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <Wifi className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            Live Games
            {liveLoaded && (
              <span className="flex items-center gap-1 text-xs font-normal text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Real-time
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">
            Active poker tables right now
            {staleCount > 0 && (
              <span className="ml-2 text-amber-400/70">
                ({staleCount} stale/zombie game{staleCount !== 1 ? 's' : ''} hidden)
              </span>
            )}
          </p>
          {liveSubError && (
            <p className="text-xs text-destructive mt-1 max-w-xl">{liveSubError}</p>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      {!liveLoaded ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Tables</CardTitle>
              <Table2 className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{totalTables}</div>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                  {playingTables.length} playing
                </Badge>
                <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                  {waitingTables.length + openSlotRows.length} waiting
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Playing Now</CardTitle>
              <CircleDot className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{uniquePlayingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Unique real players in games</p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Lobby / Waiting</CardTitle>
              <Clock className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{uniqueWaitingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Unique real players in lobby</p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tables with Bots</CardTitle>
              <Bot className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{tablesWithBots}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {realTablesOnly.length > 0 ? Math.round((tablesWithBots / realTablesOnly.length) * 100) : 0}% of live tables
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Per-Table Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Table Details — Right Now
          </CardTitle>
          <CardDescription>
            Live tables are only counted if updated in the last {playingTables.length > 0 ? '2 hrs (playing) / 20 min (waiting)' : '20 min'}.
            The list always shows at least three open listings. Click a row for player details.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!liveLoaded ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded" />)}
            </div>
          ) : tables.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Table2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
              Loading table list…
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tables.map((table) => {
                const isExpanded = expandedTable === table.id;
                const ageMinutes = table.updatedAtMs
                  ? Math.round((Date.now() - table.updatedAtMs) / 60000)
                  : null;
                return (
                  <div key={table.id}>
                    <button
                      className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-center gap-3 flex-wrap"
                      onClick={() => setExpandedTable(isExpanded ? null : table.id)}
                    >
                      <span className="text-muted-foreground shrink-0">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </span>

                      {table.isOpenSlot ? (
                        <Badge variant="outline" className="border-sky-500/50 text-sky-300 text-xs px-2 py-0 shrink-0">Open</Badge>
                      ) : table.status === 'playing' ? (
                        <Badge className="bg-emerald-600 text-white text-xs px-2 py-0 shrink-0">Playing</Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-xs px-2 py-0 shrink-0">Waiting</Badge>
                      )}

                      <span className="font-mono text-xs text-muted-foreground shrink-0 hidden sm:block">
                        {table.isOpenSlot ? (
                          <span className="text-sky-300/80">Listing {table.openSlotIndex ?? '—'}</span>
                        ) : (
                          <>#{table.id.slice(0, 8)}</>
                        )}
                      </span>

                      <span className="text-xs text-muted-foreground shrink-0">
                        {table.isOpenSlot ? (
                          <>Standard stakes · {table.smallBlind}/{table.bigBlind} · Buy‑in {table.buyIn.toLocaleString()}</>
                        ) : (
                          <>{table.smallBlind}/{table.bigBlind} — Buy‑in {table.buyIn.toLocaleString()}</>
                        )}
                      </span>

                      {!table.isOpenSlot && table.isMatchmaking && (
                        <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400 shrink-0">
                          Matchmaking
                        </Badge>
                      )}

                      {!table.isOpenSlot && ageMinutes !== null && (
                        <span className="text-[11px] text-muted-foreground/50 shrink-0 hidden md:block">
                          updated {ageMinutes}m ago
                        </span>
                      )}

                      <span className="ml-auto flex items-center gap-3 text-xs shrink-0">
                        {/* Pot and phase (only when playing) */}
                        {table.status === 'playing' && table.pot > 0 && (
                          <span className="flex items-center gap-1 text-amber-400 font-medium">
                            🏆 Pot: {table.pot.toLocaleString()}
                          </span>
                        )}
                        {table.status === 'playing' && table.phase && (
                          <Badge variant="outline" className="text-xs border-primary/30 text-primary capitalize shrink-0">
                            {table.phase}
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {table.realPlayers.length} real
                        </span>
                        {table.bots.length > 0 && (
                          <span className="flex items-center gap-1 text-purple-400">
                            <Bot className="h-3 w-3" />
                            {table.bots.length} bot{table.bots.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="bg-muted/20 border-t border-border/50">
                        <div className="px-4 py-3">
                          {/* Pot / phase summary bar */}
                          {table.status === 'playing' && (
                            <div className="flex items-center gap-4 mb-3 text-xs">
                              {table.pot > 0 && (
                                <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                                  🏆 Pot: {table.pot.toLocaleString()}
                                </span>
                              )}
                              {table.currentBet > 0 && (
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  Current bet: {table.currentBet.toLocaleString()}
                                </span>
                              )}
                              {table.phase && (
                                <Badge variant="outline" className="text-xs border-primary/30 text-primary capitalize">
                                  {table.phase}
                                </Badge>
                              )}
                            </div>
                          )}
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                            {table.isOpenSlot ? (
                              <>Open listing {table.openSlotIndex ?? ''} · seats available</>
                            ) : (
                              <>Players at Table #{table.id.slice(0, 8)}</>
                            )}
                          </div>
                          {table.isOpenSlot ? (
                            <p className="text-sm text-muted-foreground py-4 px-1">
                              No players seated yet. This listing stays open on the dashboard for visibility.
                            </p>
                          ) : (
                          <div className="rounded-md border border-border/50 overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/30">
                                  <TableHead className="text-xs py-2">Seat</TableHead>
                                  <TableHead className="text-xs py-2">Name</TableHead>
                                  <TableHead className="text-xs py-2">Email</TableHead>
                                  <TableHead className="text-xs py-2">Chips (live)</TableHead>
                                  <TableHead className="text-xs py-2">Bet</TableHead>
                                  <TableHead className="text-xs py-2">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {table.players
                                  .slice()
                                  .sort((a, b) => a.seatIndex - b.seatIndex)
                                  .map((player) => {
                                    const statusColor: Record<string, string> = {
                                      'active':      'border-emerald-500/40 text-emerald-400',
                                      'folded':      'border-red-500/40 text-red-400',
                                      'all-in':      'border-amber-500/40 text-amber-400',
                                      'sitting-out': 'border-border text-muted-foreground',
                                    };
                                    const sc = statusColor[player.status] ?? 'border-border text-muted-foreground';
                                    return (
                                      <TableRow key={player.userId} className={player.isBot ? 'opacity-60' : ''}>
                                        <TableCell className="py-2 font-mono text-xs text-muted-foreground">
                                          #{player.seatIndex + 1}
                                        </TableCell>
                                        <TableCell className="py-2">
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                              {player.isBot ? '🤖' : player.displayName.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-medium">{player.displayName}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="py-2 text-xs text-muted-foreground">
                                          {player.isBot ? (
                                            <span className="italic opacity-40">—</span>
                                          ) : player.email ? (
                                            <span className="flex items-center gap-1">
                                              <Mail className="h-3 w-3 shrink-0" />
                                              {player.email}
                                            </span>
                                          ) : (
                                            <span className="opacity-40">No email data</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="py-2">
                                          {player.chips > 0 || !player.isBot ? (
                                            <span className={`text-sm font-medium tabular-nums ${
                                              player.chips < table.buyIn * 0.4
                                                ? 'text-red-400'
                                                : player.chips > table.buyIn
                                                ? 'text-emerald-400'
                                                : player.isBot
                                                ? 'text-purple-300'
                                                : 'text-foreground'
                                            }`}>
                                              {player.chips.toLocaleString()}
                                            </span>
                                          ) : (
                                            <span className="opacity-40 text-sm">—</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="py-2 text-sm tabular-nums text-muted-foreground">
                                          {player.currentBet === 0 ? (
                                            <span className="opacity-30">—</span>
                                          ) : (
                                            <span className="text-amber-400">{player.currentBet.toLocaleString()}</span>
                                          )}
                                        </TableCell>
                                        <TableCell className="py-2">
                                          {player.isBot ? (
                                            <Badge className="bg-purple-900/50 text-purple-300 border-purple-500/30 text-xs">
                                              <Bot className="h-3 w-3 mr-1" />Bot
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className={`text-xs capitalize ${sc}`}>
                                              {player.status || 'active'}
                                            </Badge>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                              </TableBody>
                            </Table>
                          </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

type ActiveTab = 'live' | 'history' | 'analytics';

const MonitorDashboard = () => {
  const [user, setUser] = useState<{ email: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? { email: stored } : null;
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [visits, setVisits] = useState<AnalyticsVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<7 | 14 | 30>(30);
  const [activeTab, setActiveTab] = useState<ActiveTab>('live');

  const fillMonitorLoginAsAlexy = () => {
    setLoginError('');
    setEmail('alexywiseman@gmail.com');
    setPassword(MONITOR_CREDENTIALS['alexywiseman@gmail.com'] ?? '');
  };

  const fillMonitorLoginAsAdi = () => {
    setLoginError('');
    setEmail('nasimmdemon@gmail.com');
    setPassword(MONITOR_CREDENTIALS['nasimmdemon@gmail.com'] ?? '');
  };

  // Prefill when showing the login form (mount or after logout).
  useEffect(() => {
    if (user) return;
    setLoginError('');
    setEmail('nasimmdemon@gmail.com');
    setPassword(MONITOR_CREDENTIALS['nasimmdemon@gmail.com'] ?? '');
  }, [user]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const hasAnyAuth =
      Object.keys(MONITOR_CREDENTIALS).length > 0 || (MONITOR_LOGIN_EMAIL && MONITOR_LOGIN_PASSWORD);
    if (!hasAnyAuth) {
      setLoginError('Monitor login is not configured. Add accounts in code or set VITE_MONITOR_LOGIN_EMAIL / VITE_MONITOR_LOGIN_PASSWORD.');
    } else if (isValidMonitorPassword(normalizedEmail, password)) {
      setUser({ email: normalizedEmail });
      sessionStorage.setItem(STORAGE_KEY, normalizedEmail);
    } else {
      setLoginError('Invalid email or password');
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAnalyticsVisits(days);
      setVisits(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { if (user) load(); }, [user, load]);
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [user, load]);

  // Build email map once (shared between Live and History panels)
  const emailMap = visits.reduce<Record<string, string>>((acc, v) => {
    if (v.userId && v.userEmail) acc[v.userId] = v.userEmail;
    return acc;
  }, {});

  if (!user) {
    return (
      <div className="min-h-[100dvh] overflow-y-auto bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-primary/30">
          <CardHeader>
            <CardTitle className="font-display text-primary">Monitor Login</CardTitle>
            <CardDescription>
              Email and password are filled automatically for debugging. Use Alexy / Adi to switch accounts, or edit the fields and sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="w-full text-xs sm:text-sm" onClick={fillMonitorLoginAsAlexy}>
                  Login as Alexy
                </Button>
                <Button type="button" variant="outline" className="w-full text-xs sm:text-sm" onClick={fillMonitorLoginAsAdi}>
                  Login as Adi
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monitor-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="monitor-email" type="email" placeholder="you@example.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} required className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monitor-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="monitor-password" type="password" placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} required className="pl-10" />
                </div>
              </div>
              {loginError && <p className="text-destructive text-sm">{loginError}</p>}
              <Button type="submit" disabled={loginLoading} className="w-full">
                {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Analytics computations ─────────────────────────────────────────────────
  const total = visits.length;
  const played = visits.filter((v) => v.played).length;
  const notPlayed = total - played;
  const mobile = visits.filter((v) => v.device === 'mobile').length;
  const desktop = visits.filter((v) => v.device === 'desktop').length;
  const tablet = visits.filter((v) => v.device === 'tablet').length;

  const byCountry = visits.reduce<Record<string, number>>((acc, v) => {
    const c = v.country || 'Unknown';
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});
  const topCountries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const byPlatform = visits.reduce<Record<string, number>>((acc, v) => {
    const p = v.platform || 'unknown';
    acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {});

  const visitsByDay = (() => {
    const dayCounts: Record<string, { date: string; visitors: number; played: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const key = format(d, 'yyyy-MM-dd');
      dayCounts[key] = { date: format(d, 'MMM d'), visitors: 0, played: 0 };
    }
    visits.forEach((v) => {
      const key = format(new Date(v.firstSeen), 'yyyy-MM-dd');
      if (dayCounts[key]) {
        dayCounts[key].visitors += 1;
        if (v.played) dayCounts[key].played += 1;
      }
    });
    return Object.values(dayCounts);
  })();

  const deviceData = [
    { name: 'Mobile', value: mobile, color: CHART_COLORS[0] },
    { name: 'Desktop', value: desktop, color: CHART_COLORS[1] },
    { name: 'Tablet', value: tablet, color: CHART_COLORS[2] },
  ].filter((d) => d.value > 0);

  const playedData = [
    { name: 'Played', value: played, color: '#22c55e' },
    { name: 'Visited only', value: notPlayed, color: '#eab308' },
  ].filter((d) => d.value > 0);

  // ── Tabs definition ────────────────────────────────────────────────────────
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'live',      label: 'Live Games',  icon: <Wifi className="h-3.5 w-3.5" /> },
    { id: 'history',   label: 'History',     icon: <History className="h-3.5 w-3.5" /> },
    { id: 'analytics', label: 'Analytics',   icon: <BarChart3 className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="h-[100dvh] overflow-y-auto bg-background text-foreground">
      <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 lg:p-8 pb-12">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-primary">
              Liberty Poker Monitor
            </h1>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
              <span>{user.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}
                className="h-6 px-2 text-muted-foreground hover:text-foreground">
                <LogOut className="h-3.5 w-3 mr-1" />Sign out
              </Button>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Only show day filter on Analytics tab */}
            {activeTab === 'analytics' && (
              <>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {([7, 14, 30] as const).map((d) => (
                    <button key={d} onClick={() => setDays(d)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${days === d ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted text-muted-foreground'}`}>
                      {d}d
                    </button>
                  ))}
                </div>
                <Button onClick={load} disabled={loading} size="sm" variant="outline">
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tab Nav */}
        <div className="flex items-center gap-1 border-b border-border pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'live' && (
                <span className="relative flex h-1.5 w-1.5 ml-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── LIVE TAB ──────────────────────────────────────────────────────── */}
        {activeTab === 'live' && <LiveGamesSection visits={visits} />}

        {/* ── HISTORY TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'history' && <HistoryPanel emailMap={emailMap} />}

        {/* ── ANALYTICS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <>
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Visitors</CardTitle>
                      <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{total}</div>
                      <p className="text-xs text-muted-foreground mt-1">Last {days} days</p>
                    </CardContent>
                  </Card>

                  <Card className="border-green-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Played</CardTitle>
                      <Gamepad2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-500">{played}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {total > 0 ? Math.round((played / total) * 100) : 0}% conversion
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Visited Only</CardTitle>
                      <Monitor className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-amber-500">{notPlayed}</div>
                      <p className="text-xs text-muted-foreground mt-1">Tried app but did not play</p>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Devices</CardTitle>
                      <Smartphone className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1 text-sm">
                        <Badge variant="secondary">Mobile {mobile}</Badge>
                        <Badge variant="secondary">Desktop {desktop}</Badge>
                        <Badge variant="secondary">Tablet {tablet}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Visitors Over Time
                      </CardTitle>
                      <CardDescription>Daily visitors and players</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[240px]">
                        <ChartContainer
                          config={{ visitors: { label: 'Visitors', color: 'hsl(var(--primary))' }, played: { label: 'Played', color: '#22c55e' }, date: { label: 'Date' } }}
                          className="h-[240px] w-full"
                        >
                          <AreaChart data={visitsByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="playedGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                            <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Area type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" fill="url(#visitorsGrad)" strokeWidth={2} />
                            <Area type="monotone" dataKey="played" stroke="#22c55e" fill="url(#playedGrad)" strokeWidth={2} />
                          </AreaChart>
                        </ChartContainer>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Visitors</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Played</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Top Locations
                      </CardTitle>
                      <CardDescription>Visitors by country</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[240px]">
                        <ChartContainer
                          config={{ count: { label: 'Visitors' }, name: { label: 'Country' } }}
                          className="h-[240px] w-full"
                        >
                          <BarChart data={topCountries.map(([country, count]) => ({ name: country, count }))} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ChartContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Device Breakdown</CardTitle>
                      <CardDescription>Mobile, desktop, tablet</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {deviceData.length > 0 ? (
                        <div className="h-[200px] flex items-center justify-center">
                          <ChartContainer
                            config={Object.fromEntries(deviceData.map((d) => [d.name, { label: d.name, color: d.color }]))}
                            className="h-[200px] w-full"
                          >
                            <PieChart>
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Pie data={deviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="name">
                                {deviceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                              </Pie>
                            </PieChart>
                          </ChartContainer>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground py-8 text-center">No device data yet</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Played vs Visited</CardTitle>
                      <CardDescription>Conversion funnel</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {playedData.length > 0 ? (
                        <div className="h-[200px] flex items-center justify-center">
                          <ChartContainer
                            config={Object.fromEntries(playedData.map((d) => [d.name, { label: d.name, color: d.color }]))}
                            className="h-[200px] w-full"
                          >
                            <PieChart>
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Pie data={playedData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="name">
                                {playedData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                              </Pie>
                            </PieChart>
                          </ChartContainer>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground py-8 text-center">No data yet</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Platforms</CardTitle>
                      <CardDescription>iOS, Android, Windows, etc.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(byPlatform).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No platform data yet</p>
                        ) : (
                          Object.entries(byPlatform).sort((a, b) => b[1] - a[1]).map(([platform, count]) => (
                            <Badge key={platform} variant="outline" className="text-sm">
                              {platform}: {count}
                            </Badge>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Locations</CardTitle>
                      <CardDescription>Visitors by country</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {topCountries.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No location data yet</p>
                        ) : (
                          topCountries.map(([country, count]) => (
                            <div key={country} className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3 text-muted-foreground" />
                                {country}
                              </span>
                              <span className="font-medium">{count}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Visits</CardTitle>
                    <CardDescription>Who tried the app, who played, devices, and locations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Played</TableHead>
                            <TableHead>Device</TableHead>
                            <TableHead>Platform</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Last Seen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visits.slice(0, 50).map((v) => (
                            <TableRow key={v.id ?? v.sessionId}>
                              <TableCell>
                                <div className="font-medium">{v.userName || v.userEmail || 'Anonymous'}</div>
                                {v.userEmail && <div className="text-xs text-muted-foreground">{v.userEmail}</div>}
                              </TableCell>
                              <TableCell>
                                {v.played ? <Badge className="bg-green-600">Yes</Badge> : <Badge variant="secondary">No</Badge>}
                              </TableCell>
                              <TableCell>
                                <span className="flex items-center gap-1">
                                  {v.device === 'mobile' && <Smartphone className="h-3.5 w-3" />}
                                  {v.device === 'tablet' && <Tablet className="h-3.5 w-3" />}
                                  {v.device === 'desktop' && <Monitor className="h-3.5 w-3" />}
                                  {v.device}
                                </span>
                              </TableCell>
                              <TableCell>{v.platform}</TableCell>
                              <TableCell>
                                <span className="text-sm">{[v.city, v.region, v.country].filter(Boolean).join(', ') || '—'}</span>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {v.lastSeen ? format(new Date(v.lastSeen), 'MMM d, HH:mm') : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {visits.length === 0 && !loading && (
                      <p className="py-8 text-center text-muted-foreground">
                        No visits in the last {days} days. Data appears when users open the app.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MonitorDashboard;
