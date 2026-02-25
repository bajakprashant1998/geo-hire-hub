import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Loader2, Navigation, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleMap, useJsApiLoader, OverlayView, Autocomplete } from '@react-google-maps/api';
import { useGoogleMapsKey } from '@/hooks/useGoogleMapsKey';
import { GoogleMapsLoaderBoundary } from '@/components/map/GoogleMapsLoaderBoundary';

interface LocationMapPickerProps {
  coordinates: { lat: number; lng: number } | null;
  setCoordinates: (coords: { lat: number; lng: number } | null) => void;
  address: string;
  setAddress: (address: string) => void;
}

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ['places'];

const LocationMapPickerInner = ({
  coordinates,
  setCoordinates,
  address,
  setAddress,
  apiKey,
}: LocationMapPickerProps & { apiKey: string }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: `google-map-script-picker-${apiKey.slice(0, 8)}`,
    googleMapsApiKey: apiKey,
    libraries,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);

  // Default center (e.g., India or previously selected coordinate)
  const defaultCenter = useMemo(() => coordinates || { lat: 20.5937, lng: 78.9629 }, [coordinates]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    geocoderRef.current = new window.google.maps.Geocoder();
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
    geocoderRef.current = null;
  }, []);

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!geocoderRef.current) return;
    try {
      const response = await geocoderRef.current.geocode({ location: { lat, lng } });
      if (response.results && response.results.length > 0) {
        setAddress(response.results[0].formatted_address);
      }
    } catch (error) {
      console.error('Failed to reverse geocode:', error);
    }
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setCoordinates({ lat, lng });
    reverseGeocode(lat, lng);
  };

  const onLoadAutocomplete = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place && place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setCoordinates({ lat, lng });
        setAddress(place.formatted_address || place.name || '');
        setSearchQuery('');

        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(15);
        }
        toast.success('Location selected!');
      } else {
        toast.error('No location found for this place.');
      }
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });

        if (mapRef.current) {
          mapRef.current.panTo({ lat: latitude, lng: longitude });
          mapRef.current.setZoom(15);
        }

        await reverseGeocode(latitude, longitude);
        setLocating(false);
        toast.success('Location detected!');
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocating(false);
        toast.error('Failed to get your location. Please enable location access.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (loadError) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center bg-secondary rounded-lg border">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load Google Maps</p>
          <p className="text-sm text-muted-foreground mt-1">Please check your network or API key.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center bg-secondary rounded-lg border">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Label>Job Location *</Label>

      {/* Search Bar with Autocomplete */}
      <div className="flex gap-2 relative">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <Autocomplete
            onLoad={onLoadAutocomplete}
            onPlaceChanged={onPlaceChanged}
            options={{ fields: ['geometry', 'formatted_address', 'name'] }}
          >
            <Input
              placeholder="Search for a city, area or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // Prevent form submission
                }
              }}
            />
          </Autocomplete>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleUseMyLocation}
          disabled={locating}
          title="Use my location"
        >
          {locating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Map Container */}
      <div className="relative rounded-lg overflow-hidden border h-[300px] w-full group">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={defaultCenter}
          zoom={coordinates ? 15 : 2}
          onLoad={onMapLoad}
          onUnmount={onMapUnmount}
          onClick={handleMapClick}
          options={{
            disableDefaultUI: true,
            mapTypeId: isSatellite ? 'hybrid' : 'roadmap',
            gestureHandling: 'greedy', // Better UX for scroll
            clickableIcons: false,
          }}
        >
          {/* Custom Marker using OverlayView */}
          {coordinates && (
            <OverlayView
              position={coordinates}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={(width, height) => ({ x: -(width / 2), y: -height })}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'hsl(4, 90%, 58%)',
                  border: '3px solid white',
                  borderRadius: '50%',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
            </OverlayView>
          )}
        </GoogleMap>

        {/* Map Controls */}
        <div className="absolute top-3 right-3 z-10 transition-opacity">
          <Button
            type="button"
            variant={isSatellite ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setIsSatellite(!isSatellite)}
            className="gap-1.5 shadow-md bg-background/90 backdrop-blur-sm"
          >
            <Layers className="w-4 h-4" />
            {isSatellite ? 'Street' : 'Satellite'}
          </Button>
        </div>

        {/* Instruction Overlay */}
        {!coordinates && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center pointer-events-none z-10">
            <div className="text-center p-4">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-destructive" />
              <p className="text-sm font-medium">Click on the map to set job location</p>
              <p className="text-xs text-muted-foreground mt-1">Or search for an address above</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Address Display */}
      {coordinates && (
        <div className="p-3 rounded-lg bg-success/10 border border-success/30">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-success mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-success">Location Selected</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {address || `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const LocationMapPicker = (props: LocationMapPickerProps) => {
  const { apiKey, loading, error } = useGoogleMapsKey();

  if (loading) {
    return (
      <div className="space-y-4">
        <Label>Job Location *</Label>
        <div className="w-full h-[300px] flex items-center justify-center bg-secondary rounded-lg border">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !apiKey) {
    return (
      <div className="space-y-4">
        <Label>Job Location *</Label>
        <div className="w-full h-[300px] flex items-center justify-center bg-secondary rounded-lg border">
          <p className="text-destructive font-medium">Failed to load Map API Key</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMapsLoaderBoundary>
      <LocationMapPickerInner {...props} apiKey={apiKey} />
    </GoogleMapsLoaderBoundary>
  );
};
