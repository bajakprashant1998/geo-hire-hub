import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Users, Clock, TrendingUp, Pencil, Trash2, Loader2, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [deletingJob, setDeletingJob] = useState(false);

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

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    
    setDeletingJob(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobToDelete.id);
      
      if (error) throw error;
      
      setJobs(jobs.filter(j => j.id !== jobToDelete.id));
      toast.success('Job deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete job: ' + error.message);
    } finally {
      setDeletingJob(false);
      setJobToDelete(null);
    }
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
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr 
                  key={job.id} 
                  className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/jobs/${job.id}`}
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
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/edit-job/${job.id}`)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/jobs/${job.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Job
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/edit-job/${job.id}`)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Job
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setJobToDelete(job)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Job
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Job Confirmation Dialog */}
      <AlertDialog open={!!jobToDelete} onOpenChange={() => setJobToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Posting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{jobToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingJob}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteJob}
              disabled={deletingJob}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingJob ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Job'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
