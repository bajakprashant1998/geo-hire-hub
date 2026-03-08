import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Briefcase, Building2, Clock, ArrowRight, Search, TrendingUp, Shield, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';
import { BreadcrumbNav, buildBreadcrumbJsonLd } from '@/components/BreadcrumbNav';
import { SalaryBadge } from '@/components/SalaryBadge';
import { DeadlineCountdown } from '@/components/DeadlineCountdown';

const JobsNearMe = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data, count } = await supabase
        .from('jobs')
        .select('id, title, job_type, salary_range, created_at, job_address, slug, location_country, location_state, location_city, expires_at, employers!inner(company_name)', { count: 'exact' })
        .eq('status', 'open')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);

      setJobs(data || []);
      setTotal(count || 0);
      setLoading(false);
    };
    fetchJobs();
  }, []);

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

  const jobListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Jobs Near Me – Hire For Job',
    'description': 'Find jobs near me, browse job listings near me, and discover jobs hiring near me.',
    'numberOfItems': total,
    'itemListElement': jobs.slice(0, 10).map((job, i) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'url': `https://www.hireforjob.com${getJobUrl(job)}`,
      'name': job.title,
    })),
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': [
      {
        '@type': 'Question',
        'name': 'How do I find jobs near me?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Use Hire For Job\'s interactive map to discover jobs near me. Simply allow location access and browse local job listings near me instantly. Filter by job type, salary, and distance.',
        },
      },
      {
        '@type': 'Question',
        'name': 'What types of jobs hiring near me are available?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Hire For Job shows full-time, part-time, contract, internship, and freelance positions. Browse job listings near me in any industry and experience level.',
        },
      },
      {
        '@type': 'Question',
        'name': 'Is Hire For Job free to use?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Yes, Hire For Job is completely free for job seekers. Search jobs near me, apply instantly, and track your applications at no cost.',
        },
      },
      {
        '@type': 'Question',
        'name': 'How do I hire for job positions as an employer?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Sign up as an employer on Hire For Job, post your positions with location details, and reach candidates searching for jobs hiring near me. Your listings appear on the interactive map instantly.',
        },
      },
    ],
  };

  const breadcrumb = buildBreadcrumbJsonLd([{ label: 'Jobs Near Me' }]);

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
      <section className="border-b bg-card">
        <div className="container mx-auto px-4 py-10 max-w-5xl">
          <BreadcrumbNav items={[{ label: 'Jobs Near Me' }]} />

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-4 mb-3">
            Jobs Near Me – Find Job Listings Hiring Near You
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-6">
            Discover <strong>jobs near me</strong> on an interactive map. Browse <strong>job listings near me</strong> and apply to <strong>jobs hiring near me</strong> instantly with <strong>Hire For Job</strong>.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link to="/">
              <Button size="lg" className="gap-2">
                <MapPin className="w-5 h-5" /> Find Jobs on Map
              </Button>
            </Link>
            <Link to="/browse-jobs">
              <Button size="lg" variant="outline" className="gap-2">
                <Search className="w-5 h-5" /> Browse All {total}+ Jobs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Hire For Job */}
      <section className="container mx-auto px-4 py-10 max-w-5xl">
        <h2 className="text-2xl font-bold text-foreground mb-6">Why Use Hire For Job to Find Jobs Near Me?</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <Card>
            <CardContent className="p-6 text-center">
              <MapPin className="w-10 h-10 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold text-foreground mb-2">Map-Based Job Search</h3>
              <p className="text-sm text-muted-foreground">See jobs near me on an interactive map. Know exactly how far each opportunity is from your location.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Zap className="w-10 h-10 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold text-foreground mb-2">Instant Applications</h3>
              <p className="text-sm text-muted-foreground">Apply to job listings near me in one click. AI-powered tools help you create tailored cover letters instantly.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Shield className="w-10 h-10 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold text-foreground mb-2">Verified Employers</h3>
              <p className="text-sm text-muted-foreground">All jobs hiring near me are from verified companies. Trust scores ensure you apply to legitimate positions.</p>
            </CardContent>
          </Card>
        </div>

        {/* Latest Job Listings */}
        <h2 className="text-2xl font-bold text-foreground mb-4">Latest Job Listings Near Me</h2>
        <p className="text-muted-foreground mb-6">{total} jobs hiring near me — new positions added daily</p>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
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

            <div className="text-center pt-6">
              <Link to="/browse-jobs">
                <Button variant="outline" size="lg" className="gap-2">
                  View All Job Listings <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* FAQ Section - Great for SEO */}
      <section className="border-t bg-card">
        <div className="container mx-auto px-4 py-10 max-w-5xl">
          <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions About Jobs Near Me</h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-2">How do I find jobs near me?</h3>
              <p className="text-muted-foreground">Use <strong>Hire For Job</strong>'s interactive map to discover jobs near me. Simply allow location access and browse local job listings near me instantly. Filter by job type, salary, and distance to find the perfect match.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">What types of jobs hiring near me are available?</h3>
              <p className="text-muted-foreground">Hire For Job shows full-time, part-time, contract, internship, and freelance positions. Browse job listings near me in any industry — from tech to healthcare, finance to creative roles — at any experience level.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Is Hire For Job free to use?</h3>
              <p className="text-muted-foreground">Yes, <strong>Hire For Job</strong> is completely free for job seekers. Search jobs near me, apply instantly, and track your applications at no cost. Employers can post their first jobs free too.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">How do I hire for job positions as an employer?</h3>
              <p className="text-muted-foreground">Sign up as an employer on <strong>Hire For Job</strong>, post your open positions with location details, and reach candidates actively searching for jobs hiring near me. Your listings appear on the interactive map and in search results immediately.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t">
        <div className="container mx-auto px-4 py-10 max-w-5xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">Ready to Find Jobs Near Me?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">Join thousands of job seekers using Hire For Job to discover job listings near me every day.</p>
          <div className="flex justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="gap-2">
                <Briefcase className="w-5 h-5" /> Get Started Free
              </Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="outline" className="gap-2">
                <MapPin className="w-5 h-5" /> Explore Map
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default JobsNearMe;
