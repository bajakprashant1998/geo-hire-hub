import { useState, useMemo } from 'react';
import { SEOHead } from '@/components/SEOHead';
import { ViewMode, Candidate, Job } from '@/types';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapData } from '@/hooks/useMapData';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/map/Header';
import { MapContainer } from '@/components/map/MapContainer';
import { MapLoadingSkeleton } from '@/components/map/MapLoadingSkeleton';
import { Sidebar } from '@/components/map/Sidebar';
import { MarkerPreviewSheet } from '@/components/map/MarkerPreviewSheet';
import BottomNavBar from '@/components/map/BottomNavBar';
import { WelcomeOverlay } from '@/components/map/WelcomeOverlay';
import { MobileFAB } from '@/components/map/MobileFAB';
import { StatsBottomSheet } from '@/components/map/StatsBottomSheet';
import { LeftSidebarPanel } from '@/components/map/LeftSidebarPanel';
import { Button } from '@/components/ui/button';
import { Navigation } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<ViewMode>('seeking');
  const [radius, setRadius] = useState(10);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Candidate | Job | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWelcome, setShowWelcome] = useState(!user);

  const geolocation = useGeolocation();
  const userLocation = useMemo(() => {
    if (geolocation.latitude && geolocation.longitude) {
      return { lat: geolocation.latitude, lng: geolocation.longitude };
    }
    return null;
  }, [geolocation.latitude, geolocation.longitude]);

  // Fetch real data from Supabase
  const { candidates, jobs, loading } = useMapData({
    userLocation,
    radius,
    searchQuery,
  });

  // Job category counts
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
    toast.success('Centered on your location');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <SEOHead title="HireForJob - Find Jobs & Talent Near You" description="Discover jobs and talent on an interactive map. Connect with employers and candidates in your area." canonicalUrl="https://hireforjob1.lovable.app/" ogImage="https://hireforjob1.lovable.app/logo.png" />
      {/* Loading Skeleton */}
      {loading && <MapLoadingSkeleton />}

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

        {/* Map Container */}
        <div className="flex-1 relative">
          <MapContainer
            mode={mode}
            candidates={candidates}
            jobs={jobs}
            userLocation={userLocation}
            radius={radius}
            onMarkerClick={handleMarkerClick}
            selectedItem={selectedItem}
            isEmployer={profile?.user_type === 'employer'}
          />

          {/* Navigation Button - Desktop */}
          <Button
            variant="secondary"
            size="icon"
            onClick={handleCenterOnUser}
            className="absolute bottom-6 right-6 z-10 rounded-full w-12 h-12 shadow-xl hover:shadow-2xl bg-background border border-border/50"
            title="Center on my location"
          >
            <Navigation className="w-5 h-5 text-primary" />
          </Button>
        </div>
      </div>

      {/* Mobile Layout: Full screen map with overlays */}
      <div className="md:hidden h-full">
        {/* Map Layer */}
        <div className="absolute inset-0 z-0">
          <MapContainer
            mode={mode}
            candidates={candidates}
            jobs={jobs}
            userLocation={userLocation}
            radius={radius}
            onMarkerClick={handleMarkerClick}
            selectedItem={selectedItem}
            isEmployer={profile?.user_type === 'employer'}
          />
        </div>

        {/* UI Layer */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Header */}
          <div className="pointer-events-auto">
            <Header
              mode={mode}
              onModeChange={handleModeChange}
              onSearch={setSearchQuery}
              onMenuClick={() => setSidebarOpen(true)}
              userLocation={userLocation}
            />
          </div>

          {/* Stats Bottom Sheet - Mobile only */}
          <div className="pointer-events-auto">
            <StatsBottomSheet
              mode={mode}
              candidateCount={candidates.length}
              jobCount={jobs.length}
              governmentJobCount={jobCounts.government}
              privateJobCount={jobCounts.private}
              radius={radius}
              onRadiusChange={setRadius}
              onToggleSidebar={() => setSidebarOpen(true)}
              onCenterOnUser={handleCenterOnUser}
            />
          </div>
        </div>

        {/* Mobile FAB */}
        <MobileFAB mode={mode} />

        {/* Bottom Navigation - Mobile only */}
        <BottomNavBar />
      </div>

      {/* Overlay Layer - Shared between Desktop and Mobile */}
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

      {/* Welcome Overlay - Only for guests */}
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
