import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, MapPin, Building2, DollarSign, Clock, Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecommendedJobsProps {
  candidateId: string;
  skills: string[];
  latitude?: number | null;
  longitude?: number | null;
}

export const RecommendedJobs = ({ candidateId, skills, latitude, longitude }: RecommendedJobsProps) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendedJobs();
    fetchSavedJobs();
  }, [skills, latitude, longitude]);

  const fetchRecommendedJobs = async () => {
    try {
      // Fetch jobs that match candidate's skills or are nearby
      let query = supabase
        .from('jobs')
        .select(`
          *,
          employers!inner(company_name, profile_id, profiles!inner(avatar_url))
        `)
        .eq('status', 'open')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data, error } = await query;

      if (error) throw error;

      // Score and sort jobs by relevance
      const scoredJobs = (data || []).map(job => {
        let score = 0;
        
        // Skill matching
        if (skills.length > 0 && job.description) {
          const descLower = job.description.toLowerCase();
          skills.forEach(skill => {
            if (descLower.includes(skill.toLowerCase())) score += 10;
          });
        }

        // Category matching
        if (job.category && skills.some(s => job.category?.toLowerCase().includes(s.toLowerCase()))) {
          score += 5;
        }

        // Location proximity (if coordinates available)
        if (latitude && longitude && job.latitude && job.longitude) {
          const distance = Math.sqrt(
            Math.pow(job.latitude - latitude, 2) + 
            Math.pow(job.longitude - longitude, 2)
          );
          if (distance < 0.5) score += 15; // Very close
          else if (distance < 1) score += 10;
          else if (distance < 2) score += 5;
        }

        // Recency bonus
        const daysOld = (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld < 7) score += 5;
        if (daysOld < 3) score += 5;

        return { ...job, relevanceScore: score };
      });

      // Sort by relevance score
      scoredJobs.sort((a, b) => b.relevanceScore - a.relevanceScore);
      setJobs(scoredJobs.slice(0, 6));
    } catch (error) {
      console.error('Error fetching recommended jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedJobs = async () => {
    const { data } = await supabase
      .from('saved_jobs')
      .select('job_id')
      .eq('candidate_id', candidateId);
    
    if (data) {
      setSavedJobIds(new Set(data.map(sj => sj.job_id)));
    }
  };

  const toggleSaveJob = async (jobId: string) => {
    const isSaved = savedJobIds.has(jobId);

    if (isSaved) {
      const { error } = await supabase
        .from('saved_jobs')
        .delete()
        .eq('candidate_id', candidateId)
        .eq('job_id', jobId);

      if (!error) {
        setSavedJobIds(prev => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
        toast.success('Job removed from saved');
      }
    } else {
      const { error } = await supabase
        .from('saved_jobs')
        .insert({ candidate_id: candidateId, job_id: jobId });

      if (!error) {
        setSavedJobIds(prev => new Set(prev).add(jobId));
        toast.success('Job saved!');
      }
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card className="shadow-google">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Recommended Jobs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 border rounded-lg space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="shadow-google">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Recommended Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No matching jobs found yet</p>
            <p className="text-sm">Complete your profile to get better recommendations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-google">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Recommended Jobs
          <Badge variant="secondary" className="ml-auto">{jobs.length} matches</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs.map(job => (
          <div 
            key={job.id} 
            className="p-4 border rounded-lg hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Link to={`/jobs/${job.id}`} className="font-medium hover:text-primary line-clamp-1">
                  {job.title}
                </Link>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="truncate">{job.employers?.company_name}</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="shrink-0"
                onClick={() => toggleSaveJob(job.id)}
              >
                {savedJobIds.has(job.id) ? (
                  <BookmarkCheck className="w-4 h-4 text-primary" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 mt-3 text-xs text-muted-foreground">
              {job.salary_range && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {job.salary_range}
                </span>
              )}
              {job.job_type && (
                <Badge variant="outline" className="text-xs">{job.job_type}</Badge>
              )}
              <span className="flex items-center gap-1 ml-auto">
                <Clock className="w-3 h-3" />
                {formatDate(job.created_at)}
              </span>
            </div>

            {job.relevanceScore > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span className="text-xs text-amber-600">
                  {job.relevanceScore >= 20 ? 'Excellent match' : 
                   job.relevanceScore >= 10 ? 'Good match' : 'Potential match'}
                </span>
              </div>
            )}
          </div>
        ))}

        <Link to="/" className="block">
          <Button variant="outline" className="w-full mt-2">
            <ExternalLink className="w-4 h-4 mr-2" />
            View All Jobs on Map
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};
