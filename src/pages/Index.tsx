import { useState, useMemo, lazy, Suspense } from 'react';
import { SEOHead } from '@/components/SEOHead';
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

// Lazy-load the heavy Google Maps component
const LazyMapContainer = lazy(() =>
  import('@/components/map/GoogleMapContainer').then(m => ({ default: m.GoogleMapContainer }))
);

const Index = () => {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<ViewMode>('seeking');
  const [radius, setRadius] = useState(10);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Candidate | Job | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWelcome, setShowWelcome] = useState(!user);
  const [centerTrigger, setCenterTrigger] = useState(0);

  const geolocation = useGeolocation();
  const hasRealLocation = !!(geolocation.latitude && geolocation.longitude);
  const userLocation = useMemo(() => {
    if (hasRealLocation) {
      return { lat: geolocation.latitude!, lng: geolocation.longitude! };
    }
    return { lat: 20.5937, lng: 78.9629 };
  }, [geolocation.latitude, geolocation.longitude, hasRealLocation]);

  const effectiveRadius = hasRealLocation ? radius : 5000;

  const { candidates, jobs, loading } = useMapData({
    userLocation,
    radius: effectiveRadius,
    searchQuery,
  });

  const jobCounts = useMemo(() => ({
    private: jobs.filter(j => j.job_category !== 'government').length,
    government: jobs.filter(j => j.job_category === 'government').length,
  }), [jobs]);

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

  // Single shared map element — rendered once, positioned via CSS
  const mapElement = (
    <Suspense fallback={<MapLoadingSkeleton mode={mode === 'hiring' ? 'hiring' : 'job'} />}>
      <LazyMapContainer
        mode={mode}
        candidates={candidates}
        jobs={jobs}
        userLocation={userLocation}
        radius={radius}
        onMarkerClick={handleMarkerClick}
        selectedItem={selectedItem}
        isEmployer={profile?.user_type === 'employer'}
        centerTrigger={centerTrigger}
      />
    </Suspense>
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <SEOHead title="HireForJob - Find Jobs & Talent Near You" description="Discover jobs and talent on an interactive map. Connect with employers and candidates in your area." canonicalUrl="https://www.hireforjob.com/" ogImage="https://www.hireforjob.com/logo.png" />
      {/* Loading Skeleton */}
      {loading && <MapLoadingSkeleton mode={mode === 'hiring' ? 'hiring' : 'job'} />}

      {/* Google Sign-In Prompt for unauthenticated users */}
      {!user && <GoogleSignInPrompt />}

      {/* Desktop Layout: Sidebar + Map */}
      <div className="hidden md:flex h-full">
        {/* Left Sidebar Panel */}
        <div className="w-[300px] h-full border-r border-border bg-background z-20 flex-shrink-0">
          <LeftSidebarPanel
            mode={mode}
            onModeChange={handleModeChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            radius={radius}
            onRadiusChange={setRadius}
            candidateCount={candidates.length}
            jobCount={jobs.length}
            governmentJobCount={jobCounts.government}
            privateJobCount={jobCounts.private}
            onViewList={() => setSidebarOpen(true)}
            onCenterOnUser={handleCenterOnUser}
            userLocation={userLocation}
          />
        </div>

        {/* Map Container - single instance */}
        <div className="flex-1 relative">
          {mapElement}

          {/* Navigation Button - Desktop */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleCenterOnUser}
                className="absolute bottom-6 right-6 z-10 rounded-full w-12 h-12 shadow-xl hover:shadow-2xl bg-background border border-border/50"
              >
                <Navigation className="w-5 h-5 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Center on my location</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Mobile Layout: Full screen map with overlays */}
      <div className="md:hidden h-full">
        {/* Map Layer - single instance */}
        <div className="absolute inset-0 z-0">
          {mapElement}
        </div>

        {/* UI Layer */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="pointer-events-auto">
            <Header
              mode={mode}
              onModeChange={handleModeChange}
              onSearch={setSearchQuery}
              onMenuClick={() => setSidebarOpen(true)}
              userLocation={userLocation}
            />
          </div>

          <div className="pointer-events-auto">
            <QuickFilterChips
              mode={mode}
              onModeChange={handleModeChange}
              jobCount={jobs.length}
              candidateCount={candidates.length}
              governmentJobCount={jobCounts.government}
              privateJobCount={jobCounts.private}
            />
          </div>

          <div className="pointer-events-auto">
            <FloatingControls
              onCenterOnUser={handleCenterOnUser}
              onToggleSidebar={() => setSidebarOpen(true)}
              radius={radius}
              onRadiusChange={setRadius}
              onSearch={setSearchQuery}
              searchQuery={searchQuery}
            />
          </div>

          <div className="pointer-events-auto">
            <NearbyAvatarRow
              mode={mode}
              candidates={candidates}
              jobs={jobs}
              onSelect={handleSelectFromSidebar}
              onViewAll={() => setSidebarOpen(true)}
            />
          </div>
        </div>

        <MobileFAB mode={mode} />
        <BottomNavBar />
      </div>

      {/* Overlay Layer - Shared */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        mode={mode}
        candidates={candidates}
        jobs={jobs}
        onSelectCandidate={handleSelectFromSidebar}
        onSelectJob={handleSelectFromSidebar}
      />

      <MarkerPreviewSheet
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        mode={mode}
        item={selectedItem}
        isEmployer={profile?.user_type === 'employer'}
      />

      {!user && showWelcome && (
        <WelcomeOverlay
          onDismiss={() => setShowWelcome(false)}
          onFindJobs={() => setMode('seeking')}
          onFindTalent={() => setMode('hiring')}
        />
      )}
    </div>
  );
};

export default Index;
