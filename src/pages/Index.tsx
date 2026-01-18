import { useState, useMemo } from 'react';
import { ViewMode, Candidate, Job } from '@/types';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapData } from '@/hooks/useMapData';
import { Header } from '@/components/map/Header';
import { MapContainer } from '@/components/map/MapContainer';
import { FloatingControls } from '@/components/map/FloatingControls';
import { Sidebar } from '@/components/map/Sidebar';
import { MarkerPreviewSheet } from '@/components/map/MarkerPreviewSheet';
import { toast } from 'sonner';

const Index = () => {
  const [mode, setMode] = useState<ViewMode>('seeking');
  const [radius, setRadius] = useState(50);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Candidate | Job | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      {/* Map Layer - Lowest z-index */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          mode={mode}
          candidates={candidates}
          jobs={jobs}
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

        {/* Floating Controls */}
        <div className="pointer-events-auto">
          <FloatingControls
            mode={mode}
            radius={radius}
            onRadiusChange={setRadius}
            onToggleSidebar={() => setSidebarOpen(true)}
            onCenterOnUser={handleCenterOnUser}
            candidateCount={candidates.length}
            jobCount={jobs.length}
          />
        </div>
      </div>

      {/* Overlay Layer - Highest z-index */}
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
      />
    </div>
  );
};

export default Index;
