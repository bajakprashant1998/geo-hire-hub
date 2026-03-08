import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RegistrationTrendChart, RevenueChart, JobCategoryChart,
  ApplicationFunnelChart, GeographicDistributionChart,
  JobPostingTrendChart, StatsTrendCard
} from '@/components/admin/AnalyticsCharts';
import { Users, Briefcase, Banknote, TrendingUp } from 'lucide-react';
import { format, subDays, startOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from 'date-fns';

export default function AdminAnalytics() {
  const { data: registrationData, isLoading: regLoading } = useQuery({
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

  const { data: revenueData, isLoading: revLoading } = useQuery({
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

  const { data: categoryData, isLoading: catLoading } = useQuery({
    queryKey: ['admin-job-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('jobs').select('job_category').eq('is_active', true);
      const counts: Record<string, number> = {};
      data?.forEach(job => { const cat = job.job_category || 'Private'; counts[cat] = (counts[cat] || 0) + 1; });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });

  const { data: funnelData, isLoading: funnelLoading } = useQuery({
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

  const { data: geoData, isLoading: geoLoading } = useQuery({
    queryKey: ['admin-geo-distribution'],
    queryFn: async () => {
      const { data } = await supabase.from('employers').select('country_code');
      const counts: Record<string, number> = {};
      data?.forEach(e => { const cc = e.country_code || 'Unknown'; counts[cc] = (counts[cc] || 0) + 1; });
      return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    },
  });

  const { data: jobTrendData, isLoading: jobTrendLoading } = useQuery({
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
      const [totalUsers, activeJobs, totalApplications, revenueData] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('status', 'open'),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('employer_subscriptions').select('plan:employer_plans!employer_subscriptions_plan_id_fkey(price_monthly)').eq('status', 'active'),
      ]);
      const mrr = revenueData.data?.reduce((sum, sub) => { const plan = sub.plan as { price_monthly: number } | null; return sum + (plan?.price_monthly || 0); }, 0) || 0;
      return { totalUsers: totalUsers.count || 0, activeJobs: activeJobs.count || 0, totalApplications: totalApplications.count || 0, mrr };
    },
  });

  const isLoading = regLoading || revLoading || catLoading || funnelLoading || geoLoading || jobTrendLoading;
  const LoadingCard = () => <Card className="rounded-xl"><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>;

  return (
    <AdminLayout title="Analytics">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatsTrendCard title="Total Users" value={quickStats?.totalUsers || 0} change={12} data={registrationData?.slice(-7).map(d => ({ value: d.value })) || []} />
        <StatsTrendCard title="Active Jobs" value={quickStats?.activeJobs || 0} change={8} data={[{value:10},{value:15},{value:12},{value:18},{value:20},{value:22},{value:quickStats?.activeJobs||0}]} />
        <StatsTrendCard title="Applications" value={quickStats?.totalApplications || 0} change={-3} data={[{value:50},{value:45},{value:55},{value:48},{value:52},{value:40},{value:quickStats?.totalApplications||0}]} />
        <StatsTrendCard title="MRR" value={`$${quickStats?.mrr?.toLocaleString() || 0}`} change={15} data={revenueData?.map(d => ({value:d.value})) || []} />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 backdrop-blur-sm">
          <TabsTrigger value="overview" className="gap-1.5 data-[state=active]:bg-card"><TrendingUp className="h-3.5 w-3.5 hidden sm:block" />Overview</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 data-[state=active]:bg-card"><Users className="h-3.5 w-3.5 hidden sm:block" />Users</TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5 data-[state=active]:bg-card"><Briefcase className="h-3.5 w-3.5 hidden sm:block" />Jobs</TabsTrigger>
          <TabsTrigger value="revenue" className="gap-1.5 data-[state=active]:bg-card"><DollarSign className="h-3.5 w-3.5 hidden sm:block" />Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {isLoading ? <><LoadingCard /><LoadingCard /></> : <><RegistrationTrendChart data={registrationData || []} /><JobPostingTrendChart data={jobTrendData || []} /></>}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {isLoading ? <><LoadingCard /><LoadingCard /></> : <><RevenueChart data={revenueData || []} /><ApplicationFunnelChart data={funnelData || []} /></>}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {isLoading ? <><LoadingCard /><LoadingCard /></> : <><JobCategoryChart data={categoryData || []} /><GeographicDistributionChart data={geoData || []} /></>}
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4 sm:space-y-6">
          {isLoading ? <LoadingCard /> : <><RegistrationTrendChart data={registrationData || []} /><GeographicDistributionChart data={geoData || []} /></>}
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {isLoading ? <><LoadingCard /><LoadingCard /></> : <><JobPostingTrendChart data={jobTrendData || []} /><JobCategoryChart data={categoryData || []} /></>}
          </div>
          {!isLoading && <ApplicationFunnelChart data={funnelData || []} />}
        </TabsContent>

        <TabsContent value="revenue">
          {revLoading ? <LoadingCard /> : <RevenueChart data={revenueData || []} />}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
