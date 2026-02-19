import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RegistrationTrendChart,
  RevenueChart,
  JobCategoryChart,
  ApplicationFunnelChart,
  GeographicDistributionChart,
  JobPostingTrendChart,
  StatsTrendCard
} from '@/components/admin/AnalyticsCharts';
import { 
  Users, 
  Briefcase, 
  DollarSign, 
  TrendingUp,
  Target,
  Clock
} from 'lucide-react';
import { format, subDays, startOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from 'date-fns';

export default function AdminAnalytics() {
  // Registration trends
  const { data: registrationData, isLoading: regLoading } = useQuery({
    queryKey: ['admin-registration-trends'],
    queryFn: async () => {
      const days = eachDayOfInterval({
        start: subDays(new Date(), 30),
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
  const { data: revenueData, isLoading: revLoading } = useQuery({
    queryKey: ['admin-revenue-trends'],
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

  // Job categories
  const { data: categoryData, isLoading: catLoading } = useQuery({
    queryKey: ['admin-job-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('jobs')
        .select('job_category')
        .eq('is_active', true);

      const counts: Record<string, number> = {};
      data?.forEach(job => {
        const cat = job.job_category || 'Private';
        counts[cat] = (counts[cat] || 0) + 1;
      });

      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });

  // Application funnel
  const { data: funnelData, isLoading: funnelLoading } = useQuery({
    queryKey: ['admin-application-funnel'],
    queryFn: async () => {
      const { count: applied } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });

      const { count: shortlisted } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'shortlisted');

      const { count: interviewed } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'interviewed');

      const { count: hired } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'hired');

      return [
        { name: 'Applied', value: applied || 0 },
        { name: 'Shortlisted', value: shortlisted || 0 },
        { name: 'Interviewed', value: interviewed || 0 },
        { name: 'Hired', value: hired || 0 }
      ];
    },
  });

  // Geographic distribution (by employer country)
  const { data: geoData, isLoading: geoLoading } = useQuery({
    queryKey: ['admin-geo-distribution'],
    queryFn: async () => {
      const { data } = await supabase
        .from('employers')
        .select('country_code');

      const counts: Record<string, number> = {};
      data?.forEach(e => {
        const cc = e.country_code || 'Unknown';
        counts[cc] = (counts[cc] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    },
  });

  // Job posting trends (last 30 days)
  const { data: jobTrendData, isLoading: jobTrendLoading } = useQuery({
    queryKey: ['admin-job-posting-trends'],
    queryFn: async () => {
      const days = eachDayOfInterval({
        start: subDays(new Date(), 30),
        end: new Date()
      });

      const results = await Promise.all(
        days.map(async (day) => {
          const startOfDay = new Date(day);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(day);
          endOfDay.setHours(23, 59, 59, 999);

          const { count } = await supabase
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfDay.toISOString())
            .lte('created_at', endOfDay.toISOString());

          return { name: format(day, 'MMM d'), value: count || 0 };
        })
      );
      return results;
    },
  });

  // Quick stats
  const { data: quickStats } = useQuery({
    queryKey: ['admin-quick-stats'],
    queryFn: async () => {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: activeJobs } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('status', 'open');

      const { count: totalApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });

      const { data: revenueData } = await supabase
        .from('employer_subscriptions')
        .select('plan:employer_plans!employer_subscriptions_plan_id_fkey(price_monthly)')
        .eq('status', 'active');

      const mrr = revenueData?.reduce((sum, sub) => {
        const plan = sub.plan as { price_monthly: number } | null;
        return sum + (plan?.price_monthly || 0);
      }, 0) || 0;

      return {
        totalUsers: totalUsers || 0,
        activeJobs: activeJobs || 0,
        totalApplications: totalApplications || 0,
        mrr
      };
    },
  });

  const isLoading = regLoading || revLoading || catLoading || funnelLoading || geoLoading || jobTrendLoading;

  return (
    <AdminLayout title="Analytics">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsTrendCard
          title="Total Users"
          value={quickStats?.totalUsers || 0}
          change={12}
          data={registrationData?.slice(-7).map(d => ({ value: d.value })) || []}
        />
        <StatsTrendCard
          title="Active Jobs"
          value={quickStats?.activeJobs || 0}
          change={8}
          data={[{ value: 10 }, { value: 15 }, { value: 12 }, { value: 18 }, { value: 20 }, { value: 22 }, { value: quickStats?.activeJobs || 0 }]}
        />
        <StatsTrendCard
          title="Applications"
          value={quickStats?.totalApplications || 0}
          change={-3}
          data={[{ value: 50 }, { value: 45 }, { value: 55 }, { value: 48 }, { value: 52 }, { value: 40 }, { value: quickStats?.totalApplications || 0 }]}
        />
        <StatsTrendCard
          title="MRR"
          value={`$${quickStats?.mrr?.toLocaleString() || 0}`}
          change={15}
          data={revenueData?.map(d => ({ value: d.value })) || []}
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {isLoading ? (
              <>
                <Card><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
                <Card><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
              </>
            ) : (
              <>
                <RegistrationTrendChart data={registrationData || []} />
                <JobPostingTrendChart data={jobTrendData || []} />
              </>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {isLoading ? (
              <>
                <Card><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
                <Card><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
              </>
            ) : (
              <>
                <RevenueChart data={revenueData || []} />
                <ApplicationFunnelChart data={funnelData || []} />
              </>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {isLoading ? (
              <>
                <Card><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
                <Card><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
              </>
            ) : (
              <>
                <JobCategoryChart data={categoryData || []} />
                <GeographicDistributionChart data={geoData || []} />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          {isLoading ? (
            <Card><CardContent className="p-6"><Skeleton className="h-[400px] w-full" /></CardContent></Card>
          ) : (
            <>
              <RegistrationTrendChart data={registrationData || []} />
              <GeographicDistributionChart data={geoData || []} />
            </>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {isLoading ? (
              <>
                <Card><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
                <Card><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
              </>
            ) : (
              <>
                <JobPostingTrendChart data={jobTrendData || []} />
                <JobCategoryChart data={categoryData || []} />
              </>
            )}
          </div>
          <ApplicationFunnelChart data={funnelData || []} />
        </TabsContent>

        <TabsContent value="revenue">
          {revLoading ? (
            <Card><CardContent className="p-6"><Skeleton className="h-[400px] w-full" /></CardContent></Card>
          ) : (
            <RevenueChart data={revenueData || []} />
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
