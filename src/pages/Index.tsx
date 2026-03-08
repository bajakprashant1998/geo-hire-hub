import { useState, useMemo, lazy, Suspense, useCallback, useEffect } from 'react';
import { SEOHead } from '@/components/SEOHead';
import { SEOContentFooter } from '@/components/SEOContentFooter';
import { ViewMode, Candidate, Job } from '@/types';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapData } from '@/hooks/useMapData';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/map/Header';
import { MapLoadingSkeleton } from '@/components/map/MapLoadingSkeleton';
import { Sidebar } from '@/components/map/Sidebar';
import { MarkerPreviewSheet } from '@/components/map/MarkerPreviewSheet';
import BottomNavBar from '@/components/map/BottomNavBar';
import { WelcomeOverlay } from '@/components/map/WelcomeOverlay';
import { MobileFAB } from '@/components/map/MobileFAB';
import GoogleSignInPrompt from '@/components/GoogleSignInPrompt';
import { LeftSidebarPanel } from '@/components/map/LeftSidebarPanel';
import { QuickFilterChips } from '@/components/map/QuickFilterChips';
import { FloatingControls } from '@/components/map/FloatingControls';
import { NearbyAvatarRow } from '@/components/map/NearbyAvatarRow';
import { Button } from '@/components/ui/button';
import { Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MapFilters, defaultFilters } from '@/components/map/AdvancedFilters';
import { useRealtimeMarkers } from '@/hooks/useRealtimeMarkers';
import { useSearchParams } from 'react-router-dom';

// Lazy-load the heavy Google Maps component
const LazyMapContainer = lazy(() =>
  import('@/components/map/GoogleMapContainer').then(m => ({ default: m.GoogleMapContainer }))
);

