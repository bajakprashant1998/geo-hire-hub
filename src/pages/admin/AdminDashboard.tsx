import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatsCard } from '@/components/admin/StatsCard';
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
  Zap, Target, ArrowUpRight, CircleDot, LayoutGrid,
} from 'lucide-react';
import { format, subDays, eachDayOfInterval, subMonths, eachMonthOfInterval, startOfMonth } from 'date-fns';
import { exportToCSV } from '@/lib/adminExport';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
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

  const attentionItems = !isLoading && stats ? [
    stats.pending_employers > 0 && { count: stats.pending_employers, label: 'Pending Employers', icon: Building2, link: '/admin/employers?status=pending', color: 'warning' as const },
    stats.pending_moderation > 0 && { count: stats.pending_moderation, label: 'Moderation Queue', icon: Eye, link: '/admin/moderation', color: 'primary' as const },
    stats.pending_reports > 0 && { count: stats.pending_reports, label: 'Unresolved Reports', icon: Flag, link: '/admin/reports', color: 'destructive' as const },
  ].filter(Boolean) as { count: number; label: string; icon: any; link: string; color: 'warning' | 'primary' | 'destructive' }[] : [];

  const handleExportStats = () => {
    if (!stats) return;
    exportToCSV([stats as unknown as Record<string, unknown>], 'admin-dashboard-stats');
    toast.success('Dashboard stats exported');
  };

  const totalUsers = (stats?.total_candidates || 0) + (stats?.total_employers || 0);
  const healthScore = !stats ? 0 : Math.round(
    ((stats.pending_employers === 0 ? 25 : Math.max(0, 25 - stats.pending_employers * 5)) +
    (stats.pending_moderation === 0 ? 25 : Math.max(0, 25 - stats.pending_moderation * 5)) +
    (stats.pending_reports === 0 ? 25 : Math.max(0, 25 - stats.pending_reports * 5)) +
    (stats.blocked_candidates === 0 ? 25 : Math.max(0, 25 - stats.blocked_candidates * 2)))
  );

  return (
    <AdminLayout title="Dashboard">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{greeting}, Admin 👋</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {format(currentTime, 'EEEE, MMMM d, yyyy • h:mm a')}
              {stats && <span className="ml-2 text-muted-foreground/60">• {totalUsers.toLocaleString()} total users</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-xl text-xs"
              onClick={() => { refetch(); toast.info('Refreshing...'); }}
              disabled={isFetching}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-xs" onClick={handleExportStats}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Attention Banner */}
      {attentionItems.length > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
          <Card className="mb-6 rounded-2xl border-warning/20 bg-gradient-to-r from-warning/5 via-card to-destructive/5 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-warning via-destructive/50 to-warning/30" />
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-warning/15">
                  <ShieldAlert className="h-4 w-4 text-warning" />
                </div>
                <h3 className="font-semibold text-sm">Requires Your Attention</h3>
                <Badge variant="outline" className="ml-auto text-[10px] border-warning/30 text-warning">
                  {attentionItems.reduce((sum, item) => sum + item.count, 0)} items
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {attentionItems.map((item) => {
                  const colorMap = {
                    warning: 'border-warning/30 hover:bg-warning/10 text-warning',
                    primary: 'border-primary/30 hover:bg-primary/10 text-primary',
                    destructive: 'border-destructive/30 hover:bg-destructive/10 text-destructive',
                  };
                  return (
                    <Button key={item.label} asChild size="sm" variant="outline" className={`gap-2 rounded-xl ${colorMap[item.color]}`}>
                      <Link to={item.link}>
                        <item.icon className="h-3.5 w-3.5" />
                        <span className="font-medium">{item.count}</span>
                        <span>{item.label}</span>
                        <ArrowUpRight className="h-3 w-3 opacity-50" />
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Platform Health + Key Metrics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {/* Platform Health Score */}
        <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible">
          <Card className="rounded-2xl border-border/40 bg-gradient-to-br from-card via-card to-primary/5 h-full">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform Health</span>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <span className={`text-4xl font-black tabular-nums ${
                  healthScore >= 80 ? 'text-success' : healthScore >= 50 ? 'text-warning' : 'text-destructive'
                }`}>
                  {isLoading ? '—' : healthScore}
                </span>
                <span className="text-sm text-muted-foreground mb-1">/100</span>
              </div>
              <Progress
                value={isLoading ? 0 : healthScore}
                className="h-2 mt-3"
              />
              <p className="text-[11px] text-muted-foreground mt-2">
                {healthScore >= 80 ? '✅ All systems healthy' : healthScore >= 50 ? '⚠️ Some items need attention' : '🔴 Critical issues pending'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* 3 hero stats */}
        {[
          { title: 'Total Users', value: totalUsers, icon: Users, desc: `${stats?.new_registrations_today || 0} new today`, variant: 'default' as const },
          { title: 'Active Jobs', value: stats?.active_jobs || 0, icon: Briefcase, desc: `${stats?.total_jobs || 0} total jobs`, variant: 'success' as const },
          { title: 'Revenue', value: `$${(stats?.revenue_this_month || 0).toLocaleString()}`, icon: Banknote, desc: 'This month', variant: 'success' as const },
        ].map((s, i) => (
          <motion.div key={s.title} variants={fadeUp} custom={i + 1} initial="hidden" animate="visible">
            {isLoading ? (
              <Card className="rounded-2xl"><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>
            ) : (
              <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 h-full group">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.title}</span>
                    <div className={`p-2 rounded-xl group-hover:scale-110 transition-transform ${
                      s.variant === 'success' ? 'bg-success/10' : 'bg-primary/10'
                    }`}>
                      <s.icon className={`h-4 w-4 ${s.variant === 'success' ? 'text-success' : 'text-primary'}`} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-3xl font-bold tabular-nums">
                      {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">{s.desc}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        ))}
      </div>

      {/* Secondary Stats Grid */}
      <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible" className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <Card key={i} className="rounded-xl"><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
            ))
          ) : (
            <>
              <MiniStat label="Pending Approvals" value={stats?.pending_employers || 0} icon={Clock} color="warning" link="/admin/employers?status=pending" />
              <MiniStat label="Moderation Queue" value={stats?.pending_moderation || 0} icon={AlertTriangle} color="warning" link="/admin/moderation" />
              <MiniStat label="Applications" value={stats?.total_applications || 0} icon={FileText} color="primary" link="/admin/applications" />
              <MiniStat label="Reports" value={stats?.pending_reports || 0} icon={Flag} color="destructive" link="/admin/reports" />
              <MiniStat label="New This Week" value={stats?.new_registrations_week || 0} icon={UserPlus} color="success" />
            </>
          )}
        </div>
      </motion.div>

      {/* Quick Navigation */}
      <motion.div variants={fadeUp} custom={5} initial="hidden" animate="visible" className="mb-6">
        <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                stats?.pending_employers && stats.pending_employers > 0 && { label: 'Approve Employers', icon: CheckCircle, link: '/admin/employers?status=pending', badge: stats.pending_employers, variant: 'default' as const },
                stats?.pending_moderation && stats.pending_moderation > 0 && { label: 'Review Content', icon: Eye, link: '/admin/moderation', badge: stats.pending_moderation, variant: 'outline' as const },
                stats?.pending_reports && stats.pending_reports > 0 && { label: 'Handle Reports', icon: Flag, link: '/admin/reports', badge: stats.pending_reports, variant: 'outline' as const },
                { label: 'Analytics', icon: TrendingUp, link: '/admin/analytics', variant: 'ghost' as const },
                { label: 'Manage Users', icon: Users, link: '/admin/users', variant: 'ghost' as const },
                { label: 'System Health', icon: Target, link: '/admin/system-health', variant: 'ghost' as const },
              ].filter(Boolean).map((action: any) => (
                <Button key={action.label} asChild size="sm" variant={action.variant} className="rounded-xl gap-1.5 text-xs">
                  <Link to={action.link}>
                    <action.icon className="h-3.5 w-3.5" />
                    {action.label}
                    {action.badge && (
                      <Badge variant="secondary" className="ml-0.5 h-4.5 px-1.5 text-[9px] font-bold">{action.badge}</Badge>
                    )}
                    {action.variant === 'ghost' && <ArrowRight className="h-3 w-3 opacity-40" />}
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={fadeUp} custom={6} initial="hidden" animate="visible" className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {registrationData && <RegistrationTrendChart data={registrationData} />}
          </div>
          <SystemStatusCard />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={7} initial="hidden" animate="visible" className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {revenueData && <RevenueChart data={revenueData} />}

          {/* Platform Overview */}
          <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                Platform Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48 w-full" /> : (
                <div className="space-y-2">
                  {[
                    { label: 'Approved Employers', value: stats?.approved_employers, total: stats?.total_employers, color: 'bg-success' },
                    { label: 'Pending Employers', value: stats?.pending_employers, total: stats?.total_employers, color: 'bg-warning' },
                    { label: 'Suspended Employers', value: stats?.suspended_employers, total: stats?.total_employers, color: 'bg-destructive' },
                    { label: 'Active Jobs', value: stats?.active_jobs, total: stats?.total_jobs, color: 'bg-success' },
                    { label: 'Total Applications', value: stats?.total_applications, total: undefined, color: 'bg-primary' },
                    { label: 'Blocked Candidates', value: stats?.blocked_candidates, total: stats?.total_candidates, color: 'bg-destructive' },
                  ].map((item) => {
                    const pct = item.total && item.total > 0 ? Math.round(((item.value || 0) / item.total) * 100) : null;
                    return (
                      <div key={item.label} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors group">
                        <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`} />
                        <span className="text-sm text-muted-foreground flex-1">{item.label}</span>
                        <div className="flex items-center gap-2">
                          {pct !== null && (
                            <span className="text-[10px] text-muted-foreground/60 tabular-nums">{pct}%</span>
                          )}
                          <span className="font-semibold tabular-nums text-sm">{(item.value || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Live Activity + Audit Log */}
      <motion.div variants={fadeUp} custom={8} initial="hidden" animate="visible">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-success/10">
                  <CircleDot className="h-4 w-4 text-success" />
                </div>
                Live Platform Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LiveActivityFeed />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                Recent Admin Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActionLogTable limit={10} />
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </AdminLayout>
  );
}

/* Mini stat card for secondary metrics */
function MiniStat({ label, value, icon: Icon, color, link }: {
  label: string;
  value: number;
  icon: any;
  color: 'primary' | 'success' | 'warning' | 'destructive';
  link?: string;
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
        <CardContent className="p-3.5 flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${colorMap[color]} shrink-0`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold tabular-nums leading-tight">{value.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground truncate">{label}</p>
          </div>
          {link && <ArrowUpRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
        </CardContent>
      </Wrapper>
    </Card>
  );
}
