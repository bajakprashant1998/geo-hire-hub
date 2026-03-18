import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, ArrowUp, Scale, MapPin, MessageSquare, CheckCircle, Zap, Shield } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { SEOContentFooter } from '@/components/SEOContentFooter';
import { TestimonialsSection } from '@/components/TestimonialsSection';
import { buildBreadcrumbJsonLd } from '@/components/BreadcrumbNav';
import { useBrowseJobs } from '@/hooks/useBrowseJobs';
import { BrowseHeader } from '@/components/browse/BrowseHeader';
import { JobCard, getJobUrl } from '@/components/browse/JobCard';
import { CompareBar } from '@/components/browse/CompareBar';
import { CompareModal } from '@/components/browse/CompareModal';
import { toast } from 'sonner';

// FAQ items for SEO
const FAQ_ITEMS = [
  { q: 'How do I find jobs near me on HireForJob?', a: 'Use the search bar above to enter your job title or location. You can also use the Map View to visually browse job listings near your current location in real time.' },
  { q: 'Is it free to apply for jobs on HireForJob?', a: 'Yes, applying for jobs on HireForJob is completely free for candidates. Create an account, upload your resume, and start applying directly to verified employers.' },
  { q: 'How often are new jobs posted?', a: 'New job listings are posted daily by verified employers. Use the "Newest First" sort to see the latest opportunities as soon as they\'re available.' },
  { q: 'Can I save jobs and apply later?', a: 'Absolutely! Click the heart icon on any job card to save it. Access your saved jobs anytime from your candidate dashboard.' },
];

