import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CityResult {
  city: string;
  state: string | null;
  country: string;
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
      const searchTerm = q.toLowerCase();
      const { data, error } = await supabase
        .from('world_cities')
        .select('city, state, country')
        .or(`search_text.ilike.%${searchTerm}%`)
        .order('population', { ascending: false })
        .limit(8);

      if (!error && data) {
        setSuggestions(data as CityResult[]);
        setOpen(data.length > 0);
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
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden max-h-[240px] overflow-y-auto">
          {suggestions.map((s, i) => {
            const display = [s.city, s.state, s.country].filter(Boolean).join(', ');
            return (
              <button
                key={`${s.city}-${s.country}-${i}`}
                onClick={() => handleSelect(s)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{display}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
