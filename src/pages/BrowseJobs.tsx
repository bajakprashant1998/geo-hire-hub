import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Briefcase, MapPin, Clock, Building2, Filter, LayoutDashboard,
  ChevronRight, Bookmark, TrendingUp, Sparkles, ArrowUpDown, LayoutGrid, LayoutList, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SEOHead } from '@/components/SEOHead';
import { SEOContentFooter } from '@/components/SEOContentFooter';
import { BreadcrumbNav, buildBreadcrumbJsonLd } from '@/components/BreadcrumbNav';
import { SalaryBadge } from '@/components/SalaryBadge';
import { DeadlineCountdown } from '@/components/DeadlineCountdown';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const PAGE_SIZE = 20;
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

const BrowseJobs = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-synced state
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [jobType, setJobType] = useState(searchParams.get('type') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(
    (searchParams.get('view') as 'list' | 'grid') || 'list'
  );

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (jobType !== 'all') params.set('type', jobType);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (viewMode !== 'list') params.set('view', viewMode);
    setSearchParams(params, { replace: true });
  }, [search, jobType, sortBy, viewMode, setSearchParams]);

  // Fetch jobs
  const fetchJobs = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page;
    if (reset) setPage(0);
    setLoading(true);

    let query = supabase
      .from('jobs')
      .select(
        'id, title, job_type, salary_range, created_at, job_address, slug, location_country, location_state, location_city, expires_at, description, employers!inner(company_name, industry, slug)',
        { count: 'exact' }
      )
      .eq('status', 'open')
      .eq('is_active', true)
      .order('created_at', { ascending: sortBy === 'oldest' })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (debouncedSearch) {
      query = query.or(`title.ilike.%${debouncedSearch}%,job_address.ilike.%${debouncedSearch}%`);
    }
    if (jobType !== 'all') {
      query = query.eq('job_type', jobType);
    }

    const { data, count, error } = await query;
    if (!error) {
      setJobs(reset ? (data || []) : [...jobs, ...(data || [])]);
      setTotal(count || 0);
      setHasMore((data?.length || 0) === PAGE_SIZE);
    }
    setLoading(false);
  }, [page, debouncedSearch, jobType, sortBy, jobs]);

  useEffect(() => {
    fetchJobs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, jobType, sortBy]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    // Fetch with next page
    setLoading(true);
    supabase
      .from('jobs')
      .select(
        'id, title, job_type, salary_range, created_at, job_address, slug, location_country, location_state, location_city, expires_at, description, employers!inner(company_name, industry, slug)',
        { count: 'exact' }
      )
      .eq('status', 'open')
      .eq('is_active', true)
      .order('created_at', { ascending: sortBy === 'oldest' })
      .range(nextPage * PAGE_SIZE, (nextPage + 1) * PAGE_SIZE - 1)
      .then(({ data, error }) => {
        if (!error && data) {
          setJobs(prev => [...prev, ...data]);
          setHasMore(data.length === PAGE_SIZE);
        }
        setLoading(false);
      });
  };

  const formatDate = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getJobUrl = (job: any) => {
    if (job.slug) {
      const parts = ['/jobs'];
      if (job.location_country) parts.push(encodeURIComponent(job.location_country.toLowerCase().replace(/\s+/g, '-')));
      if (job.location_state) parts.push(encodeURIComponent(job.location_state.toLowerCase().replace(/\s+/g, '-')));
      if (job.location_city) parts.push(encodeURIComponent(job.location_city.toLowerCase().replace(/\s+/g, '-')));
      parts.push(job.slug);
      return parts.join('/');
    }
    return `/jobs/${job.id}`;
  };

  const getDescription = (job: any) => {
    if (!job.description) return null;
    const plain = job.description.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return plain.length > 120 ? plain.slice(0, 120) + '…' : plain;
  };

  const dashboardPath = profile?.user_type === 'employer' ? '/employer-dashboard' : '/candidate-dashboard';
  const activeFilters = [
    ...(jobType !== 'all' ? [{ key: 'type', label: jobType }] : []),
    ...(debouncedSearch ? [{ key: 'search', label: `"${debouncedSearch}"` }] : []),
  ];

  const clearFilter = (key: string) => {
    if (key === 'type') setJobType('all');
    if (key === 'search') setSearch('');
  };

  const browseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Job Listings on HireForJob',
    numberOfItems: total,
    itemListElement: jobs.slice(0, 10).map((job, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://www.hireforjob.com${getJobUrl(job)}`,
      name: job.title,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Job Listings Near Me – Browse & Hire For Job"
        description="Browse job listings near me. Find jobs hiring near me by type, location, and keywords. Hire for job opportunities updated daily."
        jsonLd={browseJsonLd}
        breadcrumbJsonLd={buildBreadcrumbJsonLd([{ label: 'Browse Jobs' }])}
        canonicalUrl="https://www.hireforjob.com/browse-jobs"
      />

      {/* Hero Header */}
      <div className="border-b bg-gradient-to-br from-primary/5 via-background to-primary/3">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="flex items-center justify-between mb-4">
            <BreadcrumbNav items={[{ label: 'Browse Jobs' }]} />
            {user && (
              <Button variant="outline" size="sm" onClick={() => navigate(dashboardPath)} className="gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Button>
            )}
          </div>

          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Find Your Next Opportunity
              </h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>
                  <strong className="text-foreground">{total.toLocaleString()}</strong> jobs available — updated daily
                </span>
              </p>
            </div>
          </div>

          {/* Search & Filters Bar */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search job title, company, or location..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 h-11 bg-card border-border/60 shadow-sm focus-visible:ring-primary/30"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger className="w-full sm:w-44 h-11 bg-card shadow-sm">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-44 h-11 bg-card shadow-sm">
                  <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters & View Toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <AnimatePresence>
                  {activeFilters.map(f => (
                    <motion.div key={f.key} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                      <Badge variant="secondary" className="gap-1 pl-2.5 pr-1.5 py-1 cursor-pointer hover:bg-muted" onClick={() => clearFilter(f.key)}>
                        {f.label}
                        <X className="w-3 h-3 ml-0.5" />
                      </Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {activeFilters.length > 0 && (
                  <button
                    onClick={() => { setSearch(''); setJobType('all'); }}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-1 bg-muted rounded-lg p-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <LayoutList className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>List view</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Grid view</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Job List */}
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {loading && jobs.length === 0 ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className={viewMode === 'grid' ? 'h-48 rounded-xl' : 'h-28 rounded-xl'} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-muted flex items-center justify-center">
              <Briefcase className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-foreground">No jobs found</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Try adjusting your search terms or removing filters to see more results.
            </p>
            <Button variant="outline" onClick={() => { setSearch(''); setJobType('all'); }}>
              Clear All Filters
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Results count */}
            <p className="text-sm text-muted-foreground mb-4">
              Showing <strong className="text-foreground">{jobs.length}</strong> of {total.toLocaleString()} jobs
            </p>

            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
            }>
              <AnimatePresence mode="popLayout">
                {jobs.map((job, i) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    layout
                  >
                    <Link to={getJobUrl(job)} className="block group">
                      <Card className="overflow-hidden border-border/60 bg-card hover:shadow-md hover:border-primary/20 transition-all duration-200 group-hover:translate-y-[-1px]">
                        <CardContent className={viewMode === 'grid' ? 'p-4 flex flex-col h-full' : 'p-4'}>
                          {viewMode === 'grid' ? (
                            /* Grid Card */
                            <>
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                  <Building2 className="w-5 h-5 text-primary" />
                                </div>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />{formatDate(job.created_at)}
                                </span>
                              </div>
                              <h3 className="font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                                {job.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{(job.employers as any)?.company_name || 'Company'}</span>
                              </p>
                              {getDescription(job) && (
                                <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-3">{getDescription(job)}</p>
                              )}
                              <div className="mt-auto flex flex-wrap items-center gap-1.5">
                                {job.job_type && <Badge variant="secondary" className="text-xs">{job.job_type}</Badge>}
                                {job.salary_range && <SalaryBadge salaryRange={job.salary_range} compact />}
                                {job.expires_at && <DeadlineCountdown expiresAt={job.expires_at} variant="inline" />}
                              </div>
                              {job.job_address && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{job.job_address}</span>
                                </p>
                              )}
                            </>
                          ) : (
                            /* List Card */
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Building2 className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                      {job.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                      <span className="truncate">{(job.employers as any)?.company_name || 'Company'}</span>
                                      {(job.employers as any)?.industry && (
                                        <>
                                          <span className="text-border">•</span>
                                          <span className="truncate text-xs">{(job.employers as any).industry}</span>
                                        </>
                                      )}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" />{formatDate(job.created_at)}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                                  </div>
                                </div>
                                {getDescription(job) && (
                                  <p className="text-xs text-muted-foreground/80 mt-1.5 line-clamp-1">{getDescription(job)}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  {job.job_type && <Badge variant="secondary" className="text-xs">{job.job_type}</Badge>}
                                  {job.salary_range && (
                                    <Badge variant="outline" className="text-xs">{job.salary_range}</Badge>
                                  )}
                                  {job.salary_range && <SalaryBadge salaryRange={job.salary_range} compact />}
                                  {job.job_address && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      <span className="truncate max-w-[200px]">{job.job_address}</span>
                                    </span>
                                  )}
                                  {job.expires_at && <DeadlineCountdown expiresAt={job.expires_at} variant="inline" />}
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center pt-8">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                  className="min-w-[200px] h-11"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    `Show More Jobs (${Math.max(0, total - jobs.length)} remaining)`
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <SEOContentFooter />
    </div>
  );
};

export default BrowseJobs;