const Index = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL params
  const [mode, setMode] = useState<ViewMode>((searchParams.get('mode') as ViewMode) || 'seeking');
  const [radius, setRadius] = useState(Number(searchParams.get('radius')) || 10);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Candidate | Job | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [showWelcome, setShowWelcome] = useState(!user);
  const [centerTrigger, setCenterTrigger] = useState(0);
  const [filters, setFilters] = useState<MapFilters>(() => {
    const jobTypes = searchParams.get('jobTypes');
    const category = searchParams.get('category') as MapFilters['category'];
    return {
      ...defaultFilters,
      ...(jobTypes ? { jobTypes: jobTypes.split(',') } : {}),
      ...(category && ['all', 'private', 'government'].includes(category) ? { category } : {}),
      experienceMin: Number(searchParams.get('expMin')) || 0,
      experienceMax: Number(searchParams.get('expMax')) || 30,
    };
  });
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [salaryHeatmapEnabled, setSalaryHeatmapEnabled] = useState(false);
  const [salaryRoleFilter, setSalaryRoleFilter] = useState('');

  // Sync state → URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (mode !== 'seeking') params.set('mode', mode);
    if (radius !== 10) params.set('radius', String(radius));
    if (searchQuery) params.set('q', searchQuery);
    if (filters.jobTypes.length > 0) params.set('jobTypes', filters.jobTypes.join(','));
    if (filters.category !== 'all') params.set('category', filters.category);
    if (filters.experienceMin > 0) params.set('expMin', String(filters.experienceMin));
    if (filters.experienceMax < 30) params.set('expMax', String(filters.experienceMax));
    setSearchParams(params, { replace: true });
  }, [mode, radius, searchQuery, filters, setSearchParams]);

  const geolocation = useGeolocation();
  const hasRealLocation = !!(geolocation.latitude && geolocation.longitude);
  const userLocation = useMemo(() => {
    if (hasRealLocation) {
      return { lat: geolocation.latitude!, lng: geolocation.longitude! };
    }
    return { lat: 20.5937, lng: 78.9629 };
  }, [geolocation.latitude, geolocation.longitude, hasRealLocation]);

  const effectiveRadius = hasRealLocation ? radius : 5000;

  const { candidates, jobs, loading, refresh } = useMapData({
    userLocation,
    radius: effectiveRadius,
    searchQuery,
  });

  // Real-time live markers
  const handleNewJob = useCallback((newJob: any) => {
    refresh();
  }, [refresh]);

  useRealtimeMarkers({
    onNewJob: handleNewJob,
    enabled: true,
  });

  // Apply advanced filters
  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (filters.jobTypes.length > 0) {
      result = result.filter(j => filters.jobTypes.includes(j.job_type));
    }
    if (filters.category !== 'all') {
      result = result.filter(j => j.job_category === filters.category);
    }
    return result;
  }, [jobs, filters]);

  const filteredCandidates = useMemo(() => {
    let result = candidates;
    if (filters.experienceMin > 0 || filters.experienceMax < 30) {
      result = result.filter(c =>
        c.experience_years >= filters.experienceMin && c.experience_years <= filters.experienceMax
      );
    }
    return result;
  }, [candidates, filters]);

  const jobCounts = useMemo(() => ({
    private: filteredJobs.filter(j => j.job_category !== 'government').length,
    government: filteredJobs.filter(j => j.job_category === 'government').length,
  }), [filteredJobs]);

  const handleModeChange = (newMode: ViewMode) => {
    setMode(newMode);
    setSelectedItem(null);
    setPreviewOpen(false);
    toast.info(
      newMode === 'hiring'
        ? 'Now showing candidates near you'
        : 'Now showing jobs near you',
      { duration: 2000 }
    );
  };

  const handleMarkerClick = (item: Candidate | Job) => {
    setSelectedItem(item);
    setPreviewOpen(true);
  };

  const handleSelectFromSidebar = (item: Candidate | Job) => {
    setSelectedItem(item);
    setSidebarOpen(false);
    setPreviewOpen(true);
  };

  const handleCenterOnUser = () => {
    if (!userLocation) {
      toast.error('Unable to get your location. Please enable location services.');
      return;
    }
    setCenterTrigger(prev => prev + 1);
    toast.success('Centered on your location');
  };

  // Single shared map element
  const mapElement = (
    <Suspense fallback={<MapLoadingSkeleton mode={mode === 'hiring' ? 'hiring' : 'job'} />}>
      <LazyMapContainer
        mode={mode}
        candidates={filteredCandidates}
        jobs={filteredJobs}
        userLocation={userLocation}
        radius={radius}
        onMarkerClick={handleMarkerClick}
        selectedItem={selectedItem}
        isEmployer={profile?.user_type === 'employer'}
        centerTrigger={centerTrigger}
        heatmapEnabled={heatmapEnabled}
        salaryHeatmapEnabled={salaryHeatmapEnabled}
        salaryRoleFilter={salaryRoleFilter}
      />
    </Suspense>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <SEOHead
        title="Hire For Job – Jobs Near Me & Job Listings"
        description="Hire for job opportunities near you. Find jobs near me, browse job listings near me, and discover jobs hiring near me on an interactive map."
        canonicalUrl="https://www.hireforjob.com/"
        ogImage="https://www.hireforjob.com/logo.png"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          'name': 'Hire For Job',
          'alternateName': ['HireForJob', 'Hire For Job'],
          'url': 'https://www.hireforjob.com',
          'description': 'Hire for job – Find jobs near me, browse job listings near me, and discover jobs hiring near me on an interactive map.',
          'applicationCategory': 'BusinessApplication',
          'operatingSystem': 'Web',
          'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
          'aggregateRating': { '@type': 'AggregateRating', 'ratingValue': '4.8', 'ratingCount': '1200', 'bestRating': '5' },
        }}
      />
      {loading && <MapLoadingSkeleton mode={mode === 'hiring' ? 'hiring' : 'job'} />}
      {!authLoading && !user && <GoogleSignInPrompt />}

      {/* Desktop Layout */}
      <div className="hidden md:flex h-full">
        <div className="w-[320px] h-full border-r border-border/30 bg-background/95 backdrop-blur-sm z-20 flex-shrink-0 shadow-xl">
          <LeftSidebarPanel
            mode={mode}
            onModeChange={handleModeChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            radius={radius}
            onRadiusChange={setRadius}
            candidateCount={filteredCandidates.length}
            jobCount={filteredJobs.length}
            governmentJobCount={jobCounts.government}
            privateJobCount={jobCounts.private}
            onViewList={() => setSidebarOpen(true)}
            onCenterOnUser={handleCenterOnUser}
            userLocation={userLocation}
            filters={filters}
            onFiltersChange={setFilters}
            heatmapEnabled={heatmapEnabled}
            onHeatmapToggle={() => setHeatmapEnabled(!heatmapEnabled)}
            salaryHeatmapEnabled={salaryHeatmapEnabled}
            onSalaryHeatmapToggle={() => setSalaryHeatmapEnabled(!salaryHeatmapEnabled)}
            salaryRoleFilter={salaryRoleFilter}
            onSalaryRoleFilterChange={setSalaryRoleFilter}
          />
        </div>

        <div className="flex-1 relative">
          {mapElement}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleCenterOnUser}
                className="absolute bottom-6 right-6 z-10 rounded-2xl w-12 h-12 shadow-xl hover:shadow-2xl bg-card/95 backdrop-blur-xl border border-border/20 hover:scale-105 transition-all"
              >
                <Navigation className="w-5 h-5 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="rounded-lg">Center on my location</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden h-full">
        <div className="absolute inset-0 z-0">{mapElement}</div>
        <Header mode={mode} onModeChange={handleModeChange} onSearch={setSearchQuery} onMenuClick={() => setSidebarOpen(true)} userLocation={userLocation} />
        <QuickFilterChips mode={mode} onModeChange={handleModeChange} jobCount={filteredJobs.length} candidateCount={filteredCandidates.length} governmentJobCount={jobCounts.government} privateJobCount={jobCounts.private} />
        <FloatingControls
          onCenterOnUser={handleCenterOnUser}
          onToggleSidebar={() => setSidebarOpen(true)}
          radius={radius}
          onRadiusChange={setRadius}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
          heatmapEnabled={heatmapEnabled}
          onHeatmapToggle={() => setHeatmapEnabled(!heatmapEnabled)}
          salaryHeatmapEnabled={salaryHeatmapEnabled}
          onSalaryHeatmapToggle={() => setSalaryHeatmapEnabled(!salaryHeatmapEnabled)}
          salaryRoleFilter={salaryRoleFilter}
          onSalaryRoleFilterChange={setSalaryRoleFilter}
        />
        <NearbyAvatarRow mode={mode} candidates={filteredCandidates} jobs={filteredJobs} onSelect={handleSelectFromSidebar} onViewAll={() => setSidebarOpen(true)} />
        <MobileFAB mode={mode} />
        <BottomNavBar />
      </div>

      {/* Overlay Layer */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} mode={mode} candidates={filteredCandidates} jobs={filteredJobs} onSelectCandidate={handleSelectFromSidebar} onSelectJob={handleSelectFromSidebar} />
      <MarkerPreviewSheet isOpen={previewOpen} onClose={() => setPreviewOpen(false)} mode={mode} item={selectedItem} isEmployer={profile?.user_type === 'employer'} />
      {!authLoading && !user && showWelcome && (
        <WelcomeOverlay onDismiss={() => setShowWelcome(false)} onFindJobs={() => setMode('seeking')} onFindTalent={() => setMode('hiring')} />
      )}

      {/* SEO Content - visible below fold for crawlers */}
      <div className="hidden md:block absolute bottom-0 left-0 right-0 z-0 pointer-events-none opacity-0 h-0 overflow-hidden" aria-hidden="false">
        <SEOContentFooter />
      </div>
    </div>
  );
};

export default Index;