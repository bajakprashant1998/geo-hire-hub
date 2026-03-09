import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Bookmark, MapPin, ExternalLink, Clock, AlertTriangle,
  Search, X, Trash2, BookmarkCheck, Building2, Briefcase,
  Filter, SortAsc
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { differenceInDays, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { SalaryBadge } from '@/components/SalaryBadge';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SavedJobsSectionProps {
  candidateId: string;
}

type SortBy = 'recent' | 'expiring' | 'title';

/** Returns days remaining until expires_at. Negative = already expired. null = no expiry set. */
const getDaysRemaining = (expiresAt: string | null): number | null => {
  if (!expiresAt) return null;
  return differenceInDays(new Date(expiresAt), new Date());
};

/* ─── Expiry Badge ─── */
const ExpiryBadge = ({
  expiresAt,
  isActive,
  status,
}: {
  expiresAt: string | null;
  isActive: boolean;
  status: string;
}) => {
  if (!isActive || status !== 'open') {
    return (
      <Badge variant="outline" className="text-[9px] h-[18px] px-1.5 border-destructive/25 text-destructive bg-destructive/8 gap-0.5 shrink-0">
        <AlertTriangle className="w-2.5 h-2.5" /> Closed
      </Badge>
    );
  }

  const daysRemaining = getDaysRemaining(expiresAt);

  // No expiry date set — no badge
  if (daysRemaining === null) return null;

  if (daysRemaining < 0) {
    return (
      <Badge variant="outline" className="text-[9px] h-[18px] px-1.5 border-destructive/25 text-destructive bg-destructive/8 gap-0.5 shrink-0">
        <AlertTriangle className="w-2.5 h-2.5" /> Expired
      </Badge>
    );
  }

  if (daysRemaining === 0) {
    return (
      <Badge variant="outline" className="text-[9px] h-[18px] px-1.5 border-destructive/25 text-destructive bg-destructive/8 gap-0.5 shrink-0 animate-pulse">
        <Clock className="w-2.5 h-2.5" /> Expires today
      </Badge>
    );
  }

  if (daysRemaining <= 3) {
    return (
      <Badge variant="outline" className="text-[9px] h-[18px] px-1.5 border-destructive/25 text-destructive bg-destructive/8 gap-0.5 shrink-0 animate-pulse">
        <Clock className="w-2.5 h-2.5" /> {daysRemaining}d left
      </Badge>
    );
  }

  if (daysRemaining <= 7) {
    return (
      <Badge variant="outline" className="text-[9px] h-[18px] px-1.5 border-warning/30 text-warning-foreground bg-warning/10 gap-0.5 shrink-0">
        <Clock className="w-2.5 h-2.5" /> {daysRemaining}d left
      </Badge>
    );
  }

  return null;
};

/* ─── Loading Skeleton ─── */
const SavedSkeleton = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
    </div>
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="rounded-2xl border border-border/30 p-4 space-y-3">
        <div className="flex justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/5 rounded-lg" />
            <Skeleton className="h-3.5 w-2/5 rounded-lg" />
          </div>
          <Skeleton className="h-5 w-5 rounded shrink-0" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-[18px] w-16 rounded-full" />
          <Skeleton className="h-[18px] w-20 rounded-full" />
        </div>
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>
    ))}
  </div>
);

