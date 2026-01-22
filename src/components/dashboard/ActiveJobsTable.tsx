import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Users, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Job {
  id: string;
  title: string;
  job_type: string;
  category: string;
  applications_count: number;
  view_count: number;
  created_at: string;
  is_trending: boolean;
}

interface ActiveJobsTableProps {
  employerId: string;
  onManageJobs: () => void;
}

export const ActiveJobsTable = ({ employerId, onManageJobs }: ActiveJobsTableProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveJobs();
  }, [employerId]);

  const fetchActiveJobs = async () => {
    const { data: jobsData } = await supabase
      .from('jobs')
      .select('*')
      .eq('employer_id', employerId)
      .eq('is_active', true)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5);

    if (jobsData) {
      const jobsWithCounts = await Promise.all(
        jobsData.map(async (job) => {
          const { count } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('job_id', job.id);
          
          // Consider a job "trending" if it has high engagement
          const isTrending = (count || 0) > 20 || (job.view_count || 0) > 100;

          return {
            ...job,
            applications_count: count || 0,
            is_trending: isTrending
          };
        })
      );
      setJobs(jobsWithCounts);
    }
    setLoading(false);
  };

  const getCategoryBadge = (category: string | null) => {
    const categoryMap: Record<string, string> = {
      'technology': 'Engineering',
      'engineering': 'Engineering',
      'design': 'Design',
      'marketing': 'Marketing',
      'sales': 'Sales',
      'hr': 'HR',
      'finance': 'Finance',
      'operations': 'Operations'
    };
    return categoryMap[category?.toLowerCase() || ''] || category || 'General';
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/4" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b">
        <h3 className="font-semibold text-foreground">Active Job Postings</h3>
        <Button 
          variant="link" 
          className="text-primary p-0 h-auto"
          onClick={onManageJobs}
        >
          Manage Jobs
        </Button>
      </div>

      {/* Table */}
      {jobs.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">No active job postings</p>
          <Link to="/post-job">
            <Button variant="link" className="text-primary mt-2">Post your first job</Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Job Title</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Department</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Applications</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Views</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Posted</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr 
                  key={job.id} 
                  className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/job/${job.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {job.title}
                      </Link>
                      {job.is_trending && (
                        <Badge className="bg-[hsl(142,53%,43%)]/10 text-[hsl(142,53%,43%)] hover:bg-[hsl(142,53%,43%)]/20 gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Trending
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{job.job_type || 'Full-time'}</p>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {getCategoryBadge(job.category)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      {job.applications_count}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Eye className="w-4 h-4" />
                      {job.view_count || 0}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
