import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { ViewMode, Candidate, Job } from '@/types';

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

// Custom marker icons with animation support
const createCandidateIcon = (isHovered: boolean = false, animationDelay: number = 0) =>
  L.divIcon({
    className: 'custom-marker marker-animated',
    html: `
      <div class="marker-pin candidate-pin ${isHovered ? 'hovered' : ''}" style="
        --animation-delay: ${animationDelay}ms;
        width: ${isHovered ? '40px' : '32px'};
        height: ${isHovered ? '40px' : '32px'};
        background: hsl(217, 89%, 61%);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 ${isHovered ? '4px 12px' : '2px 8px'} rgba(0,0,0,${isHovered ? '0.4' : '0.3'});
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        transform: ${isHovered ? 'scale(1.1)' : 'scale(1)'};
        animation: markerDrop 0.4s ease-out forwards;
        animation-delay: var(--animation-delay);
        opacity: 0;
      ">
        <svg width="${isHovered ? '20' : '16'}" height="${isHovered ? '20' : '16'}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
    `,
    iconSize: [isHovered ? 40 : 32, isHovered ? 40 : 32],
    iconAnchor: [isHovered ? 20 : 16, isHovered ? 40 : 32],
    popupAnchor: [0, isHovered ? -40 : -32],
  });

