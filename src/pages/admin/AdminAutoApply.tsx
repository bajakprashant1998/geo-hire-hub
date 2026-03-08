import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Zap, Users, Activity, Shield, Settings, BarChart3,
  Loader2, Search, ChevronLeft, ChevronRight, AlertTriangle,
  TrendingUp, CheckCircle2, XCircle, Clock, Eye, FileText,
  Ban, ToggleLeft, Gauge, ArrowUpRight, Target, Bot
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const MotionCard = motion.create(Card);

export default function AdminAutoApply() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const pageSize = 20;

  // Platform-wide stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-auto-apply-stats'],
    queryFn: async () => {
      const [
        { count: totalEnabled },
        { count: totalDisabled },
        { count: totalLogs },
        { count: appliedToday },
        { count: totalApplied },
        { count: totalSkipped },
        { count: totalFailed },
      ] = await Promise.all([
        supabase.from('auto_apply_preferences').select('*', { count: 'exact', head: true }).eq('is_enabled', true),
        supabase.from('auto_apply_preferences').select('*', { count: 'exact', head: true }).eq('is_enabled', false),
        supabase.from('auto_apply_logs').select('*', { count: 'exact', head: true }),
        supabase.from('auto_apply_logs').select('*', { count: 'exact', head: true })
          .eq('status', 'applied')
          .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from('auto_apply_logs').select('*', { count: 'exact', head: true }).eq('status', 'applied'),
        supabase.from('auto_apply_logs').select('*', { count: 'exact', head: true }).eq('status', 'skipped'),
        supabase.from('auto_apply_logs').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
      ]);
      return {
        totalEnabled: totalEnabled || 0,
        totalDisabled: totalDisabled || 0,
        totalLogs: totalLogs || 0,
        appliedToday: appliedToday || 0,
        totalApplied: totalApplied || 0,
        totalSkipped: totalSkipped || 0,
        totalFailed: totalFailed || 0,
      };
    },
  });

  // All auto-apply preferences with candidate info
  const { data: preferences, isLoading: prefsLoading } = useQuery({
    queryKey: ['admin-auto-apply-prefs', search],
    queryFn: async () => {
      const { data } = await supabase
        .from('auto_apply_preferences')
        .select('*, candidates!auto_apply_preferences_candidate_id_fkey(job_title, profiles!candidates_profile_id_fkey(full_name, user_id))')
        .order('updated_at', { ascending: false });
      
      if (!data) return [];
      if (!search) return data;
      const q = search.toLowerCase();
      return data.filter((p: any) => {
        const name = p.candidates?.profiles?.full_name?.toLowerCase() || '';
        const title = p.candidates?.job_title?.toLowerCase() || '';
        return name.includes(q) || title.includes(q);
      });
    },
  });

  // Recent logs across all candidates
  const { data: recentLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['admin-auto-apply-logs', statusFilter, page],
    queryFn: async () => {
      let query = supabase
        .from('auto_apply_logs')
        .select('*, jobs(title, employers:employer_id(company_name)), candidates!auto_apply_logs_candidate_id_fkey(job_title, profiles!candidates_profile_id_fkey(full_name))')
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Platform-wide settings via admin_settings
  const { data: platformSettings } = useQuery({
    queryKey: ['admin-auto-apply-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('key', 'auto_apply_config')
        .maybeSingle();
      return (data?.value as any) || { max_daily_limit: 10, feature_enabled: true, max_threshold: 95, min_threshold: 50 };
    },
  });

  const savePlatformSettings = useMutation({
    mutationFn: async (settings: any) => {
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id')
        .eq('key', 'auto_apply_config')
        .maybeSingle();

      if (existing) {
        await supabase.from('admin_settings').update({ value: settings, updated_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await supabase.from('admin_settings').insert({ key: 'auto_apply_config', value: settings, description: 'Platform-wide auto-apply configuration' });
      }
    },
    onSuccess: () => {
      toast.success('Platform settings saved');
      queryClient.invalidateQueries({ queryKey: ['admin-auto-apply-settings'] });
    },
    onError: (err: any) => toast.error('Failed: ' + err.message),
  });

  const [localSettings, setLocalSettings] = useState<any>(null);
  const settings = localSettings || platformSettings || { max_daily_limit: 10, feature_enabled: true, max_threshold: 95, min_threshold: 50 };

  const successRate = stats && stats.totalLogs > 0
    ? Math.round((stats.totalApplied / stats.totalLogs) * 100)
    : 0;

  const failRate = stats && stats.totalLogs > 0
    ? Math.round((stats.totalFailed / stats.totalLogs) * 100)
    : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Applied</Badge>;
      case 'skipped': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] gap-1"><Clock className="h-2.5 w-2.5" />Skipped</Badge>;
      case 'failed': return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] gap-1"><XCircle className="h-2.5 w-2.5" />Failed</Badge>;
      case 'undone': return <Badge className="bg-muted text-muted-foreground border-border text-[10px] gap-1"><Ban className="h-2.5 w-2.5" />Undone</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600';
    if (score >= 70) return 'text-primary';
    if (score >= 50) return 'text-amber-600';
    return 'text-destructive';
  };

  return (
    <AdminLayout title="Auto Apply Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Auto Apply Management</h1>
              <p className="text-sm text-muted-foreground">Monitor and control automated job applications across the platform</p>
            </div>
          </div>
          <Badge variant={settings.feature_enabled ? 'default' : 'secondary'} className="gap-1.5 px-3 py-1.5">
            <ToggleLeft className="h-3.5 w-3.5" />
            {settings.feature_enabled ? 'Feature Active' : 'Feature Disabled'}
          </Badge>
        </div>

        {/* Alert for high failure rate */}
        {stats && failRate > 15 && (
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>High failure rate detected:</strong> {failRate}% of auto-apply attempts are failing. Review the Activity Log for details and consider adjusting platform limits.
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Active Users',
              value: stats?.totalEnabled || 0,
              subtitle: `${stats?.totalDisabled || 0} disabled`,
              icon: Users,
              gradient: 'from-primary/15 via-primary/5 to-transparent',
              iconColor: 'text-primary',
              borderColor: 'border-primary/20',
            },
            {
              label: 'Applied Today',
              value: stats?.appliedToday || 0,
              subtitle: `${stats?.totalApplied || 0} all time`,
              icon: TrendingUp,
              gradient: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
              iconColor: 'text-emerald-600',
              borderColor: 'border-emerald-500/20',
            },
            {
              label: 'Success Rate',
              value: `${successRate}%`,
              subtitle: `${stats?.totalApplied || 0} of ${stats?.totalLogs || 0}`,
              icon: Target,
              gradient: 'from-blue-500/15 via-blue-500/5 to-transparent',
              iconColor: 'text-blue-600',
              borderColor: 'border-blue-500/20',
            },
            {
              label: 'Failed / Skipped',
              value: stats?.totalFailed || 0,
              subtitle: `${stats?.totalSkipped || 0} skipped`,
              icon: AlertTriangle,
              gradient: 'from-amber-500/15 via-amber-500/5 to-transparent',
              iconColor: 'text-amber-600',
              borderColor: 'border-amber-500/20',
            },
          ].map((card, i) => (
            <MotionCard
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
              className={`border ${card.borderColor} overflow-hidden`}
            >
              <CardContent className="p-4 relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
                <div className="relative flex items-start justify-between">
                  <div>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16 mb-1" />
                    ) : (
                      <p className={`text-2xl font-bold ${card.iconColor}`}>{card.value}</p>
                    )}
                    <p className="text-xs font-medium text-foreground mt-0.5">{card.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{card.subtitle}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg bg-background/80 flex items-center justify-center border border-border/50`}>
                    <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </MotionCard>
          ))}
        </div>

        <Tabs defaultValue="activity">
          <TabsList className="w-full grid grid-cols-3 h-10">
            <TabsTrigger value="activity" className="gap-1.5 text-xs"><Activity className="w-3.5 h-3.5" /> Activity Log</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs"><Users className="w-3.5 h-3.5" /> Users ({preferences?.length || 0})</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs"><Settings className="w-3.5 h-3.5" /> Platform Limits</TabsTrigger>
          </TabsList>

          {/* Activity Log Tab */}
          <TabsContent value="activity" className="space-y-4 mt-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="applied">✅ Applied</SelectItem>
                  <SelectItem value="skipped">⏭️ Skipped</SelectItem>
                  <SelectItem value="failed">❌ Failed</SelectItem>
                  <SelectItem value="undone">↩️ Undone</SelectItem>
                </SelectContent>
              </Select>
              {statusFilter !== 'all' && (
                <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setPage(0); }} className="text-xs h-8">
                  Clear filter
                </Button>
              )}
              <div className="ml-auto text-xs text-muted-foreground">
                {stats?.totalLogs || 0} total entries
              </div>
            </div>

            <Card className="border-border/40">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px]">Candidate</TableHead>
                      <TableHead className="text-[11px]">Job → Company</TableHead>
                      <TableHead className="text-[11px]">Match</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                      <TableHead className="text-[11px]">Reason</TableHead>
                      <TableHead className="text-[11px] text-right">When</TableHead>
                      <TableHead className="text-[11px] w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : recentLogs?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Activity className="h-8 w-8 opacity-30" />
                            <p className="text-sm font-medium">No auto-apply logs yet</p>
                            <p className="text-xs">Activity will appear here when candidates use auto-apply</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentLogs?.map((log: any) => (
                        <TableRow key={log.id} className="group cursor-pointer" onClick={() => setSelectedLog(log)}>
                          <TableCell className="font-medium text-sm">{log.candidates?.profiles?.full_name || '—'}</TableCell>
                          <TableCell>
                            <div className="text-sm">{log.jobs?.title || '—'}</div>
                            <div className="text-[10px] text-muted-foreground">{log.jobs?.employers?.company_name || ''}</div>
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm font-semibold ${getMatchColor(log.match_score)}`}>{log.match_score}%</span>
                          </TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell className="text-[11px] text-muted-foreground max-w-[180px] truncate">{log.skip_reason || '—'}</TableCell>
                          <TableCell className="text-[11px] text-muted-foreground text-right whitespace-nowrap">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Eye className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between p-3 border-t border-border/40">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-8 text-xs">
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                </Button>
                <span className="text-[11px] text-muted-foreground">Page {page + 1}</span>
                <Button variant="outline" size="sm" disabled={(recentLogs?.length || 0) < pageSize} onClick={() => setPage(p => p + 1)} className="h-8 text-xs">
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name or job title..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {preferences?.filter((p: any) => p.is_enabled).length || 0} active
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  {preferences?.filter((p: any) => !p.is_enabled).length || 0} disabled
                </Badge>
              </div>
            </div>

            <Card className="border-border/40">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px]">Candidate</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                      <TableHead className="text-[11px]">Threshold</TableHead>
                      <TableHead className="text-[11px]">Daily Limit</TableHead>
                      <TableHead className="text-[11px]">Preferences</TableHead>
                      <TableHead className="text-[11px] text-right">Updated</TableHead>
                      <TableHead className="text-[11px] w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prefsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : preferences?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Users className="h-8 w-8 opacity-30" />
                            <p className="text-sm font-medium">No candidates using auto-apply</p>
                            <p className="text-xs">Users will appear here once they enable this feature</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      preferences?.map((pref: any) => (
                        <TableRow key={pref.id} className="group cursor-pointer" onClick={() => setSelectedUser(pref)}>
                          <TableCell>
                            <div className="font-medium text-sm">{pref.candidates?.profiles?.full_name || '—'}</div>
                            <div className="text-[10px] text-muted-foreground">{pref.candidates?.job_title || ''}</div>
                          </TableCell>
                          <TableCell>
                            {pref.is_enabled 
                              ? <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Active</Badge>
                              : <Badge variant="secondary" className="text-[10px] gap-1"><Ban className="h-2.5 w-2.5" />Disabled</Badge>
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-12">
                                <Progress value={pref.match_threshold} className="h-1.5" />
                              </div>
                              <span className="text-xs font-medium">{pref.match_threshold}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{pref.daily_limit}</span>
                            <span className="text-[10px] text-muted-foreground">/day</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {pref.remote_only && <Badge variant="outline" className="text-[9px] px-1.5 py-0">Remote</Badge>}
                              {pref.generate_cover_letter && <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5"><FileText className="h-2 w-2" />AI CL</Badge>}
                              {pref.preferred_titles?.length > 0 && <Badge variant="outline" className="text-[9px] px-1.5 py-0">{pref.preferred_titles.length} titles</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground text-right whitespace-nowrap">
                            {formatDistanceToNow(new Date(pref.updated_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Eye className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Platform Limits Tab */}
          <TabsContent value="settings" className="space-y-6 mt-4">
            <div className="grid gap-5 md:grid-cols-2">
              {/* Feature Toggle */}
              <MotionCard
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`border ${settings.feature_enabled ? 'border-emerald-500/20' : 'border-destructive/20'} overflow-hidden`}
              >
                <CardContent className="p-5 relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${settings.feature_enabled ? 'from-emerald-500/5' : 'from-destructive/5'} to-transparent pointer-events-none`} />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${settings.feature_enabled ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-destructive/10 border-destructive/20'}`}>
                        <ToggleLeft className={`w-5 h-5 ${settings.feature_enabled ? 'text-emerald-600' : 'text-destructive'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Auto Apply Feature</p>
                        <p className="text-[11px] text-muted-foreground">Enable or disable platform-wide</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.feature_enabled}
                      onCheckedChange={v => setLocalSettings({ ...settings, feature_enabled: v })}
                    />
                  </div>
                </CardContent>
              </MotionCard>

              {/* Max Daily Limit */}
              <MotionCard
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.3 }}
                className="border-border/40"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Gauge className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Max Daily Limit</p>
                      <p className="text-[11px] text-muted-foreground">Maximum daily applications per candidate</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground w-4">1</span>
                    <Slider
                      value={[settings.max_daily_limit]}
                      onValueChange={([v]) => setLocalSettings({ ...settings, max_daily_limit: v })}
                      min={1} max={25} step={1}
                      className="flex-1"
                    />
                    <span className="text-[10px] text-muted-foreground w-4">25</span>
                  </div>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-primary">{settings.max_daily_limit}</span>
                    <span className="text-sm text-muted-foreground ml-1">/ day</span>
                  </div>
                </CardContent>
              </MotionCard>

              {/* Threshold Range */}
              <MotionCard
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.3 }}
                className="border-border/40 md:col-span-2"
              >
                <CardContent className="p-5 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                      <Target className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Match Threshold Range</p>
                      <p className="text-[11px] text-muted-foreground">Allowed match score range candidates can configure</p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Minimum Threshold</Label>
                        <Badge variant="outline" className="text-xs font-semibold">{settings.min_threshold}%</Badge>
                      </div>
                      <Slider
                        value={[settings.min_threshold]}
                        onValueChange={([v]) => setLocalSettings({ ...settings, min_threshold: v })}
                        min={30} max={80} step={5}
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>30%</span><span>80%</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Maximum Threshold</Label>
                        <Badge variant="outline" className="text-xs font-semibold">{settings.max_threshold}%</Badge>
                      </div>
                      <Slider
                        value={[settings.max_threshold]}
                        onValueChange={([v]) => setLocalSettings({ ...settings, max_threshold: v })}
                        min={60} max={100} step={5}
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>60%</span><span>100%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </MotionCard>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => savePlatformSettings.mutate(localSettings || settings)}
                disabled={savePlatformSettings.isPending || !localSettings}
                className="gap-2"
              >
                {savePlatformSettings.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Platform Settings
              </Button>
              {localSettings && (
                <Button variant="ghost" size="sm" onClick={() => setLocalSettings(null)} className="text-xs">
                  Reset Changes
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Auto-Apply Log Detail</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Candidate</p>
                  <p className="text-sm font-medium">{selectedLog.candidates?.profiles?.full_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                  <div className="mt-0.5">{getStatusBadge(selectedLog.status)}</div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Job</p>
                  <p className="text-sm">{selectedLog.jobs?.title || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Company</p>
                  <p className="text-sm">{selectedLog.jobs?.employers?.company_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Match Score</p>
                  <p className={`text-lg font-bold ${getMatchColor(selectedLog.match_score)}`}>{selectedLog.match_score}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Date</p>
                  <p className="text-sm">{format(new Date(selectedLog.created_at), 'MMM d, yyyy HH:mm')}</p>
                </div>
              </div>
              {selectedLog.skip_reason && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Skip / Fail Reason</p>
                  <p className="text-xs">{selectedLog.skip_reason}</p>
                </div>
              )}
              {selectedLog.cover_letter && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">AI Cover Letter</p>
                  <p className="text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">{selectedLog.cover_letter}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Auto-Apply Preferences</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{selectedUser.candidates?.profiles?.full_name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.candidates?.job_title || ''}</p>
                </div>
                <div className="ml-auto">
                  {selectedUser.is_enabled
                    ? <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Active</Badge>
                    : <Badge variant="secondary" className="text-[10px]">Disabled</Badge>
                  }
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-lg font-bold text-primary">{selectedUser.match_threshold}%</p>
                  <p className="text-[10px] text-muted-foreground">Match Threshold</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-lg font-bold text-primary">{selectedUser.daily_limit}</p>
                  <p className="text-[10px] text-muted-foreground">Daily Limit</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Remote only</span>
                  <span className="font-medium">{selectedUser.remote_only ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">AI cover letter</span>
                  <span className="font-medium">{selectedUser.generate_cover_letter ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Min salary</span>
                  <span className="font-medium">{selectedUser.min_salary || 'Any'} {selectedUser.salary_currency}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Location radius</span>
                  <span className="font-medium">{selectedUser.location_radius || 'Any'}</span>
                </div>
                {selectedUser.preferred_titles?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 mt-2">Preferred Titles</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedUser.preferred_titles.map((t: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedUser.excluded_companies?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 mt-2">Excluded Companies</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedUser.excluded_companies.map((c: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground text-right">
                Updated {formatDistanceToNow(new Date(selectedUser.updated_at), { addSuffix: true })}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
