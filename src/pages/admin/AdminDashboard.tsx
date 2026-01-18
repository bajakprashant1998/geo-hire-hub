import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatsCard } from '@/components/admin/StatsCard';
import { ActionLogTable } from '@/components/admin/ActionLogTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  Briefcase,
  Users,
  DollarSign,
  Clock,
  Flag,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';

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
