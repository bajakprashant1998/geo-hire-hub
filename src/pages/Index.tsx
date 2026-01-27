import { useState, useMemo } from 'react';
import { ViewMode, Candidate, Job } from '@/types';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapData } from '@/hooks/useMapData';
import { Header } from '@/components/map/Header';
import { MapContainer } from '@/components/map/MapContainer';
import { MapLoadingSkeleton } from '@/components/map/MapLoadingSkeleton';
import { FloatingControls } from '@/components/map/FloatingControls';
import { Sidebar } from '@/components/map/Sidebar';
import { MarkerPreviewSheet } from '@/components/map/MarkerPreviewSheet';
import BottomNavBar from '@/components/map/BottomNavBar';
import { JobCategoryFilter, JobCategoryFilterValue, MapLegend } from '@/components/government';
import { toast } from 'sonner';

const Index = () => {
  const [mode, setMode] = useState<ViewMode>('seeking');
  const [radius, setRadius] = useState(50);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Candidate | Job | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [jobCategoryFilter, setJobCategoryFilter] = useState<JobCategoryFilterValue>('all');

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

  // Filter jobs by category
  const filteredJobs = useMemo(() => {
    if (jobCategoryFilter === 'all') return jobs;
    return jobs.filter(job => job.job_category === jobCategoryFilter);
  }, [jobs, jobCategoryFilter]);

  // Count jobs by category
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
        : 'Now showing jobs near you'
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
      toast.error('Unable to get your location');
      return;
    }
    toast.success('Centered on your location');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Loading Skeleton */}
      {loading && <MapLoadingSkeleton />}
      
      {/* Map Layer - Lowest z-index */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          mode={mode}
          candidates={candidates}
          jobs={filteredJobs}
          userLocation={userLocation}
          radius={radius}
          onMarkerClick={handleMarkerClick}
          selectedItem={selectedItem}
        />
      </div>

      {/* UI Layer - Higher z-index */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Header */}
        <div className="pointer-events-auto">
          <Header
            mode={mode}
            onModeChange={handleModeChange}
            onSearch={setSearchQuery}
            onMenuClick={() => setSidebarOpen(true)}
          />
        </div>

        {/* Job Category Filter - only show in seeking mode */}
        {mode === 'seeking' && (
          <div className="pointer-events-auto absolute top-20 left-4 z-20">
            <JobCategoryFilter
              value={jobCategoryFilter}
              onChange={setJobCategoryFilter}
              showCounts
              privateCnt={jobCounts.private}
              governmentCnt={jobCounts.government}
            />
          </div>
        )}

        {/* Map Legend */}
        <div className="pointer-events-auto absolute bottom-32 left-4 z-20 hidden md:block">
          <MapLegend mode={mode} />
        </div>

        {/* Floating Controls */}
        <div className="pointer-events-auto">
          <FloatingControls
            mode={mode}
            radius={radius}
            onRadiusChange={setRadius}
            onToggleSidebar={() => setSidebarOpen(true)}
            onCenterOnUser={handleCenterOnUser}
            candidateCount={candidates.length}
            jobCount={filteredJobs.length}
          />
        </div>
      </div>

      {/* Overlay Layer - Highest z-index */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        mode={mode}
        candidates={candidates}
        jobs={filteredJobs}
        onSelectCandidate={handleSelectFromSidebar}
        onSelectJob={handleSelectFromSidebar}
      />

      <MarkerPreviewSheet
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        mode={mode}
        item={selectedItem}
      />

      {/* Bottom Navigation - Mobile only */}
      <BottomNavBar />
    </div>
  );
};

export default Index;
