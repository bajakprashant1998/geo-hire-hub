import { useState, useMemo, useCallback } from 'react';
import { ViewMode, Candidate, Job } from '@/types';
import { mockCandidates, mockJobs } from '@/data/mockData';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Header } from '@/components/map/Header';
import { MapContainer } from '@/components/map/MapContainer';
import { FloatingControls } from '@/components/map/FloatingControls';
import { Sidebar } from '@/components/map/Sidebar';
import { MarkerDetailSheet } from '@/components/map/MarkerDetailSheet';
import { toast } from 'sonner';

const Index = () => {
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

  // Calculate distance for items
  const calculateDistance = useCallback(
    (lat: number, lng: number) => {
      if (!userLocation) return undefined;
      const R = 6371; // Earth's radius in km
      const dLat = ((lat - userLocation.lat) * Math.PI) / 180;
      const dLon = ((lng - userLocation.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLocation.lat * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    [userLocation]
  );

  // Filter candidates and jobs based on radius and search
  const filteredCandidates = useMemo(() => {
    return mockCandidates
      .map((candidate) => ({
        ...candidate,
        distance_km: calculateDistance(candidate.latitude, candidate.longitude),
      }))
      .filter((candidate) => {
        if (!candidate.distance_km || candidate.distance_km > radius) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            candidate.full_name.toLowerCase().includes(query) ||
            candidate.job_title.toLowerCase().includes(query) ||
            candidate.skills.some((s) => s.toLowerCase().includes(query))
          );
        }
        return true;
      })
      .sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
  }, [calculateDistance, radius, searchQuery]);

  const filteredJobs = useMemo(() => {
    return mockJobs
      .map((job) => ({
        ...job,
        distance_km: calculateDistance(job.latitude, job.longitude),
      }))
      .filter((job) => {
        if (!job.distance_km || job.distance_km > radius) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            job.title.toLowerCase().includes(query) ||
            job.company_name.toLowerCase().includes(query) ||
            job.job_type.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
  }, [calculateDistance, radius, searchQuery]);

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
    setDetailSheetOpen(true);
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
      {/* Map */}
      <MapContainer
        mode={mode}
        candidates={filteredCandidates}
        jobs={filteredJobs}
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
        candidateCount={filteredCandidates.length}
        jobCount={filteredJobs.length}
      />

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        mode={mode}
        candidates={filteredCandidates}
        jobs={filteredJobs}
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
