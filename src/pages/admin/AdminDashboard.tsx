import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatsCard } from '@/components/admin/StatsCard';
import { ActionLogTable } from '@/components/admin/ActionLogTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RegistrationTrendChart, RevenueChart } from '@/components/admin/AnalyticsCharts';
import { Link } from 'react-router-dom';
import {
  Building2,
  Briefcase,
  Users,
  DollarSign,
  Clock,
  Flag,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { format, subDays, eachDayOfInterval, subMonths, eachMonthOfInterval, startOfMonth } from 'date-fns';

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

  // Registration trend data
  const { data: registrationData } = useQuery({
    queryKey: ['admin-dashboard-registration-trend'],
    queryFn: async () => {
      const days = eachDayOfInterval({
        start: subDays(new Date(), 14),
        end: new Date()
      });

      const results = await Promise.all(
        days.map(async (day) => {
          const startOfDay = new Date(day);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(day);
          endOfDay.setHours(23, 59, 59, 999);

          const { count: candidates } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('user_type', 'candidate')
            .gte('created_at', startOfDay.toISOString())
            .lte('created_at', endOfDay.toISOString());

          const { count: employers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('user_type', 'employer')
            .gte('created_at', startOfDay.toISOString())
            .lte('created_at', endOfDay.toISOString());

          return {
            name: format(day, 'MMM d'),
            candidates: candidates || 0,
            employers: employers || 0,
            value: (candidates || 0) + (employers || 0)
          };
        })
      );

      return results;
    },
  });

  // Revenue data
  const { data: revenueData } = useQuery({
    queryKey: ['admin-dashboard-revenue-trend'],
    queryFn: async () => {
      const months = eachMonthOfInterval({
        start: subMonths(new Date(), 5),
        end: new Date()
      });

      const results = await Promise.all(
        months.map(async (month) => {
          const startDate = startOfMonth(month);
          const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

          const { data } = await supabase
            .from('employer_subscriptions')
            .select('plan:employer_plans!employer_subscriptions_plan_id_fkey(price_monthly)')
            .eq('status', 'active')
            .gte('current_period_start', startDate.toISOString())
            .lte('current_period_start', endDate.toISOString());

          const revenue = data?.reduce((sum, sub) => {
            const plan = sub.plan as { price_monthly: number } | null;
            return sum + (plan?.price_monthly || 0);
          }, 0) || 0;

          return {
            name: format(month, 'MMM'),
            value: revenue
          };
        })
      );

      return results;
    },
  });

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          [...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatsCard
              title="Total Employers"
              value={stats?.total_employers || 0}
              icon={Building2}
            />
            <StatsCard
              title="Pending Approvals"
              value={stats?.pending_employers || 0}
              icon={Clock}
              variant="warning"
            />
            <StatsCard
              title="Active Jobs"
              value={stats?.active_jobs || 0}
              icon={Briefcase}
              variant="success"
            />
            <StatsCard
              title="Pending Moderation"
              value={stats?.pending_moderation || 0}
              icon={AlertTriangle}
              variant="warning"
            />
            <StatsCard
              title="Total Candidates"
              value={stats?.total_candidates || 0}
              icon={Users}
            />
            <StatsCard
              title="Pending Reports"
              value={stats?.pending_reports || 0}
              icon={Flag}
              variant="destructive"
            />
            <StatsCard
              title="Revenue This Month"
              value={`$${(stats?.revenue_this_month || 0).toLocaleString()}`}
              icon={DollarSign}
              variant="success"
            />
            <StatsCard
              title="New This Week"
              value={stats?.new_registrations_week || 0}
              icon={UserPlus}
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {stats?.pending_employers && stats.pending_employers > 0 && (
              <Button asChild variant="outline">
                <Link to="/admin/employers?status=pending">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Employers ({stats.pending_employers})
                </Link>
              </Button>
            )}
            {stats?.pending_moderation && stats.pending_moderation > 0 && (
              <Button asChild variant="outline">
                <Link to="/admin/jobs?moderation=pending">
                  <Eye className="h-4 w-4 mr-2" />
                  Moderate Jobs ({stats.pending_moderation})
                </Link>
              </Button>
            )}
            {stats?.pending_reports && stats.pending_reports > 0 && (
              <Button asChild variant="outline" className="border-destructive text-destructive">
                <Link to="/admin/reports">
                  <Flag className="h-4 w-4 mr-2" />
                  Review Reports ({stats.pending_reports})
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link to="/admin/analytics">
                View Analytics
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {registrationData && <RegistrationTrendChart data={registrationData} />}
        {revenueData && <RevenueChart data={revenueData} />}
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Employer Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Approved</span>
                  <span className="font-semibold text-success">{stats?.approved_employers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-semibold text-warning">{stats?.pending_employers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Suspended</span>
                  <span className="font-semibold text-destructive">{stats?.suspended_employers}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-4">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold">{stats?.total_employers}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Job Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Active</span>
                  <span className="font-semibold text-success">{stats?.active_jobs}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pending Moderation</span>
                  <span className="font-semibold text-warning">{stats?.pending_moderation}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Applications</span>
                  <span className="font-semibold">{stats?.total_applications}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-4">
                  <span className="text-muted-foreground">Total Jobs</span>
                  <span className="font-bold">{stats?.total_jobs}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Admin Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionLogTable limit={10} />
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
