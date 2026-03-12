import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Activity, Database, Users, HardDrive, Search, Download, Shield, FileText, Clock,
  CheckCircle2, AlertTriangle, Server, Wifi, Zap, RefreshCw, BarChart3, XCircle,
  TrendingUp, Gauge,
} from 'lucide-react';
import { format, subHours, differenceInMinutes } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface ActionLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

const MotionCard = motion.create(Card);

const cardAnim = (i: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
});

function PulsingDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${color}`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'healthy': case 'operational': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'degraded': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    default: return <XCircle className="h-4 w-4 text-destructive" />;
  }
}

function LatencyBar({ latency, max = 2000 }: { latency: number; max?: number }) {
  const pct = Math.min((latency / max) * 100, 100);
  const color = latency < 300 ? 'bg-emerald-500' : latency < 800 ? 'bg-amber-500' : 'bg-destructive';
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

export default function AdminSystemHealth() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');

  // System stats
  const { data: systemStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-system-stats'],
    queryFn: async () => {
      const [profiles, jobs, applications, messages, conversations, interviews] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('jobs').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('conversations').select('*', { count: 'exact', head: true }),
        supabase.from('interviews').select('*', { count: 'exact', head: true }),
      ]);
      return {
        totalUsers: profiles.count || 0,
        totalJobs: jobs.count || 0,
        totalApplications: applications.count || 0,
        totalMessages: messages.count || 0,
        totalConversations: conversations.count || 0,
        totalInterviews: interviews.count || 0,
      };
    },
  });

  // Table sizes
  const { data: tableSizes } = useQuery({
    queryKey: ['admin-table-sizes'],
    queryFn: async () => {
      const tables = ['profiles', 'jobs', 'applications', 'candidates', 'employers', 'messages', 'conversations', 'interviews', 'notifications'] as const;
      const results = await Promise.all(
        tables.map(async (table) => {
          const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
          return { name: table, rows: count || 0 };
        })
      );
      return results.sort((a, b) => b.rows - a.rows);
    },
  });

  // Activity timeline (24h) - optimized: fetch all recent data in 2 queries instead of 48
  const { data: activityTimeline } = useQuery({
    queryKey: ['admin-activity-timeline'],
    queryFn: async () => {
      const since = subHours(new Date(), 24).toISOString();
      const [actionsRes, signupsRes] = await Promise.all([
        supabase.from('admin_action_logs').select('created_at').gte('created_at', since),
        supabase.from('profiles').select('created_at').gte('created_at', since),
      ]);

      const hours = Array.from({ length: 24 }, (_, i) => {
        const hour = subHours(new Date(), 23 - i);
        return { hour, label: format(hour, 'HH:00') };
      });

      return hours.map(({ hour, label }) => {
        const start = new Date(hour); start.setMinutes(0, 0, 0);
        const end = new Date(hour); end.setMinutes(59, 59, 999);
        const actions = (actionsRes.data || []).filter(a => {
          const t = new Date(a.created_at!);
          return t >= start && t <= end;
        }).length;
        const signups = (signupsRes.data || []).filter(s => {
          const t = new Date(s.created_at!);
          return t >= start && t <= end;
        }).length;
        return { name: label, actions, signups };
      });
    },
  });

  // Health checks
  const { data: healthStatus, refetch: refetchHealth, isFetching: healthFetching } = useQuery({
    queryKey: ['admin-health-checks'],
    refetchInterval: 60000,
    queryFn: async () => {
      const dbStart = performance.now();
      const { error: dbError } = await supabase.from('profiles').select('id', { head: true }).limit(1);
      const dbLatency = Math.round(performance.now() - dbStart);

      const authStart = performance.now();
      const { error: authError } = await supabase.auth.getSession();
      const authLatency = Math.round(performance.now() - authStart);

      const stStart = performance.now();
      const { error: stError } = await supabase.storage.listBuckets();
      const stLatency = Math.round(performance.now() - stStart);

      const { count: recentErrors } = await supabase.from('email_logs').select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', subHours(new Date(), 1).toISOString());

      return {
        services: [
          { name: 'Database', status: dbError ? 'error' : dbLatency < 500 ? 'healthy' : 'degraded', latency: dbLatency, icon: 'database' },
          { name: 'Authentication', status: authError ? 'error' : authLatency < 500 ? 'healthy' : 'degraded', latency: authLatency, icon: 'shield' },
          { name: 'Storage', status: stError ? 'error' : stLatency < 500 ? 'healthy' : 'degraded', latency: stLatency, icon: 'server' },
        ],
        emailErrors: recentErrors || 0,
        lastChecked: new Date().toISOString(),
      };
    },
  });

  // Audit log
  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['admin-audit-log', filterType, filterAction],
    queryFn: async () => {
      let query = supabase.from('admin_action_logs').select('*').order('created_at', { ascending: false }).limit(200);
      if (filterType !== 'all') query = query.eq('target_type', filterType);
      if (filterAction !== 'all') query = query.eq('action_type', filterAction);
      const { data, error } = await query;
      if (error) throw error;
      return data as ActionLog[];
    },
  });

  const filteredLogs = auditLogs?.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return log.action_type.toLowerCase().includes(term) || log.target_type.toLowerCase().includes(term) || log.target_id.toLowerCase().includes(term);
  });

  const actionTypes = [...new Set(auditLogs?.map(l => l.action_type) || [])];
  const targetTypes = [...new Set(auditLogs?.map(l => l.target_type) || [])];

  const exportAuditLog = () => {
    if (!filteredLogs) return;
    const csv = ['Date,Action,Target Type,Target ID,Details',
      ...filteredLogs.map(l => `"${format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss')}","${l.action_type}","${l.target_type}","${l.target_id}","${JSON.stringify(l.details).replace(/"/g, '""')}"`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const actionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'update': return 'bg-primary/10 text-primary border-primary/20';
      case 'delete': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'block': case 'suspend': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const maxRows = Math.max(...(tableSizes?.map(t => t.rows) || [1]));
  const allHealthy = healthStatus?.services.every(s => s.status === 'healthy');
  const hasIssues = healthStatus?.services.some(s => s.status !== 'healthy') || (healthStatus?.emailErrors ?? 0) > 0;

  const serviceIcon = (icon: string) => {
    switch (icon) {
      case 'database': return Database;
      case 'shield': return Shield;
      case 'server': return Server;
      default: return Activity;
    }
  };

  const statItems = [
    { label: 'Users', value: systemStats?.totalUsers, icon: Users, color: 'from-primary/20 to-primary/5' },
    { label: 'Jobs', value: systemStats?.totalJobs, icon: FileText, color: 'from-emerald-500/20 to-emerald-500/5' },
    { label: 'Applications', value: systemStats?.totalApplications, icon: Database, color: 'from-amber-500/20 to-amber-500/5' },
    { label: 'Messages', value: systemStats?.totalMessages, icon: Activity, color: 'from-blue-500/20 to-blue-500/5' },
    { label: 'Conversations', value: systemStats?.totalConversations, icon: HardDrive, color: 'from-purple-500/20 to-purple-500/5' },
    { label: 'Interviews', value: systemStats?.totalInterviews, icon: Clock, color: 'from-rose-500/20 to-rose-500/5' },
  ];

  return (
    <AdminLayout title="System Health & Monitoring">
      {/* Alert banner */}
      <AnimatePresence>
        {hasIssues && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Alert variant="destructive" className="mb-6 border-destructive/30 bg-destructive/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>System Issues Detected</AlertTitle>
              <AlertDescription>
                {healthStatus?.services.filter(s => s.status !== 'healthy').map(s => s.name).join(', ') || 'Email delivery'} {' '}
                — {healthStatus?.emailErrors ? `${healthStatus.emailErrors} failed email(s) in the last hour. ` : ''}
                Review the health panel below.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overall Status + Refresh */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Gauge className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Infrastructure Overview</h2>
          {healthStatus && (
            <Badge variant="outline" className={allHealthy
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1.5'
              : 'bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1.5'
            }>
              <PulsingDot color={allHealthy ? 'bg-emerald-500' : 'bg-amber-500'} />
              {allHealthy ? 'All Systems Operational' : 'Issues Detected'}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchHealth()} disabled={healthFetching} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${healthFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Service Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {healthStatus ? healthStatus.services.map((service, i) => {
          const Icon = serviceIcon(service.icon);
          return (
            <MotionCard key={service.name} className="rounded-xl border-border/40 overflow-hidden" {...cardAnim(i)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${service.status === 'healthy' ? 'bg-emerald-500/10' : service.status === 'degraded' ? 'bg-amber-500/10' : 'bg-destructive/10'}`}>
                      <Icon className={`h-4 w-4 ${service.status === 'healthy' ? 'text-emerald-500' : service.status === 'degraded' ? 'text-amber-500' : 'text-destructive'}`} />
                    </div>
                    <span className="text-sm font-medium">{service.name}</span>
                  </div>
                  <StatusIcon status={service.status} />
                </div>
                <p className="text-2xl font-bold tabular-nums mb-1">{service.latency}ms</p>
                <LatencyBar latency={service.latency} />
                <p className="text-[10px] text-muted-foreground mt-1.5 capitalize">{service.status}</p>
              </CardContent>
            </MotionCard>
          );
        }) : [1, 2, 3].map(i => (
          <Card key={i} className="rounded-xl"><CardContent className="p-4"><Skeleton className="h-24" /></CardContent></Card>
        ))}

        {/* Email errors card */}
        <MotionCard className="rounded-xl border-border/40 overflow-hidden" {...cardAnim(3)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${(healthStatus?.emailErrors ?? 0) === 0 ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                  <Wifi className={`h-4 w-4 ${(healthStatus?.emailErrors ?? 0) === 0 ? 'text-emerald-500' : 'text-destructive'}`} />
                </div>
                <span className="text-sm font-medium">Email Delivery</span>
              </div>
              {(healthStatus?.emailErrors ?? 0) === 0
                ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                : <AlertTriangle className="h-4 w-4 text-destructive" />}
            </div>
            <p className="text-2xl font-bold tabular-nums mb-1">{healthStatus?.emailErrors ?? '—'}</p>
            <p className="text-[10px] text-muted-foreground">Failed emails (last hour)</p>
            {healthStatus?.lastChecked && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Checked {differenceInMinutes(new Date(), new Date(healthStatus.lastChecked))}m ago · auto-refreshes every 60s
              </p>
            )}
          </CardContent>
        </MotionCard>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statsLoading ? [...Array(6)].map((_, i) => (
          <Card key={i} className="rounded-xl"><CardContent className="p-3"><Skeleton className="h-14" /></CardContent></Card>
        )) : statItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <MotionCard key={item.label} className="rounded-xl border-border/40" {...cardAnim(i)}>
              <CardContent className={`p-3 bg-gradient-to-br ${item.color} rounded-xl`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground font-medium">{item.label}</span>
                </div>
                <p className="text-xl font-bold tabular-nums">{(item.value ?? 0).toLocaleString()}</p>
              </CardContent>
            </MotionCard>
          );
        })}
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" />Audit Log</TabsTrigger>
        </TabsList>

        {/* === OVERVIEW TAB === */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Timeline */}
            <Card className="rounded-xl border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Activity (24h)
                </CardTitle>
                <CardDescription className="text-xs">Signups & admin actions per hour</CardDescription>
              </CardHeader>
              <CardContent>
                {activityTimeline ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={activityTimeline}>
                      <defs>
                        <linearGradient id="fillSignups" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="fillActions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--accent-foreground))" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="hsl(var(--accent-foreground))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={3} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="signups" stackId="1" stroke="hsl(var(--primary))" fill="url(#fillSignups)" name="Signups" strokeWidth={2} />
                      <Area type="monotone" dataKey="actions" stackId="1" stroke="hsl(var(--accent-foreground))" fill="url(#fillActions)" name="Admin Actions" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <Skeleton className="h-[220px]" />}
              </CardContent>
            </Card>

            {/* Table Sizes */}
            <Card className="rounded-xl border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" /> Table Sizes
                </CardTitle>
                <CardDescription className="text-xs">Row counts across major tables</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tableSizes ? tableSizes.slice(0, 9).map((t, i) => (
                    <motion.div key={t.name} className="space-y-1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <div className="flex justify-between text-sm">
                        <span className="capitalize text-muted-foreground text-xs">{t.name}</span>
                        <span className="font-medium tabular-nums text-xs">{t.rows.toLocaleString()}</span>
                      </div>
                      <Progress value={(t.rows / maxRows) * 100} className="h-1.5" />
                    </motion.div>
                  )) : <Skeleton className="h-[220px]" />}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* === AUDIT LOG TAB === */}
        <TabsContent value="audit">
          <Card className="rounded-xl border-border/40">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Audit Log</CardTitle>
                  <CardDescription className="text-xs">{filteredLogs?.length || 0} actions recorded</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportAuditLog} className="gap-2">
                  <Download className="h-3.5 w-3.5" />Export CSV
                </Button>
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search audit log..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Action" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {actionTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Target" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Targets</SelectItem>
                    {targetTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? <Skeleton className="h-64 w-full" /> : (
                <div className="overflow-x-auto rounded-lg border border-border/40">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs">Timestamp</TableHead>
                        <TableHead className="text-xs">Action</TableHead>
                        <TableHead className="text-xs">Target</TableHead>
                        <TableHead className="text-xs">Target ID</TableHead>
                        <TableHead className="text-xs">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs?.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(log.created_at), 'MMM d, HH:mm:ss')}</TableCell>
                          <TableCell><Badge className={`${actionColor(log.action_type)} text-[10px]`}>{log.action_type}</Badge></TableCell>
                          <TableCell className="capitalize text-xs">{log.target_type}</TableCell>
                          <TableCell className="font-mono text-[10px] max-w-[120px] truncate">{log.target_id}</TableCell>
                          <TableCell className="max-w-[200px]"><pre className="text-[10px] text-muted-foreground truncate">{JSON.stringify(log.details)}</pre></TableCell>
                        </TableRow>
                      ))}
                      {!filteredLogs?.length && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                            <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No audit logs found</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
