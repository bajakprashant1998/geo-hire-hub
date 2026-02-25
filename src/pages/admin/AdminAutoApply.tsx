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
import { toast } from 'sonner';
import {
  Zap, Users, Activity, Shield, Settings, BarChart3,
  Loader2, Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminAutoApply() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Platform-wide stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-auto-apply-stats'],
    queryFn: async () => {
      const [
        { count: totalEnabled },
        { count: totalLogs },
        { count: appliedToday },
        { count: totalApplied },
        { count: totalSkipped },
        { count: totalFailed },
      ] = await Promise.all([
        supabase.from('auto_apply_preferences').select('*', { count: 'exact', head: true }).eq('is_enabled', true),
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

  const statCards = [
    { label: 'Active Users', value: stats?.totalEnabled || 0, icon: Users, color: 'text-primary' },
    { label: 'Applied Today', value: stats?.appliedToday || 0, icon: Activity, color: 'text-emerald-500' },
    { label: 'Total Applied', value: stats?.totalApplied || 0, icon: Zap, color: 'text-blue-500' },
    { label: 'Total Skipped', value: stats?.totalSkipped || 0, icon: Shield, color: 'text-amber-500' },
    { label: 'Failed', value: stats?.totalFailed || 0, icon: Shield, color: 'text-destructive' },
    { label: 'Total Logs', value: stats?.totalLogs || 0, icon: BarChart3, color: 'text-muted-foreground' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Applied</Badge>;
      case 'skipped': return <Badge variant="secondary">Skipped</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      case 'undone': return <Badge variant="outline">Undone</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout title="Auto Apply Management">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Auto Apply Management</h1>
            <p className="text-sm text-muted-foreground">Monitor and control auto-apply activity across the platform</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((s, i) => (
            <Card key={i} className="border-border/40">
              <CardContent className="p-4 text-center">
                {statsLoading ? (
                  <Skeleton className="h-8 w-12 mx-auto mb-1" />
                ) : (
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="activity">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="activity" className="gap-1.5"><Activity className="w-4 h-4" /> Activity Log</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="w-4 h-4" /> Users</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><Settings className="w-4 h-4" /> Platform Limits</TabsTrigger>
          </TabsList>

          {/* Activity Log Tab */}
          <TabsContent value="activity" className="space-y-4 mt-4">
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="undone">Undone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="border-border/40">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : recentLogs?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No auto-apply logs yet</TableCell>
                      </TableRow>
                    ) : (
                      recentLogs?.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium text-sm">{log.candidates?.profiles?.full_name || '—'}</TableCell>
                          <TableCell className="text-sm">{log.jobs?.title || '—'}</TableCell>
                          <TableCell className="text-sm">{log.jobs?.employers?.company_name || '—'}</TableCell>
                          <TableCell><Badge variant="outline">{log.match_score}%</Badge></TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.skip_reason || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'MMM d, HH:mm')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between p-3 border-t border-border/40">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <span className="text-xs text-muted-foreground">Page {page + 1}</span>
                <Button variant="outline" size="sm" disabled={(recentLogs?.length || 0) < pageSize} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search candidate..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>

            <Card className="border-border/40">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead>Daily Limit</TableHead>
                      <TableHead>Remote Only</TableHead>
                      <TableHead>AI Cover Letter</TableHead>
                      <TableHead>Updated</TableHead>
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
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No candidates using auto-apply</TableCell>
                      </TableRow>
                    ) : (
                      preferences?.map((pref: any) => (
                        <TableRow key={pref.id}>
                          <TableCell className="font-medium text-sm">{pref.candidates?.profiles?.full_name || '—'}</TableCell>
                          <TableCell>
                            {pref.is_enabled 
                              ? <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                              : <Badge variant="secondary">Disabled</Badge>
                            }
                          </TableCell>
                          <TableCell>{pref.match_threshold}%</TableCell>
                          <TableCell>{pref.daily_limit}</TableCell>
                          <TableCell>{pref.remote_only ? 'Yes' : 'No'}</TableCell>
                          <TableCell>{pref.generate_cover_letter ? 'Yes' : 'No'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{format(new Date(pref.updated_at), 'MMM d, HH:mm')}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Platform Limits Tab */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle className="text-base">Feature Toggle</CardTitle>
                  <CardDescription className="text-xs">Enable or disable auto-apply platform-wide</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Label>Auto Apply Feature</Label>
                    <Switch
                      checked={settings.feature_enabled}
                      onCheckedChange={v => setLocalSettings({ ...settings, feature_enabled: v })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle className="text-base">Max Daily Limit</CardTitle>
                  <CardDescription className="text-xs">Maximum daily applications any candidate can set</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">1</span>
                    <span className="text-2xl font-bold text-primary">{settings.max_daily_limit}</span>
                    <span className="text-sm text-muted-foreground">25</span>
                  </div>
                  <Slider
                    value={[settings.max_daily_limit]}
                    onValueChange={([v]) => setLocalSettings({ ...settings, max_daily_limit: v })}
                    min={1} max={25} step={1}
                  />
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle className="text-base">Threshold Range</CardTitle>
                  <CardDescription className="text-xs">Allowed match threshold range for candidates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm">Minimum Threshold: {settings.min_threshold}%</Label>
                    <Slider
                      value={[settings.min_threshold]}
                      onValueChange={([v]) => setLocalSettings({ ...settings, min_threshold: v })}
                      min={30} max={80} step={5}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Maximum Threshold: {settings.max_threshold}%</Label>
                    <Slider
                      value={[settings.max_threshold]}
                      onValueChange={([v]) => setLocalSettings({ ...settings, max_threshold: v })}
                      min={60} max={100} step={5}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button
              onClick={() => savePlatformSettings.mutate(localSettings || settings)}
              disabled={savePlatformSettings.isPending}
              className="gap-2"
            >
              {savePlatformSettings.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Platform Settings
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
