import { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Loader2, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapPickerProps {
  coordinates: { lat: number; lng: number } | null;
  setCoordinates: (coords: { lat: number; lng: number } | null) => void;
  address: string;
  setAddress: (address: string) => void;
}

export const LocationMapPicker = ({
  coordinates,
  setCoordinates,
  address,
  setAddress,
}: LocationMapPickerProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: coordinates ? [coordinates.lat, coordinates.lng] : [20.5937, 78.9629],
      zoom: coordinates ? 15 : 5,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Click to place marker
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      updateMarker(map, lat, lng);
      setCoordinates({ lat, lng });
      await reverseGeocode(lat, lng);
    });

    mapRef.current = map;

    // If we have initial coordinates, place the marker
    if (coordinates) {
      updateMarker(map, coordinates.lat, coordinates.lng);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const updateMarker = (map: L.Map, lat: number, lng: number) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              width: 36px;
              height: 36px;
              background: hsl(4, 90%, 58%);
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        }),
      }).addTo(map);
    }
    map.setView([lat, lng], Math.max(map.getZoom(), 14));
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
        { headers: { 'User-Agent': 'HireForJob/1.0' } }
      );
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name);
      }
    } catch (error) {
      console.error('Failed to reverse geocode:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'HireForJob/1.0' } }
      );
      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        setCoordinates({ lat: latitude, lng: longitude });
        setAddress(display_name);

        if (mapRef.current) {
          updateMarker(mapRef.current, latitude, longitude);
        }
      } else {
        // Could show a toast here
        console.log('No results found');
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });

        if (mapRef.current) {
          updateMarker(mapRef.current, latitude, longitude);
        }

        await reverseGeocode(latitude, longitude);
        setLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-4">
      <Label>Job Location *</Label>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search for a location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleSearch}
          disabled={searching}
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </Button>
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
      <div className="relative rounded-lg overflow-hidden border">
        <div ref={containerRef} className="h-[300px] w-full" />
        
        {/* Instruction Overlay */}
        {!coordinates && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
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
