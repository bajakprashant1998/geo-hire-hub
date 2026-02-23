import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Briefcase, Bookmark, Clock, Eye, CheckCircle2, XCircle, 
  Building2, MapPin, DollarSign, Trash2, ExternalLink 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ApplicationStatusTimeline } from './ApplicationStatusTimeline';

interface JobActivityTabsProps {
  candidateId: string;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending: { color: 'bg-warning/10 text-warning-foreground', icon: <Clock className="w-4 h-4" />, label: 'Applied' },
  reviewed: { color: 'bg-primary/10 text-primary', icon: <Eye className="w-4 h-4" />, label: 'Viewed' },
  shortlisted: { color: 'bg-success/10 text-success', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Shortlisted' },
  rejected: { color: 'bg-destructive/10 text-destructive', icon: <XCircle className="w-4 h-4" />, label: 'Rejected' },
  hired: { color: 'bg-success/10 text-success', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Hired' },
};

export const JobActivityTabs = ({ candidateId }: JobActivityTabsProps) => {
  const queryClient = useQueryClient();
  const [applications, setApplications] = useState<any[]>([]);
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [candidateId]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch applications
    const { data: appsData } = await supabase
      .from('applications')
      .select(`
        *,
        jobs (
          id, title, salary_range, job_type, latitude, longitude,
          employers (company_name)
        )
      `)
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });
    
    setApplications(appsData || []);

    // Fetch saved jobs
    const { data: savedData } = await supabase
      .from('saved_jobs')
      .select(`
        *,
        jobs (
          id, title, salary_range, job_type, latitude, longitude, status,
          employers (company_name)
        )
      `)
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });
    
    setSavedJobs(savedData || []);
    setLoading(false);
  };

  const removeSavedJob = async (savedJobId: string) => {
    try {
      const { error } = await supabase
        .from('saved_jobs')
        .delete()
        .eq('id', savedJobId);

      if (error) throw error;

      setSavedJobs(savedJobs.filter(sj => sj.id !== savedJobId));
      queryClient.invalidateQueries({ queryKey: ['saved-jobs', candidateId] });
      toast.success('Job removed from saved');
    } catch (error) {
      toast.error('Failed to remove job');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const JobCard = ({ job, application, saved }: { job: any; application?: any; saved?: any }) => {
    const status = application ? statusConfig[application.status] : null;

    return (
      <div className="card-google p-4 hover:shadow-md transition-shadow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Link to={`/jobs/${job.id}`} className="font-semibold hover:text-primary transition-colors">
                {job.title}
              </Link>
              {job.status === 'closed' && (
                <Badge variant="secondary" className="text-xs">Closed</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {job.employers?.company_name}
              </span>
              {job.salary_range && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  {job.salary_range}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{job.job_type}</Badge>
            </div>
            {/* Status Timeline for applications */}
            {application && (
              <ApplicationStatusTimeline status={application.status} />
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            {application && (
              <span className="text-muted-foreground">
                Applied {formatDate(application.created_at)}
              </span>
            )}
            {saved && (
              <>
                <span className="text-muted-foreground">
                  Saved {formatDate(saved.created_at)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeSavedJob(saved.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            <Link to={`/jobs/${job.id}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="shadow-google">
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-google-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          Job Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="applied">
          <TabsList className="grid grid-cols-2 w-full max-w-md mb-6">
            <TabsTrigger value="applied" className="gap-2">
              <Briefcase className="w-4 h-4" />
              Applied ({applications.length})
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Bookmark className="w-4 h-4" />
              Saved ({savedJobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applied" className="space-y-3">
            {applications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No applications yet</p>
                <Link to="/">
                  <Button variant="link">Browse Jobs on Map</Button>
                </Link>
              </div>
            ) : (
              applications.map((app) => (
                <JobCard key={app.id} job={app.jobs} application={app} />
              ))
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-3">
            {savedJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No saved jobs yet</p>
                <Link to="/">
                  <Button variant="link">Browse Jobs on Map</Button>
                </Link>
              </div>
            ) : (
              savedJobs.map((saved) => (
                <JobCard key={saved.id} job={saved.jobs} saved={saved} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
