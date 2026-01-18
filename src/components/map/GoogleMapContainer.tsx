import { useCallback, useMemo, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, MarkerClusterer } from '@react-google-maps/api';
import { ViewMode, Candidate, Job } from '@/types';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { GoogleMapsLoaderBoundary } from '@/components/map/GoogleMapsLoaderBoundary';
import { Loader2 } from 'lucide-react';

interface GoogleMapContainerProps {
  mode: ViewMode;
  candidates: Candidate[];
  jobs: Job[];
  userLocation: { lat: number; lng: number } | null;
  radius: number;
  onMarkerClick: (data: Candidate | Job) => void;
  selectedItem: Candidate | Job | null;
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
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

// Inner component that only renders when we have the API key
const GoogleMapInner = ({
  mode,
  candidates,
  jobs,
  userLocation,
  radius,
  onMarkerClick,
  selectedItem,
  apiKey,
}: GoogleMapContainerProps & { apiKey: string }) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);

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
  const markerColor = mode === 'hiring' ? '#4285F4' : '#EA4335';

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
      options={mapOptions}
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
              fillColor: markerColor,
              fillOpacity: 0.1,
              strokeColor: markerColor,
              strokeOpacity: 0.4,
              strokeWeight: 2,
            }}
          />
        </>
      )}

      {/* Marker Clusterer */}
      <MarkerClusterer
        options={{
          imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
          gridSize: 50,
          minimumClusterSize: 2,
        }}
      >
        {(clusterer) => (
          <>
            {items.map((item) => (
              <Marker
                key={item.id}
                position={{ lat: item.latitude, lng: item.longitude }}
                onClick={() => onMarkerClick(item)}
                clusterer={clusterer}
                icon={{
                  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                  fillColor: markerColor,
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                  scale: 1.5,
                  anchor: new google.maps.Point(12, 24),
                }}
              />
            ))}
          </>
        )}
      </MarkerClusterer>
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
        apiKey={apiKey}
      />
    </GoogleMapsLoaderBoundary>
  );
};
