import { useCallback, useMemo, useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, Circle, MarkerClusterer, InfoWindow, OverlayView } from '@react-google-maps/api';
import { ViewMode, Candidate, Job } from '@/types';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { GoogleMapsLoaderBoundary } from '@/components/map/GoogleMapsLoaderBoundary';
import { Loader2, MapPin, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const MAPS_LIBRARIES: ('visualization')[] = ['visualization'];

interface GoogleMapContainerProps {
  mode: ViewMode;
  candidates: Candidate[];
  jobs: Job[];
  userLocation: { lat: number; lng: number } | null;
  radius: number;
  onMarkerClick: (data: Candidate | Job) => void;
  selectedItem: Candidate | Job | null;
  isEmployer?: boolean;
  centerTrigger?: number;
  heatmapEnabled?: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: 20.5937, lng: 78.9629 };

// Modern minimal map style
const modernMapStyle: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e7f5' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f0f4f0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e0e4e0' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#e8ece8' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#f0f4f0' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
];

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  styles: modernMapStyle,
};

// Pre-computed marker icon URLs
const markerIconCache = new Map<string, string>();
const getMarkerIconUrl = (color: string, isCandidate: boolean): string => {
  const key = `${color}-${isCandidate}`;
  if (markerIconCache.has(key)) return markerIconCache.get(key)!;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/></filter></defs><circle cx="20" cy="20" r="16" fill="#${color}" stroke="white" stroke-width="3" filter="url(#s)"/>${
    isCandidate
      ? '<path d="M24 26v-1a3 3 0 0 0-3-3h-2a3 3 0 0 0-3 3v1" stroke="white" stroke-width="1.5" fill="none"/><circle cx="20" cy="16" r="2.5" stroke="white" stroke-width="1.5" fill="none"/>'
      : '<rect x="13" y="16" width="14" height="9" rx="1.5" fill="white" opacity="0.9"/><path d="M18 16V14a2 2 0 0 1 4 0v2" stroke="white" stroke-width="1.5" fill="none"/>'
  }</svg>`;
  const url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  markerIconCache.set(key, url);
  return url;
};

// Pre-computed cluster icon URLs with gradient
const clusterIconCache = new Map<string, string>();
const getClusterIconUrl = (mode: string, size: number): string => {
  const key = `${mode}-${size}`;
  if (clusterIconCache.has(key)) return clusterIconCache.get(key)!;
  const r = size / 2;
  const innerR = Math.round(r * 0.77);
  const fill = mode === 'hiring' ? 'hsl(217,89%,61%)' : 'hsl(4,90%,58%)';
  const innerFill = mode === 'hiring' ? 'hsl(217,89%,51%)' : 'hsl(4,90%,48%)';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><filter id="cs" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.2"/></filter></defs><circle cx="${r}" cy="${r}" r="${r}" fill="${fill}" opacity="0.85" filter="url(#cs)"/><circle cx="${r}" cy="${r}" r="${innerR}" fill="${innerFill}" stroke="white" stroke-width="2.5"/></svg>`;
  const url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  clusterIconCache.set(key, url);
  return url;
};

