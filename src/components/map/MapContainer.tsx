import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { ViewMode, Candidate, Job } from '@/types';
import { toast } from 'sonner';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapContainerProps {
  mode: ViewMode;
  candidates: Candidate[];
  jobs: Job[];
  userLocation: { lat: number; lng: number } | null;
  radius: number;
  onMarkerClick: (data: Candidate | Job) => void;
  selectedItem: Candidate | Job | null;
}

// Custom marker icons
const createCandidateIcon = () =>
  L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: hsl(217, 89%, 61%);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

const createJobIcon = () =>
  L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: hsl(4, 90%, 58%);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

const createUserIcon = () =>
  L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: hsl(142, 76%, 36%);
        border: 4px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      ">
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
      </style>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

export const MapContainer = ({
  mode,
  candidates,
  jobs,
  userLocation,
  radius,
  onMarkerClick,
  selectedItem,
}: MapContainerProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: userLocation ? [userLocation.lat, userLocation.lng] : [20.5937, 78.9629],
      zoom: userLocation ? 12 : 5,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Add clean tile layer (CartoDB Voyager - Google-like style)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Initialize marker cluster group
    const markers = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const isCandidate = mode === 'hiring';
        return L.divIcon({
          html: `<div class="${isCandidate ? 'marker-cluster-candidate' : 'marker-cluster-job'}" style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 30px;
              height: 30px;
              background: ${isCandidate ? 'hsl(217, 89%, 61%)' : 'hsl(4, 90%, 58%)'};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 12px;
              font-weight: 600;
            ">${count}</div>
          </div>`,
          className: 'marker-cluster',
          iconSize: L.point(40, 40),
        });
      },
    });

    map.addLayer(markers);
    markersRef.current = markers;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update user location marker and radius circle
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    // Remove existing user marker and circle
    if (userMarkerRef.current) {
      mapRef.current.removeLayer(userMarkerRef.current);
    }
    if (radiusCircleRef.current) {
      mapRef.current.removeLayer(radiusCircleRef.current);
    }

    // Add user location marker
    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
      icon: createUserIcon(),
    }).addTo(mapRef.current);

    // Add radius circle
    radiusCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
      radius: radius * 1000, // Convert km to meters
      color: mode === 'hiring' ? 'hsl(217, 89%, 61%)' : 'hsl(4, 90%, 58%)',
      fillColor: mode === 'hiring' ? 'hsl(217, 89%, 61%)' : 'hsl(4, 90%, 58%)',
      fillOpacity: 0.1,
      weight: 2,
    }).addTo(mapRef.current);

    // Center map on user location
    mapRef.current.setView([userLocation.lat, userLocation.lng], 12);
  }, [userLocation, radius, mode]);

  // Update markers based on mode
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    // Clear existing markers
    markersRef.current.clearLayers();

    const items = mode === 'hiring' ? candidates : jobs;
    const icon = mode === 'hiring' ? createCandidateIcon() : createJobIcon();

    items.forEach((item) => {
      const lat = 'latitude' in item ? item.latitude : item.latitude;
      const lng = 'longitude' in item ? item.longitude : item.longitude;

      if (lat && lng) {
        const marker = L.marker([lat, lng], { icon });

        marker.on('click', () => {
          onMarkerClick(item);
        });

        markersRef.current?.addLayer(marker);
      }
    });

    // Fit bounds if there are markers
    if (items.length > 0 && markersRef.current.getLayers().length > 0) {
      const bounds = markersRef.current.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      }
    }
  }, [mode, candidates, jobs, onMarkerClick]);

  // Pan to selected item
  useEffect(() => {
    if (!mapRef.current || !selectedItem) return;

    const lat = (selectedItem as any).latitude;
    const lng = (selectedItem as any).longitude;

    if (lat && lng) {
      mapRef.current.setView([lat, lng], 14, { animate: true });
    }
  }, [selectedItem]);

  return (
    <div ref={containerRef} className="w-full h-full" style={{ minHeight: '100vh' }} />
  );
};