const createJobIcon = (isHovered: boolean = false, animationDelay: number = 0) =>
  L.divIcon({
    className: 'custom-marker marker-animated',
    html: `
      <div class="marker-pin job-pin ${isHovered ? 'hovered' : ''}" style="
        --animation-delay: ${animationDelay}ms;
        width: ${isHovered ? '40px' : '32px'};
        height: ${isHovered ? '40px' : '32px'};
        background: hsl(4, 90%, 58%);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 ${isHovered ? '4px 12px' : '2px 8px'} rgba(0,0,0,${isHovered ? '0.4' : '0.3'});
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        transform: ${isHovered ? 'scale(1.1)' : 'scale(1)'};
        animation: markerDrop 0.4s ease-out forwards;
        animation-delay: var(--animation-delay);
        opacity: 0;
      ">
        <svg width="${isHovered ? '20' : '16'}" height="${isHovered ? '20' : '16'}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
      </div>
    `,
    iconSize: [isHovered ? 40 : 32, isHovered ? 40 : 32],
    iconAnchor: [isHovered ? 20 : 16, isHovered ? 40 : 32],
    popupAnchor: [0, isHovered ? -40 : -32],
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

// Generate popup content for candidates
const createCandidatePopupContent = (candidate: Candidate): string => {
  const avatarHtml = candidate.avatar_url 
    ? `<img src="${candidate.avatar_url}" alt="${candidate.full_name}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid hsl(217, 89%, 61%);" />`
    : `<div style="width: 48px; height: 48px; border-radius: 50%; background: hsl(217, 89%, 61%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px;">${candidate.full_name?.charAt(0) || 'C'}</div>`;

  return `
    <div class="marker-popup-content" data-type="candidate" data-id="${candidate.id}" style="
      padding: 12px;
      min-width: 220px;
      font-family: 'Google Sans', 'Roboto', sans-serif;
      cursor: pointer;
    ">
      <div style="display: flex; gap: 12px; align-items: center;">
        ${avatarHtml}
        <div style="flex: 1; min-width: 0;">
          <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: hsl(220, 9%, 20%); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${candidate.full_name}</h4>
          <p style="margin: 2px 0 0; font-size: 12px; color: hsl(220, 9%, 46%); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${candidate.job_title || 'Job Seeker'}</p>
          ${candidate.experience_years ? `<p style="margin: 4px 0 0; font-size: 11px; color: hsl(217, 89%, 61%); font-weight: 500;">${candidate.experience_years}+ years exp</p>` : ''}
        </div>
      </div>
      ${candidate.skills && candidate.skills.length > 0 ? `
        <div style="margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap;">
          ${candidate.skills.slice(0, 3).map(skill => `
            <span style="padding: 2px 8px; background: hsl(217, 89%, 61%, 0.1); color: hsl(217, 89%, 50%); font-size: 10px; border-radius: 12px; font-weight: 500;">${skill}</span>
          `).join('')}
          ${candidate.skills.length > 3 ? `<span style="padding: 2px 8px; background: hsl(220, 14%, 96%); color: hsl(220, 9%, 46%); font-size: 10px; border-radius: 12px;">+${candidate.skills.length - 3}</span>` : ''}
        </div>
      ` : ''}
      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid hsl(220, 13%, 91%); display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 11px; color: hsl(220, 9%, 46%);">Click to view profile</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(217, 89%, 61%)" stroke-width="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
    </div>
  `;
};

// Generate popup content for jobs
const createJobPopupContent = (job: Job): string => {
  return `
    <div class="marker-popup-content" data-type="job" data-id="${job.id}" style="
      padding: 12px;
      min-width: 240px;
      font-family: 'Google Sans', 'Roboto', sans-serif;
      cursor: pointer;
    ">
      <div style="display: flex; gap: 12px; align-items: flex-start;">
        <div style="width: 44px; height: 44px; border-radius: 8px; background: hsl(4, 90%, 58%, 0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(4, 90%, 58%)" stroke-width="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        </div>
        <div style="flex: 1; min-width: 0;">
          <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: hsl(220, 9%, 20%); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${job.title}</h4>
          <p style="margin: 2px 0 0; font-size: 12px; color: hsl(220, 9%, 46%); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${job.company_name || 'Company'}</p>
        </div>
      </div>
      <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px;">
        ${job.job_type ? `<span style="padding: 3px 8px; background: hsl(220, 14%, 96%); color: hsl(220, 9%, 46%); font-size: 11px; border-radius: 4px;">${job.job_type}</span>` : ''}
        ${job.salary_range ? `<span style="padding: 3px 8px; background: hsl(142, 76%, 36%, 0.1); color: hsl(142, 76%, 30%); font-size: 11px; border-radius: 4px; font-weight: 500;">${job.salary_range}</span>` : ''}
      </div>
      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid hsl(220, 13%, 91%); display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 11px; color: hsl(220, 9%, 46%);">Click to view details</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(4, 90%, 58%)" stroke-width="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
    </div>
  `;
};

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
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const [isMobile, setIsMobile] = useState(false);
  const [tappedMarkerId, setTappedMarkerId] = useState<string | null>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle popup click to navigate
  const handlePopupClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const popupContent = target.closest('.marker-popup-content') as HTMLElement;
    if (popupContent) {
      const type = popupContent.dataset.type;
      const id = popupContent.dataset.id;
      
      if (type === 'candidate') {
        const candidate = candidates.find(c => c.id === id);
        if (candidate) onMarkerClick(candidate);
      } else if (type === 'job') {
        const job = jobs.find(j => j.id === id);
        if (job) onMarkerClick(job);
      }
    }
  }, [candidates, jobs, onMarkerClick]);

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

    // Add global popup click handler
    document.addEventListener('click', handlePopupClick);

    return () => {
      document.removeEventListener('click', handlePopupClick);
      map.remove();
      mapRef.current = null;
    };
  }, [handlePopupClick]);

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
    markerMapRef.current.clear();
    setTappedMarkerId(null);

    const items = mode === 'hiring' ? candidates : jobs;

    items.forEach((item, index) => {
      const lat = 'latitude' in item ? item.latitude : item.latitude;
      const lng = 'longitude' in item ? item.longitude : item.longitude;

      if (lat && lng) {
        const isCandidate = mode === 'hiring';
        // Staggered animation delay for each marker (max 50 markers with 30ms delay each)
        const animationDelay = Math.min(index, 50) * 30;
        const icon = isCandidate ? createCandidateIcon(false, animationDelay) : createJobIcon(false, animationDelay);
        const hoverIcon = isCandidate ? createCandidateIcon(true, 0) : createJobIcon(true, 0);
        
        const marker = L.marker([lat, lng], { icon });

        // Create popup with custom content for hover preview
        const popupContent = isCandidate 
          ? createCandidatePopupContent(item as Candidate)
          : createJobPopupContent(item as Job);

        const popup = L.popup({
          closeButton: false,
          className: 'custom-popup hover-popup',
          maxWidth: 280,
          offset: [0, -10],
          autoPan: false,
        }).setContent(popupContent);

        marker.bindPopup(popup);

        // Desktop: hover to show popup preview
        if (!isMobile) {
          marker.on('mouseover', () => {
            marker.setIcon(hoverIcon);
            marker.openPopup();
          });

          marker.on('mouseout', () => {
            // Reset icon after a small delay
            setTimeout(() => {
              marker.setIcon(icon);
            }, 100);
          });

          // Click opens the preview sheet
          marker.on('click', () => {
            marker.closePopup();
            onMarkerClick(item);
          });
        } else {
          // Mobile: tap to open preview sheet directly
          marker.on('click', () => {
            onMarkerClick(item);
          });
        }

        markerMapRef.current.set(item.id, marker);
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
  }, [mode, candidates, jobs, isMobile, tappedMarkerId]);

  // Pan to selected item
  useEffect(() => {
    if (!mapRef.current || !selectedItem) return;

    const lat = (selectedItem as any).latitude;
    const lng = (selectedItem as any).longitude;

    if (lat && lng) {
      mapRef.current.setView([lat, lng], 14, { animate: true });
      
      // Open the popup for the selected item
      const marker = markerMapRef.current.get(selectedItem.id);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedItem]);

  return (
    <>
      <style>{`
        @keyframes markerDrop {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.5);
          }
          60% {
            opacity: 1;
            transform: translateY(5px) scale(1.1);
          }
          80% {
            transform: translateY(-3px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes markerPulse {
          0%, 100% {
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          }
          50% {
            box-shadow: 0 4px 16px rgba(0,0,0,0.4);
          }
        }
        .marker-animated .marker-pin {
          animation: markerDrop 0.4s ease-out forwards;
        }
        .marker-pin.hovered {
          animation: markerPulse 1s ease-in-out infinite;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          animation: popupFadeIn 0.2s ease-out;
        }
        @keyframes popupFadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .custom-popup .leaflet-popup-content {
          margin: 0;
          min-width: 200px;
        }
        .custom-popup .leaflet-popup-tip {
          background: white;
        }
        .custom-popup .leaflet-popup-close-button {
          display: none;
        }
        .hover-popup .marker-popup-content {
          pointer-events: none;
        }
        .marker-popup-content {
          transition: background 0.15s ease;
        }
        .marker-popup-content:hover {
          background: hsl(220, 14%, 98%);
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: '100vh' }} />
    </>
  );
};
