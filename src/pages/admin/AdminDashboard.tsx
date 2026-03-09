import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ActionLogTable } from '@/components/admin/ActionLogTable';
import { LiveActivityFeed } from '@/components/admin/LiveActivityFeed';
import { SystemStatusCard } from '@/components/admin/SystemStatusCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RegistrationTrendChart, RevenueChart } from '@/components/admin/AnalyticsCharts';
import { Link } from 'react-router-dom';
import { Download, RefreshCw } from 'lucide-react';
import {
  Building2, Briefcase, Users, Banknote, Clock, Flag, UserPlus, AlertTriangle,
  ArrowRight, Eye, CheckCircle, ShieldAlert, TrendingUp, FileText,
  Zap, Target, ArrowUpRight, CircleDot, LayoutGrid, Sparkles, Activity,
  PieChart, Shield, MessageSquare,
} from 'lucide-react';
import { format, subDays, eachDayOfInterval, subMonths, eachMonthOfInterval, startOfMonth } from 'date-fns';
import { exportToCSV } from '@/lib/adminExport';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 140, damping: 20 } },
};

export default function AdminDashboard() {
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: stats, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
      if (error) throw error;
      return data as {
        total_employers: number;
        pending_employers: number;
        approved_employers: number;
        suspended_employers: number;
        total_jobs: number;
        active_jobs: number;
        pending_moderation: number;
        total_candidates: number;
        blocked_candidates: number;
        total_applications: number;
        pending_reports: number;
        revenue_this_month: number;
        new_registrations_today: number;
        new_registrations_week: number;
      };
    },
  });

  const { data: registrationData } = useQuery({
    queryKey: ['admin-dashboard-registration-trend'],
    queryFn: async () => {
      const days = eachDayOfInterval({ start: subDays(new Date(), 14), end: new Date() });
      const results = await Promise.all(
        days.map(async (day) => {
          const startOfDay = new Date(day); startOfDay.setHours(0,0,0,0);
          const endOfDay = new Date(day); endOfDay.setHours(23,59,59,999);
          const { count: candidates } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'candidate').gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString());
          const { count: employers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'employer').gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString());
          return { name: format(day, 'MMM d'), candidates: candidates || 0, employers: employers || 0, value: (candidates || 0) + (employers || 0) };
        })
      );
      return results;
    },
  });

  const { data: revenueData } = useQuery({
    queryKey: ['admin-dashboard-revenue-trend'],
    queryFn: async () => {
      const months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
      const results = await Promise.all(
        months.map(async (month) => {
          const startDate = startOfMonth(month);
          const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);
          const { data } = await supabase.from('employer_subscriptions').select('plan:employer_plans!employer_subscriptions_plan_id_fkey(price_monthly)').eq('status', 'active').gte('current_period_start', startDate.toISOString()).lte('current_period_start', endDate.toISOString());
          const revenue = data?.reduce((sum, sub) => { const plan = sub.plan as { price_monthly: number } | null; return sum + (plan?.price_monthly || 0); }, 0) || 0;
          return { name: format(month, 'MMM'), value: revenue };
        })
      );
      return results;
    },
  });

  // Top employers by jobs
  const { data: topEmployers } = useQuery({
    queryKey: ['admin-top-employers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('employer_id, employers!jobs_employer_id_fkey(company_name, logo_url)')
        .eq('is_active', true)
        .eq('status', 'open');
      if (!data) return [];
      const counts: Record<string, { name: string; logo: string | null; count: number }> = {};
      data.forEach((j: any) => {
        const id = j.employer_id;
        if (!counts[id]) counts[id] = { name: j.employers?.company_name || 'Unknown', logo: j.employers?.logo_url, count: 0 };
        counts[id].count++;
      });
      return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
    },
  });

  const totalUsers = (stats?.total_candidates || 0) + (stats?.total_employers || 0);
  const attentionCount = (stats?.pending_employers || 0) + (stats?.pending_moderation || 0) + (stats?.pending_reports || 0);

  const healthScore = useMemo(() => {
    if (!stats) return 0;
    return Math.round(
      ((stats.pending_employers === 0 ? 25 : Math.max(0, 25 - stats.pending_employers * 5)) +
      (stats.pending_moderation === 0 ? 25 : Math.max(0, 25 - stats.pending_moderation * 5)) +
      (stats.pending_reports === 0 ? 25 : Math.max(0, 25 - stats.pending_reports * 5)) +
      (stats.blocked_candidates === 0 ? 25 : Math.max(0, 25 - stats.blocked_candidates * 2)))
    );
  }, [stats]);

  const handleExportStats = () => {
    if (!stats) return;
    exportToCSV([stats as unknown as Record<string, unknown>], 'admin-dashboard-stats');
    toast.success('Dashboard stats exported');
  };

  // Derive today summary sentence
  const summaryLine = useMemo(() => {
    if (!stats) return '';
    const parts: string[] = [];
    if (stats.new_registrations_today > 0) parts.push(`${stats.new_registrations_today} new signup${stats.new_registrations_today > 1 ? 's' : ''}`);
    if (stats.pending_employers > 0) parts.push(`${stats.pending_employers} employer${stats.pending_employers > 1 ? 's' : ''} awaiting approval`);
    if (stats.pending_reports > 0) parts.push(`${stats.pending_reports} report${stats.pending_reports > 1 ? 's' : ''} to review`);
    if (parts.length === 0) return 'All clear — nothing requires your attention right now.';
    return parts.join(' · ');
  }, [stats]);

  return (
    <AdminLayout title="Dashboard">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

        {/* ─── Welcome Hero ─── */}
        <motion.div variants={fadeUp}>
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border/40 p-5 sm:p-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{greeting}, Admin</h2>
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(currentTime, 'EEEE, MMMM d, yyyy')}
                  <span className="mx-1.5 text-border">|</span>
                  <span className="font-medium text-foreground/70">{totalUsers.toLocaleString()} total users</span>
                </p>
                {!isLoading && (
                  <p className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1.5">
                    <Activity className="h-3 w-3" />
                    {summaryLine}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 rounded-xl text-xs bg-card/50 backdrop-blur-sm"
                  onClick={() => { refetch(); toast.info('Refreshing...'); }}
                  disabled={isFetching}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-xs bg-card/50 backdrop-blur-sm" onClick={handleExportStats}>
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Attention Banner ─── */}
        {attentionCount > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="rounded-2xl border-warning/20 bg-gradient-to-r from-warning/5 via-card to-destructive/5 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-warning via-destructive/50 to-warning/30" />
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-warning/15"><ShieldAlert className="h-4 w-4 text-warning" /></div>
                  <h3 className="font-semibold text-sm">Requires Attention</h3>
                  <Badge variant="outline" className="ml-auto text-[10px] border-warning/30 text-warning">{attentionCount} items</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    stats?.pending_employers && stats.pending_employers > 0 && { count: stats.pending_employers, label: 'Pending Employers', icon: Building2, link: '/admin/employers?status=pending', cls: 'border-warning/30 hover:bg-warning/10 text-warning' },
                    stats?.pending_moderation && stats.pending_moderation > 0 && { count: stats.pending_moderation, label: 'Moderation Queue', icon: Eye, link: '/admin/moderation', cls: 'border-primary/30 hover:bg-primary/10 text-primary' },
                    stats?.pending_reports && stats.pending_reports > 0 && { count: stats.pending_reports, label: 'Reports', icon: Flag, link: '/admin/reports', cls: 'border-destructive/30 hover:bg-destructive/10 text-destructive' },
                  ].filter(Boolean).map((item: any) => (
                    <Button key={item.label} asChild size="sm" variant="outline" className={`gap-2 rounded-xl ${item.cls}`}>
                      <Link to={item.link}>
                        <item.icon className="h-3.5 w-3.5" />
                        <span className="font-bold">{item.count}</span>
                        <span>{item.label}</span>
                        <ArrowUpRight className="h-3 w-3 opacity-50" />
                      </Link>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── Key Metrics Row ─── */}
        <motion.div variants={fadeUp}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard loading={isLoading} label="Platform Health" icon={Zap} gradient="from-primary/15 to-primary/5">
              <div className="flex items-end gap-1.5">
                <span className={`text-3xl sm:text-4xl font-black tabular-nums ${healthScore >= 80 ? 'text-success' : healthScore >= 50 ? 'text-warning' : 'text-destructive'}`}>
                  {healthScore}
                </span>
                <span className="text-xs text-muted-foreground mb-1.5">/100</span>
              </div>
              <Progress value={healthScore} className="h-1.5 mt-2" />
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {healthScore >= 80 ? '✅ All healthy' : healthScore >= 50 ? '⚠️ Needs attention' : '🔴 Critical'}
              </p>
            </MetricCard>

            <MetricCard loading={isLoading} label="Total Users" icon={Users} gradient="from-success/15 to-success/5">
              <p className="text-3xl sm:text-4xl font-black tabular-nums">{totalUsers.toLocaleString()}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <UserPlus className="h-3 w-3 text-success" />
                <span className="text-[10px] text-success font-medium">+{stats?.new_registrations_today || 0} today</span>
                <span className="text-[10px] text-muted-foreground">· +{stats?.new_registrations_week || 0} this week</span>
              </div>
            </MetricCard>

            <MetricCard loading={isLoading} label="Active Jobs" icon={Briefcase} gradient="from-accent/15 to-accent/5">
              <p className="text-3xl sm:text-4xl font-black tabular-nums">{(stats?.active_jobs || 0).toLocaleString()}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-muted-foreground">{(stats?.total_jobs || 0).toLocaleString()} total</span>
                {stats && stats.total_jobs > 0 && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{Math.round((stats.active_jobs / stats.total_jobs) * 100)}% active</Badge>
                )}
              </div>
            </MetricCard>

            <MetricCard loading={isLoading} label="Revenue" icon={Banknote} gradient="from-warning/15 to-warning/5">
              <p className="text-3xl sm:text-4xl font-black tabular-nums">${(stats?.revenue_this_month || 0).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-1.5">This month</p>
            </MetricCard>
          </div>
        </motion.div>

        {/* ─── Secondary Stats Strip ─── */}
        <motion.div variants={fadeUp}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {isLoading ? (
              [...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
            ) : (
              <>
                <MiniStat label="Applications" value={stats?.total_applications || 0} icon={FileText} color="primary" link="/admin/applications" />
                <MiniStat label="Approved Employers" value={stats?.approved_employers || 0} icon={CheckCircle} color="success" link="/admin/employers" />
                <MiniStat label="Pending Approvals" value={stats?.pending_employers || 0} icon={Clock} color="warning" link="/admin/employers?status=pending" />
                <MiniStat label="Moderation" value={stats?.pending_moderation || 0} icon={AlertTriangle} color="warning" link="/admin/moderation" />
                <MiniStat label="Open Reports" value={stats?.pending_reports || 0} icon={Flag} color="destructive" link="/admin/reports" />
                <MiniStat label="Candidates" value={stats?.total_candidates || 0} icon={Users} color="primary" />
              </>
            )}
          </div>
        </motion.div>

        {/* ─── Quick Actions ─── */}
        <motion.div variants={fadeUp}>
          <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { label: 'Approve Employers', icon: CheckCircle, link: '/admin/employers?status=pending', badge: stats?.pending_employers, color: 'text-success' },
                  { label: 'Review Content', icon: Eye, link: '/admin/moderation', badge: stats?.pending_moderation, color: 'text-warning' },
                  { label: 'Handle Reports', icon: Flag, link: '/admin/reports', badge: stats?.pending_reports, color: 'text-destructive' },
                  { label: 'Analytics', icon: TrendingUp, link: '/admin/analytics', color: 'text-primary' },
                  { label: 'Messages', icon: MessageSquare, link: '/admin/messages', color: 'text-muted-foreground' },
                  { label: 'System Health', icon: Shield, link: '/admin/system-health', color: 'text-muted-foreground' },
                ].map((action) => (
                  <Link key={action.label} to={action.link}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/30 bg-muted/20 hover:bg-muted/50 hover:border-border/60 transition-all duration-200 group text-center"
                  >
                    <div className="relative">
                      <action.icon className={`h-5 w-5 ${action.color} group-hover:scale-110 transition-transform`} />
                      {action.badge && action.badge > 0 && (
                        <span className="absolute -top-1.5 -right-2.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {action.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground leading-tight">{action.label}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Charts Row ─── */}
        <motion.div variants={fadeUp}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              {registrationData && <RegistrationTrendChart data={registrationData} />}
            </div>
            <SystemStatusCard />
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {revenueData && <RevenueChart data={revenueData} />}

            {/* Platform Breakdown */}
            <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10"><PieChart className="h-4 w-4 text-primary" /></div>
                  Platform Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-48 w-full" /> : (
                  <div className="space-y-2.5">
                    {[
                      { label: 'Approved Employers', value: stats?.approved_employers || 0, total: stats?.total_employers || 1, color: 'bg-success' },
                      { label: 'Pending Employers', value: stats?.pending_employers || 0, total: stats?.total_employers || 1, color: 'bg-warning' },
                      { label: 'Active Jobs', value: stats?.active_jobs || 0, total: stats?.total_jobs || 1, color: 'bg-primary' },
                      { label: 'Blocked Candidates', value: stats?.blocked_candidates || 0, total: stats?.total_candidates || 1, color: 'bg-destructive' },
                      { label: 'Applications', value: stats?.total_applications || 0, total: undefined, color: 'bg-accent' },
                    ].map((item) => {
                      const pct = item.total ? Math.round((item.value / item.total) * 100) : null;
                      return (
                        <div key={item.label} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`} />
                              <span className="text-xs text-muted-foreground">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {pct !== null && <span className="text-[10px] text-muted-foreground/60 tabular-nums">{pct}%</span>}
                              <span className="font-semibold tabular-nums text-sm">{item.value.toLocaleString()}</span>
                            </div>
                          </div>
                          {pct !== null && (
                            <div className="h-1 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
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
        </motion.div>

        {/* ─── Top Employers + Live Activity ─── */}
        <motion.div variants={fadeUp}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top Employers */}
            <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-success/10"><Target className="h-4 w-4 text-success" /></div>
                  Top Employers
                  <Badge variant="secondary" className="ml-auto text-[9px]">By active jobs</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!topEmployers ? <Skeleton className="h-48 w-full" /> : topEmployers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                ) : (
                  <div className="space-y-1">
                    {topEmployers.map((emp, idx) => (
                      <div key={idx} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                        <span className="text-xs font-bold text-muted-foreground/50 w-4">{idx + 1}</span>
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {emp.logo ? (
                            <img src={emp.logo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-sm font-medium truncate flex-1">{emp.name}</span>
                        <Badge variant="outline" className="text-[10px] tabular-nums">{emp.count} jobs</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Activity */}
            <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-success/10">
                    <CircleDot className="h-4 w-4 text-success animate-pulse" />
                  </div>
                  Live Platform Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LiveActivityFeed />
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* ─── Audit Log ─── */}
        <motion.div variants={fadeUp}>
          <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-muted"><FileText className="h-4 w-4 text-muted-foreground" /></div>
                  Recent Admin Activity
                </CardTitle>
                <Button asChild size="sm" variant="ghost" className="text-xs gap-1">
                  <Link to="/admin/system-health">View all <ArrowRight className="h-3 w-3" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ActionLogTable limit={8} />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AdminLayout>
  );
}

/* ─── Metric Card ─── */
function MetricCard({ loading, label, icon: Icon, gradient, children }: {
  loading: boolean; label: string; icon: any; gradient: string; children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 h-full group overflow-hidden">
      <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full relative">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-40 pointer-events-none`} />
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
            <div className="p-1.5 rounded-lg bg-background/60 group-hover:scale-110 transition-transform">
              <Icon className="h-4 w-4 text-foreground/60" />
            </div>
          </div>
          {loading ? <Skeleton className="h-12 w-24" /> : children}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Mini Stat ─── */
function MiniStat({ label, value, icon: Icon, color, link }: {
  label: string; value: number; icon: any; color: 'primary' | 'success' | 'warning' | 'destructive'; link?: string;
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };
  const Wrapper = link ? Link : 'div';
  const wrapperProps = link ? { to: link } : {};

  return (
    <Card className={`rounded-xl border-border/40 bg-card/80 backdrop-blur-sm hover:shadow-md transition-all duration-200 ${link ? 'cursor-pointer hover:scale-[1.02]' : ''}`}>
      <Wrapper {...(wrapperProps as any)} className="block">
        <CardContent className="p-3 flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${colorMap[color]} shrink-0`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold tabular-nums leading-tight">{value.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground truncate">{label}</p>
          </div>
          {link && <ArrowUpRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
        </CardContent>
      </Wrapper>
    </Card>
  );
}
