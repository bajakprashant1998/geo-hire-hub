import { useCallback, useMemo, useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, Circle, MarkerClusterer, InfoWindow, OverlayView } from '@react-google-maps/api';
import { ViewMode, Candidate, Job } from '@/types';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { GoogleMapsLoaderBoundary } from '@/components/map/GoogleMapsLoaderBoundary';
import { Loader2, MapPin, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // India center

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy', // Allow scroll zoom without ctrl key
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

// Pre-computed marker icon URLs to avoid regenerating SVG data URIs on every render
const markerIconCache = new Map<string, string>();
const getMarkerIconUrl = (color: string, isCandidate: boolean): string => {
  const key = `${color}-${isCandidate}`;
  if (markerIconCache.has(key)) return markerIconCache.get(key)!;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><circle cx="18" cy="18" r="15" fill="#${color}" stroke="white" stroke-width="3"/>${
    isCandidate
      ? '<path d="M22 24v-1a3 3 0 0 0-3-3h-2a3 3 0 0 0-3 3v1" stroke="white" stroke-width="1.5" fill="none"/><circle cx="18" cy="14" r="2.5" stroke="white" stroke-width="1.5" fill="none"/>'
      : '<rect x="11" y="14" width="14" height="9" rx="1.5" fill="white" opacity="0.9"/><path d="M16 14V12a2 2 0 0 1 4 0v2" stroke="white" stroke-width="1.5" fill="none"/>'
  }</svg>`;
  const url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  markerIconCache.set(key, url);
  return url;
};

// Pre-computed cluster icon URLs
const clusterIconCache = new Map<string, string>();
const getClusterIconUrl = (mode: string, size: number): string => {
  const key = `${mode}-${size}`;
  if (clusterIconCache.has(key)) return clusterIconCache.get(key)!;
  const r = size / 2;
  const innerR = Math.round(r * 0.77);
  const fill = mode === 'hiring' ? 'hsl(217,89%,61%)' : 'hsl(4,90%,58%)';
  const innerFill = mode === 'hiring' ? 'hsl(217,89%,51%)' : 'hsl(4,90%,48%)';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="${fill}" opacity="0.85"/><circle cx="${r}" cy="${r}" r="${innerR}" fill="${innerFill}" stroke="white" stroke-width="2"/></svg>`;
  const url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  clusterIconCache.set(key, url);
  return url;
};

const CustomMarker = ({
  item,
  mode,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave
}: {
  item: Candidate | Job;
  mode: ViewMode;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) => {
  const isCandidate = mode === 'hiring';

  // Base styles ported from the custom Leaflet HTML clusters
  const size = isHovered ? '40px' : '32px';
  const iconSize = isHovered ? '20' : '16';

  // Specific styling based on mode and attributes
  let bgColor = '';
  if (isCandidate) {
    bgColor = 'hsl(217, 89%, 61%)'; // Blue
  } else {
    const job = item as Job;
    bgColor = job.job_category === 'government' ? 'hsl(152, 69%, 31%)' : 'hsl(4, 90%, 58%)'; // Green or Red
  }

  return (
    <OverlayView
      position={{ lat: item.latitude, lng: item.longitude }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(width, height) => ({
        x: -(width / 2),
        y: -height, // Anchor to bottom center like Leaflet's [16, 32]
      })}
    >
      <div
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          width: size,
          height: size,
          background: bgColor,
          border: '3px solid white',
          borderRadius: '50%',
          boxShadow: `0 ${isHovered ? '4px 12px' : '2px 8px'} rgba(0,0,0,${isHovered ? '0.4' : '0.3'})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          cursor: 'pointer',
          zIndex: isHovered ? 1000 : 1
        }}
      >
        {isCandidate ? (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ) : (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        )}
      </div>
    </OverlayView>
  );
};
// -------------------------------------------------------------

// Inner component that only renders when we have the API key
const GoogleMapInner = ({
  mode,
  candidates,
  jobs,
  userLocation,
  radius,
  onMarkerClick,
  selectedItem,
  isEmployer,
  centerTrigger = 0,
  apiKey,
}: GoogleMapContainerProps & { apiKey: string }) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [hoveredItem, setHoveredItem] = useState<Candidate | Job | null>(null);
  const [spiderfiedCluster, setSpiderfiedCluster] = useState<{ center: google.maps.LatLng; markers: google.maps.Marker[] } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clusterHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
    }, 300); // 300ms buffer to allow mouse to move into popup
  };

  // Helper to format relative time
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
    // Use a key-derived script id to avoid "different options" crashes during hot reloads
    // or when the loader was previously initialized with an empty key.
    id: `google-map-script-${apiKey.slice(0, 8)}`,
    googleMapsApiKey: apiKey,
  });

  const center = useMemo(() => {
    if (userLocation) return userLocation;
    return defaultCenter;
  }, [userLocation]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Pan to selected item
  useEffect(() => {
    if (!map || !selectedItem) return;

    const lat = (selectedItem as any).latitude;
    const lng = (selectedItem as any).longitude;

    if (lat && lng) {
      map.panTo({ lat, lng });
      map.setZoom(14);
    }
  }, [map, selectedItem]);

  // Handle center trigger
  useEffect(() => {
    if (!map || !userLocation || centerTrigger === 0) return;
    map.panTo(userLocation);
    map.setZoom(12);
  }, [centerTrigger, map, userLocation]);

  // Fit bounds when markers change
  useEffect(() => {
    if (!map) return;

    const items = mode === 'hiring' ? candidates : jobs;
    if (items.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    items.forEach((item) => {
      bounds.extend({ lat: item.latitude, lng: item.longitude });
    });

    if (userLocation) {
      bounds.extend(userLocation);
    }

    map.fitBounds(bounds, { top: 100, right: 50, bottom: 50, left: 50 });
  }, [map, mode, candidates, jobs, userLocation]);

  const items = mode === 'hiring' ? candidates : jobs;

  const mapTypeId = map?.getMapTypeId() || 'roadmap';

  const isSaved = false; // Note: For a robust implementation, pass saved states or fetch them similar to MapContainer
  const isGovt = hoveredItem && 'job_category' in hoveredItem ? hoveredItem.job_category === 'government' : false;

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary">
        <div className="text-center">
          <p className="text-destructive">Failed to load map</p>
          <p className="text-sm text-muted-foreground mt-1">Please check your API key</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary">
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
      options={{
        ...mapOptions,
        mapTypeId: 'hybrid', // Setting satellite view as requested
      }}
    >
      {/* User location marker */}
      {userLocation && (
        <>
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
          <Circle
            center={userLocation}
            radius={radius * 1000}
            options={{
              fillColor: mode === 'hiring' ? '#4285F4' : '#EA4335',
              fillOpacity: 0.1,
              strokeColor: mode === 'hiring' ? '#4285F4' : '#EA4335',
              strokeOpacity: 0.4,
              strokeWeight: 2,
            }}
          />
        </>
      )}

      {/* Clustered Markers - key forces re-creation when mode changes */}
      <MarkerClusterer
        key={`cluster-${mode}`}
        onLoad={(clusterer) => {
          clustererRef.current = clusterer;
          // Attach hover listeners to cluster DOM elements after clustering
          google.maps.event.addListener(clusterer, 'clusteringend', () => {
            const clusters = clusterer.getClusters();
            clusters.forEach((cluster: any) => {
              // Try multiple internal API paths for different versions of markerclustererplus
              const icon = cluster.clusterIcon_;
              const el = icon?.div_ || icon?.element_ || icon?.div || icon?.container_;
              if (!el) return;
              el.style.cursor = 'pointer';

              // Avoid duplicate listeners
              if (el._spiderListenerAttached) return;
              el._spiderListenerAttached = true;

              el.addEventListener('mouseenter', () => {
                if (clusterHoverTimeoutRef.current) {
                  clearTimeout(clusterHoverTimeoutRef.current);
                  clusterHoverTimeoutRef.current = null;
                }
                const markers = cluster.getMarkers();
                const center = cluster.getCenter();
                if (markers && center && markers.length <= 20) {
                  setSpiderfiedCluster({ center, markers });
                }
              });
              el.addEventListener('mouseleave', () => {
                clusterHoverTimeoutRef.current = setTimeout(() => {
                  setSpiderfiedCluster(null);
                }, 400);
              });
            });
          });
        }}
        options={{
          maxZoom: 18,
          gridSize: 60,
          zoomOnClick: true,
          minimumClusterSize: 2,
          styles: [
            {
              textColor: 'white',
              textSize: 14,
              url: getClusterIconUrl(mode, 52),
              width: 52,
              height: 52,
            },
            {
              textColor: 'white',
              textSize: 15,
              url: getClusterIconUrl(mode, 62),
              width: 62,
              height: 62,
            },
          ],
        }}
        onClick={(cluster) => {
          setSpiderfiedCluster(null);
          if (map) {
            const bounds = cluster.getBounds();
            if (bounds) {
              map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
              const currentZoom = map.getZoom();
              if (currentZoom && currentZoom >= 17) {
                map.setZoom(currentZoom + 1);
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
                    scaledSize: new google.maps.Size(36, 36),
                    anchor: new google.maps.Point(18, 18),
                  }}
                  onClick={() => onMarkerClick(item)}
                  onMouseOver={() => handleMouseEnter(item)}
                  onMouseOut={handleMouseLeave}
                />
              );
            })}
          </>
        )}
      </MarkerClusterer>

      {/* Spiderfied cluster overlay - shows individual markers on cluster hover */}
      {spiderfiedCluster && spiderfiedCluster.markers.length > 0 && (
        <OverlayView
          position={{ lat: spiderfiedCluster.center.lat(), lng: spiderfiedCluster.center.lng() }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={() => ({ x: 0, y: 0 })}
        >
          <div
            style={{ position: 'relative', width: 0, height: 0 }}
            onMouseEnter={() => {
              if (clusterHoverTimeoutRef.current) {
                clearTimeout(clusterHoverTimeoutRef.current);
                clusterHoverTimeoutRef.current = null;
              }
            }}
            onMouseLeave={() => {
              clusterHoverTimeoutRef.current = setTimeout(() => {
                setSpiderfiedCluster(null);
              }, 400);
            }}
          >
            {/* Semi-transparent backdrop circle */}
            <div style={{
              position: 'absolute',
              left: '-100px',
              top: '-100px',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.08)',
              border: '2px solid rgba(255,255,255,0.3)',
              pointerEvents: 'none',
            }} />
            {/* Spider legs + markers */}
            {spiderfiedCluster.markers.map((marker, i) => {
              const count = spiderfiedCluster.markers.length;
              const angle = (2 * Math.PI * i) / count - Math.PI / 2;
              const legLen = Math.min(80, 40 + count * 5);
              const x = Math.cos(angle) * legLen;
              const y = Math.sin(angle) * legLen;

              // Find the matching data item
              const pos = marker.getPosition();
              const matchedItem = items.find(
                (it) => Math.abs(it.latitude - (pos?.lat() || 0)) < 0.0001 && Math.abs(it.longitude - (pos?.lng() || 0)) < 0.0001
              );

              const isCandidate = mode === 'hiring';
              const job = matchedItem as Job;
              const bgColor = isCandidate
                ? 'hsl(217, 89%, 61%)'
                : job?.job_category === 'government'
                  ? 'hsl(152, 69%, 31%)'
                  : 'hsl(4, 90%, 58%)';

              const label = isCandidate
                ? (matchedItem as Candidate)?.full_name?.split(' ')[0] || ''
                : (matchedItem as Job)?.title?.split(' ').slice(0, 2).join(' ') || '';

              return (
                <div key={marker.getTitle?.() || i}>
                  {/* Leg line */}
                  <svg
                    style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}
                    width="0"
                    height="0"
                  >
                    <line x1="0" y1="0" x2={x} y2={y} stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
                  </svg>
                  {/* Marker dot */}
                  <div
                    onClick={() => matchedItem && onMarkerClick(matchedItem)}
                    onMouseEnter={() => matchedItem && handleMouseEnter(matchedItem)}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      position: 'absolute',
                      left: `${x - 18}px`,
                      top: `${y - 18}px`,
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: bgColor,
                      border: '3px solid white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.2s ease',
                      zIndex: 10,
                    }}
                    title={label}
                  >
                    {isCandidate ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    )}
                  </div>
                  {/* Label */}
                  <div style={{
                    position: 'absolute',
                    left: `${x - 40}px`,
                    top: `${y + 20}px`,
                    width: '80px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'white',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </OverlayView>
      )}

      {/* InfoWindow for hover preview */}
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
              minWidth: '280px',
              maxWidth: '320px',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              background: 'white',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
            }}>
            {mode === 'hiring' ? (
              // Candidate Preview
              <>
                <div style={{ padding: '16px 16px 12px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  {(hoveredItem as Candidate).avatar_url ? (
                    <img
                      src={(hoveredItem as Candidate).avatar_url}
                      alt={(hoveredItem as Candidate).full_name}
                      style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', border: '2px solid hsl(217, 89%, 85%)' }}
                    />
                  ) : (
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '12px',
                      background: 'hsl(217, 89%, 95%)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: 'hsl(217, 89%, 61%)', fontWeight: 600, fontSize: '18px'
                    }}>
                      {(hoveredItem as Candidate).full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'C'}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'hsl(220, 9%, 15%)', lineHeight: 1.3, fontFamily: "'Playfair Display', Georgia, serif" }}>
                      {(hoveredItem as Candidate).full_name}
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'hsl(217, 89%, 61%)', fontWeight: 500 }}>
                      {(hoveredItem as Candidate).job_title || 'Job Seeker'}
                    </p>
                  </div>
                  {isEmployer && (
                    <button style={{
                      width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', flexShrink: 0,
                      background: isSaved ? 'hsl(45, 93%, 95%)' : 'hsl(220, 14%, 96%)'
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={isSaved ? "hsl(45, 93%, 47%)" : "none"} stroke={isSaved ? "hsl(45, 93%, 47%)" : "hsl(220, 9%, 46%)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  )}
                </div>

                {isEmployer ? (
                  <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(hoveredItem as Candidate).experience_years && (
                      <span style={{ padding: '6px 12px', background: 'hsl(217, 89%, 95%)', color: 'hsl(217, 89%, 45%)', fontSize: '12px', borderRadius: '6px', fontWeight: 500 }}>
                        {(hoveredItem as Candidate).experience_years}+ years
                      </span>
                    )}
                    {(hoveredItem as Candidate).skills && (hoveredItem as Candidate).skills!.length > 0 && (
                      <span style={{ padding: '6px 12px', background: 'hsl(142, 70%, 95%)', color: 'hsl(142, 76%, 30%)', fontSize: '12px', borderRadius: '6px', fontWeight: 600 }}>
                        {(hoveredItem as Candidate).skills!.length} skills
                      </span>
                    )}
                    {(hoveredItem as Candidate).distance_km !== undefined && (
                      <span style={{ padding: '6px 12px', background: 'hsl(4, 90%, 95%)', color: 'hsl(4, 90%, 50%)', fontSize: '12px', borderRadius: '6px', fontWeight: 500 }}>
                        {(hoveredItem as Candidate).distance_km?.toFixed(1)} km
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '0 16px 14px' }}>
                    <p style={{ margin: 0, fontSize: '12px', color: 'hsl(220, 9%, 46%)', lineHeight: 1.5 }}>Sign in as an employer to view full profile details</p>
                  </div>
                )}

                <div style={{ padding: '12px 16px', borderTop: '1px solid hsl(220, 13%, 93%)', display: 'flex', gap: '8px' }}>
                  {isEmployer ? (
                    <>
                      <button
                        onClick={() => { navigate(`/candidates/${hoveredItem.id}?action=contact`); }}
                        style={{
                          flex: 1, padding: '10px 16px', background: 'hsl(217, 89%, 61%)', color: 'white', border: 'none', borderRadius: '8px',
                          fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        Contact
                      </button>
                      <button
                        onClick={() => { navigate(`/candidates/${hoveredItem.id}`); }}
                        style={{
                          padding: '10px 16px', background: 'hsl(220, 14%, 96%)', color: 'hsl(220, 9%, 35%)', border: 'none', borderRadius: '8px',
                          fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                        </svg>
                        View
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { navigate(`/candidates/${hoveredItem.id}`); }}
                      style={{
                        flex: 1, padding: '10px 16px', background: 'hsl(217, 89%, 61%)', color: 'white', border: 'none', borderRadius: '8px',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                      </svg>
                      Sign In to View
                    </button>
                  )}
                </div>
              </>
            ) : (
              // Job Preview
              <>
                <div style={{ height: '4px', background: isGovt ? 'hsl(152, 69%, 31%)' : 'hsl(4, 90%, 58%)' }}></div>

                <div style={{ padding: '14px 16px 10px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '12px', background: isGovt ? 'hsl(152, 69%, 95%)' : 'hsl(4, 90%, 95%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={isGovt ? 'hsl(152, 69%, 31%)' : 'hsl(4, 90%, 58%)'} stroke="none">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" fill={isGovt ? 'hsl(152, 69%, 95%)' : 'hsl(4, 90%, 95%)'} />
                    </svg>
                    {(hoveredItem as any).employers?.verification_status === 'approved' && (
                      <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'white', borderRadius: '50%', padding: '2px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#16a34a" stroke="white" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'hsl(220, 9%, 15%)', lineHeight: 1.3, fontFamily: "'Playfair Display', Georgia, serif", flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {(hoveredItem as Job).title}
                      </h4>
                      {(hoveredItem as Job).created_at && isNewJob((hoveredItem as Job).created_at) && (
                        <span style={{ padding: '2px 8px', background: 'hsl(45, 93%, 47%)', color: 'white', fontSize: '10px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'hsl(220, 9%, 46%)' }}>{(hoveredItem as Job).company_name || 'Company'}</p>
                  </div>
                  <button style={{
                    width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease', flexShrink: 0,
                    background: isSaved ? 'hsl(45, 93%, 95%)' : 'hsl(220, 14%, 96%)'
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={isSaved ? "hsl(45, 93%, 47%)" : "none"} stroke={isSaved ? "hsl(45, 93%, 47%)" : "hsl(220, 9%, 46%)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </div>

                <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {(hoveredItem as Job).job_type && (
                    <span style={{ padding: '6px 12px', background: 'hsl(220, 14%, 96%)', color: 'hsl(220, 9%, 35%)', fontSize: '12px', borderRadius: '6px', fontWeight: 500 }}>
                      {(hoveredItem as Job).job_type}
                    </span>
                  )}
                  {(hoveredItem as Job).salary_range && (
                    <span style={{ padding: '6px 12px', background: 'hsl(142, 70%, 95%)', color: 'hsl(142, 76%, 30%)', fontSize: '12px', borderRadius: '6px', fontWeight: 600 }}>
                      ₹{(hoveredItem as Job).salary_range}
                    </span>
                  )}
                  {(hoveredItem as Job).distance_km !== undefined && (
                    <span style={{ padding: '6px 12px', background: 'hsl(4, 90%, 95%)', color: 'hsl(4, 90%, 50%)', fontSize: '12px', borderRadius: '6px', fontWeight: 500 }}>
                      {(hoveredItem as Job).distance_km?.toFixed(1)} km
                    </span>
                  )}
                  {(hoveredItem as Job).created_at && (
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'hsl(220, 9%, 56%)' }}>
                      {formatTimeAgo((hoveredItem as Job).created_at)}
                    </span>
                  )}
                </div>

                <div style={{ padding: '12px 16px', borderTop: '1px solid hsl(220, 13%, 93%)', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { navigate(`/jobs/${hoveredItem.id}?action=apply`); }}
                    style={{
                      flex: 1, padding: '10px 16px', background: 'hsl(4, 90%, 58%)', color: 'white', border: 'none', borderRadius: '8px',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s ease'
                    }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Apply Now
                  </button>
                  <button
                    onClick={() => { navigate(`/jobs/${hoveredItem.id}`); }}
                    style={{
                      padding: '10px 16px', background: 'hsl(220, 14%, 96%)', color: 'hsl(220, 9%, 35%)', border: 'none', borderRadius: '8px',
                      fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s ease'
                    }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                    </svg>
                    View
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

// Wrapper component that handles API key loading
export const GoogleMapContainer = ({
  mode,
  candidates,
  jobs,
  userLocation,
  radius,
  onMarkerClick,
  selectedItem,
  isEmployer,
  centerTrigger,
}: GoogleMapContainerProps) => {
  const { apiKey, loading: keyLoading, error: keyError } = useGoogleMapsKey();

  if (keyLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (keyError || !apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary">
        <div className="text-center">
          <p className="text-destructive">Failed to load map</p>
          <p className="text-sm text-muted-foreground mt-1">{keyError || 'API key not available'}</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMapsLoaderBoundary>
      <GoogleMapInner
        key={apiKey}
        mode={mode}
        candidates={candidates}
        jobs={jobs}
        userLocation={userLocation}
        radius={radius}
        onMarkerClick={onMarkerClick}
        selectedItem={selectedItem}
        isEmployer={isEmployer}
        centerTrigger={centerTrigger}
        apiKey={apiKey}
      />
    </GoogleMapsLoaderBoundary>
  );
};

