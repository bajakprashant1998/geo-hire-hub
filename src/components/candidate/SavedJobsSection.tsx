import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bookmark, MapPin, Briefcase, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface SavedJobsSectionProps {
  candidateId: string;
}

export const SavedJobsSection = ({ candidateId }: SavedJobsSectionProps) => {
  const { data: savedJobs, isLoading } = useQuery({
    queryKey: ['saved-jobs', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_jobs')
        .select(`
          id,
          created_at,
          job:jobs(id, title, salary_range, job_type, job_address, employer_id, is_active, status, created_at,
            employer:employers(company_name)
          )
        `)
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Saved Jobs</h3>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Bookmark className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Saved Jobs ({savedJobs?.length || 0})</h3>
      </div>

      {!savedJobs || savedJobs.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center">
            <Bookmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">No saved jobs yet</p>
            <p className="text-sm text-muted-foreground mt-1">Browse jobs and save them for later</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {savedJobs.map((saved) => {
            const job = saved.job as any;
            if (!job) return null;
            const employer = job.employer as any;
            
            return (
              <Card key={saved.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{job.title}</h4>
                      <p className="text-sm text-muted-foreground">{employer?.company_name || 'Unknown Company'}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {job.job_address && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {job.job_address}
                          </span>
                        )}
                        {job.job_type && (
                          <Badge variant="secondary" className="text-xs">{job.job_type}</Badge>
                        )}
                        {job.salary_range && (
                          <span className="text-xs text-muted-foreground">{job.salary_range}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Saved {format(new Date(saved.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Link to={`/jobs/${job.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
