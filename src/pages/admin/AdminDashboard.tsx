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
import { RegistrationTrendChart, RevenueChart } from '@/components/admin/AnalyticsCharts';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import {
  Building2, Briefcase, Users, Banknote, Clock, Flag, UserPlus, AlertTriangle,
  ArrowRight, Eye, CheckCircle, ShieldAlert, TrendingUp, FileText,
} from 'lucide-react';
import { format, subDays, eachDayOfInterval, subMonths, eachMonthOfInterval, startOfMonth } from 'date-fns';
import { exportToCSV } from '@/lib/adminExport';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
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

  const needsAttention = !isLoading && stats && (
    (stats.pending_employers > 0) || (stats.pending_moderation > 0) || (stats.pending_reports > 0)
  );

  const handleExportStats = () => {
    if (!stats) return;
    exportToCSV([stats as unknown as Record<string, unknown>], 'admin-dashboard-stats');
    toast.success('Dashboard stats exported');
  };

  return (
    <AdminLayout title="Dashboard">
      {/* Needs Attention Banner */}
      {needsAttention && (
        <Card className="mb-6 rounded-xl border-warning/30 bg-gradient-to-r from-warning/5 via-card to-destructive/5 overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-warning via-destructive/60 to-warning/40" />
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="h-5 w-5 text-warning" />
              <h3 className="font-semibold text-sm">Needs Attention</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats!.pending_employers > 0 && (
                <Button asChild size="sm" variant="outline" className="border-warning/30 hover:bg-warning/10 gap-2">
                  <Link to="/admin/employers?status=pending">
                    <Building2 className="h-3.5 w-3.5 text-warning" />
                    <span>{stats!.pending_employers} Pending Employers</span>
                  </Link>
                </Button>
              )}
              {stats!.pending_moderation > 0 && (
                <Button asChild size="sm" variant="outline" className="border-primary/30 hover:bg-primary/10 gap-2">
                  <Link to="/admin/moderation">
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    <span>{stats!.pending_moderation} Moderation Queue</span>
                  </Link>
                </Button>
              )}
              {stats!.pending_reports > 0 && (
                <Button asChild size="sm" variant="outline" className="border-destructive/30 hover:bg-destructive/10 gap-2">
                  <Link to="/admin/reports">
                    <Flag className="h-3.5 w-3.5 text-destructive" />
                    <span>{stats!.pending_reports} Unresolved Reports</span>
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {isLoading ? (
          [...Array(8)].map((_, i) => (
            <Card key={i} className="rounded-xl"><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatsCard title="Total Employers" value={stats?.total_employers || 0} icon={Building2} />
            <StatsCard title="Pending Approvals" value={stats?.pending_employers || 0} icon={Clock} variant="warning" />
            <StatsCard title="Active Jobs" value={stats?.active_jobs || 0} icon={Briefcase} variant="success" />
            <StatsCard title="Pending Moderation" value={stats?.pending_moderation || 0} icon={AlertTriangle} variant="warning" />
            <StatsCard title="Total Candidates" value={stats?.total_candidates || 0} icon={Users} />
            <StatsCard title="Pending Reports" value={stats?.pending_reports || 0} icon={Flag} variant="destructive" />
            <StatsCard title="Revenue This Month" value={`$${(stats?.revenue_this_month || 0).toLocaleString()}`} icon={Banknote} variant="success" />
            <StatsCard title="New This Week" value={stats?.new_registrations_week || 0} icon={UserPlus} />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <Card className="mb-6 rounded-xl border-border/40 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={handleExportStats}>
              <Download className="h-3.5 w-3.5" />
              Export Stats
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stats?.pending_employers && stats.pending_employers > 0 && (
              <Button asChild size="sm" className="rounded-full gap-1.5">
                <Link to="/admin/employers?status=pending">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Approve Employers
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{stats.pending_employers}</Badge>
                </Link>
              </Button>
            )}
            {stats?.pending_moderation && stats.pending_moderation > 0 && (
              <Button asChild size="sm" variant="outline" className="rounded-full gap-1.5">
                <Link to="/admin/moderation">
                  <Eye className="h-3.5 w-3.5" />
                  Moderation Queue
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{stats.pending_moderation}</Badge>
                </Link>
              </Button>
            )}
            {stats?.pending_reports && stats.pending_reports > 0 && (
              <Button asChild size="sm" variant="outline" className="rounded-full gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10">
                <Link to="/admin/reports">
                  <Flag className="h-3.5 w-3.5" />
                  Review Reports
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{stats.pending_reports}</Badge>
                </Link>
              </Button>
            )}
            <Button asChild size="sm" variant="ghost" className="rounded-full gap-1.5">
              <Link to="/admin/analytics">
                <TrendingUp className="h-3.5 w-3.5" />
                View Analytics
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts + System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <div className="lg:col-span-2">
          {registrationData && <RegistrationTrendChart data={registrationData} />}
        </div>
        <SystemStatusCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        {revenueData && <RevenueChart data={revenueData} />}
        
        {/* Employer Overview */}
        <Card className="rounded-xl border-border/40 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Platform Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <div className="space-y-3">
                {[
                  { label: 'Approved Employers', value: stats?.approved_employers, color: 'text-success' },
                  { label: 'Pending Employers', value: stats?.pending_employers, color: 'text-warning' },
                  { label: 'Suspended Employers', value: stats?.suspended_employers, color: 'text-destructive' },
                  { label: 'Active Jobs', value: stats?.active_jobs, color: 'text-success' },
                  { label: 'Total Applications', value: stats?.total_applications, color: 'text-foreground' },
                  { label: 'Blocked Candidates', value: stats?.blocked_candidates, color: 'text-destructive' },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center py-1.5">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className={`font-semibold tabular-nums ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Activity + Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="rounded-xl border-border/40 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Live Platform Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LiveActivityFeed />
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/40 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Admin Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionLogTable limit={10} />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
