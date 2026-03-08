import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Briefcase, Eye, Users, TrendingUp, TrendingDown, Trophy, Target,
  ArrowUpRight, Clock, Calendar, Filter, BarChart3, PieChart as PieChartIcon,
  Zap, CheckCircle2, XCircle, Hourglass
} from 'lucide-react';
import { motion } from 'framer-motion';
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

export const JobAnalyticsDashboard = ({ employerId }: JobAnalyticsDashboardProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  const { data: jobStats, isLoading } = useQuery({
    queryKey: ['employer-job-analytics', employerId],
    queryFn: async () => {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('id, title, view_count, is_active, status, created_at, expires_at, category')
        .eq('employer_id', employerId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const jobsWithApps = await Promise.all(
        (jobs || []).map(async (job) => {
          const [{ count: appCount }, { data: appStatuses }, { count: interviewCount }] = await Promise.all([
            supabase.from('applications').select('*', { count: 'exact', head: true }).eq('job_id', job.id),
            supabase.from('applications').select('status').eq('job_id', job.id),
            supabase.from('interviews').select('*', { count: 'exact', head: true }).eq('job_id', job.id),
          ]);

          const statusCounts = {
            pending: 0,
            reviewed: 0,
            shortlisted: 0,
            rejected: 0,
            hired: 0,
          };
          appStatuses?.forEach(a => {
            const s = (a.status || 'pending').toLowerCase();
            if (s in statusCounts) statusCounts[s as keyof typeof statusCounts]++;
          });

          return {
            id: job.id,
            name: job.title.length > 18 ? job.title.slice(0, 18) + '…' : job.title,
            fullTitle: job.title,
            views: job.view_count || 0,
            applications: appCount || 0,
            interviews: interviewCount || 0,
            active: job.is_active && job.status === 'open',
            created_at: job.created_at,
            category: job.category || 'Uncategorized',
            expires_at: job.expires_at,
            ...statusCounts,
          };
        })
      );

      return jobsWithApps;
    },
  });

  // Application status data
  const { data: applicationTrend } = useQuery({
    queryKey: ['employer-app-trend', employerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('applications')
        .select('created_at, status, jobs!inner(employer_id)')
        .eq('jobs.employer_id', employerId)
        .order('created_at', { ascending: true });

      if (!data) return [];

      // Group by day
      const grouped = new Map<string, number>();
      data.forEach(app => {
        const day = new Date(app.created_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        grouped.set(day, (grouped.get(day) || 0) + 1);
      });

      return Array.from(grouped.entries()).slice(-14).map(([date, count]) => ({
        date,
        applications: count,
      }));
    },
  });

  const totalViews = jobStats?.reduce((s, j) => s + j.views, 0) || 0;
  const totalApps = jobStats?.reduce((s, j) => s + j.applications, 0) || 0;
  const conversionRate = totalViews > 0 ? ((totalApps / totalViews) * 100).toFixed(1) : '0';
  const activeJobs = jobStats?.filter(j => j.active).length || 0;

  // Top performing job
  const topJob = useMemo(() => {
    if (!jobStats?.length) return null;
    return jobStats.reduce((best, job) =>
      job.applications > (best?.applications || 0) ? job : best
    , jobStats[0]);
  }, [jobStats]);

  // Application funnel
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

  // Category breakdown
  const categoryData = useMemo(() => {
    if (!jobStats) return [];
    const cats = new Map<string, { views: number; apps: number; count: number }>();
    jobStats.forEach(j => {
      const existing = cats.get(j.category) || { views: 0, apps: 0, count: 0 };
      cats.set(j.category, {
        views: existing.views + j.views,
        apps: existing.apps + j.applications,
        count: existing.count + 1,
      });
    });
    return Array.from(cats.entries()).map(([name, data]) => ({
      name: name.length > 15 ? name.slice(0, 15) + '…' : name,
      views: data.views,
      applications: data.apps,
      jobs: data.count,
    })).slice(0, 6);
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-[350px] rounded-xl" />
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, trend, suffix = '', variant = 'default' }: {
    title: string; value: number | string; icon: any; trend?: number; suffix?: string;
    variant?: 'default' | 'success' | 'warning';
  }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-border hover:shadow-md transition-shadow">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between mb-2">
            <div className={cn(
              "p-2 rounded-xl",
              variant === 'success' ? 'bg-accent/50' : variant === 'warning' ? 'bg-destructive/10' : 'bg-primary/10'
            )}>
              <Icon className={cn(
                "h-4 w-4 sm:h-5 sm:w-5",
                variant === 'success' ? 'text-primary' : variant === 'warning' ? 'text-destructive' : 'text-primary'
              )} />
            </div>
            {trend !== undefined && (
              <div className={cn(
                "flex items-center gap-0.5 text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full",
                trend >= 0 ? 'bg-accent/50 text-primary' : 'bg-destructive/10 text-destructive'
              )}>
                {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(trend)}%
              </div>
            )}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{title}</p>
          <p className="text-lg sm:text-2xl font-bold text-foreground tabular-nums">{value}{suffix}</p>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <StatCard title="Total Views" value={totalViews.toLocaleString()} icon={Eye} />
        <StatCard title="Applications" value={totalApps} icon={Users} variant="success" />
        <StatCard title="Conversion Rate" value={conversionRate} icon={TrendingUp} suffix="%" />
        <StatCard title="Active Jobs" value={activeJobs} icon={Briefcase} />
      </div>

      {/* Top Performer + Application Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Performing Job */}
        {topJob && topJob.applications > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border border-border h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10">
                    <Trophy className="h-4 w-4 text-amber-500" />
                  </div>
                  Top Performing Job
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground text-sm sm:text-base">{topJob.fullTitle}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{topJob.category}</Badge>
                    {topJob.active && <Badge className="text-[10px] bg-accent/50 text-primary hover:bg-accent/60">Active</Badge>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-foreground">{topJob.views}</p>
                    <p className="text-[10px] text-muted-foreground">Views</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-foreground">{topJob.applications}</p>
                    <p className="text-[10px] text-muted-foreground">Applied</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-foreground">
                      {topJob.views > 0 ? ((topJob.applications / topJob.views) * 100).toFixed(0) : 0}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">Rate</p>
                  </div>
                </div>
                {/* Mini funnel for top job */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Application Pipeline</p>
                  {[
                    { label: 'Pending', value: topJob.pending, icon: Hourglass, color: 'bg-amber-500' },
                    { label: 'Shortlisted', value: topJob.shortlisted, icon: CheckCircle2, color: 'bg-primary' },
                    { label: 'Hired', value: topJob.hired, icon: Zap, color: 'bg-accent' },
                  ].map(stage => (
                    <div key={stage.label} className="flex items-center gap-2">
                      <stage.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground w-20">{stage.label}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", stage.color)}
                          style={{ width: `${topJob.applications > 0 ? (stage.value / topJob.applications) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground w-6 text-right">{stage.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Application Funnel */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border border-border h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                Application Pipeline
              </CardTitle>
              <CardDescription className="text-xs">Status breakdown across all jobs</CardDescription>
            </CardHeader>
            <CardContent>
              {funnelData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={funnelData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {funnelData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
                    {funnelData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-semibold text-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No applications yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Application Trend */}
      {applicationTrend && applicationTrend.length > 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                Application Trend
              </CardTitle>
              <CardDescription className="text-xs">Daily applications over the last 14 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={applicationTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="appGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-[10px] fill-muted-foreground" tick={{ fontSize: 10 }} />
                  <YAxis className="text-[10px] fill-muted-foreground" tick={{ fontSize: 10 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="applications"
                    stroke="hsl(var(--primary))"
                    fill="url(#appGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Job Performance Chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="border border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
                Job Performance
              </CardTitle>
              <div className="flex gap-1">
                {(['7d', '30d', '90d', 'all'] as TimeRange[]).map(range => (
                  <Button
                    key={range}
                    variant={timeRange === range ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2 text-xs rounded-lg"
                    onClick={() => setTimeRange(range)}
                  >
                    {range === 'all' ? 'All' : range}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStats && filteredStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredStats} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    angle={-35}
                    textAnchor="end"
                    height={80}
                    className="text-[10px] fill-muted-foreground"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis className="text-[10px] fill-muted-foreground" tick={{ fontSize: 10 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="applications" fill="hsl(var(--chart-2, 160 60% 45%))" name="Applications" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">No job data for this period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Breakdown */}
      {categoryData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <PieChartIcon className="h-4 w-4 text-primary" />
                </div>
                Performance by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryData.map((cat, i) => {
                  const maxViews = Math.max(...categoryData.map(c => c.views), 1);
                  return (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-xs sm:text-sm font-medium text-foreground">{cat.name}</span>
                          <Badge variant="secondary" className="text-[10px] h-4">{cat.jobs} jobs</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{cat.views} views</span>
                          <span>{cat.applications} apps</span>
                        </div>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div
                          className="rounded-full transition-all"
                          style={{
                            width: `${(cat.views / maxViews) * 100}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                            opacity: 0.7,
                          }}
                        />
                        <div
                          className="rounded-full transition-all"
                          style={{
                            width: `${(cat.applications / maxViews) * 100}%`,
                            backgroundColor: COLORS[i % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
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
