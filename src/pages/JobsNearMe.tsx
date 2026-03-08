import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  MapPin, Briefcase, Building2, Clock, ArrowRight, Search, TrendingUp, Shield, Zap,
  ChevronRight, Star, Users, Globe2, Filter, Sparkles, ArrowUp, X, Target, CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';
import { BreadcrumbNav, buildBreadcrumbJsonLd } from '@/components/BreadcrumbNav';
import { SalaryBadge } from '@/components/SalaryBadge';
import { DeadlineCountdown } from '@/components/DeadlineCountdown';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Animated counter
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

const JOB_TYPES = ['All', 'Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];

const JobsNearMe = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('All');
  const [showTop, setShowTop] = useState(false);
  const [stats, setStats] = useState({ candidates: 0, employers: 0 });

  useEffect(() => {
    const fetchJobs = async () => {
      const { data, count } = await supabase
        .from('jobs')
        .select('id, title, job_type, salary_range, created_at, job_address, slug, location_country, location_state, location_city, expires_at, description, employers!inner(company_name, logo_url)', { count: 'exact' })
        .eq('status', 'open')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(30);

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
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
    ],
  };

  const breadcrumb = buildBreadcrumbJsonLd([{ label: 'Jobs Near Me' }]);

  const features = [
    { icon: MapPin, title: 'Map-Based Search', desc: 'See jobs plotted on an interactive map near your location', color: 'text-primary', bg: 'bg-primary/10' },
    { icon: Zap, title: 'One-Click Apply', desc: 'AI-powered cover letters and instant applications', color: 'text-[hsl(var(--warning))]', bg: 'bg-[hsl(var(--warning))]/10' },
    { icon: Shield, title: 'Verified Employers', desc: 'Trust scores ensure legitimate, quality positions', color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success))]/10' },
    { icon: Sparkles, title: 'AI Job Matching', desc: 'Smart algorithms match your skills to ideal roles', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
  const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

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

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-[hsl(var(--success))]/3" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        
        <div className="relative container mx-auto px-4 pt-8 pb-12 max-w-5xl">
          <BreadcrumbNav items={[{ label: 'Jobs Near Me' }]} />

          <motion.div
            initial="hidden" animate="visible" variants={stagger}
            className="mt-6"
          >
            <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight leading-[1.1]">
              Find <span className="text-primary">Jobs Near Me</span>
              <br className="hidden sm:block" />
              <span className="text-muted-foreground text-2xl sm:text-3xl md:text-4xl font-bold"> Hiring Right Now</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-base sm:text-lg text-muted-foreground max-w-xl mt-4 leading-relaxed">
              Discover <strong className="text-foreground">job listings near me</strong> on an interactive map. 
              Apply to <strong className="text-foreground">jobs hiring near me</strong> instantly with Hire For Job.
            </motion.p>

            {/* Search bar */}
            <motion.div variants={fadeUp} className="mt-6 flex gap-2 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search jobs, companies, locations..."
                  className="pl-10 h-12 rounded-2xl border-border/60 bg-card shadow-sm focus-visible:ring-primary/30 text-sm"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
              <Link to="/">
                <Button size="lg" className="h-12 rounded-2xl gap-2 shadow-md shadow-primary/15 px-5">
                  <MapPin className="w-4 h-4" /> Map View
                </Button>
              </Link>
            </motion.div>

            {/* Live Stats */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-4 sm:gap-6 mt-8">
              {[
                { value: total, label: 'Active Jobs', icon: Briefcase, color: 'text-destructive' },
                { value: stats.candidates, label: 'Job Seekers', icon: Users, color: 'text-primary' },
                { value: stats.employers, label: 'Companies', icon: Building2, color: 'text-[hsl(var(--success))]' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-muted/60")}>
                    <s.icon className={cn("w-4 h-4", s.color)} />
                  </div>
                  <div>
                    <p className={cn("text-lg font-extrabold tabular-nums leading-none", s.color)}>
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

      {/* Features Section */}
      <section className="container mx-auto px-4 py-10 max-w-5xl">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="text-2xl font-bold text-foreground mb-2">
            Why Hire For Job?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground mb-6 text-sm">
            The smarter way to find jobs near me
          </motion.p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {features.map((f, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Card className="group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-border/40 h-full">
                  <CardContent className="p-5">
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-3", f.bg)}>
                      <f.icon className={cn("w-5 h-5", f.color)} />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1 group-hover:text-primary transition-colors">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Job Listings Section */}
      <section className="container mx-auto px-4 pb-10 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Latest Job Listings Near Me</h2>
            <p className="text-sm text-muted-foreground mt-1">
              <strong className="text-foreground tabular-nums">{total.toLocaleString()}</strong> jobs hiring near me — updated daily
            </p>
          </div>
          <Link to="/browse-jobs">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs">
              Browse All <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Job type filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide mb-4">
          {JOB_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all duration-200",
                activeType === type
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/15"
                  : "bg-card text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground"
              )}
            >
              {type}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/80 flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <p className="font-semibold text-foreground mb-1">No jobs match your filters</p>
            <p className="text-sm text-muted-foreground mb-4">Try broadening your search or changing the job type</p>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setSearch(''); setActiveType('All'); }}>
              Clear Filters
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {filteredJobs.map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <Link to={getJobUrl(job)}>
                    <Card className="group hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer border-border/40 h-full overflow-hidden">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          {/* Company logo / icon */}
                          <div className="w-11 h-11 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 overflow-hidden border border-border/30">
                            {(job.employers as any)?.logo_url ? (
                              <img
                                src={(job.employers as any).logo_url}
                                alt={(job.employers as any)?.company_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Building2 className="w-5 h-5 text-muted-foreground/50" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                                  {job.title}
                                </h3>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {(job.employers as any)?.company_name || 'Company'}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isNew(job.created_at) && (
                                  <Badge className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20 text-[9px] h-5 px-1.5 font-bold">
                                    NEW
                                  </Badge>
                                )}
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />{formatDate(job.created_at)}
                                </span>
                              </div>
                            </div>

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                              {job.job_type && (
                                <Badge variant="secondary" className="text-[10px] h-5 px-2 font-medium rounded-lg">
                                  {job.job_type}
                                </Badge>
                              )}
                              {job.salary_range && <SalaryBadge salaryRange={job.salary_range} compact />}
                              {job.expires_at && <DeadlineCountdown expiresAt={job.expires_at} variant="inline" />}
                            </div>

                            {job.job_address && (
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-2 truncate">
                                <MapPin className="w-3 h-3 shrink-0" />{job.job_address}
                              </p>
                            )}
                          </div>

                          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1.5" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* View all CTA */}
        {filteredJobs.length > 0 && (
          <div className="text-center pt-8">
            <Link to="/browse-jobs">
              <Button variant="outline" size="lg" className="gap-2 rounded-xl min-w-[240px]">
                View All {total.toLocaleString()} Jobs <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="border-t border-b bg-muted/20">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-2xl font-bold text-foreground text-center mb-2">
              How to Find Jobs Near Me
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-center mb-8 text-sm">
              Three simple steps to land your next opportunity
            </motion.p>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { step: '1', icon: Target, title: 'Allow Location', desc: 'Enable location access to see jobs plotted on an interactive map near you.' },
                { step: '2', icon: Filter, title: 'Filter & Search', desc: 'Narrow results by job type, salary, distance, and keywords.' },
                { step: '3', icon: CheckCircle2, title: 'Apply Instantly', desc: 'Submit applications with one click and AI-generated cover letters.' },
              ].map((item, i) => (
                <motion.div key={i} variants={fadeUp} className="text-center">
                  <div className="relative mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <item.icon className="w-7 h-7 text-primary" />
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px] mx-auto">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-card">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Frequently Asked Questions</h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {[
              { q: 'How do I find jobs near me?', a: "Use Hire For Job's interactive map to discover jobs near me. Simply allow location access and browse local job listings near me instantly. Filter by job type, salary, and distance." },
              { q: 'What types of jobs hiring near me are available?', a: 'Hire For Job shows full-time, part-time, contract, internship, and freelance positions in any industry — from tech to healthcare, finance to creative roles.' },
              { q: 'Is Hire For Job free to use?', a: 'Yes, Hire For Job is completely free for job seekers. Search jobs near me, apply instantly, and track your applications at no cost.' },
              { q: 'How do I hire for job positions as an employer?', a: 'Sign up as an employer, post positions with location details, and reach candidates searching for jobs hiring near me. Listings appear on the interactive map immediately.' },
            ].map((faq, i) => (
              <Card key={i} className="border-border/40">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground text-sm mb-2">{faq.q}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t">
        <div className="container mx-auto px-4 py-12 max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 sm:p-12">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,hsl(var(--destructive)/0.1),transparent_50%)]" />
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
              
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground mb-3">
                  Ready to Find Your Next Job?
                </h2>
                <p className="text-primary-foreground/70 mb-6 max-w-md mx-auto text-sm">
                  Join {stats.candidates > 0 ? `${stats.candidates.toLocaleString()}+` : 'thousands of'} professionals using Hire For Job to discover opportunities near them.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <Link to="/signup">
                    <Button size="lg" className="bg-white text-primary hover:bg-white/90 gap-2 rounded-2xl shadow-lg min-w-[200px] font-bold">
                      <Briefcase className="w-4 h-4" /> Get Started Free
                    </Button>
                  </Link>
                  <Link to="/">
                    <Button size="lg" variant="outline" className="border-2 border-white/30 text-primary-foreground hover:bg-white/10 gap-2 rounded-2xl min-w-[200px] font-bold">
                      <MapPin className="w-4 h-4" /> Explore Map
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Back to top */}
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
