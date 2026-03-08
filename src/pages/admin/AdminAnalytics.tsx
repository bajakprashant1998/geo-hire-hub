import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RegistrationTrendChart, RevenueChart, JobCategoryChart,
  ApplicationFunnelChart, GeographicDistributionChart,
  JobPostingTrendChart, StatsTrendCard
} from '@/components/admin/AnalyticsCharts';
import { AdminDateRangeFilter } from '@/components/admin/AdminDateRangeFilter';
import { Users, Briefcase, Banknote, TrendingUp, Download, RefreshCw, BarChart3, Activity, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, subDays, startOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from 'date-fns';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }),
};

const KPICard = ({ title, value, change, icon: Icon, color, index }: {
  title: string; value: string | number; change?: number; icon: any; color: string; index: number;
}) => (
  <motion.div custom={index} variants={fadeUp} initial="hidden" animate="visible">
    <Card className="rounded-2xl border-border/30 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:border-border/50 transition-all duration-300 group overflow-hidden relative">
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-[0.03] group-hover:opacity-[0.06] transition-opacity`} />
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
          </div>
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color} shadow-sm`}>
            <Icon className="h-4.5 w-4.5 text-white" />
          </div>
        </div>
        {change !== undefined && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30">
            <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-semibold ${change >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'}`}>
              {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(change)}%
            </div>
            <span className="text-[11px] text-muted-foreground">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);

  const { data: registrationData, isLoading: regLoading, refetch: refetchReg } = useQuery({
    queryKey: ['admin-registration-trends'],
    queryFn: async () => {
      const days = eachDayOfInterval({ start: subDays(new Date(), 30), end: new Date() });
      const results = await Promise.all(days.map(async (day) => {
        const s = new Date(day); s.setHours(0,0,0,0);
        const e = new Date(day); e.setHours(23,59,59,999);
        const { count: candidates } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'candidate').gte('created_at', s.toISOString()).lte('created_at', e.toISOString());
        const { count: employers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'employer').gte('created_at', s.toISOString()).lte('created_at', e.toISOString());
        return { name: format(day, 'MMM d'), candidates: candidates || 0, employers: employers || 0, value: (candidates || 0) + (employers || 0) };
      }));
      return results;
    },
  });

  const { data: revenueData, isLoading: revLoading, refetch: refetchRev } = useQuery({
    queryKey: ['admin-revenue-trends'],
    queryFn: async () => {
      const months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
      const results = await Promise.all(months.map(async (month) => {
        const startDate = startOfMonth(month);
        const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        const { data } = await supabase.from('employer_subscriptions').select('plan:employer_plans!employer_subscriptions_plan_id_fkey(price_monthly)').eq('status', 'active').gte('current_period_start', startDate.toISOString()).lte('current_period_start', endDate.toISOString());
        const revenue = data?.reduce((sum, sub) => { const plan = sub.plan as { price_monthly: number } | null; return sum + (plan?.price_monthly || 0); }, 0) || 0;
        return { name: format(month, 'MMM'), value: revenue };
      }));
      return results;
    },
  });

  const { data: categoryData, isLoading: catLoading, refetch: refetchCat } = useQuery({
    queryKey: ['admin-job-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('jobs').select('job_category').eq('is_active', true);
      const counts: Record<string, number> = {};
      data?.forEach(job => { const cat = job.job_category || 'Private'; counts[cat] = (counts[cat] || 0) + 1; });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });

  const { data: funnelData, isLoading: funnelLoading, refetch: refetchFunnel } = useQuery({
    queryKey: ['admin-application-funnel'],
    queryFn: async () => {
      const [applied, shortlisted, interviewed, hired] = await Promise.all([
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'shortlisted'),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'interviewed'),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'hired'),
      ]);
      return [
        { name: 'Applied', value: applied.count || 0 },
        { name: 'Shortlisted', value: shortlisted.count || 0 },
        { name: 'Interviewed', value: interviewed.count || 0 },
        { name: 'Hired', value: hired.count || 0 },
      ];
    },
  });

  const { data: geoData, isLoading: geoLoading, refetch: refetchGeo } = useQuery({
    queryKey: ['admin-geo-distribution'],
    queryFn: async () => {
      const { data } = await supabase.from('employers').select('country_code');
      const counts: Record<string, number> = {};
      data?.forEach(e => { const cc = e.country_code || 'Unknown'; counts[cc] = (counts[cc] || 0) + 1; });
      return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    },
  });

  const { data: jobTrendData, isLoading: jobTrendLoading, refetch: refetchJobTrend } = useQuery({
    queryKey: ['admin-job-posting-trends'],
    queryFn: async () => {
      const days = eachDayOfInterval({ start: subDays(new Date(), 30), end: new Date() });
      const results = await Promise.all(days.map(async (day) => {
        const s = new Date(day); s.setHours(0,0,0,0);
        const e = new Date(day); e.setHours(23,59,59,999);
        const { count } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).gte('created_at', s.toISOString()).lte('created_at', e.toISOString());
        return { name: format(day, 'MMM d'), value: count || 0 };
      }));
      return results;
    },
  });

  const { data: quickStats } = useQuery({
    queryKey: ['admin-quick-stats'],
    queryFn: async () => {
      const [totalUsers, activeJobs, totalApplications, revenueData, weekUsers, prevWeekUsers] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('status', 'open'),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('employer_subscriptions').select('plan:employer_plans!employer_subscriptions_plan_id_fkey(price_monthly)').eq('status', 'active'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', subDays(new Date(), 7).toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', subDays(new Date(), 14).toISOString()).lte('created_at', subDays(new Date(), 7).toISOString()),
      ]);
      const mrr = revenueData.data?.reduce((sum, sub) => { const plan = sub.plan as { price_monthly: number } | null; return sum + (plan?.price_monthly || 0); }, 0) || 0;
      const wk = weekUsers.count || 0;
      const prevWk = prevWeekUsers.count || 1;
      const userGrowth = Math.round(((wk - prevWk) / prevWk) * 100);
      return { totalUsers: totalUsers.count || 0, activeJobs: activeJobs.count || 0, totalApplications: totalApplications.count || 0, mrr, userGrowth, weeklyUsers: wk };
    },
  });

  const isLoading = regLoading || revLoading || catLoading || funnelLoading || geoLoading || jobTrendLoading;

  const handleRefreshAll = () => {
    refetchReg(); refetchRev(); refetchCat(); refetchFunnel(); refetchGeo(); refetchJobTrend();
  };

  const handleExportCSV = () => {
    const rows = [['Metric', 'Value'], ['Total Users', String(quickStats?.totalUsers || 0)], ['Active Jobs', String(quickStats?.activeJobs || 0)], ['Applications', String(quickStats?.totalApplications || 0)], ['MRR', `$${quickStats?.mrr || 0}`]];
    if (registrationData) registrationData.forEach(d => rows.push(['Registration ' + d.name, String(d.value)]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const LoadingCard = () => (
    <Card className="rounded-2xl border-border/30">
      <CardContent className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-[260px] w-full rounded-xl" />
      </CardContent>
    </Card>
  );

  const conversionRate = funnelData
    ? funnelData[0].value > 0 ? ((funnelData[3].value / funnelData[0].value) * 100).toFixed(1) : '0'
    : '0';

  return (
    <AdminLayout title="Analytics">
      <div className="space-y-6">
        {/* Header bar */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Platform Analytics</h2>
              <p className="text-xs text-muted-foreground">Real-time insights across all metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AdminDateRangeFilter value={dateRange} onChange={setDateRange} />
            <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={handleRefreshAll}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={handleExportCSV}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPICard index={0} title="Total Users" value={quickStats?.totalUsers?.toLocaleString() || '0'} change={quickStats?.userGrowth} icon={Users} color="from-blue-500 to-blue-600" />
          <KPICard index={1} title="Active Jobs" value={quickStats?.activeJobs?.toLocaleString() || '0'} change={8} icon={Briefcase} color="from-emerald-500 to-emerald-600" />
          <KPICard index={2} title="Applications" value={quickStats?.totalApplications?.toLocaleString() || '0'} change={-3} icon={Activity} color="from-amber-500 to-orange-500" />
          <KPICard index={3} title="Monthly Revenue" value={`$${quickStats?.mrr?.toLocaleString() || '0'}`} change={15} icon={Banknote} color="from-violet-500 to-purple-600" />
        </div>

        {/* Quick insight badges */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1.5 py-1 px-3 text-xs bg-card/60 backdrop-blur-sm border-border/40">
            <Zap className="h-3 w-3 text-amber-500" />
            Hire Rate: <span className="font-semibold text-foreground">{conversionRate}%</span>
          </Badge>
          <Badge variant="outline" className="gap-1.5 py-1 px-3 text-xs bg-card/60 backdrop-blur-sm border-border/40">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            New This Week: <span className="font-semibold text-foreground">{quickStats?.weeklyUsers || 0}</span>
          </Badge>
          {categoryData && categoryData.length > 0 && (
            <Badge variant="outline" className="gap-1.5 py-1 px-3 text-xs bg-card/60 backdrop-blur-sm border-border/40">
              <Briefcase className="h-3 w-3 text-blue-500" />
              Top Category: <span className="font-semibold text-foreground">{categoryData.sort((a, b) => b.value - a.value)[0]?.name}</span>
            </Badge>
          )}
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-5">
          <TabsList className="bg-muted/40 backdrop-blur-sm border border-border/30 p-1 h-auto rounded-xl">
            <TabsTrigger value="overview" className="gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-2">
              <TrendingUp className="h-3.5 w-3.5 hidden sm:block" />Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-2">
              <Users className="h-3.5 w-3.5 hidden sm:block" />Users
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-2">
              <Briefcase className="h-3.5 w-3.5 hidden sm:block" />Jobs
            </TabsTrigger>
            <TabsTrigger value="revenue" className="gap-1.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-2">
              <Banknote className="h-3.5 w-3.5 hidden sm:block" />Revenue
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {isLoading ? <><LoadingCard /><LoadingCard /></> : (
                <>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <RegistrationTrendChart data={registrationData || []} />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <JobPostingTrendChart data={jobTrendData || []} />
                  </motion.div>
                </>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {isLoading ? <><LoadingCard /><LoadingCard /></> : (
                <>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <RevenueChart data={revenueData || []} />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <ApplicationFunnelChart data={funnelData || []} />
                  </motion.div>
                </>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {isLoading ? <><LoadingCard /><LoadingCard /></> : (
                <>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <JobCategoryChart data={categoryData || []} />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                    <GeographicDistributionChart data={geoData || []} />
                  </motion.div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-5">
            {isLoading ? <LoadingCard /> : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <RegistrationTrendChart data={registrationData || []} />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <GeographicDistributionChart data={geoData || []} />
                </motion.div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="jobs" className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {isLoading ? <><LoadingCard /><LoadingCard /></> : (
                <>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <JobPostingTrendChart data={jobTrendData || []} />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <JobCategoryChart data={categoryData || []} />
                  </motion.div>
                </>
              )}
            </div>
            {!isLoading && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <ApplicationFunnelChart data={funnelData || []} />
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="revenue">
            {revLoading ? <LoadingCard /> : (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <RevenueChart data={revenueData || []} />
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
