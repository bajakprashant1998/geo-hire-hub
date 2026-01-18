import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

// Generate popup content for candidates - with contact button for employers
const createCandidatePopupContent = (candidate: Candidate): string => {
  const avatarHtml = candidate.avatar_url 
    ? `<img src="${candidate.avatar_url}" alt="${candidate.full_name}" style="width: 48px; height: 48px; border-radius: 12px; object-fit: cover;" />`
    : `<div style="width: 48px; height: 48px; border-radius: 12px; background: hsl(217, 89%, 95%); display: flex; align-items: center; justify-content: center; color: hsl(217, 89%, 61%); font-weight: 600; font-size: 20px;">${candidate.full_name?.charAt(0) || 'C'}</div>`;

  return `
    <div class="marker-popup-content" data-type="candidate" data-id="${candidate.id}" style="
      min-width: 280px;
      max-width: 320px;
      font-family: 'Google Sans', 'Roboto', sans-serif;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
    ">
      <!-- Header with avatar and name -->
      <div style="padding: 16px 16px 12px; display: flex; gap: 14px; align-items: flex-start;">
        ${avatarHtml}
        <div style="flex: 1; min-width: 0;">
          <h4 style="margin: 0; font-size: 16px; font-weight: 600; color: hsl(220, 9%, 15%); line-height: 1.3;">${candidate.full_name}</h4>
          <p style="margin: 4px 0 0; font-size: 13px; color: hsl(220, 9%, 46%);">${candidate.job_title || 'Job Seeker'}</p>
        </div>
      </div>
      
      <!-- Tags row -->
      <div style="padding: 0 16px 14px; display: flex; flex-wrap: wrap; gap: 8px;">
        ${candidate.experience_years ? `<span style="padding: 6px 12px; background: hsl(220, 14%, 96%); color: hsl(220, 9%, 35%); font-size: 12px; border-radius: 6px; font-weight: 500;">${candidate.experience_years}+ years</span>` : ''}
        ${candidate.skills && candidate.skills.length > 0 ? `<span style="padding: 6px 12px; background: hsl(217, 89%, 95%); color: hsl(217, 89%, 45%); font-size: 12px; border-radius: 6px; font-weight: 600;">${candidate.skills.length} skills</span>` : ''}
      </div>
      
      <!-- Action buttons -->
      <div style="padding: 12px 16px; border-top: 1px solid hsl(220, 13%, 93%); display: flex; gap: 8px;">
        <button class="popup-contact-btn" data-action="contact" data-candidate-id="${candidate.id}" style="
          flex: 1;
          padding: 10px 16px;
          background: hsl(217, 89%, 61%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Contact
        </button>
        <button class="popup-view-btn" data-action="view" style="
          padding: 10px 16px;
          background: hsl(220, 14%, 96%);
          color: hsl(220, 9%, 35%);
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"/>
            <path d="m12 5 7 7-7 7"/>
          </svg>
          View
        </button>
      </div>
    </div>
  `;
};

// Generate popup content for jobs - with apply button
const createJobPopupContent = (job: Job): string => {
  return `
    <div class="marker-popup-content" data-type="job" data-id="${job.id}" style="
      min-width: 280px;
      max-width: 320px;
      font-family: 'Google Sans', 'Roboto', sans-serif;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
    ">
      <!-- Header with icon and title -->
      <div style="padding: 16px 16px 12px; display: flex; gap: 14px; align-items: flex-start;">
        <div style="width: 48px; height: 48px; border-radius: 12px; background: hsl(4, 90%, 95%); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="hsl(4, 90%, 58%)" stroke="none">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" fill="hsl(4, 90%, 95%)"/>
          </svg>
        </div>
        <div style="flex: 1; min-width: 0;">
          <h4 style="margin: 0; font-size: 16px; font-weight: 600; color: hsl(220, 9%, 15%); line-height: 1.3;">${job.title}</h4>
          <p style="margin: 4px 0 0; font-size: 13px; color: hsl(220, 9%, 46%);">${job.company_name || 'Company'}</p>
        </div>
      </div>
      
      <!-- Tags row -->
      <div style="padding: 0 16px 14px; display: flex; flex-wrap: wrap; gap: 8px;">
        ${job.job_type ? `<span style="padding: 6px 12px; background: hsl(220, 14%, 96%); color: hsl(220, 9%, 35%); font-size: 12px; border-radius: 6px; font-weight: 500;">${job.job_type}</span>` : ''}
        ${job.salary_range ? `<span style="padding: 6px 12px; background: hsl(142, 70%, 95%); color: hsl(142, 76%, 30%); font-size: 12px; border-radius: 6px; font-weight: 600;">₹${job.salary_range}</span>` : ''}
      </div>
      
      <!-- Action buttons -->
      <div style="padding: 12px 16px; border-top: 1px solid hsl(220, 13%, 93%); display: flex; gap: 8px;">
        <button class="popup-apply-btn" data-action="apply" data-job-id="${job.id}" style="
          flex: 1;
          padding: 10px 16px;
          background: hsl(4, 90%, 58%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          Apply Now
        </button>
        <button class="popup-view-btn" data-action="view" style="
          padding: 10px 16px;
          background: hsl(220, 14%, 96%);
          color: hsl(220, 9%, 35%);
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"/>
            <path d="m12 5 7 7-7 7"/>
          </svg>
          View
        </button>
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
  const navigate = useNavigate();
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

  // Handle popup button clicks
  const handlePopupClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const button = target.closest('button') as HTMLButtonElement;
    const popupContent = target.closest('.marker-popup-content') as HTMLElement;
    
    if (!popupContent) return;
    
    const type = popupContent.dataset.type;
    const id = popupContent.dataset.id;
    
    // Handle button clicks
    if (button) {
      e.preventDefault();
      e.stopPropagation();
      
      const action = button.dataset.action;
      
      if (action === 'apply' && id) {
        // Navigate to job detail with apply intent
        navigate(`/jobs/${id}?action=apply`);
      } else if (action === 'contact' && id) {
        // Navigate to messages with candidate
        navigate(`/messages?candidate=${id}`);
      } else if (action === 'view' && id) {
        // Navigate to detail page
        if (type === 'candidate') {
          navigate(`/candidates/${id}`);
        } else if (type === 'job') {
          navigate(`/jobs/${id}`);
        }
      }
    }
  }, [navigate]);

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
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
          overflow: hidden;
          animation: popupFadeIn 0.25s ease-out;
          border: none;
          background: transparent;
        }
        @keyframes popupFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .custom-popup .leaflet-popup-content {
          margin: 0;
          min-width: 280px;
        }
        .custom-popup .leaflet-popup-tip-container {
          display: none;
        }
        .custom-popup .leaflet-popup-close-button {
          display: none;
        }
        .marker-popup-content {
          pointer-events: auto !important;
        }
        .popup-apply-btn:hover {
          background: hsl(4, 90%, 52%) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px hsla(4, 90%, 58%, 0.3);
        }
        .popup-contact-btn:hover {
          background: hsl(217, 89%, 55%) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px hsla(217, 89%, 61%, 0.3);
        }
        .popup-view-btn:hover {
          background: hsl(220, 14%, 92%) !important;
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: '100vh' }} />
    </>
  );
};
