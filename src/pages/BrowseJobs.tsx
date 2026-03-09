import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, ArrowUp } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { SEOContentFooter } from '@/components/SEOContentFooter';
import { buildBreadcrumbJsonLd } from '@/components/BreadcrumbNav';
import { useBrowseJobs } from '@/hooks/useBrowseJobs';
import { BrowseHeader } from '@/components/browse/BrowseHeader';
import { JobCard, getJobUrl } from '@/components/browse/JobCard';

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

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Job Listings Near Me – Browse & Hire For Job"
        description="Browse job listings near me. Find jobs hiring near me by type, location, and keywords. Hire for job opportunities updated daily."
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
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {loading && jobs.length === 0 ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className={viewMode === 'grid' ? 'h-56 rounded-xl' : 'h-28 rounded-xl'} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-muted/80 flex items-center justify-center">
              <Briefcase className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-foreground">No jobs match your filters</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
              Try broadening your search or removing some filters.
            </p>
            <Button variant="outline" onClick={clearAllFilters} className="rounded-xl">
              Clear All Filters
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Showing <strong className="text-foreground tabular-nums">{jobs.length}</strong> of{' '}
                <strong className="tabular-nums">{total.toLocaleString()}</strong> jobs
              </p>
            </div>

            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
            }>
              <AnimatePresence mode="popLayout">
                {jobs.map((job: any, i: number) => (
                  <JobCard key={job.id} job={job} index={i} viewMode={viewMode} savedJobIds={savedJobIds} onSaveToggle={refreshSavedJobIds} />
                ))}
              </AnimatePresence>
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center pt-10 pb-2">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="min-w-[240px] h-12 rounded-xl text-sm font-medium"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Loading more…
                    </span>
                  ) : (
                    `Load More Jobs · ${Math.max(0, total - jobs.length).toLocaleString()} remaining`
                  )}
                </Button>
              </div>
            )}

            {!hasMore && jobs.length > 0 && (
              <p className="text-center text-sm text-muted-foreground pt-8 pb-2">
                You've seen all {total.toLocaleString()} jobs 🎉
              </p>
            )}
          </>
        )}
      </div>

      <SEOContentFooter />

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

export default BrowseJobs;
