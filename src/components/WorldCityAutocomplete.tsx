import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CityResult {
  city: string;
  state: string | null;
  country: string;
  source?: string;
}

interface WorldCityAutocompleteProps {
  value: string;
  onChange: (value: string, structured?: CityResult) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export const WorldCityAutocomplete = ({
  value,
  onChange,
  placeholder = "Start typing a city...",
  className,
  inputClassName,
}: WorldCityAutocompleteProps) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    setLoading(true);
    try {
      // First try local DB for fast results
      const searchTerm = q.toLowerCase();
      const { data: localData } = await supabase
        .from('world_cities')
        .select('city, state, country')
        .or(`search_text.ilike.%${searchTerm}%`)
        .order('population', { ascending: false })
        .limit(8);

      if (localData && localData.length > 0) {
        const results = localData.map(r => ({ ...r, source: 'local' })) as CityResult[];
        setSuggestions(results);
        setOpen(true);
      }

      // If local results are sparse, call the edge function for GeoNames fallback
      if (!localData || localData.length < 3) {
        const { data: apiData } = await supabase.functions.invoke('search-cities', {
          body: { query: q, limit: 10 },
        });
        if (apiData?.results && apiData.results.length > 0) {
          setSuggestions(apiData.results);
          setOpen(true);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (s: CityResult) => {
    const display = [s.city, s.state, s.country].filter(Boolean).join(', ');
    setQuery(display);
    onChange(display, s);
    setOpen(false);
    setSuggestions([]);
  };

  const highlightMatch = (text: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-semibold text-primary">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={cn("pl-9 pr-8", inputClassName)}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden max-h-[280px] overflow-y-auto">
          {suggestions.map((s, i) => {
            const display = [s.city, s.state, s.country].filter(Boolean).join(', ');
            return (
              <button
                key={`${s.city}-${s.state}-${s.country}-${i}`}
                onClick={() => handleSelect(s)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{highlightMatch(display)}</span>
                {s.source === 'google' && (
                   <Globe className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                 )}
              </button>
            );
          })}
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground/50 border-t border-border/30 bg-secondary/30">
            {suggestions.some(s => s.source === 'geonames') ? 'Results from database + GeoNames' : `${suggestions.length} cities found`}
          </div>
        </div>
      )}
    </div>
  );
};
