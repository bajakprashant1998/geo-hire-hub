import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Briefcase, Eye, Users, TrendingUp, TrendingDown, Trophy, Target,
  ArrowUpRight, ArrowDownRight, Clock, Calendar, Filter, BarChart3,
  PieChart as PieChartIcon, Zap, CheckCircle2, XCircle, Hourglass,
  Sparkles, Info, RefreshCw, Lightbulb, Award, Gauge, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface JobAnalyticsDashboardProps {
  employerId: string;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))',
  'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))',
];

const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  fontSize: '12px',
  padding: '8px 12px',
  boxShadow: '0 4px 12px hsl(var(--foreground) / 0.08)',
};

export const JobAnalyticsDashboard = ({ employerId }: JobAnalyticsDashboardProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [showInsights, setShowInsights] = useState(true);

  const { data: jobStats, isLoading, refetch } = useQuery({
    queryKey: ['employer-job-analytics', employerId],
    queryFn: async () => {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('id, title, view_count, is_active, status, created_at, expires_at, category')
        .eq('employer_id', employerId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const jobIds = (jobs || []).map(j => j.id);

      // Batch all queries instead of N+1
      const [{ data: allApps }, { data: allInterviews }] = jobIds.length > 0
        ? await Promise.all([
            supabase.from('applications').select('job_id, status').in('job_id', jobIds),
            supabase.from('interviews').select('job_id').in('job_id', jobIds),
          ])
        : [{ data: [] }, { data: [] }];

      // Group by job_id client-side
      const appsByJob = new Map<string, { count: number; statuses: Record<string, number> }>();
      const interviewsByJob = new Map<string, number>();

      (allApps || []).forEach(a => {
        const entry = appsByJob.get(a.job_id) || { count: 0, statuses: { pending: 0, reviewed: 0, shortlisted: 0, rejected: 0, hired: 0 } };
        entry.count++;
        const s = (a.status || 'pending').toLowerCase();
        if (s in entry.statuses) entry.statuses[s]++;
        appsByJob.set(a.job_id, entry);
      });

      (allInterviews || []).forEach(i => {
        interviewsByJob.set(i.job_id, (interviewsByJob.get(i.job_id) || 0) + 1);
      });

      const jobsWithApps = (jobs || []).map(job => {
        const appData = appsByJob.get(job.id) || { count: 0, statuses: { pending: 0, reviewed: 0, shortlisted: 0, rejected: 0, hired: 0 } };
        return {
          id: job.id,
          name: job.title.length > 18 ? job.title.slice(0, 18) + '…' : job.title,
          fullTitle: job.title,
          views: job.view_count || 0,
          applications: appData.count,
          interviews: interviewsByJob.get(job.id) || 0,
          active: job.is_active && job.status === 'open',
          created_at: job.created_at,
          category: job.category || 'Uncategorized',
          expires_at: job.expires_at,
          pending: appData.statuses.pending,
          reviewed: appData.statuses.reviewed,
          shortlisted: appData.statuses.shortlisted,
          rejected: appData.statuses.rejected,
          hired: appData.statuses.hired,
        };
      });

      return jobsWithApps;
    },
  });

  // Views trend from job_views table (real tracking data)
  const { data: viewsTrend } = useQuery({
    queryKey: ['employer-views-trend', employerId],
    queryFn: async () => {
      const jobIds = jobStats?.map(j => j.id) || [];
      if (!jobIds.length) return [];
      const { data } = await supabase
        .from('job_views')
        .select('viewed_at, job_id')
        .in('job_id', jobIds)
        .order('viewed_at', { ascending: true });
      if (!data) return [];
      const grouped = new Map<string, number>();
      data.forEach(v => {
        const day = new Date(v.viewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        grouped.set(day, (grouped.get(day) || 0) + 1);
      });
      return Array.from(grouped.entries()).slice(-14).map(([date, count]) => ({ date, views: count }));
    },
    enabled: !!jobStats?.length,
  });

  const { data: applicationTrend } = useQuery({
    queryKey: ['employer-app-trend', employerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('applications')
        .select('created_at, status, jobs!inner(employer_id)')
        .eq('jobs.employer_id', employerId)
        .order('created_at', { ascending: true });

      if (!data) return [];

      const grouped = new Map<string, number>();
      data.forEach(app => {
        const day = new Date(app.created_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        grouped.set(day, (grouped.get(day) || 0) + 1);
      });

      return Array.from(grouped.entries()).slice(-14).map(([date, count]) => ({ date, applications: count }));
    },
  });

  const totalViews = jobStats?.reduce((s, j) => s + j.views, 0) || 0;
  const totalApps = jobStats?.reduce((s, j) => s + j.applications, 0) || 0;
  const totalInterviews = jobStats?.reduce((s, j) => s + j.interviews, 0) || 0;
  const totalHired = jobStats?.reduce((s, j) => s + j.hired, 0) || 0;
  const conversionRate = totalViews > 0 ? ((totalApps / totalViews) * 100).toFixed(1) : '0';
  const activeJobs = jobStats?.filter(j => j.active).length || 0;
  const interviewRate = totalApps > 0 ? ((totalInterviews / totalApps) * 100).toFixed(1) : '0';

  const hiringFunnel = useMemo(() => {
    const stages = [
      { label: 'Views', value: totalViews, icon: Eye, color: 'hsl(var(--primary))' },
      { label: 'Applied', value: totalApps, icon: Users, color: 'hsl(var(--chart-2, 160 60% 45%))' },
      { label: 'Interviews', value: totalInterviews, icon: Calendar, color: 'hsl(var(--chart-3, 30 80% 55%))' },
      { label: 'Hired', value: totalHired, icon: CheckCircle2, color: 'hsl(var(--chart-4, 280 65% 60%))' },
    ];
    return stages.map((stage, i) => ({
      ...stage,
      conversionFromPrev: i === 0 ? null : stages[i - 1].value > 0
        ? ((stage.value / stages[i - 1].value) * 100).toFixed(1)
        : '0',
      overallConversion: i === 0 ? null : totalViews > 0
        ? ((stage.value / totalViews) * 100).toFixed(1)
        : '0',
    }));
  }, [totalViews, totalApps, totalInterviews, totalHired]);

  const topJob = useMemo(() => {
    if (!jobStats?.length) return null;
    return jobStats.reduce((best, job) =>
      job.applications > (best?.applications || 0) ? job : best, jobStats[0]);
  }, [jobStats]);

  const funnelData = useMemo(() => {
    if (!jobStats) return [];
    const totals = jobStats.reduce((acc, j) => ({
      pending: acc.pending + j.pending,
      reviewed: acc.reviewed + j.reviewed,
      shortlisted: acc.shortlisted + j.shortlisted,
      hired: acc.hired + j.hired,
      rejected: acc.rejected + j.rejected,
    }), { pending: 0, reviewed: 0, shortlisted: 0, hired: 0, rejected: 0 });

    return [
      { name: 'Pending', value: totals.pending, color: 'hsl(var(--chart-3, 30 80% 55%))' },
      { name: 'Reviewed', value: totals.reviewed, color: 'hsl(var(--primary))' },
      { name: 'Shortlisted', value: totals.shortlisted, color: 'hsl(var(--chart-2, 160 60% 45%))' },
      { name: 'Hired', value: totals.hired, color: 'hsl(var(--chart-4, 280 65% 60%))' },
      { name: 'Rejected', value: totals.rejected, color: 'hsl(var(--destructive))' },
    ].filter(d => d.value > 0);
  }, [jobStats]);

  const categoryData = useMemo(() => {
    if (!jobStats) return [];
    const cats = new Map<string, { views: number; apps: number; count: number }>();
    jobStats.forEach(j => {
      const existing = cats.get(j.category) || { views: 0, apps: 0, count: 0 };
      cats.set(j.category, { views: existing.views + j.views, apps: existing.apps + j.applications, count: existing.count + 1 });
    });
    return Array.from(cats.entries()).map(([name, data]) => ({
      name: name.length > 15 ? name.slice(0, 15) + '…' : name,
      fullName: name,
      views: data.views,
      applications: data.apps,
      jobs: data.count,
      rate: data.views > 0 ? ((data.apps / data.views) * 100).toFixed(1) : '0',
    })).sort((a, b) => b.applications - a.applications).slice(0, 6);
  }, [jobStats]);

  const filteredStats = useMemo(() => {
    if (!jobStats || timeRange === 'all') return jobStats;
    const now = Date.now();
    const ranges: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const days = ranges[timeRange] || 999;
    return jobStats.filter(j => {
      const created = new Date(j.created_at!).getTime();
      return (now - created) / (1000 * 60 * 60 * 24) <= days;
    });
  }, [jobStats, timeRange]);

  // AI-style insights
  const insights = useMemo(() => {
    const tips: { icon: any; text: string; type: 'success' | 'warning' | 'info' }[] = [];
    if (totalViews > 0 && parseFloat(conversionRate) < 3) {
      tips.push({ icon: Lightbulb, text: 'Your view-to-apply rate is below 3%. Try improving job titles and descriptions.', type: 'warning' });
    }
    if (parseFloat(conversionRate) >= 5) {
      tips.push({ icon: Award, text: `Great conversion rate of ${conversionRate}%! Your jobs are attracting the right candidates.`, type: 'success' });
    }
    if (topJob && topJob.applications > 0 && topJob.shortlisted === 0) {
      tips.push({ icon: Info, text: `"${topJob.fullTitle}" has ${topJob.applications} applicants but none shortlisted. Review pending applications.`, type: 'info' });
    }
    if (activeJobs === 0 && (jobStats?.length || 0) > 0) {
      tips.push({ icon: Lightbulb, text: 'No active jobs right now. Reactivate or post new jobs to keep your pipeline flowing.', type: 'warning' });
    }
    if (totalHired > 0) {
      tips.push({ icon: Award, text: `You've hired ${totalHired} candidate${totalHired > 1 ? 's' : ''}. Keep the momentum going!`, type: 'success' });
    }
    return tips;
  }, [totalViews, conversionRate, topJob, activeJobs, totalHired, jobStats]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[280px] rounded-xl" />
          <Skeleton className="h-[280px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Analytics Dashboard</h3>
            <p className="text-xs text-muted-foreground">Track your hiring performance and job metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl h-9 text-xs" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Smart Insights Banner */}
      <AnimatePresence>
        {showInsights && insights.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Card className="rounded-xl border-primary/10 bg-gradient-to-r from-primary/[0.03] to-transparent overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Smart Insights</span>
                  </div>
                  <button onClick={() => setShowInsights(false)} className="text-[10px] text-muted-foreground hover:text-foreground">
                    Dismiss
                  </button>
                </div>
                <div className="space-y-1.5">
                  {insights.map((tip, i) => (
                    <div key={i} className={cn(
                      'flex items-start gap-2 p-2 rounded-lg text-xs',
                      tip.type === 'success' ? 'bg-success/5 text-success' :
                      tip.type === 'warning' ? 'bg-warning/5 text-warning' :
                      'bg-primary/5 text-primary'
                    )}>
                      <tip.icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="text-foreground/80">{tip.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Stats - 6 cards in a row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { title: 'Total Views', value: totalViews.toLocaleString(), icon: Eye, color: 'text-primary', bg: 'bg-primary/10' },
          { title: 'Applications', value: totalApps.toLocaleString(), icon: Users, color: 'text-chart-2', bg: 'bg-success/10' },
          { title: 'Interviews', value: totalInterviews.toLocaleString(), icon: Calendar, color: 'text-warning', bg: 'bg-warning/10' },
          { title: 'Hired', value: totalHired.toLocaleString(), icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
          { title: 'Conversion', value: `${conversionRate}%`, icon: TrendingUp, color: parseFloat(conversionRate) >= 5 ? 'text-success' : 'text-warning', bg: parseFloat(conversionRate) >= 5 ? 'bg-success/10' : 'bg-warning/10' },
          { title: 'Active Jobs', value: activeJobs.toString(), icon: Briefcase, color: 'text-primary', bg: 'bg-primary/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className="rounded-xl border-border/50 hover:shadow-md transition-shadow h-full">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', stat.bg)}>
                    <stat.icon className={cn('w-4 h-4', stat.color)} />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">{stat.title}</p>
                <p className="text-xl font-bold text-foreground tabular-nums mt-0.5">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Hiring Funnel */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="rounded-xl border-border/50 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Filter className="h-4 w-4 text-primary" />
                  </div>
                  Hiring Funnel
                </CardTitle>
                <CardDescription className="text-xs mt-1">Conversion across every stage of your pipeline</CardDescription>
              </div>
              {totalApps > 0 && (
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-muted-foreground">Overall Conversion</p>
                  <p className={cn('text-lg font-bold tabular-nums', parseFloat(conversionRate) >= 5 ? 'text-success' : 'text-foreground')}>
                    {conversionRate}%
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {totalViews > 0 || totalApps > 0 ? (
              <div className="space-y-1">
                {hiringFunnel.map((stage, i) => {
                  const maxVal = hiringFunnel[0].value || 1;
                  const widthPercent = Math.max(8, (stage.value / maxVal) * 100);
                  const convNum = stage.conversionFromPrev ? parseFloat(stage.conversionFromPrev) : null;
                  return (
                    <div key={stage.label}>
                      {stage.conversionFromPrev !== null && (
                        <div className="flex items-center justify-center py-1">
                          <div className={cn(
                            'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full',
                            convNum && convNum >= 20 ? 'bg-success/10' : convNum && convNum >= 10 ? 'bg-muted/60' : 'bg-warning/10'
                          )}>
                            {convNum && convNum >= 20 ? (
                              <ArrowUpRight className="w-3 h-3 text-success rotate-90" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3 text-warning rotate-90" />
                            )}
                            <span className={cn(
                              'text-[10px] font-bold tabular-nums',
                              convNum && convNum >= 20 ? 'text-success' : 'text-foreground'
                            )}>
                              {stage.conversionFromPrev}%
                            </span>
                            <span className="text-[10px] text-muted-foreground">conversion</span>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 w-24 sm:w-28 shrink-0">
                          <stage.icon className="w-4 h-4 shrink-0" style={{ color: stage.color }} />
                          <span className="text-xs font-medium text-foreground">{stage.label}</span>
                        </div>
                        <div className="flex-1 relative h-10 flex items-center">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${widthPercent}%` }}
                            transition={{ delay: 0.2 + i * 0.12, duration: 0.6, ease: 'easeOut' }}
                            className="h-full rounded-xl flex items-center justify-end px-3"
                            style={{
                              background: `linear-gradient(90deg, ${stage.color}15, ${stage.color}40)`,
                              border: `1px solid ${stage.color}30`,
                            }}
                          >
                            <span className="text-xs font-bold text-foreground tabular-nums whitespace-nowrap">
                              {stage.value.toLocaleString()}
                            </span>
                          </motion.div>
                        </div>
                        {stage.overallConversion !== null && (
                          <span className="text-[10px] text-muted-foreground w-14 text-right tabular-nums shrink-0">
                            {stage.overallConversion}% total
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Filter className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium mb-1">No data yet</p>
                <p className="text-xs">Post jobs and get views to see your hiring funnel</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Views Trend Chart */}
      {viewsTrend && viewsTrend.length > 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Card className="rounded-xl border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Eye className="h-4 w-4 text-primary" />
                    </div>
                    Views Trend
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">Daily job views over the last 14 days</CardDescription>
                </div>
                {viewsTrend.length > 0 && (
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-muted-foreground">Peak Day</p>
                    <p className="text-sm font-bold text-foreground">
                      {Math.max(...viewsTrend.map(d => d.views))} views
                    </p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={viewsTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-3, 30 80% 55%))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--chart-3, 30 80% 55%))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="date" className="text-[10px] fill-muted-foreground" tick={{ fontSize: 10 }} />
                  <YAxis className="text-[10px] fill-muted-foreground" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <RechartsTooltip contentStyle={chartTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="hsl(var(--chart-3, 30 80% 55%))"
                    fill="url(#viewsGradient)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: 'hsl(var(--chart-3, 30 80% 55%))', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: 'hsl(var(--chart-3, 30 80% 55%))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Application Trend Chart */}
      {applicationTrend && applicationTrend.length > 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="rounded-xl border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    Application Trend
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">Daily applications over the last 14 days</CardDescription>
                </div>
                {applicationTrend.length > 0 && (
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-muted-foreground">Peak Day</p>
                    <p className="text-sm font-bold text-foreground">
                      {Math.max(...applicationTrend.map(d => d.applications))} apps
                    </p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={applicationTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="appGradientEnhanced" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis dataKey="date" className="text-[10px] fill-muted-foreground" tick={{ fontSize: 10 }} />
                  <YAxis className="text-[10px] fill-muted-foreground" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <RechartsTooltip contentStyle={chartTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="applications"
                    stroke="hsl(var(--primary))"
                    fill="url(#appGradientEnhanced)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Two columns: Top Performer + Pipeline Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Performing Job */}
        {topJob && topJob.applications > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="rounded-xl border-border/50 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-warning" />
                  </div>
                  Top Performing Job
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground text-sm leading-tight">{topJob.fullTitle}</h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="secondary" className="text-[10px]">{topJob.category}</Badge>
                    {topJob.active && (
                      <Badge className="text-[10px] bg-success/10 text-success border-success/20">Active</Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Views', value: topJob.views, icon: Eye },
                    { label: 'Applied', value: topJob.applications, icon: Users },
                    { label: 'Conv. Rate', value: `${topJob.views > 0 ? ((topJob.applications / topJob.views) * 100).toFixed(0) : 0}%`, icon: TrendingUp },
                  ].map(m => (
                    <div key={m.label} className="text-center p-2.5 rounded-xl bg-muted/30 border border-border/30">
                      <m.icon className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-bold text-foreground tabular-nums">{m.value}</p>
                      <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pipeline</p>
                  {[
                    { label: 'Pending', value: topJob.pending, icon: Hourglass, color: 'bg-warning' },
                    { label: 'Shortlisted', value: topJob.shortlisted, icon: CheckCircle2, color: 'bg-primary' },
                    { label: 'Hired', value: topJob.hired, icon: Zap, color: 'bg-success' },
                  ].map(stage => (
                    <div key={stage.label} className="flex items-center gap-2">
                      <stage.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground w-20">{stage.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${topJob.applications > 0 ? (stage.value / topJob.applications) * 100 : 0}%` }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                          className={cn('h-full rounded-full', stage.color)}
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground w-6 text-right tabular-nums">{stage.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Application Pipeline Donut */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="rounded-xl border-border/50 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                Application Pipeline
              </CardTitle>
              <CardDescription className="text-xs mt-1">Status breakdown across all jobs</CardDescription>
            </CardHeader>
            <CardContent>
              {funnelData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <ResponsiveContainer width={220} height={200}>
                      <PieChart>
                        <Pie
                          data={funnelData}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {funnelData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={chartTooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-xl font-bold text-foreground tabular-nums">{totalApps}</p>
                        <p className="text-[10px] text-muted-foreground">Total</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
                    {funnelData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-bold text-foreground tabular-nums">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Target className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium mb-1">No applications yet</p>
                  <p className="text-xs">Applications will appear here as candidates apply</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Job Performance Bar Chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="rounded-xl border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                  Job Performance
                </CardTitle>
                <CardDescription className="text-xs mt-1">Views vs applications per job</CardDescription>
              </div>
              <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/40">
                {(['7d', '30d', '90d', 'all'] as TimeRange[]).map(range => (
                  <button
                    key={range}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-medium rounded-md transition-all',
                      timeRange === range ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setTimeRange(range)}
                  >
                    {range === 'all' ? 'All' : range}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStats && filteredStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredStats} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                  <XAxis
                    dataKey="name"
                    angle={-35}
                    textAnchor="end"
                    height={80}
                    className="text-[10px] fill-muted-foreground"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis className="text-[10px] fill-muted-foreground" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <RechartsTooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="applications" fill="hsl(var(--chart-2, 160 60% 45%))" name="Applications" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium mb-1">No job data for this period</p>
                <p className="text-xs">Try a different time range or post new jobs</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Breakdown */}
      {categoryData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="rounded-xl border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <PieChartIcon className="h-4 w-4 text-primary" />
                </div>
                Performance by Category
              </CardTitle>
              <CardDescription className="text-xs mt-1">Compare metrics across job categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryData.map((cat, i) => {
                  const maxViews = Math.max(...categoryData.map(c => c.views), 1);
                  return (
                    <motion.div
                      key={cat.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className="space-y-1.5 p-2.5 rounded-xl hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-xs sm:text-sm font-medium text-foreground">{cat.fullName}</span>
                          <Badge variant="secondary" className="text-[10px] h-4">{cat.jobs} job{cat.jobs > 1 ? 's' : ''}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-muted-foreground tabular-nums">{cat.views} views</span>
                          <span className="text-muted-foreground tabular-nums">{cat.applications} apps</span>
                          <Badge variant="outline" className={cn(
                            'text-[10px] tabular-nums',
                            parseFloat(cat.rate) >= 5 ? 'text-success border-success/20 bg-success/5' : 'text-muted-foreground'
                          )}>
                            {cat.rate}%
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(cat.views / maxViews) * 100}%` }}
                          transition={{ delay: 0.1 * i, duration: 0.5 }}
                          className="rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length], opacity: 0.35 }}
                        />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(cat.applications / maxViews) * 100}%` }}
                          transition={{ delay: 0.1 * i + 0.1, duration: 0.5 }}
                          className="rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
