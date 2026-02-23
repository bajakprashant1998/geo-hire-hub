import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, MapPin, Building2, DollarSign, Clock, Bookmark, 
  BookmarkCheck, TrendingUp, Zap, ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RecommendedJobsProps {
  candidateId: string;
  skills: string[];
  latitude?: number | null;
  longitude?: number | null;
}

export const RecommendedJobs = ({ candidateId, skills, latitude, longitude }: RecommendedJobsProps) => {
  const queryClient = useQueryClient();
  const [jobs, setJobs] = useState<any[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendedJobs();
    fetchSavedJobs();
  }, [skills, latitude, longitude]);

  const fetchRecommendedJobs = async () => {
    try {
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

      const scoredJobs = (data || []).map(job => {
        let score = 0;
        
        if (skills.length > 0 && job.description) {
          const descLower = job.description.toLowerCase();
          skills.forEach(skill => {
            if (descLower.includes(skill.toLowerCase())) score += 10;
          });
        }

        if (job.category && skills.some(s => job.category?.toLowerCase().includes(s.toLowerCase()))) {
          score += 5;
        }

        if (latitude && longitude && job.latitude && job.longitude) {
          const distance = Math.sqrt(
            Math.pow(job.latitude - latitude, 2) + 
            Math.pow(job.longitude - longitude, 2)
          );
          if (distance < 0.5) score += 15;
          else if (distance < 1) score += 10;
          else if (distance < 2) score += 5;
        }

        const daysOld = (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld < 7) score += 5;
        if (daysOld < 3) score += 5;

        return { ...job, relevanceScore: score };
      });

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

  const toggleSaveJob = async (jobId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
        queryClient.invalidateQueries({ queryKey: ['saved-jobs', candidateId] });
      }
    } else {
      const { error } = await supabase
        .from('saved_jobs')
        .insert({ candidate_id: candidateId, job_id: jobId });

      if (!error) {
        setSavedJobIds(prev => new Set(prev).add(jobId));
        toast.success('Job saved!');
        queryClient.invalidateQueries({ queryKey: ['saved-jobs', candidateId] });
      }
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    return d.toLocaleDateString();
  };

  // Google-colored match badges
  const getMatchBadge = (score: number) => {
    if (score >= 25) return { label: 'Perfect Match', color: 'bg-google-green/10 text-google-green border-google-green/20', icon: Zap };
    if (score >= 15) return { label: 'Great Match', color: 'bg-google-blue/10 text-google-blue border-google-blue/20', icon: TrendingUp };
    if (score >= 5) return { label: 'Good Match', color: 'bg-google-yellow/10 text-google-yellow border-google-yellow/20', icon: Sparkles };
    return null;
  };

  if (loading) {
    return (
      <Card className="border border-border shadow-google-lg bg-card">
        <CardHeader className="bg-secondary/50 border-b border-border">
          <CardTitle className="flex items-center gap-3 font-heading">
            <div className="p-2.5 bg-google-yellow/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-google-yellow" />
            </div>
            Recommended Jobs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 bg-secondary/50 rounded-xl space-y-3 border border-border">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="border border-border shadow-google-lg bg-card">
        <CardHeader className="bg-secondary/50 border-b border-border">
          <CardTitle className="flex items-center gap-3 font-heading">
            <div className="p-2.5 bg-google-yellow/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-google-yellow" />
            </div>
            Recommended Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold font-heading mb-1">No matches yet</h3>
            <p className="text-sm text-muted-foreground">
              Complete your profile to get personalized recommendations
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border shadow-google-lg overflow-hidden bg-card">
      <CardHeader className="flex flex-row items-center justify-between bg-secondary/50 border-b border-border">
        <CardTitle className="flex items-center gap-3 font-heading">
          <div className="p-2.5 bg-google-yellow/10 rounded-xl shadow-google">
            <Sparkles className="w-5 h-5 text-google-yellow" />
          </div>
          <div>
            <span>Recommended Jobs</span>
            <p className="text-xs font-normal text-muted-foreground mt-0.5">
              Based on your skills & preferences
            </p>
          </div>
        </CardTitle>
        <Badge className="bg-google-blue/10 text-google-blue hover:bg-google-blue/20 rounded-full px-3 border border-google-blue/20 font-semibold">
          {jobs.length} matches
        </Badge>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {jobs.map(job => {
          const matchBadge = getMatchBadge(job.relevanceScore);
          const MatchIcon = matchBadge?.icon || Sparkles;

          return (
            <Link 
              to={`/jobs/${job.id}`}
              key={job.id} 
              className="block p-4 bg-secondary/30 hover:bg-secondary/60 rounded-xl transition-all duration-200 group border border-border hover:border-primary/30 hover:shadow-google"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1 font-heading">
                      {job.title}
                    </h4>
                    {matchBadge && (
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap border",
                        matchBadge.color
                      )}>
                        <MatchIcon className="w-3 h-3" />
                        {matchBadge.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{job.employers?.company_name}</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="shrink-0 rounded-xl h-9 w-9 hover:bg-google-blue/10"
                  onClick={(e) => toggleSaveJob(job.id, e)}
                >
                  {savedJobIds.has(job.id) ? (
                    <BookmarkCheck className="w-4 h-4 text-google-blue" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {job.salary_range && (
                  <span className="inline-flex items-center gap-1 text-xs bg-google-green/10 text-google-green px-2.5 py-1 rounded-full font-medium border border-google-green/20">
                    <DollarSign className="w-3 h-3" />
                    {job.salary_range}
                  </span>
                )}
                {job.job_type && (
                  <Badge variant="secondary" className="text-xs rounded-full font-medium">
                    {job.job_type}
                  </Badge>
                )}
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground ml-auto font-medium">
                  <Clock className="w-3 h-3" />
                  {formatDate(job.created_at)}
                </span>
              </div>
            </Link>
          );
        })}

        <Link to="/" className="block">
          <Button variant="outline" className="w-full rounded-xl mt-2 group border-border hover:border-primary/30 hover:bg-secondary">
            <MapPin className="w-4 h-4 mr-2" />
            View All Jobs on Map
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};
