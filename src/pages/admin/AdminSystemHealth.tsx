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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { StatsCard } from '@/components/admin/StatsCard';
import {
  Activity, Database, Users, HardDrive, Search, Download, Shield, FileText, Clock,
  CheckCircle, AlertTriangle, Server, Wifi, Zap,
} from 'lucide-react';
import { format, subHours, differenceInMinutes } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ActionLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
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

  // Table sizes for storage monitoring
  const { data: tableSizes } = useQuery({
    queryKey: ['admin-table-sizes'],
    queryFn: async () => {
      const tables = ['profiles', 'jobs', 'applications', 'candidates', 'employers', 'messages', 'conversations', 'interviews', 'notifications'] as const;
      type TableName = 'profiles' | 'jobs' | 'applications' | 'candidates' | 'employers' | 'messages' | 'conversations' | 'interviews' | 'notifications';
      const results = await Promise.all(
        tables.map(async (table) => {
          const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
          return { name: table, rows: count || 0 };
        })
      );
      return results.sort((a, b) => b.rows - a.rows);
    },
  });

  // Recent activity timeline (last 24h)
  const { data: activityTimeline } = useQuery({
    queryKey: ['admin-activity-timeline'],
    queryFn: async () => {
      const hours = Array.from({ length: 24 }, (_, i) => {
        const hour = subHours(new Date(), 23 - i);
        return { hour, label: format(hour, 'HH:00') };
      });
      
      const results = await Promise.all(
        hours.map(async ({ hour, label }) => {
          const start = new Date(hour); start.setMinutes(0, 0, 0);
          const end = new Date(hour); end.setMinutes(59, 59, 999);
          const { count: actions } = await supabase.from('admin_action_logs').select('*', { count: 'exact', head: true })
            .gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
          const { count: signups } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
            .gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
          return { name: label, actions: actions || 0, signups: signups || 0 };
        })
      );
      return results;
    },
  });

  // Health checks
  const { data: healthStatus } = useQuery({
    queryKey: ['admin-health-checks'],
    refetchInterval: 60000,
    queryFn: async () => {
      const start = performance.now();
      const { error: dbError } = await supabase.from('profiles').select('id', { head: true }).limit(1);
      const dbLatency = Math.round(performance.now() - start);

      const startAuth = performance.now();
      const { error: authError } = await supabase.auth.getSession();
      const authLatency = Math.round(performance.now() - startAuth);

      const { count: recentErrors } = await supabase.from('email_logs').select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', subHours(new Date(), 1).toISOString());

      return {
        database: { status: dbError ? 'error' : dbLatency < 500 ? 'healthy' : 'degraded', latency: dbLatency },
        auth: { status: authError ? 'error' : authLatency < 500 ? 'healthy' : 'degraded', latency: authLatency },
        emailErrors: recentErrors || 0,
        lastChecked: new Date().toISOString(),
      };
    },
  });

  // Full audit log
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
      case 'create': return 'bg-success/10 text-success border-success/20';
      case 'update': return 'bg-primary/10 text-primary border-primary/20';
      case 'delete': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'block': case 'suspend': return 'bg-warning/10 text-warning border-warning/20';
      default: return '';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-warning" />;
      default: return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
  };

  const maxRows = Math.max(...(tableSizes?.map(t => t.rows) || [1]));

  return (
    <AdminLayout title="System Health & Monitoring">
      {/* Health Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="rounded-xl border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Database</span>
              </div>
              {healthStatus && statusIcon(healthStatus.database.status)}
            </div>
            <p className="text-2xl font-bold tabular-nums">{healthStatus?.database.latency || '—'}ms</p>
            <p className="text-xs text-muted-foreground capitalize">{healthStatus?.database.status || 'checking...'}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Auth</span>
              </div>
              {healthStatus && statusIcon(healthStatus.auth.status)}
            </div>
            <p className="text-2xl font-bold tabular-nums">{healthStatus?.auth.latency || '—'}ms</p>
            <p className="text-xs text-muted-foreground capitalize">{healthStatus?.auth.status || 'checking...'}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Email Errors (1h)</span>
              </div>
              {healthStatus && (healthStatus.emailErrors === 0
                ? <CheckCircle className="h-4 w-4 text-success" />
                : <AlertTriangle className="h-4 w-4 text-destructive" />)}
            </div>
            <p className="text-2xl font-bold tabular-nums">{healthStatus?.emailErrors ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Failed emails last hour</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Last Check</span>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {healthStatus ? `${differenceInMinutes(new Date(), new Date(healthStatus.lastChecked))}m ago` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Auto-refresh: 60s</p>
          </CardContent>
        </Card>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {statsLoading ? (
          [...Array(6)].map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>)
        ) : (
          <>
            <StatsCard title="Users" value={systemStats?.totalUsers || 0} icon={Users} />
            <StatsCard title="Jobs" value={systemStats?.totalJobs || 0} icon={FileText} />
            <StatsCard title="Applications" value={systemStats?.totalApplications || 0} icon={Database} />
            <StatsCard title="Messages" value={systemStats?.totalMessages || 0} icon={Activity} />
            <StatsCard title="Conversations" value={systemStats?.totalConversations || 0} icon={HardDrive} />
            <StatsCard title="Interviews" value={systemStats?.totalInterviews || 0} icon={Clock} />
          </>
        )}
      </div>

      {/* Activity Timeline & Table Sizes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="rounded-xl border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Activity (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {activityTimeline ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activityTimeline}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={3} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="signups" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" name="Signups" />
                  <Area type="monotone" dataKey="actions" stackId="1" stroke="hsl(var(--accent-foreground))" fill="hsl(var(--accent)/0.2)" name="Admin Actions" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-[200px]" />}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" /> Table Sizes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tableSizes ? tableSizes.slice(0, 8).map((t) => (
                <div key={t.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize text-muted-foreground">{t.name}</span>
                    <span className="font-medium tabular-nums">{t.rows.toLocaleString()}</span>
                  </div>
                  <Progress value={(t.rows / maxRows) * 100} className="h-1.5" />
                </div>
              )) : <Skeleton className="h-[200px]" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Audit Log</CardTitle>
              <CardDescription>{filteredLogs?.length || 0} actions recorded</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportAuditLog}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search audit log..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Target" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Targets</SelectItem>
                {targetTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? <Skeleton className="h-64 w-full" /> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Target ID</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{format(new Date(log.created_at), 'MMM d, HH:mm:ss')}</TableCell>
                      <TableCell><Badge className={actionColor(log.action_type)}>{log.action_type}</Badge></TableCell>
                      <TableCell className="capitalize">{log.target_type}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">{log.target_id}</TableCell>
                      <TableCell className="max-w-[200px]"><pre className="text-xs text-muted-foreground truncate">{JSON.stringify(log.details)}</pre></TableCell>
                    </TableRow>
                  ))}
                  {!filteredLogs?.length && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No audit logs found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
