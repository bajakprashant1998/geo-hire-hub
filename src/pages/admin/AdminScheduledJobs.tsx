import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { StatsCard } from '@/components/admin/StatsCard';
import { Play, CheckCircle, XCircle, Clock, Activity, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

interface ScheduledJob {
  name: string;
  description: string;
  functionName: string;
  schedule: string;
  lastRun?: { status: string; started_at: string; completed_at?: string; error_message?: string; result?: any };
}

const SCHEDULED_JOBS: Omit<ScheduledJob, 'lastRun'>[] = [
  { name: 'Message Cleanup', description: 'Delete messages older than 60 days and associated attachments', functionName: 'cleanup-old-messages', schedule: 'Daily at midnight' },
  { name: 'Auto Apply Jobs', description: 'Run automated job applications for opted-in candidates', functionName: 'auto-apply-jobs', schedule: 'Every 6 hours' },
  { name: 'Sitemap Generation', description: 'Regenerate XML sitemap with latest jobs and profiles', functionName: 'sitemap', schedule: 'Daily at 3 AM' },
  { name: 'Send Notification Emails', description: 'Process and send pending notification emails', functionName: 'send-notification-email', schedule: 'On trigger' },
];

export default function AdminScheduledJobs() {
  const queryClient = useQueryClient();
  const [runningJob, setRunningJob] = useState<string | null>(null);

  const { data: jobRuns, isLoading } = useQuery({
    queryKey: ['admin-scheduled-job-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_job_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const triggerJobMutation = useMutation({
    mutationFn: async (functionName: string) => {
      setRunningJob(functionName);

      // Log the run start
      const { data: runRecord } = await supabase
        .from('scheduled_job_runs')
        .insert({ job_name: functionName, status: 'running' })
        .select()
        .single();

      try {
        const { data, error } = await supabase.functions.invoke(functionName);
        
        if (runRecord) {
          await supabase
            .from('scheduled_job_runs')
            .update({
              status: error ? 'error' : 'success',
              completed_at: new Date().toISOString(),
              error_message: error?.message || null,
              result: data || {},
            })
            .eq('id', runRecord.id);
        }
        
        if (error) throw error;
        return data;
      } catch (err: any) {
        if (runRecord) {
          await supabase
            .from('scheduled_job_runs')
            .update({
              status: 'error',
              completed_at: new Date().toISOString(),
              error_message: err.message,
            })
            .eq('id', runRecord.id);
        }
        throw err;
      }
    },
    onSuccess: (_, functionName) => {
      queryClient.invalidateQueries({ queryKey: ['admin-scheduled-job-runs'] });
      toast.success(`${functionName} completed successfully`);
      setRunningJob(null);
    },
    onError: (error, functionName) => {
      toast.error(`${functionName} failed: ${error.message}`);
      setRunningJob(null);
    },
  });

  // Merge last run data into job configs
  const jobsWithStatus: ScheduledJob[] = SCHEDULED_JOBS.map(job => {
    const lastRun = jobRuns?.find(r => r.job_name === job.functionName);
    return {
      ...job,
      lastRun: lastRun ? {
        status: lastRun.status,
        started_at: lastRun.started_at,
        completed_at: lastRun.completed_at || undefined,
        error_message: lastRun.error_message || undefined,
        result: lastRun.result,
      } : undefined,
    };
  });

  const successRuns = jobRuns?.filter(r => r.status === 'success').length || 0;
  const errorRuns = jobRuns?.filter(r => r.status === 'error').length || 0;
  const lastRunTime = jobRuns?.[0]?.started_at;

  return (
    <AdminLayout title="Scheduled Jobs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Jobs" value={SCHEDULED_JOBS.length} icon={Activity} />
        <StatsCard title="Successful Runs" value={successRuns} icon={CheckCircle} variant="success" />
        <StatsCard title="Failed Runs" value={errorRuns} icon={XCircle} variant={errorRuns > 0 ? 'destructive' : 'default'} />
        <StatsCard
          title="Last Activity"
          value={lastRunTime ? formatDistanceToNow(new Date(lastRunTime), { addSuffix: true }) : 'Never'}
          icon={Clock}
        />
      </div>

      {/* Job Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {jobsWithStatus.map(job => (
          <Card key={job.functionName}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{job.name}</CardTitle>
                {job.lastRun?.status === 'success' && <Badge className="bg-success/10 text-success border-success/20">Healthy</Badge>}
                {job.lastRun?.status === 'error' && <Badge variant="destructive">Error</Badge>}
                {!job.lastRun && <Badge variant="secondary">No runs</Badge>}
              </div>
              <CardDescription>{job.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Schedule: {job.schedule}
                  </p>
                  {job.lastRun && (
                    <p className="text-muted-foreground">
                      Last run: {formatDistanceToNow(new Date(job.lastRun.started_at), { addSuffix: true })}
                    </p>
                  )}
                  {job.lastRun?.error_message && (
                    <p className="text-destructive text-xs">{job.lastRun.error_message}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => triggerJobMutation.mutate(job.functionName)}
                  disabled={runningJob === job.functionName}
                >
                  {runningJob === job.functionName ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Running</>
                  ) : (
                    <><Play className="h-3 w-3 mr-1" /> Run Now</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Run History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Run History</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-scheduled-job-runs'] })}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobRuns?.map(run => {
                  const duration = run.completed_at
                    ? ((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000).toFixed(1) + 's'
                    : '-';
                  return (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">{run.job_name}</TableCell>
                      <TableCell>
                        {run.status === 'success' && <Badge className="bg-success/10 text-success border-success/20">Success</Badge>}
                        {run.status === 'error' && <Badge variant="destructive">Error</Badge>}
                        {run.status === 'running' && <Badge variant="secondary">Running</Badge>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(run.started_at), 'MMM d, HH:mm:ss')}</TableCell>
                      <TableCell className="text-muted-foreground">{duration}</TableCell>
                      <TableCell className="text-destructive text-xs max-w-xs truncate">{run.error_message || '-'}</TableCell>
                    </TableRow>
                  );
                })}
                {(!jobRuns || jobRuns.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No run history</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
