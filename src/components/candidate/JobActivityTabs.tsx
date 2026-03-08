import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Briefcase, Bookmark, Clock, Eye, CheckCircle2, XCircle,
  Building2, MapPin, Trash2, ExternalLink, Search, X,
  TrendingUp, BookmarkCheck, Zap, Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ApplicationStatusTimeline } from './ApplicationStatusTimeline';
import { SalaryBadge } from '@/components/SalaryBadge';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface JobActivityTabsProps {
  candidateId: string;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string; dotColor: string }> = {
  pending: { color: 'bg-warning/10 text-warning-foreground', icon: <Clock className="w-3.5 h-3.5" />, label: 'Applied', dotColor: 'bg-warning' },
  reviewed: { color: 'bg-primary/10 text-primary', icon: <Eye className="w-3.5 h-3.5" />, label: 'Viewed', dotColor: 'bg-primary' },
  shortlisted: { color: 'bg-success/10 text-success', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Shortlisted', dotColor: 'bg-success' },
  rejected: { color: 'bg-destructive/10 text-destructive', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Rejected', dotColor: 'bg-destructive' },
  hired: { color: 'bg-success/10 text-success', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Hired', dotColor: 'bg-success' },
};

/* ─── Loading Skeleton ─── */
const ActivitySkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map(i => (
      <div key={i} className="rounded-2xl border border-border/30 p-4 space-y-3">
        <div className="flex justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/5 rounded-lg" />
            <Skeleton className="h-3.5 w-2/5 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(j => (
            <Skeleton key={j} className="h-6 w-6 rounded-full" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

/* ─── Stats Summary ─── */
const StatsSummary = ({ applications }: { applications: any[] }) => {
  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter(a => a.status === 'pending').length;
    const reviewed = applications.filter(a => a.status === 'reviewed').length;
    const shortlisted = applications.filter(a => a.status === 'shortlisted').length;
    const rejected = applications.filter(a => a.status === 'rejected').length;
    const responseRate = total > 0 ? Math.round(((reviewed + shortlisted) / total) * 100) : 0;
    return { total, pending, reviewed, shortlisted, rejected, responseRate };
  }, [applications]);

  if (stats.total === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4"
    >
      {[
        { label: 'Total', value: stats.total, color: 'text-primary', bg: 'bg-primary/10', icon: Briefcase },
        { label: 'In Review', value: stats.pending + stats.reviewed, color: 'text-warning-foreground', bg: 'bg-warning/10', icon: Clock },
        { label: 'Shortlisted', value: stats.shortlisted, color: 'text-success', bg: 'bg-success/10', icon: CheckCircle2 },
        { label: 'Response Rate', value: `${stats.responseRate}%`, color: 'text-[hsl(262,83%,58%)]', bg: 'bg-[hsl(262,83%,58%)]/10', icon: TrendingUp },
      ].map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 + i * 0.04 }}
          className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-card/60 backdrop-blur border border-border/30"
        >
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', stat.bg)}>
            <stat.icon className={cn('w-4 h-4', stat.color)} />
          </div>
          <div className="min-w-0">
            <p className="text-base sm:text-lg font-bold text-foreground leading-none tabular-nums">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

/* ─── Application Card ─── */
const ApplicationCard = ({ app, index }: { app: any; index: number }) => {
  const job = app.jobs;
  if (!job) return null;

  const status = statusConfig[app.status] || statusConfig.pending;
  const timeAgo = formatDistanceToNow(new Date(app.created_at), { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.25 }}
      className="group relative bg-card/70 backdrop-blur-xl border border-border/30 rounded-2xl overflow-hidden hover:shadow-md hover:border-border/50 transition-all duration-200"
    >
      {/* Status accent line */}
      <div className={cn('h-[2px] w-full', app.status === 'shortlisted' || app.status === 'hired' ? 'bg-gradient-to-r from-success to-success/50' : app.status === 'rejected' ? 'bg-gradient-to-r from-destructive to-destructive/50' : 'bg-transparent')} />

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <Link
              to={`/jobs/${job.id}`}
              className="text-[15px] font-semibold text-foreground hover:text-primary transition-colors line-clamp-1 leading-tight"
            >
              {job.title}
            </Link>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                <span className="truncate max-w-[160px]">{job.employers?.company_name || 'Company'}</span>
              </span>
              {job.status === 'closed' && (
                <Badge variant="outline" className="text-[9px] h-[18px] px-1.5 border-destructive/20 text-destructive/80 bg-destructive/5">
                  Closed
                </Badge>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <Badge
            variant="outline"
            className={cn('text-[10px] h-6 px-2 font-semibold gap-1 shrink-0 border', status.color)}
          >
            {status.icon}
            {status.label}
          </Badge>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground mb-3">
          {job.salary_range && (
            <span className="font-semibold text-foreground">{job.salary_range}</span>
          )}
          {job.salary_range && <SalaryBadge salaryRange={job.salary_range} compact />}
          {job.job_type && (
            <Badge variant="secondary" className="text-[10px] h-[18px] px-1.5 font-medium">{job.job_type}</Badge>
          )}
          <span className="flex items-center gap-1 opacity-70">
            <Clock className="w-3 h-3" /> {timeAgo}
          </span>
        </div>

        {/* Timeline */}
        <ApplicationStatusTimeline status={app.status} />

        {/* Actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
          <p className="text-[11px] text-muted-foreground">
            Applied {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <Link to={`/jobs/${job.id}`}>
            <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs gap-1.5 border-border/40">
              <ExternalLink className="w-3 h-3" /> View Job
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Saved Job Card ─── */
const SavedJobCard = ({ saved, index, onRemove }: { saved: any; index: number; onRemove: (id: string) => void }) => {
  const job = saved.jobs;
  if (!job) return null;

  const timeAgo = formatDistanceToNow(new Date(saved.created_at), { addSuffix: true });
  const isClosed = job.status === 'closed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.25 }}
      layout
      className={cn(
        'group relative bg-card/70 backdrop-blur-xl border border-border/30 rounded-2xl overflow-hidden hover:shadow-md hover:border-border/50 transition-all duration-200',
        isClosed && 'opacity-60'
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              to={`/jobs/${job.id}`}
              className="text-[15px] font-semibold text-foreground hover:text-primary transition-colors line-clamp-1 leading-tight"
            >
              {job.title}
            </Link>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                <span className="truncate max-w-[160px]">{job.employers?.company_name || 'Company'}</span>
              </span>
              {isClosed && (
                <Badge variant="outline" className="text-[9px] h-[18px] px-1.5 border-destructive/20 text-destructive/80 bg-destructive/5">
                  Closed
                </Badge>
              )}
            </div>
          </div>
          <BookmarkCheck className="w-5 h-5 text-primary shrink-0" />
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground mt-2.5">
          {job.salary_range && (
            <span className="font-semibold text-foreground">{job.salary_range}</span>
          )}
          {job.salary_range && <SalaryBadge salaryRange={job.salary_range} compact />}
          {job.job_type && (
            <Badge variant="secondary" className="text-[10px] h-[18px] px-1.5 font-medium">{job.job_type}</Badge>
          )}
          <span className="flex items-center gap-1 opacity-70">
            <Clock className="w-3 h-3" /> Saved {timeAgo}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20">
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
                className="h-9 w-9 rounded-xl border-border/30 shrink-0 text-destructive/60 hover:text-destructive hover:bg-destructive/5"
                onClick={() => onRemove(saved.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Remove from saved</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Status Filter Chips ─── */
const StatusFilterChips = ({ active, onChange, counts }: {
  active: string | null;
  onChange: (v: string | null) => void;
  counts: Record<string, number>;
}) => (
  <div className="flex flex-wrap gap-1.5 mb-3">
    <button
      onClick={() => onChange(null)}
      className={cn(
        'h-7 px-2.5 rounded-lg text-[11px] font-medium border transition-all',
        !active ? 'bg-primary/10 border-primary/25 text-primary' : 'bg-card/70 border-border/30 text-muted-foreground hover:text-foreground'
      )}
    >
      All ({Object.values(counts).reduce((a, b) => a + b, 0)})
    </button>
    {Object.entries(statusConfig).map(([key, cfg]) => {
      const count = counts[key] || 0;
      if (count === 0) return null;
      return (
        <button
          key={key}
          onClick={() => onChange(active === key ? null : key)}
          className={cn(
            'h-7 px-2.5 rounded-lg text-[11px] font-medium border transition-all gap-1 inline-flex items-center',
            active === key ? cn(cfg.color, 'border-current/20') : 'bg-card/70 border-border/30 text-muted-foreground hover:text-foreground'
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dotColor)} />
          {cfg.label} ({count})
        </button>
      );
    })}
  </div>
);

/* ─── Main Component ─── */
export const JobActivityTabs = ({ candidateId }: JobActivityTabsProps) => {
  const queryClient = useQueryClient();
  const [applications, setApplications] = useState<any[]>([]);
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('applied');

  useEffect(() => {
    fetchData();
  }, [candidateId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsRes, savedRes] = await Promise.all([
        supabase
          .from('applications')
          .select('*, jobs (id, title, salary_range, job_type, latitude, longitude, status, slug, employers (company_name))')
          .eq('candidate_id', candidateId)
          .order('created_at', { ascending: false }),
        supabase
          .from('saved_jobs')
          .select('*, jobs (id, title, salary_range, job_type, latitude, longitude, status, slug, employers (company_name))')
          .eq('candidate_id', candidateId)
          .order('created_at', { ascending: false }),
      ]);

      if (appsRes.error) console.error('Applications fetch error:', appsRes.error);
      if (savedRes.error) console.error('Saved jobs fetch error:', savedRes.error);
      setApplications(appsRes.data || []);
      setSavedJobs(savedRes.data || []);
    } catch (error) {
      console.error('Error fetching job activity:', error);
      toast.error('Failed to load job activity.');
    } finally {
      setLoading(false);
    }
  };

  const removeSavedJob = async (savedJobId: string) => {
    try {
      const { error } = await supabase.from('saved_jobs').delete().eq('id', savedJobId);
      if (error) throw error;
      setSavedJobs(prev => prev.filter(sj => sj.id !== savedJobId));
      queryClient.invalidateQueries({ queryKey: ['saved-jobs', candidateId] });
      toast.success('Job removed from saved');
    } catch {
      toast.error('Failed to remove job');
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    applications.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return counts;
  }, [applications]);

  const filteredApplications = useMemo(() => {
    let result = applications;
    if (statusFilter) result = result.filter(a => a.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.jobs?.title?.toLowerCase().includes(q) ||
        a.jobs?.employers?.company_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [applications, statusFilter, search]);

  const filteredSaved = useMemo(() => {
    if (!search.trim()) return savedJobs;
    const q = search.toLowerCase();
    return savedJobs.filter(s =>
      s.jobs?.title?.toLowerCase().includes(q) ||
      s.jobs?.employers?.company_name?.toLowerCase().includes(q)
    );
  }, [savedJobs, search]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20"
        >
          <Briefcase className="w-5 h-5 text-primary-foreground" />
        </motion.div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">My Applications</h2>
          <p className="text-[11px] sm:text-xs text-muted-foreground">Track your applied and saved jobs</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setStatusFilter(null); setSearch(''); }}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList className="h-10 p-1 rounded-xl bg-muted/50 border border-border/30">
            <TabsTrigger value="applied" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-sm px-4">
              <Briefcase className="w-3.5 h-3.5" />
              Applied
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 ml-0.5">{applications.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="saved" className="rounded-lg text-xs gap-1.5 data-[state=active]:shadow-sm px-4">
              <Bookmark className="w-3.5 h-3.5" />
              Saved
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 ml-0.5">{savedJobs.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs..."
              className="h-9 pl-9 pr-8 w-full sm:w-52 text-xs rounded-xl border-border/40 bg-muted/30"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        <TabsContent value="applied" className="mt-4 space-y-0">
          {loading ? (
            <ActivitySkeleton />
          ) : applications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-muted/40 flex items-center justify-center mb-5">
                <Briefcase className="w-10 h-10 text-muted-foreground/25" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5 text-lg">No applications yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-5">Start applying to jobs to track your progress here.</p>
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
              <StatsSummary applications={applications} />
              <StatusFilterChips active={statusFilter} onChange={setStatusFilter} counts={statusCounts} />
              <div className="space-y-2.5">
                <AnimatePresence mode="popLayout">
                  {filteredApplications.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-10 text-muted-foreground"
                    >
                      <p className="text-sm">No applications match your search.</p>
                      <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => { setSearch(''); setStatusFilter(null); }}>
                        Clear filters
                      </Button>
                    </motion.div>
                  ) : (
                    filteredApplications.map((app, i) => (
                      <ApplicationCard key={app.id} app={app} index={i} />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-4 space-y-0">
          {loading ? (
            <ActivitySkeleton />
          ) : savedJobs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-muted/40 flex items-center justify-center mb-5">
                <Bookmark className="w-10 h-10 text-muted-foreground/25" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5 text-lg">No saved jobs</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-5">Save jobs while browsing to compare them later.</p>
              <Link to="/">
                <Button className="rounded-xl gap-2 text-sm shadow-sm">
                  <Search className="w-3.5 h-3.5" /> Explore Jobs
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-xs h-7 px-3 rounded-lg font-medium tabular-nums">
                  {filteredSaved.length} saved job{filteredSaved.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <AnimatePresence mode="popLayout">
                {filteredSaved.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-10 text-muted-foreground"
                  >
                    <p className="text-sm">No saved jobs match your search.</p>
                    <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setSearch('')}>
                      Clear search
                    </Button>
                  </motion.div>
                ) : (
                  filteredSaved.map((saved, i) => (
                    <SavedJobCard key={saved.id} saved={saved} index={i} onRemove={removeSavedJob} />
                  ))
                )}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