/* ─── Saved Job Card ─── */
const SavedCard = ({ saved, index, onRemove }: { saved: any; index: number; onRemove: (id: string) => void }) => {
  const job = saved.job as any;
  if (!job) return null;

  const employer = job.employer as any;
  const isClosed = !job.is_active || job.status !== 'open';
  const timeAgo = formatDistanceToNow(new Date(saved.created_at), { addSuffix: true });
  const daysRemaining = getDaysRemaining(job.expires_at);
  const isUrgent = !isClosed && daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.025, 0.2), duration: 0.25 }}
      layout
      className={cn(
        'group relative bg-card/70 backdrop-blur-xl border rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200',
        isClosed ? 'border-border/20 opacity-60' : isUrgent ? 'border-destructive/20' : 'border-border/30 hover:border-border/50'
      )}
    >
      {/* Urgency accent */}
      {isUrgent && <div className="h-[2px] w-full bg-gradient-to-r from-destructive to-destructive/40" />}

      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/jobs/${job.id}`}
                className="text-[15px] font-semibold text-foreground hover:text-primary transition-colors line-clamp-1 leading-tight"
              >
                {job.title}
              </Link>
              <ExpiryBadge expiresAt={job.expires_at} isActive={job.is_active} status={job.status} />
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                <span className="truncate max-w-[180px]">{employer?.company_name || 'Company'}</span>
              </span>
            </div>
          </div>
          <BookmarkCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground mb-3">
          {job.job_address && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[140px]">{job.job_address.split(',')[0]}</span>
            </span>
          )}
          {job.salary_range && (
            <span className="font-semibold text-foreground">{job.salary_range}</span>
          )}
          {job.salary_range && <SalaryBadge salaryRange={job.salary_range} compact />}
          {job.job_type && (
            <Badge variant="secondary" className="text-[10px] h-[18px] px-1.5 font-medium">{job.job_type}</Badge>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/20">
          <Link to={`/jobs/${job.id}`} className="flex-1">
            <Button
              size="sm"
              className={cn(
                'w-full h-9 rounded-xl text-xs font-semibold gap-1.5',
                isClosed ? 'bg-muted text-muted-foreground pointer-events-none' : 'shadow-sm shadow-primary/10'
              )}
              disabled={isClosed}
            >
              {isClosed ? 'Position Closed' : <>View & Apply <ExternalLink className="w-3 h-3" /></>}
            </Button>
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl border-border/30 shrink-0 text-destructive/60 hover:text-destructive hover:bg-destructive/5 transition-colors"
                onClick={() => onRemove(saved.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Remove from saved</TooltipContent>
          </Tooltip>
        </div>

        {/* Saved date */}
        <p className="text-[10px] text-muted-foreground/60 mt-2">Saved {timeAgo}</p>
      </div>
    </motion.div>
  );
};

/* ─── Main Component ─── */
export const SavedJobsSection = ({ candidateId }: SavedJobsSectionProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [showClosedOnly, setShowClosedOnly] = useState<boolean | null>(null); // null = all

  const { data: savedJobs, isLoading } = useQuery({
    queryKey: ['saved-jobs', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_jobs')
        .select(`
          id, created_at,
          job:jobs(id, title, salary_range, job_type, job_address, employer_id, is_active, status, created_at, expires_at, slug,
            employer:employers(company_name)
          )
        `)
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const removeSavedJob = async (savedJobId: string) => {
    try {
      const { error } = await supabase.from('saved_jobs').delete().eq('id', savedJobId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['saved-jobs', candidateId] });
      toast.success('Job removed from saved');
    } catch {
      toast.error('Failed to remove job');
    }
  };

  // Stats
  const stats = useMemo(() => {
    if (!savedJobs) return { total: 0, active: 0, expiring: 0, closed: 0 };
    let active = 0, expiring = 0, closed = 0;
    savedJobs.forEach(s => {
      const job = s.job as any;
      if (!job) return;
      if (!job.is_active || job.status !== 'open') { closed++; return; }
      active++;
      const days = getDaysRemaining(job.expires_at);
      if (days !== null && days >= 0 && days <= 7) expiring++;
    });
    return { total: savedJobs.length, active, expiring, closed };
  }, [savedJobs]);

  // Filter & sort
  const filteredJobs = useMemo(() => {
    if (!savedJobs) return [];
    let result = [...savedJobs];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => {
        const job = s.job as any;
        return job?.title?.toLowerCase().includes(q) || (job?.employer as any)?.company_name?.toLowerCase().includes(q);
      });
    }

    // Status filter
    if (showClosedOnly === true) {
      result = result.filter(s => { const j = s.job as any; return !j?.is_active || j?.status !== 'open'; });
    } else if (showClosedOnly === false) {
      result = result.filter(s => { const j = s.job as any; return j?.is_active && j?.status === 'open'; });
    }

    // Sort
    result.sort((a, b) => {
      const ja = a.job as any, jb = b.job as any;
      if (sortBy === 'expiring') {
        // Jobs with expires_at sort ascending (soonest first); null expires_at goes to end
        const daysA = getDaysRemaining(ja?.expires_at);
        const daysB = getDaysRemaining(jb?.expires_at);
        if (daysA === null && daysB === null) return 0;
        if (daysA === null) return 1;
        if (daysB === null) return -1;
        return daysA - daysB;
      }
      if (sortBy === 'title') return (ja?.title || '').localeCompare(jb?.title || '');
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [savedJobs, search, sortBy, showClosedOnly]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 animate-pulse" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-3 w-48 rounded-lg" />
          </div>
        </div>
        <SavedSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20"
        >
          <Bookmark className="w-5 h-5 text-primary-foreground" />
        </motion.div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Saved Jobs</h2>
          <p className="text-[11px] sm:text-xs text-muted-foreground">Jobs you've bookmarked for later</p>
        </div>
      </div>

      {!savedJobs || savedJobs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-muted/40 flex items-center justify-center mb-5">
            <Bookmark className="w-10 h-10 text-muted-foreground/25" />
          </div>
          <h3 className="font-semibold text-foreground mb-1.5 text-lg">No saved jobs yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-5">
            Tap the bookmark icon on any job to save it here for quick access later.
          </p>
          <div className="flex gap-2">
            <Link to="/">
              <Button variant="outline" className="rounded-xl gap-2 text-sm">
                <MapPin className="w-3.5 h-3.5" /> Jobs on Map
              </Button>
            </Link>
            <Link to="/browse-jobs">
              <Button className="rounded-xl gap-2 text-sm shadow-sm">
                <Search className="w-3.5 h-3.5" /> Browse Jobs
              </Button>
            </Link>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-3 gap-2"
          >
            {[
              { label: 'Active', value: stats.active, color: 'text-success', bg: 'bg-success/10', icon: Briefcase, onClick: () => setShowClosedOnly(showClosedOnly === false ? null : false) },
              { label: 'Expiring Soon', value: stats.expiring, color: 'text-warning-foreground', bg: 'bg-warning/10', icon: Clock, onClick: () => setSortBy('expiring') },
              { label: 'Closed', value: stats.closed, color: 'text-destructive', bg: 'bg-destructive/10', icon: AlertTriangle, onClick: () => setShowClosedOnly(showClosedOnly === true ? null : true) },
            ].map((stat, i) => (
              <motion.button
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.08 + i * 0.04 }}
                onClick={stat.onClick}
                className={cn(
                  'flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-card/60 backdrop-blur border border-border/30 text-left hover:border-border/50 transition-all',
                  (showClosedOnly === false && stat.label === 'Active') || (showClosedOnly === true && stat.label === 'Closed') ? 'ring-1 ring-primary/30 border-primary/20' : ''
                )}
              >
                <div className={cn('w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0', stat.bg)}>
                  <stat.icon className={cn('w-4 h-4', stat.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-base sm:text-lg font-bold text-foreground leading-none tabular-nums">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>

          {/* Search + Sort */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-2 flex-wrap"
          >
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search saved jobs..."
                className="h-9 pl-9 pr-8 text-xs rounded-xl border-border/40 bg-muted/30"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground" />
                </button>
              )}
            </div>
            <Select value={sortBy} onValueChange={v => setSortBy(v as SortBy)}>
              <SelectTrigger className="w-[140px] h-9 rounded-xl border-border/40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently Saved</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="title">Job Title</SelectItem>
              </SelectContent>
            </Select>
            {showClosedOnly !== null && (
              <Button variant="ghost" size="sm" className="h-9 rounded-xl text-xs gap-1 text-muted-foreground" onClick={() => setShowClosedOnly(null)}>
                <X className="w-3 h-3" /> Clear filter
              </Button>
            )}
          </motion.div>

          {/* Results count */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs h-7 px-3 rounded-lg font-medium tabular-nums">
              {filteredJobs.length} of {savedJobs.length} jobs
            </Badge>
          </div>

          {/* Job Cards */}
          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {filteredJobs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-muted-foreground"
                >
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No saved jobs match your search.</p>
                  <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => { setSearch(''); setShowClosedOnly(null); }}>
                    Clear filters
                  </Button>
                </motion.div>
              ) : (
                filteredJobs.map((saved, i) => (
                  <SavedCard key={saved.id} saved={saved} index={i} onRemove={removeSavedJob} />
                ))
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
};
