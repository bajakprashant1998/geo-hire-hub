import { useEffect, useRef, useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Loader2, Navigation, Layers, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMapPickerProps {
  coordinates: { lat: number; lng: number } | null;
  setCoordinates: (coords: { lat: number; lng: number } | null) => void;
  address: string;
  setAddress: (address: string) => void;
}

interface AISuggestion {
  city: string;
  state: string;
  country: string;
}

export const LocationMapPicker = ({
  coordinates,
  setCoordinates,
  address,
  setAddress,
}: LocationMapPickerProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const streetTileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const satelliteTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: coordinates ? [coordinates.lat, coordinates.lng] : [20, 0],
      zoom: coordinates ? 15 : 2,
    });

    tileLayerRef.current = L.tileLayer(streetTileUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      updateMarker(map, lat, lng);
      setCoordinates({ lat, lng });
      await reverseGeocode(lat, lng);
    });

    mapRef.current = map;

    if (coordinates) {
      updateMarker(map, coordinates.lat, coordinates.lng);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // AI-powered location suggestions
  const fetchAISuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setAiSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-location-suggest', {
        body: { query },
      });

      if (error) throw error;

      const suggestions = data?.suggestions || [];
      setAiSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('AI location suggest failed:', error);
      setAiSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);
  // Handle search input change with debouncing
  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new timeout for debounced search
    debounceRef.current = setTimeout(() => {
      fetchAISuggestions(value);
    }, 300);
  };

  // Handle AI suggestion selection — geocode to get coordinates
  const handleSelectSuggestion = async (suggestion: AISuggestion) => {
    const locationStr = [suggestion.city, suggestion.state, suggestion.country].filter(Boolean).join(', ');
    setSearchQuery('');
    setAiSuggestions([]);
    setShowSuggestions(false);
    setAddress(locationStr);

    // Geocode the selected AI suggestion to get coordinates
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationStr)}&format=json&limit=1&accept-language=en`,
        { headers: { 'User-Agent': 'HireForJob/1.0' } }
      );
      const data = await response.json();
      if (data.length > 0) {
        const latitude = parseFloat(data[0].lat);
        const longitude = parseFloat(data[0].lon);
        setCoordinates({ lat: latitude, lng: longitude });
        if (mapRef.current) {
          updateMarker(mapRef.current, latitude, longitude);
        }
      }
    } catch (error) {
      console.error('Geocoding AI suggestion failed:', error);
    }

    toast.success('Location selected!');
  };

  // Toggle satellite view
  const toggleSatelliteView = () => {
    if (!mapRef.current || !tileLayerRef.current) return;

    mapRef.current.removeLayer(tileLayerRef.current);

    const newIsSatellite = !isSatellite;
    setIsSatellite(newIsSatellite);

    const tileOptions: L.TileLayerOptions = {
      maxZoom: 19,
      attribution: newIsSatellite 
        ? '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        : '&copy; OpenStreetMap contributors &copy; CARTO',
    };

    // Only add subdomains for street view (satellite doesn't use them)
    if (!newIsSatellite) {
      tileOptions.subdomains = 'abcd';
    }

    tileLayerRef.current = L.tileLayer(
      newIsSatellite ? satelliteTileUrl : streetTileUrl,
      tileOptions
    ).addTo(mapRef.current);
  };

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
    if (!searchQuery.trim()) {
      toast.error('Please enter a location to search');
      return;
    }

    setSearching(true);
    setShowSuggestions(false);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&accept-language=en`,
        { headers: { 'User-Agent': 'HireForJob/1.0' } }
      );
      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        setCoordinates({ lat: latitude, lng: longitude });
        setAddress(display_name);
        setSearchQuery('');

        if (mapRef.current) {
          updateMarker(mapRef.current, latitude, longitude);
        }
        
        toast.success('Location found!');
      } else {
        toast.error('No location found. Try a different search term.');
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    setShowSuggestions(false);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });

        if (mapRef.current) {
          updateMarker(mapRef.current, latitude, longitude);
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

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.location-search-container')) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="space-y-4">
      <Label>Job Location *</Label>

      {/* Search Bar with Autocomplete */}
      <div className="flex gap-2 location-search-container">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <Input
            placeholder="Search for a city, area or address..."
            value={searchQuery}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            onFocus={() => aiSuggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
              if (e.key === 'Escape') {
                setShowSuggestions(false);
              }
            }}
            className="pl-9"
          />
          
          {/* AI-Powered Autocomplete Dropdown */}
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 max-h-[250px] overflow-y-auto">
              <div className="px-3 py-1.5 border-b bg-muted/50 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-medium text-primary">AI-powered suggestions</span>
              </div>
              {loadingSuggestions ? (
                <div className="p-3 text-center text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Finding locations...
                </div>
              ) : aiSuggestions.length > 0 ? (
                aiSuggestions.map((suggestion, idx) => (
                  <button
                    key={`${suggestion.city}-${suggestion.state}-${idx}`}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors flex items-start gap-2 border-b last:border-b-0"
                  >
                    <MapPin className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <span className="text-sm font-medium">{suggestion.city}</span>
                      <span className="text-xs text-muted-foreground block">
                        {[suggestion.state, suggestion.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-sm text-muted-foreground">
                  No locations found
                </div>
              )}
            </div>
          )}
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
        
        {/* Map Controls */}
        <div className="absolute top-3 right-3 z-[1000]">
          <Button
            type="button"
            variant={isSatellite ? 'default' : 'secondary'}
            size="sm"
            onClick={toggleSatelliteView}
            className="gap-1.5 shadow-md"
          >
            <Layers className="w-4 h-4" />
            {isSatellite ? 'Street' : 'Satellite'}
          </Button>
        </div>
        
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
