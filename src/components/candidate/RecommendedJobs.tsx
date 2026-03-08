import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Sparkles, MapPin, Building2, Banknote, Clock, Bookmark, 
  BookmarkCheck, TrendingUp, Zap, ArrowRight, Search, SlidersHorizontal,
  Briefcase, Target, RefreshCw, ExternalLink, ChevronDown, ChevronUp,
  Star, Filter, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface RecommendedJobsProps {
  candidateId: string;
  skills: string[];
  latitude?: number | null;
  longitude?: number | null;
}

type SortOption = 'relevance' | 'newest' | 'salary' | 'distance';
type MatchFilter = 'all' | 'perfect' | 'great' | 'good';

interface AIRecommendation {
  id: string;
  title: string;
  description?: string;
  job_type: string;
  salary_range?: string;
  job_address?: string;
  created_at: string;
  work_mode?: string;
  company_name: string;
  industry?: string;
  avatar_url?: string;
  score: number;
  reasons: string[];
  is_saved: boolean;
}

// --- Sub-components ---

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn("flex items-center gap-3 p-3 rounded-xl border border-border bg-card")}
  >
    <div className={cn("p-2 rounded-lg", color)}>
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-lg font-bold text-foreground leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  </motion.div>
);

const MatchBadge = ({ score }: { score: number }) => {
  const config = score >= 70
    ? { label: 'Perfect Match', bg: 'bg-[hsl(var(--success))]/10', text: 'text-[hsl(var(--success))]', border: 'border-[hsl(var(--success))]/20', icon: Zap }
    : score >= 50
    ? { label: 'Great Match', bg: 'bg-[hsl(var(--primary))]/10', text: 'text-primary', border: 'border-primary/20', icon: TrendingUp }
    : score >= 30
    ? { label: 'Good Match', bg: 'bg-[hsl(var(--warning))]/10', text: 'text-[hsl(var(--warning))]', border: 'border-[hsl(var(--warning))]/20', icon: Star }
    : null;

  if (!config) return null;
  const BadgeIcon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap", config.bg, config.text, config.border)}>
      <BadgeIcon className="w-3 h-3" />
      {config.label} ({score}%)
    </span>
  );
};

