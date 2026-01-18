import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ViewMode, Candidate, Job } from '@/types';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapData } from '@/hooks/useMapData';
import { Header } from '@/components/map/Header';
import { GoogleMapContainer } from '@/components/map/GoogleMapContainer';
import { FloatingControls } from '@/components/map/FloatingControls';
import { Sidebar } from '@/components/map/Sidebar';
import { MarkerDetailSheet } from '@/components/map/MarkerDetailSheet';
import { toast } from 'sonner';

const Index = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ViewMode>('seeking');
  const [radius, setRadius] = useState(50);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Candidate | Job | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
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
    toast.info(
      newMode === 'hiring'
        ? 'Now showing candidates near you'
        : 'Now showing jobs near you'
    );
  };

  const handleMarkerClick = (item: Candidate | Job) => {
    setSelectedItem(item);
    // Navigate to detail page
    if ('job_title' in item) {
      navigate(`/candidate/${item.id}`);
    } else {
      navigate(`/job/${(item as Job).id}`);
    }
  };

  const handleSelectFromSidebar = (item: Candidate | Job) => {
    setSelectedItem(item);
    setSidebarOpen(false);
    setDetailSheetOpen(true);
  };

  const handleCenterOnUser = () => {
    if (!userLocation) {
      toast.error('Unable to get your location');
      return;
    }
    toast.success('Centered on your location');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Google Map */}
      <GoogleMapContainer
        mode={mode}
        candidates={candidates}
        jobs={jobs}
        userLocation={userLocation}
        radius={radius}
        onMarkerClick={handleMarkerClick}
        selectedItem={selectedItem}
      />

      {/* Header */}
      <Header
        mode={mode}
        onModeChange={handleModeChange}
        onSearch={setSearchQuery}
        onMenuClick={() => setSidebarOpen(true)}
      />

      {/* Floating Controls */}
      <FloatingControls
        mode={mode}
        radius={radius}
        onRadiusChange={setRadius}
        onToggleSidebar={() => setSidebarOpen(true)}
        onCenterOnUser={handleCenterOnUser}
        candidateCount={candidates.length}
        jobCount={jobs.length}
      />

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        mode={mode}
        candidates={candidates}
        jobs={jobs}
        onSelectCandidate={handleSelectFromSidebar}
        onSelectJob={handleSelectFromSidebar}
      />

      {/* Detail Sheet (Mobile) */}
      <MarkerDetailSheet
        isOpen={detailSheetOpen}
        onClose={() => setDetailSheetOpen(false)}
        mode={mode}
        selectedItem={selectedItem}
      />
    </div>
  );
};

export default Index;
