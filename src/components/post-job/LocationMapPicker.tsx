/// <reference types="google.maps" />
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Loader2, Navigation, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Map as GoogleMapView, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { GoogleMapsProvider } from '@/components/map/GoogleMapsProvider';

const MAP_ID = 'hireforjob-picker';

interface LocationMapPickerProps {
  coordinates: { lat: number; lng: number } | null;
  setCoordinates: (coords: { lat: number; lng: number } | null) => void;
  address: string;
  setAddress: (address: string) => void;
}

const LocationMapPickerInner = ({
  coordinates,
  setCoordinates,
  address,
  setAddress,
}: LocationMapPickerProps) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);

  const defaultCenter = useMemo(() => coordinates || { lat: 20.5937, lng: 78.9629 }, [coordinates]);

  // Initialize geocoder
  useEffect(() => {
    geocoderRef.current = new google.maps.Geocoder();
  }, []);

  // Initialize autocomplete when places library loads
  useEffect(() => {
    if (!placesLib || !inputRef.current) return;
    const ac = new placesLib.Autocomplete(inputRef.current, {
      fields: ['geometry', 'formatted_address', 'name'],
    });
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (place?.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setCoordinates({ lat, lng });
        setAddress(place.formatted_address || place.name || '');
        setSearchQuery('');
        if (map) {
          map.panTo({ lat, lng });
          map.setZoom(15);
        }
        toast.success('Location selected!');
      } else {
        toast.error('No location found for this place.');
      }
    });
    autocompleteRef.current = ac;
  }, [placesLib, map, setCoordinates, setAddress]);

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!geocoderRef.current) return;
    try {
      const response = await geocoderRef.current.geocode({ location: { lat, lng } });
      if (response.results?.[0]) {
        setAddress(response.results[0].formatted_address);
      }
    } catch (error) {
      console.error('Failed to reverse geocode:', error);
    }
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setCoordinates({ lat, lng });
    reverseGeocode(lat, lng);
  }, [setCoordinates]); // eslint-disable-line react-hooks/exhaustive-deps

  // Attach click listener
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('click', handleMapClick);
    return () => google.maps.event.removeListener(listener);
  }, [map, handleMapClick]);

  // Toggle satellite
  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(isSatellite ? 'hybrid' : 'roadmap');
  }, [map, isSatellite]);

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
        if (map) {
          map.panTo({ lat: latitude, lng: longitude });
          map.setZoom(15);
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

  return (
    <div className="space-y-4">
      

      {/* Search Bar */}
      <div className="flex gap-2 relative">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <Input
            ref={inputRef}
            placeholder="Search for a city, area or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault();
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleUseMyLocation}
          disabled={locating}
          title="Use my location"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
        </Button>
      </div>

      {/* Map */}
      <div className="relative rounded-lg overflow-hidden border h-[300px] w-full group">
        <GoogleMapView
          defaultCenter={defaultCenter}
          defaultZoom={coordinates ? 15 : 2}
          mapId={MAP_ID}
          gestureHandling="greedy"
          disableDefaultUI
          clickableIcons={false}
          style={{ width: '100%', height: '100%' }}
        >
          {coordinates && (
            <AdvancedMarker position={coordinates}>
              <div style={{
                width: '36px', height: '36px',
                background: 'hsl(4, 90%, 58%)', border: '3px solid white',
                borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
            </AdvancedMarker>
          )}
        </GoogleMapView>

        {/* Map Controls */}
        <div className="absolute top-3 right-3 z-10">
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

      {/* Selected Address */}
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
  return (
    <GoogleMapsProvider>
      <LocationMapPickerInner {...props} />
    </GoogleMapsProvider>
  );
};