const BrowseJobs = () => {
  const {
    search, setSearch, jobType, setJobType, sortBy, setSortBy,
    viewMode, setViewMode, jobs, loading, loadingMore, hasMore,
    total, debouncedSearch, loadMore, clearAllFilters,
    isRemote, setIsRemote,
    experienceLevel, setExperienceLevel,
    salaryMin, setSalaryMin,
    salaryMax, setSalaryMax,
    activeFilterCount,
    savedJobIds, refreshSavedJobIds,
  } = useBrowseJobs();

  // Compare state
  const [compareMode, setCompareMode] = useState(false);
  const [compareJobs, setCompareJobs] = useState<any[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const compareIds = new Set(compareJobs.map(j => j.id));

  const handleCompareToggle = useCallback((job: any) => {
    setCompareJobs(prev => {
      const exists = prev.find(j => j.id === job.id);
      if (exists) return prev.filter(j => j.id !== job.id);
      if (prev.length >= 3) {
        toast.error('Maximum 3 jobs can be compared');
        return prev;
      }
      return [...prev, job];
    });
  }, []);

  const removeFromCompare = useCallback((id: string) => {
    setCompareJobs(prev => prev.filter(j => j.id !== id));
  }, []);

  // Auto-enable compare mode when jobs are selected
  useEffect(() => {
    if (compareJobs.length > 0) setCompareMode(true);
  }, [compareJobs.length]);

  // Back to top
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const browseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Job Listings on HireForJob',
    numberOfItems: total,
    itemListElement: jobs.slice(0, 10).map((job: any, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://www.hireforjob.com${getJobUrl(job)}`,
      name: job.title,
    })),
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(f => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEOHead
        title="Browse Jobs Near Me – Apply Today | HireForJob"
        description="Browse and apply for job listings near you. Find full-time, part-time, contract, and remote jobs updated daily on HireForJob."
        jsonLd={browseJsonLd}
        breadcrumbJsonLd={buildBreadcrumbJsonLd([{ label: 'Browse Jobs' }])}
        canonicalUrl="https://www.hireforjob.com/browse-jobs"
      />

      <BrowseHeader
        search={search} setSearch={setSearch}
        jobType={jobType} setJobType={setJobType}
        sortBy={sortBy} setSortBy={setSortBy}
        viewMode={viewMode} setViewMode={setViewMode}
        total={total} debouncedSearch={debouncedSearch}
        clearAllFilters={clearAllFilters}
        isRemote={isRemote} setIsRemote={setIsRemote}
        experienceLevel={experienceLevel} setExperienceLevel={setExperienceLevel}
        salaryMin={salaryMin} setSalaryMin={setSalaryMin}
        salaryMax={salaryMax} setSalaryMax={setSalaryMax}
        activeFilterCount={activeFilterCount}
      />

      {/* Job List */}
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-6xl">
        {loading && jobs.length === 0 ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4' : 'space-y-3'}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className={viewMode === 'grid' ? 'h-56 rounded-xl' : 'h-28 rounded-xl'} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 sm:py-24"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-5 rounded-2xl bg-muted/80 flex items-center justify-center">
              <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/30" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-foreground">No jobs match your filters</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm px-4">
              Try broadening your search or removing some filters.
            </p>
            <Button variant="outline" onClick={clearAllFilters} className="rounded-xl">
              Clear All Filters
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Results count + Compare toggle */}
            <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Showing <strong className="text-foreground tabular-nums">{jobs.length}</strong> of{' '}
                <strong className="tabular-nums">{total.toLocaleString()}</strong> jobs
              </p>
              <Button
                variant={compareMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (compareMode && compareJobs.length === 0) {
                    setCompareMode(false);
                  } else {
                    setCompareMode(!compareMode);
                  }
                }}
                className="rounded-xl gap-1.5 text-xs h-8 px-3"
              >
                <Scale className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{compareMode ? 'Exit Compare' : 'Compare'}</span>
              </Button>
            </div>

            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4'
              : 'space-y-3'
            }>
              <AnimatePresence mode="popLayout">
                {jobs.map((job: any, i: number) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    index={i}
                    viewMode={viewMode}
                    savedJobIds={savedJobIds}
                    onSaveToggle={refreshSavedJobIds}
                    compareMode={compareMode}
                    isSelectedForCompare={compareIds.has(job.id)}
                    onCompareToggle={handleCompareToggle}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center pt-8 sm:pt-10 pb-2">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="min-w-[200px] sm:min-w-[240px] h-11 sm:h-12 rounded-xl text-sm font-medium"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Loading more…
                    </span>
                  ) : (
                    `Load More · ${Math.max(0, total - jobs.length).toLocaleString()} remaining`
                  )}
                </Button>
              </div>
            )}

            {!hasMore && jobs.length > 0 && (
              <p className="text-center text-xs sm:text-sm text-muted-foreground pt-6 sm:pt-8 pb-2">
                You've seen all {total.toLocaleString()} jobs 🎉
              </p>
            )}
          </>
        )}
      </div>

      {/* Mid-page CTA */}
      <div className="container mx-auto px-4 max-w-6xl pb-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent shadow-sm overflow-hidden">
            <CardContent className="p-5 sm:p-8 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="flex-1">
                <h2 className="text-base sm:text-lg font-bold text-foreground mb-1">Can't find the right job?</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Try our interactive map to discover opportunities near your location.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link to="/jobs-near-me">
                  <Button className="rounded-xl gap-2 px-5 sm:px-8 shadow-md hover:shadow-lg transition-shadow">
                    <MapPin className="w-4 h-4" /> Jobs Near Me
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Testimonials */}
      <div className="container mx-auto px-4 max-w-6xl">
        <TestimonialsSection compact className="mb-8" />
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-4 max-w-6xl pb-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Frequently Asked Questions</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            {FAQ_ITEMS.map((faq, i) => (
              <Card key={i} className="border-border/50 hover:border-primary/20 transition-colors">
                <CardContent className="p-4 sm:p-5">
                  <h3 className="font-semibold text-sm text-foreground mb-1.5">{faq.q}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Inject FAQ JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        style={{ display: 'none' }}
      />

      <SEOContentFooter />

      {/* Compare bar */}
      <AnimatePresence>
        {compareJobs.length > 0 && (
          <CompareBar
            selectedJobs={compareJobs}
            onRemove={removeFromCompare}
            onClear={() => { setCompareJobs([]); setCompareMode(false); }}
            onCompare={() => setShowCompareModal(true)}
          />
        )}
      </AnimatePresence>

      {/* Compare modal */}
      <CompareModal
        open={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        jobs={compareJobs}
      />

      {/* Back to top */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
            style={{ bottom: compareJobs.length > 0 ? '5rem' : undefined }}
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BrowseJobs;
