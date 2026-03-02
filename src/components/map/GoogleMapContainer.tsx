/// <reference types="google.maps" />
import { useCallback, useMemo, useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map as GoogleMapView, AdvancedMarker, useMap, InfoWindow } from '@vis.gl/react-google-maps';
import { MarkerClusterer, type Cluster } from '@googlemaps/markerclusterer';
import { ViewMode, Candidate, Job } from '@/types';
import { GoogleMapsProvider } from '@/components/map/GoogleMapsProvider';


// Map ID required for AdvancedMarkerElement — use a generic one or your own
const MAP_ID = 'hireforjob-map';

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

const defaultCenter = { lat: 20.5937, lng: 78.9629 };

const GoogleMapInner = (props: GoogleMapContainerProps) => {
  const {
    mode, candidates, jobs, userLocation, radius,
    onMarkerClick, selectedItem, isEmployer,
    centerTrigger = 0, heatmapEnabled = false,
  } = props;

  const map = useMap();
  const navigate = useNavigate();
  const heatmapLayerRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<globalThis.Map<string, google.maps.marker.AdvancedMarkerElement>>(new globalThis.Map());
  const [hoveredItem, setHoveredItem] = useState<Candidate | Job | null>(null);
  const [spiderfiedCluster, setSpiderfiedCluster] = useState<{ center: google.maps.LatLng; items: (Candidate | Job)[] } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const items = mode === 'hiring' ? candidates : jobs;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const center = useMemo(() => userLocation || defaultCenter, [userLocation]);

  const handleMouseEnter = (item: Candidate | Job) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredItem(item);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredItem(null), 300);
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
    return (Date.now() - date.getTime()) < 24 * 60 * 60 * 1000;
  };

  // Initialize clusterer
  useEffect(() => {
    if (!map) return;

    const clusterer = new MarkerClusterer({
      map,
      markers: [],
      onClusterClick: (_event: google.maps.MapMouseEvent, cluster: Cluster, _map: google.maps.Map) => {
        const clusterMarkers = cluster.markers as google.maps.marker.AdvancedMarkerElement[];
        if (!clusterMarkers || clusterMarkers.length === 0) return;

        if (clusterMarkers.length <= 20) {
          // Spiderfy: find matching items
          const clusterItems: (Candidate | Job)[] = [];
          clusterMarkers.forEach(m => {
            const pos = m.position as google.maps.LatLngLiteral;
            if (!pos) return;
            const matched = itemsRef.current.find(
              it => Math.abs(it.latitude - pos.lat) < 0.0001 && Math.abs(it.longitude - pos.lng) < 0.0001
            );
            if (matched) clusterItems.push(matched);
          });

          const clusterCenter = cluster.position;
          setSpiderfiedCluster(prev => {
            if (prev && Math.abs(prev.center.lat() - clusterCenter.lat()) < 0.0001) return null;
            return { center: clusterCenter, items: clusterItems };
          });
        } else {
          // Zoom in
          setSpiderfiedCluster(null);
          const bounds = cluster.bounds;
          if (bounds) _map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
        }
      },
      renderer: {
        render: ({ count, position }: Cluster, _stats: any, _map: google.maps.Map) => {
          const size = count > 50 ? 66 : 54;
          const color = mode === 'hiring' ? '#3B82F6' : '#EF4444';
          const innerColor = mode === 'hiring' ? '#2563EB' : '#DC2626';
          
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${color}" opacity="0.85"/>
            <circle cx="${size/2}" cy="${size/2}" r="${Math.round(size * 0.38)}" fill="${innerColor}" stroke="white" stroke-width="2.5"/>
            <text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="central" fill="white" font-size="${count > 99 ? 13 : 14}" font-weight="600" font-family="system-ui, sans-serif">${count}</text>
          </svg>`;

          const marker = new google.maps.marker.AdvancedMarkerElement({
            position,
            content: (() => {
              const div = document.createElement('div');
              div.innerHTML = svg;
              div.style.cursor = 'pointer';
              div.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))';
              return div;
            })(),
            zIndex: 1000 + count,
          });

          return marker;
        },
      },
    });

    clustererRef.current = clusterer;

    return () => {
      clusterer.clearMarkers();
      (clusterer as any).setMap?.(null);
    };
  }, [map, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync markers with clusterer
  useEffect(() => {
    if (!clustererRef.current) return;
    const newMarkers = Array.from(markersRef.current.values());
    clustererRef.current.clearMarkers();
    clustererRef.current.addMarkers(newMarkers);
  }, [items]);

  // Close spiderfier on map click
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('click', () => setSpiderfiedCluster(null));
    return () => google.maps.event.removeListener(listener);
  }, [map]);

  // Pan to selected item
  useEffect(() => {
    if (!map || !selectedItem) return;
    const lat = (selectedItem as any).latitude;
    const lng = (selectedItem as any).longitude;
    if (lat && lng) {
      map.panTo({ lat, lng });
      if (map.getZoom()! < 14) map.setZoom(14);
    }
  }, [map, selectedItem]);

  // Handle center trigger
  useEffect(() => {
    if (!map || !userLocation || centerTrigger === 0) return;
    map.panTo(userLocation);
    map.setZoom(13);
  }, [centerTrigger, map, userLocation]);

  // Fit bounds
  useEffect(() => {
    if (!map) return;
    if (items.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    items.forEach(item => bounds.extend({ lat: item.latitude, lng: item.longitude }));
    if (userLocation) bounds.extend(userLocation);
    map.fitBounds(bounds, { top: 100, right: 50, bottom: 50, left: 50 });
  }, [map, mode, candidates, jobs, userLocation]);

  // Heatmap layer
  useEffect(() => {
    if (!map) return;
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.setMap(null);
      heatmapLayerRef.current = null;
    }
    if (!heatmapEnabled) return;
    const points = items.map(item => ({
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
  }, [map, heatmapEnabled, mode, items]);

  // Marker ref callback
  const setMarkerRef = useCallback((marker: google.maps.marker.AdvancedMarkerElement | null, id: string) => {
    if (marker) {
      markersRef.current.set(id, marker);
    } else {
      markersRef.current.delete(id);
    }
  }, []);

  const isGovt = hoveredItem && 'job_category' in hoveredItem ? hoveredItem.job_category === 'government' : false;

  return (
    <GoogleMapView
      defaultCenter={center}
      defaultZoom={userLocation ? 12 : 5}
      mapId={MAP_ID}
      gestureHandling="greedy"
      disableDefaultUI={false}
      zoomControl
      mapTypeControl={false}
      streetViewControl={false}
      fullscreenControl={false}
      clickableIcons={false}
      style={{ width: '100%', height: '100%' }}
    >
      {/* User location marker */}
      {userLocation && (
        <AdvancedMarker position={userLocation} zIndex={1000}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: '#22C55E', border: '3px solid white',
              boxShadow: '0 0 0 6px rgba(34,197,94,0.2), 0 2px 8px rgba(0,0,0,0.3)',
            }} />
          </div>
        </AdvancedMarker>
      )}

      {/* Item markers */}
      {items.map(item => {
        const isCandidate = mode === 'hiring';
        const job = item as Job;
        const bgColor = isCandidate ? '#3B82F6' : (job.job_category === 'government' ? '#16A34A' : '#EF4444');
        const isSelected = selectedItem?.id === item.id;

        return (
          <AdvancedMarker
            key={item.id}
            position={{ lat: item.latitude, lng: item.longitude }}
            onClick={() => { setSpiderfiedCluster(null); onMarkerClick(item); }}
            ref={(marker) => setMarkerRef(marker as unknown as google.maps.marker.AdvancedMarkerElement, item.id)}
            zIndex={isSelected ? 999 : 1}
          >
            <div
              onMouseEnter={() => handleMouseEnter(item)}
              onMouseLeave={handleMouseLeave}
              style={{
                width: isSelected ? 44 : 38,
                height: isSelected ? 44 : 38,
                borderRadius: '50%',
                background: bgColor,
                border: `3px solid white`,
                boxShadow: isSelected
                  ? `0 0 0 4px ${bgColor}44, 0 4px 12px rgba(0,0,0,0.3)`
                  : '0 2px 8px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              {isCandidate ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              )}
            </div>
          </AdvancedMarker>
        );
      })}

      {/* Spiderfied cluster overlay */}
      {spiderfiedCluster && spiderfiedCluster.items.length > 0 && (
        <AdvancedMarker
          position={{ lat: spiderfiedCluster.center.lat(), lng: spiderfiedCluster.center.lng() }}
          zIndex={900}
        >
          <div style={{ position: 'relative', width: 0, height: 0 }}>
            {/* Background circle */}
            <div style={{
              position: 'absolute', left: '-100px', top: '-100px',
              width: '200px', height: '200px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.06)', border: '2px solid rgba(255,255,255,0.4)',
              pointerEvents: 'none',
            }} />
            {spiderfiedCluster.items.map((spiderItem, i) => {
              const count = spiderfiedCluster.items.length;
              const angle = (2 * Math.PI * i) / count - Math.PI / 2;
              const legLen = Math.min(85, 40 + count * 5);
              const x = Math.cos(angle) * legLen;
              const y = Math.sin(angle) * legLen;
              const isCandidate = mode === 'hiring';
              const job = spiderItem as Job;
              const bgColor = isCandidate ? '#3B82F6' : (job?.job_category === 'government' ? '#16A34A' : '#EF4444');
              const label = isCandidate
                ? (spiderItem as Candidate)?.full_name?.split(' ')[0] || ''
                : (spiderItem as Job)?.title?.split(' ').slice(0, 2).join(' ') || '';

              return (
                <div key={spiderItem.id}>
                  {/* Connecting line */}
                  <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }} width="0" height="0">
                    <line x1="0" y1="0" x2={x} y2={y} stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
                  </svg>
                  {/* Spider marker */}
                  <div
                    onClick={() => { setSpiderfiedCluster(null); onMarkerClick(spiderItem); }}
                    onMouseEnter={() => handleMouseEnter(spiderItem)}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      position: 'absolute', left: `${x - 18}px`, top: `${y - 18}px`,
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: bgColor, border: '3px solid white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'transform 0.2s ease', zIndex: 10,
                    }}
                  >
                    {isCandidate ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    )}
                  </div>
                  {/* Label */}
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
        </AdvancedMarker>
      )}

      {/* Hover InfoWindow */}
      {hoveredItem && (
        <InfoWindow
          position={{ lat: hoveredItem.latitude, lng: hoveredItem.longitude }}
          pixelOffset={[0, -40]}
          onCloseClick={() => setHoveredItem(null)}
          headerContent={<span />}
          maxWidth={320}
        >
          <div
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
            }}
            onMouseLeave={handleMouseLeave}
            className="map-infowindow-card"
          >
            {mode === 'hiring' ? (
              <div className="p-0 m-0">
                <div className="flex items-start gap-3 p-3 pb-2">
                  {(hoveredItem as Candidate).avatar_url ? (
                    <img src={(hoveredItem as Candidate).avatar_url} alt={(hoveredItem as Candidate).full_name}
                      className="w-11 h-11 rounded-xl object-cover border-2 border-blue-200 shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 font-bold text-base shrink-0">
                      {(hoveredItem as Candidate).full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'C'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-gray-900 leading-tight truncate m-0">
                      {(hoveredItem as Candidate).full_name}
                    </h4>
                    <p className="text-xs text-blue-600 font-medium mt-0.5 m-0 truncate">
                      {(hoveredItem as Candidate).job_title || 'Job Seeker'}
                    </p>
                  </div>
                </div>
                {isEmployer ? (
                  <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                    {(hoveredItem as Candidate).experience_years > 0 && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[11px] rounded-md font-semibold">
                        {(hoveredItem as Candidate).experience_years}+ yrs
                      </span>
                    )}
                    {(hoveredItem as Candidate).skills?.length > 0 && (
                      <span className="px-2 py-1 bg-green-50 text-green-700 text-[11px] rounded-md font-semibold">
                        {(hoveredItem as Candidate).skills!.length} skills
                      </span>
                    )}
                    {(hoveredItem as Candidate).distance_km !== undefined && (
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[11px] rounded-md font-semibold">
                        📍 {(hoveredItem as Candidate).distance_km?.toFixed(1)} km
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="px-3 pb-2">
                    <p className="text-[11px] text-gray-500 m-0">Sign in as employer to view profile</p>
                  </div>
                )}
                <div className="flex gap-2 px-3 py-2 border-t border-gray-100">
                  {isEmployer ? (
                    <>
                      <button onClick={() => navigate(`/candidates/${hoveredItem.id}?action=contact`)}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg border-none cursor-pointer transition-colors">
                        💬 Contact
                      </button>
                      <button onClick={() => navigate(`/candidates/${hoveredItem.id}`)}
                        className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg border-none cursor-pointer transition-colors">
                        View →
                      </button>
                    </>
                  ) : (
                    <button onClick={() => navigate(`/candidates/${hoveredItem.id}`)}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg border-none cursor-pointer transition-colors">
                      🔒 Sign In to View
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-0 m-0">
                <div className={`h-1 ${isGovt ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div className="flex items-start gap-3 p-3 pb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isGovt ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={isGovt ? '#059669' : '#ef4444'} stroke="none">
                      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" fill={isGovt ? '#d1fae5' : '#fee2e2'} />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-gray-900 leading-tight truncate m-0 flex-1">
                        {(hoveredItem as Job).title}
                      </h4>
                      {(hoveredItem as Job).created_at && isNewJob((hoveredItem as Job).created_at) && (
                        <span className="px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] rounded font-extrabold uppercase tracking-wide shrink-0">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 m-0 truncate">{(hoveredItem as Job).company_name || 'Company'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2">
                  {(hoveredItem as Job).job_type && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-[11px] rounded-md font-medium">
                      {(hoveredItem as Job).job_type}
                    </span>
                  )}
                  {(hoveredItem as Job).salary_range && (
                    <span className="px-2 py-1 bg-green-50 text-green-800 text-[11px] rounded-md font-semibold">
                      ₹{(hoveredItem as Job).salary_range}
                    </span>
                  )}
                  {(hoveredItem as Job).distance_km !== undefined && (
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[11px] rounded-md font-semibold">
                      📍 {(hoveredItem as Job).distance_km?.toFixed(1)} km
                    </span>
                  )}
                  {(hoveredItem as Job).created_at && (
                    <span className="ml-auto text-[10px] text-gray-400">
                      {formatTimeAgo((hoveredItem as Job).created_at)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 px-3 py-2 border-t border-gray-100">
                  <button onClick={() => navigate(`/jobs/${hoveredItem.id}?action=apply`)}
                    className={`flex-1 py-2 text-white text-xs font-semibold rounded-lg border-none cursor-pointer transition-colors ${isGovt ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}>
                    ⚡ Apply Now
                  </button>
                  <button onClick={() => navigate(`/jobs/${hoveredItem.id}`)}
                    className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg border-none cursor-pointer transition-colors">
                    Details →
                  </button>
                </div>
              </div>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMapView>
  );
};

// Wrapper
export const GoogleMapContainer = memo((props: GoogleMapContainerProps) => {
  return (
    <GoogleMapsProvider>
      <GoogleMapInner {...props} />
    </GoogleMapsProvider>
  );
});