// Inner component
const GoogleMapInner = (props: GoogleMapContainerProps & { apiKey: string }) => {
  const {
    mode, candidates, jobs, userLocation, radius,
    onMarkerClick, selectedItem, isEmployer,
    centerTrigger = 0, apiKey, heatmapEnabled = false,
  } = props;
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const heatmapLayerRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const [hoveredItem, setHoveredItem] = useState<Candidate | Job | null>(null);
  const [spiderfiedCluster, setSpiderfiedCluster] = useState<{ center: google.maps.LatLng; markers: google.maps.Marker[] } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clustererRef = useRef<any>(null);
  const navigate = useNavigate();

  const handleMouseEnter = (item: Candidate | Job) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredItem(item);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 300);
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  const isNewJob = (dateString: string): boolean => {
    const date = new Date(dateString);
    const now = new Date();
    return (now.getTime() - date.getTime()) < 24 * 60 * 60 * 1000;
  };

  const { isLoaded, loadError } = useJsApiLoader({
    id: `google-map-script-${apiKey.slice(0, 8)}`,
    googleMapsApiKey: apiKey,
    libraries: MAPS_LIBRARIES,
  });

  const center = useMemo(() => userLocation || defaultCenter, [userLocation]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    map.addListener('click', () => setSpiderfiedCluster(null));
  }, []);
  const onUnmount = useCallback(() => setMap(null), []);

  // Smooth pan to selected item
  useEffect(() => {
    if (!map || !selectedItem) return;
    const lat = (selectedItem as any).latitude;
    const lng = (selectedItem as any).longitude;
    if (lat && lng) {
      map.panTo({ lat, lng });
      if (map.getZoom()! < 14) map.setZoom(14);
    }
  }, [map, selectedItem]);

  // Handle center trigger with smooth animation
  useEffect(() => {
    if (!map || !userLocation || centerTrigger === 0) return;
    map.panTo(userLocation);
    map.setZoom(13);
  }, [centerTrigger, map, userLocation]);

  // Fit bounds
  useEffect(() => {
    if (!map) return;
    const items = mode === 'hiring' ? candidates : jobs;
    if (items.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    items.forEach((item) => bounds.extend({ lat: item.latitude, lng: item.longitude }));
    if (userLocation) bounds.extend(userLocation);
    map.fitBounds(bounds, { top: 100, right: 50, bottom: 50, left: 50 });
  }, [map, mode, candidates, jobs, userLocation]);

  // Heatmap layer
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.setMap(null);
      heatmapLayerRef.current = null;
    }
    if (!heatmapEnabled) return;
    const points = (mode === 'hiring' ? candidates : jobs).map(item => ({
      location: new google.maps.LatLng(item.latitude, item.longitude),
      weight: 1,
    }));
    if (points.length === 0) return;
    const heatmap = new google.maps.visualization.HeatmapLayer({
      data: points,
      map,
      radius: 40,
      opacity: 0.6,
      gradient: mode === 'hiring'
        ? ['rgba(66,133,244,0)', 'rgba(66,133,244,0.4)', 'rgba(66,133,244,0.8)', 'rgba(25,82,180,1)']
        : ['rgba(234,67,53,0)', 'rgba(234,67,53,0.4)', 'rgba(234,67,53,0.8)', 'rgba(180,25,25,1)'],
    });
    heatmapLayerRef.current = heatmap;
    return () => { heatmap.setMap(null); };
  }, [map, isLoaded, heatmapEnabled, mode, candidates, jobs]);

  const items = mode === 'hiring' ? candidates : jobs;
  const isGovt = hoveredItem && 'job_category' in hoveredItem ? hoveredItem.job_category === 'government' : false;
  const isSaved = false;

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30">
        <div className="text-center p-8 rounded-2xl bg-card shadow-lg border border-border/30">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-6 h-6 text-destructive" />
          </div>
          <p className="text-destructive font-semibold">Failed to load map</p>
          <p className="text-sm text-muted-foreground mt-1">Please check your connection</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/10">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={userLocation ? 12 : 5}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={mapOptions}
    >
      {/* User location marker with pulse */}
      {userLocation && (
        <>
          {/* Outer pulse ring */}
          <Circle
            center={userLocation}
            radius={150}
            options={{
              fillColor: '#22C55E',
              fillOpacity: 0.15,
              strokeColor: '#22C55E',
              strokeOpacity: 0.3,
              strokeWeight: 1,
            }}
          />
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#22C55E',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            }}
            zIndex={1000}
          />
          {/* Radius circle with gradient feel */}
          <Circle
            center={userLocation}
            radius={radius * 1000}
            options={{
              fillColor: mode === 'hiring' ? '#4285F4' : '#EA4335',
              fillOpacity: 0.06,
              strokeColor: mode === 'hiring' ? '#4285F4' : '#EA4335',
              strokeOpacity: 0.3,
              strokeWeight: 2,
              strokePosition: google.maps.StrokePosition.INSIDE,
            }}
          />
        </>
      )}

      {/* Clustered Markers */}
      <MarkerClusterer
        key={`cluster-${mode}`}
        onLoad={(clusterer) => {
          clustererRef.current = clusterer;
        }}
        options={{
          maxZoom: 18,
          gridSize: 60,
          zoomOnClick: false,
          minimumClusterSize: 2,
          styles: [
            {
              textColor: 'white',
              textSize: 14,
              url: getClusterIconUrl(mode, 54),
              width: 54,
              height: 54,
            },
            {
              textColor: 'white',
              textSize: 15,
              url: getClusterIconUrl(mode, 66),
              width: 66,
              height: 66,
            },
          ],
        }}
        onClick={(cluster) => {
          const markers = cluster.getMarkers();
          const center = cluster.getCenter();
          // If small cluster, spiderfy; otherwise zoom in
          if (markers && center && markers.length <= 20) {
            setSpiderfiedCluster(prev => {
              // Toggle off if clicking same cluster
              if (prev && prev.center.lat() === center.lat() && prev.center.lng() === center.lng()) {
                return null;
              }
              return { center, markers };
            });
          } else {
            setSpiderfiedCluster(null);
            if (map) {
              const bounds = cluster.getBounds();
              if (bounds) {
                map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
              }
            }
          }
        }}
      >
        {(clusterer) => (
          <>
            {items.map((item) => {
              const isCandidate = mode === 'hiring';
              const job = item as Job;
              const markerColor = isCandidate ? '3B82F6' : (job.job_category === 'government' ? '16A34A' : 'EF4444');

              return (
                <Marker
                  key={item.id}
                  position={{ lat: item.latitude, lng: item.longitude }}
                  clusterer={clusterer}
                  icon={{
                    url: getMarkerIconUrl(markerColor, isCandidate),
                    scaledSize: new google.maps.Size(40, 40),
                    anchor: new google.maps.Point(20, 20),
                  }}
                  onClick={() => onMarkerClick(item)}
                  onMouseOver={() => handleMouseEnter(item)}
                  onMouseOut={handleMouseLeave}
                  animation={selectedItem?.id === item.id ? google.maps.Animation.BOUNCE : undefined}
                />
              );
            })}
          </>
        )}
      </MarkerClusterer>

      {/* Spiderfied cluster overlay */}
      {spiderfiedCluster && spiderfiedCluster.markers.length > 0 && (
        <OverlayView
          position={{ lat: spiderfiedCluster.center.lat(), lng: spiderfiedCluster.center.lng() }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={() => ({ x: 0, y: 0 })}
        >
          <div
            style={{ position: 'relative', width: 0, height: 0 }}
          >
            <div style={{
              position: 'absolute', left: '-100px', top: '-100px',
              width: '200px', height: '200px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.08)', border: '2px solid rgba(255,255,255,0.3)',
              pointerEvents: 'none',
            }} />
            {spiderfiedCluster.markers.map((marker, i) => {
              const count = spiderfiedCluster.markers.length;
              const angle = (2 * Math.PI * i) / count - Math.PI / 2;
              const legLen = Math.min(80, 40 + count * 5);
              const x = Math.cos(angle) * legLen;
              const y = Math.sin(angle) * legLen;
              const pos = marker.getPosition();
              const matchedItem = items.find(
                (it) => Math.abs(it.latitude - (pos?.lat() || 0)) < 0.0001 && Math.abs(it.longitude - (pos?.lng() || 0)) < 0.0001
              );
              const isCandidate = mode === 'hiring';
              const job = matchedItem as Job;
              const bgColor = isCandidate ? 'hsl(217, 89%, 61%)' : job?.job_category === 'government' ? 'hsl(152, 69%, 31%)' : 'hsl(4, 90%, 58%)';
              const label = isCandidate
                ? (matchedItem as Candidate)?.full_name?.split(' ')[0] || ''
                : (matchedItem as Job)?.title?.split(' ').slice(0, 2).join(' ') || '';

              return (
                <div key={marker.getTitle?.() || i}>
                  <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }} width="0" height="0">
                    <line x1="0" y1="0" x2={x} y2={y} stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
                  </svg>
                  <div
                    onClick={() => matchedItem && onMarkerClick(matchedItem)}
                    onMouseEnter={() => matchedItem && handleMouseEnter(matchedItem)}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      position: 'absolute', left: `${x - 18}px`, top: `${y - 18}px`,
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: bgColor, border: '3px solid white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'transform 0.2s ease', zIndex: 10,
                    }}
                    title={label}
                  >
                    {isCandidate ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    )}
                  </div>
                  <div style={{
                    position: 'absolute', left: `${x - 40}px`, top: `${y + 20}px`,
                    width: '80px', textAlign: 'center', fontSize: '11px', fontWeight: 600,
                    color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    pointerEvents: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </OverlayView>
      )}

      {/* Enhanced InfoWindow for hover preview */}
      {hoveredItem && (
        <InfoWindow
          position={{ lat: hoveredItem.latitude, lng: hoveredItem.longitude }}
          options={{ disableAutoPan: true, pixelOffset: new google.maps.Size(0, -32) }}
          onCloseClick={() => setHoveredItem(null)}
        >
          <div
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
            }}
            onMouseLeave={handleMouseLeave}
            style={{
              minWidth: '280px', maxWidth: '320px',
              fontFamily: "'Inter', -apple-system, sans-serif",
              background: 'white', borderRadius: '16px', overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            }}>
            {mode === 'hiring' ? (
              <>
                <div style={{ padding: '16px 16px 12px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  {(hoveredItem as Candidate).avatar_url ? (
                    <img src={(hoveredItem as Candidate).avatar_url} alt={(hoveredItem as Candidate).full_name}
                      style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover', border: '2px solid hsl(217, 89%, 85%)' }} />
                  ) : (
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '14px',
                      background: 'linear-gradient(135deg, hsl(217, 89%, 95%), hsl(217, 89%, 88%))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'hsl(217, 89%, 51%)', fontWeight: 700, fontSize: '18px'
                    }}>
                      {(hoveredItem as Candidate).full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'C'}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
                      {(hoveredItem as Candidate).full_name}
                    </h4>
                    <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'hsl(217, 89%, 51%)', fontWeight: 500 }}>
                      {(hoveredItem as Candidate).job_title || 'Job Seeker'}
                    </p>
                  </div>
                </div>
                {isEmployer ? (
                  <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(hoveredItem as Candidate).experience_years && (
                      <span style={{ padding: '5px 10px', background: 'hsl(217, 89%, 96%)', color: 'hsl(217, 89%, 40%)', fontSize: '12px', borderRadius: '8px', fontWeight: 600 }}>
                        {(hoveredItem as Candidate).experience_years}+ yrs
                      </span>
                    )}
                    {(hoveredItem as Candidate).skills?.length > 0 && (
                      <span style={{ padding: '5px 10px', background: 'hsl(142, 70%, 96%)', color: 'hsl(142, 76%, 30%)', fontSize: '12px', borderRadius: '8px', fontWeight: 600 }}>
                        {(hoveredItem as Candidate).skills!.length} skills
                      </span>
                    )}
                    {(hoveredItem as Candidate).distance_km !== undefined && (
                      <span style={{ padding: '5px 10px', background: 'hsl(280, 60%, 96%)', color: 'hsl(280, 60%, 40%)', fontSize: '12px', borderRadius: '8px', fontWeight: 600 }}>
                        📍 {(hoveredItem as Candidate).distance_km?.toFixed(1)} km
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '0 16px 14px' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>Sign in as employer to view profile</p>
                  </div>
                )}
                <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '8px' }}>
                  {isEmployer ? (
                    <>
                      <button onClick={() => navigate(`/candidates/${hoveredItem.id}?action=contact`)}
                        style={{ flex: 1, padding: '10px', background: 'hsl(217, 89%, 51%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                        💬 Contact
                      </button>
                      <button onClick={() => navigate(`/candidates/${hoveredItem.id}`)}
                        style={{ padding: '10px 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                        View →
                      </button>
                    </>
                  ) : (
                    <button onClick={() => navigate(`/candidates/${hoveredItem.id}`)}
                      style={{ flex: 1, padding: '10px', background: 'hsl(217, 89%, 51%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                      🔒 Sign In to View
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{ height: '4px', background: isGovt ? 'hsl(152, 69%, 36%)' : 'hsl(4, 90%, 55%)' }} />
                <div style={{ padding: '14px 16px 10px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '14px', background: isGovt ? 'linear-gradient(135deg, hsl(152, 69%, 95%), hsl(152, 69%, 88%))' : 'linear-gradient(135deg, hsl(4, 90%, 96%), hsl(4, 90%, 90%))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={isGovt ? 'hsl(152, 69%, 31%)' : 'hsl(4, 90%, 55%)'} stroke="none">
                      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" fill={isGovt ? 'hsl(152, 69%, 95%)' : 'hsl(4, 90%, 96%)'} />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827', lineHeight: 1.3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(hoveredItem as Job).title}
                      </h4>
                      {(hoveredItem as Job).created_at && isNewJob((hoveredItem as Job).created_at) && (
                        <span style={{ padding: '2px 8px', background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: 'white', fontSize: '9px', borderRadius: '6px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#6b7280' }}>{(hoveredItem as Job).company_name || 'Company'}</p>
                  </div>
                </div>
                <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  {(hoveredItem as Job).job_type && (
                    <span style={{ padding: '5px 10px', background: '#f3f4f6', color: '#374151', fontSize: '12px', borderRadius: '8px', fontWeight: 500 }}>
                      {(hoveredItem as Job).job_type}
                    </span>
                  )}
                  {(hoveredItem as Job).salary_range && (
                    <span style={{ padding: '5px 10px', background: 'hsl(142, 70%, 96%)', color: 'hsl(142, 76%, 28%)', fontSize: '12px', borderRadius: '8px', fontWeight: 600 }}>
                      ₹{(hoveredItem as Job).salary_range}
                    </span>
                  )}
                  {(hoveredItem as Job).distance_km !== undefined && (
                    <span style={{ padding: '5px 10px', background: 'hsl(280, 60%, 96%)', color: 'hsl(280, 60%, 40%)', fontSize: '12px', borderRadius: '8px', fontWeight: 600 }}>
                      📍 {(hoveredItem as Job).distance_km?.toFixed(1)} km
                    </span>
                  )}
                  {(hoveredItem as Job).created_at && (
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#9ca3af' }}>
                      {formatTimeAgo((hoveredItem as Job).created_at)}
                    </span>
                  )}
                </div>
                <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '8px' }}>
                  <button onClick={() => navigate(`/jobs/${hoveredItem.id}?action=apply`)}
                    style={{ flex: 1, padding: '10px', background: isGovt ? 'hsl(152, 69%, 36%)' : 'hsl(4, 90%, 55%)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                    ⚡ Apply Now
                  </button>
                  <button onClick={() => navigate(`/jobs/${hoveredItem.id}`)}
                    style={{ padding: '10px 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                    Details →
                  </button>
                </div>
              </>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

// Wrapper component
export const GoogleMapContainer = memo((props: GoogleMapContainerProps) => {
  const { apiKey, error } = useGoogleMapsKey();

  if (error || !apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30">
        <div className="text-center p-8 rounded-2xl bg-card shadow-lg border border-border/30">
          <MapPin className="w-8 h-8 text-destructive mx-auto mb-3" />
          <p className="text-destructive font-semibold">Map unavailable</p>
          <p className="text-sm text-muted-foreground mt-1">{error || 'API key missing'}</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMapsLoaderBoundary>
      <GoogleMapInner {...props} apiKey={apiKey} />
    </GoogleMapsLoaderBoundary>
  );
});