const JobCard = ({ job, isSaved, onToggleSave, index }: { job: any; isSaved: boolean; onToggleSave: (id: string, e: React.MouseEvent) => void; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const daysAgo = Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : daysAgo < 7 ? `${daysAgo}d ago` : new Date(job.created_at).toLocaleDateString();
  const isPerfect = job.relevanceScore >= 70;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link 
        to={`/jobs/${job.id}`}
        className={cn(
          "block p-4 rounded-xl transition-all duration-200 group border bg-card hover:shadow-[var(--shadow-hover)]",
          isPerfect 
            ? "border-[hsl(var(--success))]/30 hover:border-[hsl(var(--success))]/50" 
            : "border-border hover:border-primary/30"
        )}
      >
        {/* Top accent for perfect matches */}
        {isPerfect && (
          <div className="h-0.5 -mt-4 -mx-4 mb-3 rounded-t-xl bg-gradient-to-r from-[hsl(var(--success))] via-primary to-[hsl(var(--warning))]" />
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1 font-heading">
                {job.title}
              </h4>
              {isNew && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20">
                  NEW
                </Badge>
              )}
              <MatchBadge score={job.relevanceScore} />
            </div>

            {/* Company */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{job.employers?.company_name}</span>
            </div>
          </div>

          {/* Save button */}
          <Button 
            variant="ghost" 
            size="icon"
            className="shrink-0 rounded-xl h-9 w-9 hover:bg-primary/10"
            onClick={(e) => onToggleSave(job.id, e)}
          >
            {isSaved ? (
              <BookmarkCheck className="w-4 h-4 text-primary" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {job.job_address && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[140px]">{job.job_address}</span>
            </span>
          )}
          {job.salary_range && (
            <span className="inline-flex items-center gap-1 text-xs bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] px-2.5 py-1 rounded-full font-medium border border-[hsl(var(--success))]/20">
              <Banknote className="w-3 h-3" />
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
            {timeLabel}
          </span>
        </div>

        {/* Expandable details */}
        {job.description && (
          <div className="mt-2">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded); }}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Less details' : 'Quick preview'}
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="text-xs text-muted-foreground mt-1.5 line-clamp-3 overflow-hidden"
                >
                  {job.description.slice(0, 200)}...
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}
      </Link>
    </motion.div>
  );
};

const RecommendedSkeleton = () => (
  <Card className="border border-border bg-card">
    <CardHeader className="bg-secondary/50 border-b border-border">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="pt-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
      {[1,2,3].map(i => (
        <div key={i} className="p-4 rounded-xl border border-border space-y-3">
          <div className="flex justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="w-9 h-9 rounded-xl" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

// --- Main Component ---

export const RecommendedJobs = ({ candidateId, skills, latitude, longitude }: RecommendedJobsProps) => {
  const queryClient = useQueryClient();
  const [jobs, setJobs] = useState<any[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all');

  const [aiInsight, setAiInsight] = useState('');
  const [profileSummary, setProfileSummary] = useState<{ skills_count: number; applied_count: number; viewed_count: number; saved_count: number } | null>(null);

  useEffect(() => {
    fetchAIRecommendations();
    fetchSavedJobs();
  }, [candidateId]);

  const fetchAIRecommendations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-job-recommendations`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (!res.ok) throw new Error('Failed to fetch recommendations');

      const data = await res.json();
      const recs = (data.recommendations || []).map((r: any) => ({
        ...r,
        relevanceScore: r.score,
        employers: { company_name: r.company_name },
      }));

      setJobs(recs);
      setAiInsight(data.insight || '');
      setProfileSummary(data.profile_summary || null);
    } catch (error) {
      console.error('AI recommendations error, falling back to basic:', error);
      // Fallback to basic query
      await fetchBasicRecommendations();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBasicRecommendations = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select(`*, employers!inner(company_name, profile_id, profiles!inner(avatar_url))`)
      .eq('status', 'open')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      const scoredJobs = data.map(job => {
        let score = 0;
        if (skills.length > 0 && job.description) {
          const descLower = job.description.toLowerCase();
          skills.forEach(skill => { if (descLower.includes(skill.toLowerCase())) score += 10; });
        }
        const daysOld = (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld < 7) score += 5;
        return { ...job, relevanceScore: score, reasons: [] as string[] };
      });
      scoredJobs.sort((a, b) => b.relevanceScore - a.relevanceScore);
      setJobs(scoredJobs);
    }
  };

  const fetchSavedJobs = async () => {
    const { data } = await supabase.from('saved_jobs').select('job_id').eq('candidate_id', candidateId);
    if (data) setSavedJobIds(new Set(data.map(sj => sj.job_id)));
  };

  const toggleSaveJob = async (jobId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isSaved = savedJobIds.has(jobId);

    if (isSaved) {
      const { error } = await supabase.from('saved_jobs').delete().eq('candidate_id', candidateId).eq('job_id', jobId);
      if (!error) {
        setSavedJobIds(prev => { const next = new Set(prev); next.delete(jobId); return next; });
        toast.success('Job removed from saved');
        queryClient.invalidateQueries({ queryKey: ['saved-jobs', candidateId] });
      }
    } else {
      const { error } = await supabase.from('saved_jobs').insert({ candidate_id: candidateId, job_id: jobId });
      if (!error) {
        setSavedJobIds(prev => new Set(prev).add(jobId));
        toast.success('Job saved!');
        queryClient.invalidateQueries({ queryKey: ['saved-jobs', candidateId] });
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAIRecommendations();
    fetchSavedJobs();
  };

  // --- Filtering & Sorting ---
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(j =>
        j.title?.toLowerCase().includes(q) ||
        j.employers?.company_name?.toLowerCase().includes(q) ||
        j.job_address?.toLowerCase().includes(q)
      );
    }

    // Match filter
    if (matchFilter === 'perfect') result = result.filter(j => j.relevanceScore >= 70);
    else if (matchFilter === 'great') result = result.filter(j => j.relevanceScore >= 50);
    else if (matchFilter === 'good') result = result.filter(j => j.relevanceScore >= 30);

    // Sort
    if (sortBy === 'newest') result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sortBy === 'relevance') result.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return result;
  }, [jobs, searchQuery, sortBy, matchFilter]);

  // --- Stats ---
  const stats = useMemo(() => ({
    total: jobs.length,
    perfect: jobs.filter(j => j.relevanceScore >= 70).length,
    great: jobs.filter(j => j.relevanceScore >= 50 && j.relevanceScore < 70).length,
    newToday: jobs.filter(j => {
      const d = (Date.now() - new Date(j.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return d < 1;
    }).length,
  }), [jobs]);

  const matchFilters: { key: MatchFilter; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'All', count: jobs.length, color: 'bg-secondary text-foreground' },
    { key: 'perfect', label: 'Perfect', count: stats.perfect, color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
    { key: 'great', label: 'Great', count: stats.great, color: 'bg-primary/10 text-primary' },
    { key: 'good', label: 'Good+', count: jobs.filter(j => j.relevanceScore >= 30).length, color: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' },
  ];

  if (loading) return <RecommendedSkeleton />;

  if (jobs.length === 0) {
    return (
      <Card className="border border-border bg-card">
        <CardHeader className="bg-secondary/50 border-b border-border">
          <CardTitle className="flex items-center gap-3 font-heading">
            <div className="p-2.5 bg-[hsl(var(--warning))]/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-[hsl(var(--warning))]" />
            </div>
            Recommended Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold font-heading mb-2 text-foreground">No recommendations yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
              Add more skills to your profile so we can find jobs tailored to your expertise.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/">
                <Button variant="outline" className="rounded-xl">
                  <MapPin className="w-4 h-4 mr-2" /> Explore Map
                </Button>
              </Link>
              <Link to="/browse-jobs">
                <Button className="rounded-xl">
                  <Briefcase className="w-4 h-4 mr-2" /> Browse Jobs
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="border border-border overflow-hidden bg-card">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between bg-secondary/50 border-b border-border gap-2">
          <CardTitle className="flex items-center gap-3 font-heading">
            <div className="p-2.5 bg-[hsl(var(--warning))]/10 rounded-xl shadow-[var(--shadow-xs)]">
              <Sparkles className="w-5 h-5 text-[hsl(var(--warning))]" />
            </div>
            <div>
              <span>Recommended Jobs</span>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                Based on your skills & preferences
              </p>
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 rounded-full px-3 border border-primary/20 font-semibold">
              {filteredJobs.length} matches
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh recommendations</TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Briefcase} label="Total Matches" value={stats.total} color="bg-primary/10 text-primary" />
            <StatCard icon={Zap} label="Perfect Matches" value={stats.perfect} color="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" />
            <StatCard icon={TrendingUp} label="Great Matches" value={stats.great} color="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" />
            <StatCard icon={Clock} label="New Today" value={stats.newToday} color="bg-destructive/10 text-destructive" />
          </div>

          {/* Search + Sort */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, company, or location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl bg-secondary/50 border-border"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-[160px] rounded-xl bg-secondary/50 border-border">
                <SlidersHorizontal className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Best Match</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Match filter chips */}
          <div className="flex gap-2 flex-wrap">
            {matchFilters.map(f => (
              <button
                key={f.key}
                onClick={() => setMatchFilter(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                  matchFilter === f.key
                    ? cn(f.color, "border-current ring-1 ring-current/20")
                    : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/30"
                )}
              >
                {f.label}
                <span className="bg-background/60 text-[10px] px-1.5 py-0 rounded-full">{f.count}</span>
              </button>
            ))}
          </div>

          {/* Job list */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredJobs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-10"
                >
                  <Filter className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No jobs match your current filters.</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearchQuery(''); setMatchFilter('all'); }}>
                    Clear filters
                  </Button>
                </motion.div>
              ) : (
                filteredJobs.map((job, index) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isSaved={savedJobIds.has(job.id)}
                    onToggleSave={toggleSaveJob}
                    index={index}
                  />
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Footer CTA */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Link to="/" className="flex-1">
              <Button variant="outline" className="w-full rounded-xl group border-border hover:border-primary/30 hover:bg-secondary">
                <MapPin className="w-4 h-4 mr-2" />
                View All Jobs on Map
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/browse-jobs" className="flex-1">
              <Button variant="outline" className="w-full rounded-xl group border-border hover:border-primary/30 hover:bg-secondary">
                <Briefcase className="w-4 h-4 mr-2" />
                Browse All Jobs
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
