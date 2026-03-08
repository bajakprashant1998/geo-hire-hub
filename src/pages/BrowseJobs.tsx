import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Search, Briefcase, MapPin, Clock, Building2, Filter, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SEOHead } from '@/components/SEOHead';
import { BreadcrumbNav, buildBreadcrumbJsonLd } from '@/components/BreadcrumbNav';
import { SalaryBadge } from '@/components/SalaryBadge';
import { DeadlineCountdown } from '@/components/DeadlineCountdown';

const PAGE_SIZE = 20;

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];

const BrowseJobs = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchJobs(true);
  }, [search, jobType]);

  const fetchJobs = async (reset = false) => {
    const currentPage = reset ? 0 : page;
    if (reset) setPage(0);
    setLoading(true);

    let query = supabase
      .from('jobs')
      .select('id, title, job_type, salary_range, created_at, job_address, slug, location_country, location_state, location_city, expires_at, employers!inner(company_name)', { count: 'exact' })
      .eq('status', 'open')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (search) {
      query = query.or(`title.ilike.%${search}%,job_address.ilike.%${search}%`);
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
  };

  const loadMore = () => {
    setPage(p => p + 1);
    fetchJobs(false);
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

  const dashboardPath = profile?.user_type === 'employer' ? '/employer-dashboard' : '/candidate-dashboard';

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
  const browseBreadcrumb = buildBreadcrumbJsonLd([{ label: 'Browse Jobs' }]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Job Listings Near Me – Browse & Hire For Job" description="Browse job listings near me. Find jobs hiring near me by type, location, and keywords. Hire for job opportunities updated daily." jsonLd={browseJsonLd} breadcrumbJsonLd={browseBreadcrumb} canonicalUrl="https://www.hireforjob.com/browse-jobs" />

      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          <div className="flex items-center gap-2 mb-4">
            <BreadcrumbNav items={[{ label: 'Browse Jobs' }]} />
          </div>
          <div className="flex items-center gap-2 mb-4">
            {user && (
              <Button variant="outline" size="sm" onClick={() => navigate(dashboardPath)} className="gap-2 text-muted-foreground">
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Button>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Job Listings Near Me</h1>
          <p className="text-muted-foreground">{total} jobs hiring near me — updated daily</p>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or location..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={jobType} onValueChange={setJobType}>
              <SelectTrigger className="w-full sm:w-44">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Job Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Job List */}
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {loading && jobs.length === 0 ? (
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold mb-2">No jobs found</h2>
            <p className="text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <Link key={job.id} to={getJobUrl(job)}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {(job.employers as any)?.company_name || 'Company'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {job.job_type && <Badge variant="secondary" className="text-xs">{job.job_type}</Badge>}
                          {job.salary_range && <Badge variant="outline" className="text-xs">{job.salary_range}</Badge>}
                          {job.salary_range && <SalaryBadge salaryRange={job.salary_range} compact />}
                          {job.job_address && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{job.job_address}
                            </span>
                          )}
                          {job.expires_at && <DeadlineCountdown expiresAt={job.expires_at} variant="inline" />}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                        <Clock className="w-3 h-3" />{formatDate(job.created_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {hasMore && (
              <div className="text-center pt-4">
                <Button variant="outline" onClick={loadMore} disabled={loading}>
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseJobs;