import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  MapPin, Briefcase, Building2, Clock, ArrowRight, Search, TrendingUp, Shield, Zap,
  ChevronRight, Star, Users, Globe2, Filter, Sparkles, ArrowUp, X, Target, CheckCircle2,
  ChevronDown, Bookmark, Eye, MapPinned, Flame, LocateFixed, Share2, Heart,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';
import { BreadcrumbNav, buildBreadcrumbJsonLd } from '@/components/BreadcrumbNav';
import { SalaryBadge } from '@/components/SalaryBadge';
import { DeadlineCountdown } from '@/components/DeadlineCountdown';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/* ─── Animated counter ─── */
const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value <= 0) return;
    let frame: number;
    const duration = 1400;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{display.toLocaleString()}</>;
};

const JOB_TYPES = ['All', 'Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'] as const;

const TRENDING_SEARCHES = [
  'Software Engineer', 'Marketing', 'Data Analyst', 'Remote', 'Design', 'Sales',
];

/* ─── Main Component ─── */
const JobsNearMe = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('All');
  const [showTop, setShowTop] = useState(false);
  const [stats, setStats] = useState({ candidates: 0, employers: 0 });
  const [visibleCount, setVisibleCount] = useState(12);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isSearchSticky, setIsSearchSticky] = useState(false);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const heroRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data, count } = await supabase
        .from('jobs')
        .select('id, title, job_type, salary_range, created_at, job_address, slug, location_country, location_state, location_city, expires_at, description, employers!inner(company_name, logo_url)', { count: 'exact' })
        .eq('status', 'open')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);

      setJobs(data || []);
      setTotal(count || 0);
      setLoading(false);
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      const [c, e] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'candidate'),
        supabase.from('employers').select('id', { count: 'exact', head: true }),
      ]);
      setStats({ candidates: c.count || 0, employers: e.count || 0 });
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > 600);
      setIsSearchSticky(window.scrollY > 320);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Load saved jobs from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('hfj_saved_jobs') || '[]');
      setSavedJobs(new Set(saved));
    } catch {}
  }, []);

  const toggleSaveJob = useCallback((e: React.MouseEvent, jobId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSavedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      localStorage.setItem('hfj_saved_jobs', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (activeType !== 'All') {
      result = result.filter((j: any) => j.job_type === activeType);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((j: any) =>
        j.title?.toLowerCase().includes(q) ||
        (j.employers as any)?.company_name?.toLowerCase().includes(q) ||
        j.job_address?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [jobs, activeType, search]);

  const visibleJobs = useMemo(() => filteredJobs.slice(0, visibleCount), [filteredJobs, visibleCount]);
  const hasMore = visibleCount < filteredJobs.length;

  // Count jobs per type for badges
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { All: jobs.length };
    jobs.forEach((j: any) => {
      if (j.job_type) counts[j.job_type] = (counts[j.job_type] || 0) + 1;
    });
    return counts;
  }, [jobs]);

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

  const formatDate = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isNew = (d: string) => (Date.now() - new Date(d).getTime()) < 2 * 86400000;
  const isHot = (d: string) => (Date.now() - new Date(d).getTime()) < 1 * 86400000;

  const jobListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Jobs Near Me – Hire For Job',
    description: 'Find jobs near me, browse job listings near me, and discover jobs hiring near me.',
    numberOfItems: total,
    itemListElement: jobs.slice(0, 10).map((job, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://www.hireforjob.com${getJobUrl(job)}`,
      name: job.title,
    })),
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How do I find jobs near me?', acceptedAnswer: { '@type': 'Answer', text: "Use Hire For Job's interactive map to discover jobs near me. Simply allow location access and browse local job listings near me instantly. Filter by job type, salary, and distance." } },
      { '@type': 'Question', name: 'What types of jobs hiring near me are available?', acceptedAnswer: { '@type': 'Answer', text: 'Hire For Job shows full-time, part-time, contract, internship, and freelance positions. Browse job listings near me in any industry and experience level.' } },
      { '@type': 'Question', name: 'Is Hire For Job free to use?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, Hire For Job is completely free for job seekers. Search jobs near me, apply instantly, and track your applications at no cost.' } },
      { '@type': 'Question', name: 'How do I hire for job positions as an employer?', acceptedAnswer: { '@type': 'Answer', text: "Sign up as an employer on Hire For Job, post your positions with location details, and reach candidates searching for jobs hiring near me. Your listings appear on the interactive map instantly." } },
      { '@type': 'Question', name: 'Can I set up job alerts for new positions near me?', acceptedAnswer: { '@type': 'Answer', text: "Yes! Create a free account and set up custom job alerts based on your location, preferred job type, and keywords. Get notified instantly when new jobs matching your criteria are posted." } },
    ],
  };

  const breadcrumb = buildBreadcrumbJsonLd([{ label: 'Jobs Near Me' }]);

  const features = [
    { icon: MapPinned, title: 'Map-Based Discovery', desc: 'See every job plotted on a live map — zoom into your neighborhood', color: 'text-primary', bg: 'bg-primary/10' },
    { icon: Zap, title: 'Instant Apply', desc: 'AI-powered cover letters and one-click applications', color: 'text-[hsl(var(--warning))]', bg: 'bg-[hsl(var(--warning))]/10' },
    { icon: Shield, title: 'Verified Employers', desc: 'Trust scores and verification badges for every company', color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success))]/10' },
    { icon: Sparkles, title: 'AI Job Matching', desc: 'Smart algorithms match your skills to the best-fit roles', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  const faqs = [
    { q: 'How do I find jobs near me?', a: "Use Hire For Job's interactive map to discover jobs near me. Simply allow location access and browse local job listings near me instantly. Filter by job type, salary, and distance." },
    { q: 'What types of jobs hiring near me are available?', a: 'Hire For Job shows full-time, part-time, contract, internship, and freelance positions in any industry — from tech to healthcare, finance to creative roles.' },
    { q: 'Is Hire For Job free to use?', a: 'Yes, Hire For Job is completely free for job seekers. Search jobs near me, apply instantly, and track your applications at no cost.' },
    { q: 'How do I post a job as an employer?', a: 'Sign up as an employer, post positions with location details, and reach candidates searching for jobs hiring near me. Listings appear on the interactive map immediately.' },
    { q: 'Can I set up alerts for new jobs near me?', a: 'Absolutely! Create a free account and configure custom job alerts by location, job type, and keywords. Get notified the moment matching jobs are posted.' },
  ];

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
  const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } } };

  const handleLoadMore = () => setVisibleCount(prev => prev + 12);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Jobs Near Me – Find Local Job Listings | Hire For Job"
        description="Find jobs near me on Hire For Job. Browse job listings near me, discover jobs hiring near me on an interactive map. Apply to local jobs instantly."
        canonicalUrl="https://www.hireforjob.com/jobs-near-me"
        ogImage="https://www.hireforjob.com/logo.png"
        jsonLd={jobListJsonLd}
        breadcrumbJsonLd={breadcrumb}
      />

      {/* ── Hero Section ── */}
      <section ref={heroRef} className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/6 via-background to-[hsl(var(--success))]/4" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.1),transparent_60%)]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[hsl(var(--success))]/5 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

        <div className="relative container mx-auto px-4 pt-6 pb-10 sm:pt-8 sm:pb-14 max-w-6xl">
          <BreadcrumbNav items={[{ label: 'Jobs Near Me' }]} />

          <motion.div initial="hidden" animate="visible" variants={stagger} className="mt-6 sm:mt-8">
            <motion.div variants={fadeUp} className="flex items-center gap-2 mb-4">
              <Badge className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20 text-[10px] h-6 px-2.5 font-bold gap-1">
                <Flame className="w-3 h-3" />
                {total > 0 ? `${total.toLocaleString()} Active Jobs` : 'Jobs Updated Daily'}
              </Badge>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl md:text-[3.25rem] font-extrabold text-foreground tracking-tight leading-[1.08]">
              Find <span className="text-primary relative">
                Jobs Near Me
                <svg className="absolute -bottom-1 left-0 w-full h-2 text-primary/20" viewBox="0 0 200 8" preserveAspectRatio="none">
                  <path d="M0 7 Q50 0 100 5 Q150 9 200 3" stroke="currentColor" strokeWidth="3" fill="none" />
                </svg>
              </span>
              <br className="hidden sm:block" />
              <span className="text-muted-foreground text-2xl sm:text-3xl md:text-[2.5rem] font-bold block mt-1"> That Match Your Skills</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-base sm:text-lg text-muted-foreground max-w-xl mt-4 leading-relaxed">
              Discover <strong className="text-foreground">job listings near me</strong> on an interactive map.
              Apply to <strong className="text-foreground">jobs hiring near me</strong> with AI-powered tools.
            </motion.p>

            {/* Search bar */}
            <motion.div variants={fadeUp} className="mt-6 max-w-xl">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={searchInputRef}
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setVisibleCount(12); }}
                    placeholder="Search jobs, companies, locations..."
                    className="pl-10 h-12 rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm shadow-sm focus-visible:ring-primary/30 text-sm"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors">
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <Link to="/">
                  <Button size="lg" className="h-12 rounded-2xl gap-2 shadow-md shadow-primary/15 px-5">
                    <MapPin className="w-4 h-4" /> Map
                  </Button>
                </Link>
              </div>

              {/* Trending searches */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Trending:
                </span>
                {TRENDING_SEARCHES.map((term) => (
                  <button
                    key={term}
                    onClick={() => { setSearch(term); setVisibleCount(12); searchInputRef.current?.focus(); }}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors font-medium"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Live Stats */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-5 sm:gap-8 mt-8">
              {[
                { value: total, label: 'Active Jobs', icon: Briefcase, color: 'text-destructive' },
                { value: stats.candidates, label: 'Job Seekers', icon: Users, color: 'text-primary' },
                { value: stats.employers, label: 'Companies', icon: Building2, color: 'text-[hsl(var(--success))]' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-muted/50 group-hover:scale-105 transition-transform")}>
                    <s.icon className={cn("w-4.5 h-4.5", s.color)} />
                  </div>
                  <div>
                    <p className={cn("text-xl font-extrabold tabular-nums leading-none", s.color)}>
                      <AnimatedNumber value={s.value} />+
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Sticky Search Bar ── */}
      <AnimatePresence>
        {isSearchSticky && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm"
          >
            <div className="container mx-auto px-4 max-w-6xl py-2.5 flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setVisibleCount(12); }}
                  placeholder="Search jobs..."
                  className="pl-9 h-9 rounded-xl text-xs border-border/50 bg-muted/30"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {JOB_TYPES.slice(0, 4).map((type) => (
                  <button
                    key={type}
                    onClick={() => { setActiveType(type); setVisibleCount(12); }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all",
                      activeType === type
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap hidden sm:inline">
                {filteredJobs.length} results
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Features Section ── */}
      <section className="container mx-auto px-4 py-10 sm:py-12 max-w-6xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={stagger}>
          <motion.div variants={fadeUp} className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Why Hire For Job?</h2>
              <p className="text-muted-foreground text-sm mt-1">The smarter way to find jobs near me</p>
            </div>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {features.map((f, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-border/30 h-full bg-card/60 backdrop-blur-sm">
                  <CardContent className="p-4 sm:p-5">
                    <div className={cn("w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110", f.bg)}>
                      <f.icon className={cn("w-5 h-5", f.color)} />
                    </div>
                    <h3 className="font-semibold text-foreground text-xs sm:text-sm mb-1 group-hover:text-primary transition-colors">{f.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Job Listings Section ── */}
      <section className="container mx-auto px-4 pb-10 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Latest Jobs Hiring Near Me</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Showing <strong className="text-foreground tabular-nums">{filteredJobs.length}</strong> of{' '}
              <strong className="text-foreground tabular-nums">{total.toLocaleString()}</strong> positions
              {search && <span> for "<strong className="text-primary">{search}</strong>"</span>}
            </p>
          </div>
          <Link to="/browse-jobs">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs">
              Browse All <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Job type filter chips with counts */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide mb-4">
          {JOB_TYPES.map((type) => {
            const count = typeCounts[type] || 0;
            return (
              <button
                key={type}
                onClick={() => { setActiveType(type); setVisibleCount(12); }}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all duration-200 flex items-center gap-1.5",
                  activeType === type
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/15"
                    : "bg-card text-muted-foreground border-border/40 hover:border-primary/30 hover:text-foreground"
                )}
              >
                {type}
                {count > 0 && (
                  <span className={cn(
                    "text-[9px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold",
                    activeType === type
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active filter summary */}
        {(search || activeType !== 'All') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 mb-4 flex-wrap"
          >
            <span className="text-[10px] text-muted-foreground font-medium">Active filters:</span>
            {activeType !== 'All' && (
              <Badge variant="secondary" className="text-[10px] h-5 gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => setActiveType('All')}>
                {activeType} <X className="w-2.5 h-2.5" />
              </Badge>
            )}
            {search && (
              <Badge variant="secondary" className="text-[10px] h-5 gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => setSearch('')}>
                "{search}" <X className="w-2.5 h-2.5" />
              </Badge>
            )}
            <button
              onClick={() => { setSearch(''); setActiveType('All'); }}
              className="text-[10px] text-destructive font-medium hover:underline ml-1"
            >
              Clear all
            </button>
          </motion.div>
        )}

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/30 p-4 space-y-3">
                <div className="flex gap-3">
                  <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-muted/60 flex items-center justify-center">
              <Search className="w-9 h-9 text-muted-foreground/25" />
            </div>
            <p className="font-bold text-foreground text-lg mb-1">No matching jobs found</p>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
              Try different keywords, remove filters, or explore the map for more results
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => { setSearch(''); setActiveType('All'); }}>
                <X className="w-3.5 h-3.5" /> Clear Filters
              </Button>
              <Link to="/">
                <Button size="sm" className="rounded-xl gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Explore Map
                </Button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {visibleJobs.map((job, i) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: Math.min(i * 0.03, 0.25), duration: 0.35 }}
                  >
                    <Link to={getJobUrl(job)}>
                      <Card className="group relative hover:shadow-lg hover:border-primary/25 transition-all duration-300 cursor-pointer border-border/30 h-full overflow-hidden bg-card/70 backdrop-blur-sm">
                        {/* Hot indicator stripe */}
                        {isHot(job.created_at) && (
                          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-[hsl(var(--warning))] to-primary" />
                        )}

                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-start gap-3">
                            {/* Company logo */}
                            <div className="w-11 h-11 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden border border-border/20 group-hover:border-primary/20 transition-colors">
                              {(job.employers as any)?.logo_url ? (
                                <img
                                  src={(job.employers as any).logo_url}
                                  alt={(job.employers as any)?.company_name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <Building2 className="w-5 h-5 text-muted-foreground/40" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors leading-tight">
                                    {job.title}
                                  </h3>
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {(job.employers as any)?.company_name || 'Company'}
                                  </p>
                                </div>
                                {/* Save button */}
                                <button
                                  onClick={(e) => toggleSaveJob(e, job.id)}
                                  className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0 -mr-1 -mt-0.5"
                                  title={savedJobs.has(job.id) ? 'Unsave' : 'Save job'}
                                >
                                  <Heart className={cn(
                                    "w-3.5 h-3.5 transition-colors",
                                    savedJobs.has(job.id) ? "fill-destructive text-destructive" : "text-muted-foreground/40 group-hover:text-muted-foreground"
                                  )} />
                                </button>
                              </div>

                              {/* Meta row */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                {isNew(job.created_at) && (
                                  <Badge className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20 text-[9px] h-[18px] px-1.5 font-bold gap-0.5">
                                    {isHot(job.created_at) ? <><Flame className="w-2.5 h-2.5" />HOT</> : 'NEW'}
                                  </Badge>
                                )}
                                {job.job_type && (
                                  <Badge variant="secondary" className="text-[10px] h-[18px] px-2 font-medium rounded-md">
                                    {job.job_type}
                                  </Badge>
                                )}
                                {job.salary_range && <SalaryBadge salaryRange={job.salary_range} compact />}
                                {job.expires_at && <DeadlineCountdown expiresAt={job.expires_at} variant="inline" />}
                              </div>

                              {/* Description preview */}
                              {job.description && (
                                <p className="text-[11px] text-muted-foreground/70 mt-2 line-clamp-2 leading-relaxed">
                                  {job.description.replace(/<[^>]+>/g, '').slice(0, 120)}
                                </p>
                              )}

                              {/* Location + time footer */}
                              <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-border/20">
                                {job.job_address ? (
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                                    <MapPin className="w-3 h-3 shrink-0 text-primary/50" />{job.job_address}
                                  </p>
                                ) : (
                                  <span />
                                )}
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-0.5 shrink-0">
                                  <Clock className="w-2.5 h-2.5" />{formatDate(job.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Load more / View all */}
            <div className="text-center pt-8 space-y-3">
              {hasMore ? (
                <Button variant="outline" size="lg" onClick={handleLoadMore} className="gap-2 rounded-xl min-w-[220px]">
                  Show More Jobs <ChevronDown className="w-4 h-4" />
                </Button>
              ) : filteredJobs.length > 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  Showing all {filteredJobs.length} results
                </p>
              )}
              <div>
                <Link to="/browse-jobs">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary">
                    Browse All {total.toLocaleString()} Jobs <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── How It Works ── */}
      <section className="border-t border-b border-border/30 bg-muted/15">
        <div className="container mx-auto px-4 py-12 sm:py-14 max-w-6xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-xl sm:text-2xl font-bold text-foreground text-center mb-2">
              How to Find Jobs Near Me
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-center mb-10 text-sm">
              Three simple steps to land your next opportunity
            </motion.p>
            <div className="grid sm:grid-cols-3 gap-8">
              {[
                { step: '1', icon: LocateFixed, title: 'Share Your Location', desc: 'Enable location access to see jobs plotted on a live interactive map around you.' },
                { step: '2', icon: Filter, title: 'Filter & Discover', desc: 'Narrow results by job type, salary range, distance, and keywords that matter to you.' },
                { step: '3', icon: CheckCircle2, title: 'Apply in Seconds', desc: 'Submit applications with one click using AI-generated cover letters tailored to each job.' },
              ].map((item, i) => (
                <motion.div key={i} variants={fadeUp} className="text-center group">
                  <div className="relative mx-auto w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                    <item.icon className="w-7 h-7 text-primary" />
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
                      {item.step}
                    </div>
                    {/* Connector line */}
                    {i < 2 && (
                      <div className="hidden sm:block absolute top-1/2 -right-[calc(50%+16px)] w-[calc(100%-32px)] h-px border-t-2 border-dashed border-border/40" />
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px] mx-auto">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ Section (Accordion) ── */}
      <section className="bg-card/50">
        <div className="container mx-auto px-4 py-12 sm:py-14 max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 text-center">Frequently Asked Questions</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">Everything you need to know about finding jobs near you</p>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={false}
                className="border border-border/30 rounded-xl overflow-hidden bg-background/60"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors"
                >
                  <h3 className="font-semibold text-foreground text-sm flex-1">{faq.q}</h3>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300",
                    openFaq === i && "rotate-180"
                  )} />
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-muted-foreground leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="border-t border-border/30">
        <div className="container mx-auto px-4 py-12 sm:py-14 max-w-6xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 sm:p-14">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,hsl(var(--destructive)/0.08),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--background)/0.05),transparent_50%)]" />
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 text-[10px] font-bold text-primary-foreground mb-5">
                  <Star className="w-3 h-3 fill-current" /> Trusted by {stats.candidates > 0 ? `${stats.candidates.toLocaleString()}+` : 'thousands of'} professionals
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary-foreground mb-3 leading-tight">
                  Ready to Find Your<br className="hidden sm:block" /> Perfect Job?
                </h2>
                <p className="text-primary-foreground/65 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                  Join professionals who discover, apply, and land their dream jobs through our map-powered platform.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <Link to="/signup">
                    <Button size="lg" className="bg-white text-primary hover:bg-white/90 gap-2 rounded-2xl shadow-lg min-w-[200px] font-bold h-12">
                      <Briefcase className="w-4 h-4" /> Get Started Free
                    </Button>
                  </Link>
                  <Link to="/">
                    <Button size="lg" variant="outline" className="border-2 border-white/25 text-primary-foreground hover:bg-white/10 gap-2 rounded-2xl min-w-[200px] font-bold h-12">
                      <MapPin className="w-4 h-4" /> Explore Map
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Back to top ── */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-xl bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobsNearMe;
