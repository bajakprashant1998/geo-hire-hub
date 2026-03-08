import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Play, CheckCircle, XCircle, Clock, Activity, RefreshCw, Loader2,
  Zap, Calendar, AlertTriangle, Search, Timer, TrendingUp, ChevronRight,
  BarChart3, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface ScheduledJob {
  name: string;
  description: string;
  functionName: string;
  schedule: string;
  category: 'maintenance' | 'automation' | 'content' | 'security';
  lastRun?: { status: string; started_at: string; completed_at?: string; error_message?: string; result?: any };
}

const SCHEDULED_JOBS: Omit<ScheduledJob, 'lastRun'>[] = [
  { name: 'Message Cleanup', description: 'Delete messages older than 60 days and associated attachments', functionName: 'cleanup-old-messages', schedule: 'Daily at midnight', category: 'maintenance' },
  { name: 'Auto Apply Jobs', description: 'Run automated job applications for opted-in candidates', functionName: 'auto-apply-jobs', schedule: 'Every 6 hours', category: 'automation' },
  { name: 'Sitemap Generation', description: 'Regenerate XML sitemap with latest jobs and profiles', functionName: 'sitemap', schedule: 'Daily at 3 AM', category: 'content' },
  { name: 'Notification Emails', description: 'Process and send pending notification emails', functionName: 'send-notification-email', schedule: 'On trigger', category: 'automation' },
  { name: 'Re-verification Check', description: 'Flag employers due for re-verification', functionName: 'check-reverification', schedule: 'Daily at 6 AM', category: 'security' },
];

const CATEGORY_CONFIG = {
  maintenance: { icon: Timer, label: 'Maintenance', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  automation: { icon: Zap, label: 'Automation', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  content: { icon: BarChart3, label: 'Content', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  security: { icon: Shield, label: 'Security', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

export default function AdminScheduledJobs() {
  const queryClient = useQueryClient();
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error' | 'running'>('all');

  const { data: jobRuns, isLoading } = useQuery({
    queryKey: ['admin-scheduled-job-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_job_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const triggerJobMutation = useMutation({
    mutationFn: async (functionName: string) => {
      setRunningJob(functionName);
      const { data: runRecord } = await supabase
        .from('scheduled_job_runs')
        .insert({ job_name: functionName, status: 'running' })
        .select()
        .single();
      try {
        const { data, error } = await supabase.functions.invoke(functionName);
        if (runRecord) {
          await supabase.from('scheduled_job_runs').update({
            status: error ? 'error' : 'success',
            completed_at: new Date().toISOString(),
            error_message: error?.message || null,
            result: data || {},
          }).eq('id', runRecord.id);
        }
        if (error) throw error;
        return data;
      } catch (err: any) {
        if (runRecord) {
          await supabase.from('scheduled_job_runs').update({
            status: 'error',
            completed_at: new Date().toISOString(),
            error_message: err.message,
          }).eq('id', runRecord.id);
        }
        throw err;
      }
    },
    onSuccess: (_, functionName) => {
      queryClient.invalidateQueries({ queryKey: ['admin-scheduled-job-runs'] });
      toast.success(`${functionName} completed successfully`);
      setRunningJob(null);
    },
    onError: (error, functionName) => {
      queryClient.invalidateQueries({ queryKey: ['admin-scheduled-job-runs'] });
      toast.error(`${functionName} failed: ${error.message}`);
      setRunningJob(null);
    },
  });

  const jobsWithStatus: ScheduledJob[] = useMemo(() => SCHEDULED_JOBS.map(job => {
    const lastRun = jobRuns?.find(r => r.job_name === job.functionName);
    return {
      ...job,
      lastRun: lastRun ? {
        status: lastRun.status,
        started_at: lastRun.started_at,
        completed_at: lastRun.completed_at || undefined,
        error_message: lastRun.error_message || undefined,
        result: lastRun.result,
      } : undefined,
    };
  }), [jobRuns]);

  const successRuns = jobRuns?.filter(r => r.status === 'success').length || 0;
  const errorRuns = jobRuns?.filter(r => r.status === 'error').length || 0;
  const healthyJobs = jobsWithStatus.filter(j => j.lastRun?.status === 'success').length;
  const lastRunTime = jobRuns?.[0]?.started_at;

  const filteredRuns = useMemo(() => {
    let runs = jobRuns || [];
    if (searchQuery) runs = runs.filter(r => r.job_name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (statusFilter !== 'all') runs = runs.filter(r => r.status === statusFilter);
    return runs;
  }, [jobRuns, searchQuery, statusFilter]);

  // Compute avg duration for successful runs
  const avgDuration = useMemo(() => {
    const completed = jobRuns?.filter(r => r.status === 'success' && r.completed_at) || [];
    if (!completed.length) return '—';
    const totalMs = completed.reduce((sum, r) => sum + (new Date(r.completed_at!).getTime() - new Date(r.started_at).getTime()), 0);
    return (totalMs / completed.length / 1000).toFixed(1) + 's';
  }, [jobRuns]);

  const stats = [
    { title: 'Total Jobs', value: SCHEDULED_JOBS.length, icon: Activity, gradient: 'from-primary/10 to-primary/5', iconColor: 'text-primary' },
    { title: 'Healthy', value: `${healthyJobs}/${SCHEDULED_JOBS.length}`, icon: CheckCircle, gradient: 'from-emerald-500/10 to-emerald-500/5', iconColor: 'text-emerald-600' },
    { title: 'Failed Runs', value: errorRuns, icon: XCircle, gradient: errorRuns > 0 ? 'from-destructive/10 to-destructive/5' : 'from-muted/10 to-muted/5', iconColor: errorRuns > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { title: 'Avg Duration', value: avgDuration, icon: TrendingUp, gradient: 'from-blue-500/10 to-blue-500/5', iconColor: 'text-blue-600' },
  ];

  return (
    <AdminLayout title="Scheduled Jobs">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <motion.div key={stat.title} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <Card className={`bg-gradient-to-br ${stat.gradient} border-0 shadow-sm`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-background/80 ${stat.iconColor}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Alert Banner */}
      {errorRuns > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-sm text-foreground">{errorRuns} failed run{errorRuns > 1 ? 's' : ''} detected</p>
                <p className="text-xs text-muted-foreground">Review the history tab for error details and re-run affected jobs.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="jobs" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Jobs</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><Clock className="h-3.5 w-3.5" />History</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5"><Calendar className="h-3.5 w-3.5" />Schedule</TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {jobsWithStatus.map((job, i) => {
                const catConfig = CATEGORY_CONFIG[job.category];
                const CatIcon = catConfig.icon;
                const isRunning = runningJob === job.functionName;
                return (
                  <motion.div key={job.functionName} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                    <Card className="hover:shadow-md transition-shadow group">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-lg ${catConfig.color}`}>
                              <CatIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-sm font-semibold">{job.name}</CardTitle>
                              <Badge variant="outline" className={`mt-1 text-[10px] px-1.5 ${catConfig.color}`}>{catConfig.label}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {job.lastRun?.status === 'success' && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Healthy</Badge>}
                            {job.lastRun?.status === 'error' && <Badge variant="destructive" className="text-[10px]">Error</Badge>}
                            {!job.lastRun && <Badge variant="secondary" className="text-[10px]">No runs</Badge>}
                          </div>
                        </div>
                        <CardDescription className="text-xs mt-2">{job.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between border-t border-border/50 pt-3">
                          <div className="text-xs space-y-1 text-muted-foreground">
                            <p className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.schedule}</p>
                            {job.lastRun && (
                              <p>Last: {formatDistanceToNow(new Date(job.lastRun.started_at), { addSuffix: true })}</p>
                            )}
                            {job.lastRun?.error_message && (
                              <p className="text-destructive text-[11px] line-clamp-1">{job.lastRun.error_message}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant={job.lastRun?.status === 'error' ? 'destructive' : 'outline'}
                            onClick={() => triggerJobMutation.mutate(job.functionName)}
                            disabled={isRunning}
                            className="gap-1 text-xs"
                          >
                            {isRunning ? (
                              <><Loader2 className="h-3 w-3 animate-spin" />Running</>
                            ) : (
                              <><Play className="h-3 w-3" />{job.lastRun?.status === 'error' ? 'Retry' : 'Run'}</>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
              <CardTitle className="text-base">Run History</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter by job name..."
                    className="pl-8 h-9 w-48 text-xs"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-1">
                  {(['all', 'success', 'error', 'running'] as const).map(s => (
                    <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'ghost'} className="h-8 text-xs capitalize" onClick={() => setStatusFilter(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="h-8" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-scheduled-job-runs'] })}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredRuns.map((run, i) => {
                        const duration = run.completed_at
                          ? ((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000).toFixed(1) + 's'
                          : '—';
                        return (
                          <motion.tr
                            key={run.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(i * 0.02, 0.5) }}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <TableCell className="font-medium text-sm">{run.job_name}</TableCell>
                            <TableCell>
                              {run.status === 'success' && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Success</Badge>}
                              {run.status === 'error' && <Badge variant="destructive" className="text-[10px]">Error</Badge>}
                              {run.status === 'running' && <Badge variant="secondary" className="text-[10px] gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" />Running</Badge>}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">{format(new Date(run.started_at), 'MMM d, HH:mm:ss')}</TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">{duration}</TableCell>
                            <TableCell className="text-destructive text-xs max-w-xs truncate">{run.error_message || '—'}</TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                    {filteredRuns.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                          <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No run history found</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schedule Overview</CardTitle>
              <CardDescription>Visual timeline of all scheduled jobs and their frequencies.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {SCHEDULED_JOBS.map((job, i) => {
                  const catConfig = CATEGORY_CONFIG[job.category];
                  const CatIcon = catConfig.icon;
                  const lastRun = jobRuns?.find(r => r.job_name === job.functionName);
                  const runCount = jobRuns?.filter(r => r.job_name === job.functionName).length || 0;
                  const successCount = jobRuns?.filter(r => r.job_name === job.functionName && r.status === 'success').length || 0;
                  const successRate = runCount > 0 ? Math.round((successCount / runCount) * 100) : 0;

                  return (
                    <motion.div
                      key={job.functionName}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover:border-border transition-colors"
                    >
                      <div className={`p-2.5 rounded-lg ${catConfig.color} shrink-0`}>
                        <CatIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{job.name}</p>
                          <Badge variant="outline" className="text-[10px]">{job.schedule}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{job.description}</p>
                      </div>
                      <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-sm font-semibold">{runCount} runs</p>
                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${successRate}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-8">{successRate}%</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Last Activity Footer */}
      {lastRunTime && (
        <p className="text-xs text-muted-foreground text-center mt-6">
          Last activity: {formatDistanceToNow(new Date(lastRunTime), { addSuffix: true })}
        </p>
      )}
    </AdminLayout>
  );
}
