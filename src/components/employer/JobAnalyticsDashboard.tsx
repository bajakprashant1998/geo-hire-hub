import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Briefcase, Eye, Users, TrendingUp } from 'lucide-react';

interface JobAnalyticsDashboardProps {
  employerId: string;
}

export const JobAnalyticsDashboard = ({ employerId }: JobAnalyticsDashboardProps) => {
  const { data: jobStats, isLoading } = useQuery({
    queryKey: ['employer-job-analytics', employerId],
    queryFn: async () => {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('id, title, view_count, is_active, status')
        .eq('employer_id', employerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const jobsWithApps = await Promise.all(
        (jobs || []).map(async (job) => {
          const { count } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('job_id', job.id);

          return {
            name: job.title.length > 20 ? job.title.slice(0, 20) + '…' : job.title,
            views: job.view_count || 0,
            applications: count || 0,
            active: job.is_active && job.status === 'open',
          };
        })
      );

      return jobsWithApps;
    },
  });

  const totalViews = jobStats?.reduce((s, j) => s + j.views, 0) || 0;
  const totalApps = jobStats?.reduce((s, j) => s + j.applications, 0) || 0;
  const conversionRate = totalViews > 0 ? ((totalApps / totalViews) * 100).toFixed(1) : '0';

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Views</p>
              <p className="text-xl font-bold">{totalViews.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Applications</p>
              <p className="text-xl font-bold">{totalApps}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-xl font-bold">{conversionRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Job Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobStats && jobStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={jobStats} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  angle={-35} 
                  textAnchor="end" 
                  height={80}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" radius={[4, 4, 0, 0]} />
                <Bar dataKey="applications" fill="hsl(var(--chart-2, 160 60% 45%))" name="Applications" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No job data available yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
