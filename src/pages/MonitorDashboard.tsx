import { useEffect, useState, useCallback } from 'react';
import { getAnalyticsVisits, type AnalyticsVisit } from '@/lib/analytics';
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
} from 'lucide-react';
import { format, startOfDay, subDays } from 'date-fns';
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

const MONITOR_CREDENTIALS: Record<string, string> = {
  'nasimmdemon@gmail.com': 'Emon4288@',
  'alexywiseman@gmail.com': 'Paradise1@',
};

const STORAGE_KEY = 'monitor_logged_in';

const CHART_COLORS = ['hsl(var(--primary))', '#22c55e', '#eab308', '#3b82f6', '#a855f7', '#ec4899'];

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const expectedPass = MONITOR_CREDENTIALS[normalizedEmail];
    if (expectedPass && password === expectedPass) {
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

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [user, load]);

  if (!user) {
    return (
      <div className="min-h-[100dvh] overflow-y-auto bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-primary/30">
          <CardHeader>
            <CardTitle className="font-display text-primary">Monitor Login</CardTitle>
            <CardDescription>
              Sign in with an authorized account to access the analytics dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monitor-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="monitor-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monitor-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="monitor-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10"
                  />
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
  const topCountries = Object.entries(byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

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

  return (
    <div className="h-[100dvh] overflow-y-auto bg-background text-foreground">
      <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 lg:p-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-primary">
              Liberty Poker Monitor
            </h1>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
              <span>{user.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-6 px-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3 mr-1" />
                Sign out
              </Button>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    days === d
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <Button onClick={load} disabled={loading} size="sm" variant="outline">
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Visitors
                  </CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{total}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last {days} days
                  </p>
                </CardContent>
              </Card>

              <Card className="border-green-500/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Played
                  </CardTitle>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Visited Only
                  </CardTitle>
                  <Monitor className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-500">{notPlayed}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tried app but did not play
                  </p>
                </CardContent>
              </Card>

              <Card className="border-blue-500/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Devices
                  </CardTitle>
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
                      config={{
                        visitors: { label: 'Visitors', color: 'hsl(var(--primary))' },
                        played: { label: 'Played', color: '#22c55e' },
                        date: { label: 'Date' },
                      }}
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
                        <Area
                          type="monotone"
                          dataKey="visitors"
                          stroke="hsl(var(--primary))"
                          fill="url(#visitorsGrad)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="played"
                          stroke="#22c55e"
                          fill="url(#playedGrad)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary" /> Visitors
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500" /> Played
                    </span>
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
                      <BarChart
                        data={topCountries.map(([country, count]) => ({ name: country, count }))}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
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
                          <Pie
                            data={deviceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                          >
                            {deviceData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
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
                          <Pie
                            data={playedData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                          >
                            {playedData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
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
                      Object.entries(byPlatform)
                        .sort((a, b) => b[1] - a[1])
                        .map(([platform, count]) => (
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
                <CardDescription>
                  Who tried the app, who played, devices, and locations
                </CardDescription>
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
                            <div className="font-medium">
                              {v.userName || v.userEmail || 'Anonymous'}
                            </div>
                            {v.userEmail && (
                              <div className="text-xs text-muted-foreground">{v.userEmail}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {v.played ? (
                              <Badge className="bg-green-600">Yes</Badge>
                            ) : (
                              <Badge variant="secondary">No</Badge>
                            )}
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
                            <span className="text-sm">
                              {[v.city, v.region, v.country].filter(Boolean).join(', ') || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {v.lastSeen
                              ? format(new Date(v.lastSeen), 'MMM d, HH:mm')
                              : '—'}
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
      </div>
    </div>
  );
};

export default MonitorDashboard;
