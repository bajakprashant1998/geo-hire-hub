import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Briefcase, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Fallback common job categories for when AI is rate limited
const COMMON_CATEGORIES = [
  "Software Engineer", "Software Developer", "Software Architect",
  "Data Scientist", "Data Analyst", "Data Engineer",
  "Product Manager", "Project Manager", "Program Manager",
  "UX Designer", "UI Designer", "Graphic Designer", "Interior Designer",
  "Marketing Manager", "Digital Marketing Specialist", "Content Writer",
  "Sales Representative", "Sales Manager", "Account Executive",
  "HR Manager", "Recruiter", "Talent Acquisition Specialist",
  "Accountant", "Financial Analyst", "Finance Manager",
  "Nurse", "Doctor", "Medical Assistant", "Pharmacist",
  "Teacher", "Professor", "Tutor", "Education Consultant",
  "Lawyer", "Legal Assistant", "Paralegal",
  "Chef", "Cook", "Restaurant Manager",
  "Electrician", "Plumber", "Carpenter", "Mechanic",
  "Driver", "Delivery Driver", "Truck Driver",
  "Customer Service Representative", "Support Specialist",
  "AI Engineer", "Machine Learning Engineer", "DevOps Engineer",
  "Full Stack Developer", "Frontend Developer", "Backend Developer",
  "Mobile Developer", "iOS Developer", "Android Developer",
  "Security Analyst", "Cybersecurity Specialist",
  "Business Analyst", "Operations Manager", "Administrative Assistant",
  "Photographer", "Videographer", "Video Editor",
  "Real Estate Agent", "Property Manager",
  "Fitness Trainer", "Personal Trainer", "Yoga Instructor",
  "Social Media Manager", "SEO Specialist", "PPC Specialist",
  "AutoCAD Designer", "CAD Technician", "Architect",
  "Civil Engineer", "Mechanical Engineer", "Electrical Engineer",
  "Laboratory Technician", "Research Scientist", "Chemist",
  "Pilot", "Flight Attendant", "Travel Agent",
];

// Simple cache for AI suggestions
const suggestionCache = new Map<string, { suggestions: string[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface JobCategorySearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const JobCategorySearch = ({
  value,
  onChange,
  placeholder = "Search job category...",
  className,
}: JobCategorySearchProps) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const rateLimitCooldown = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentJobSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored).slice(0, 5));
    }
  }, []);

  // Sync external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fallback filtering using local categories
  const getFallbackSuggestions = useCallback((searchQuery: string): string[] => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    return COMMON_CATEGORIES
      .filter(cat => cat.toLowerCase().includes(normalizedQuery))
      .slice(0, 8);
  }, []);

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setUsingFallback(false);
      return;
    }

    // Check cache first
    const cacheKey = searchQuery.toLowerCase().trim();
    const cached = suggestionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setSuggestions(cached.suggestions);
      setIsOpen(true);
      setUsingFallback(false);
      return;
    }

    // If rate limited, use fallback immediately
    if (isRateLimited) {
      const fallback = getFallbackSuggestions(searchQuery);
      setSuggestions(fallback);
      setUsingFallback(true);
      setIsOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-job-categories`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ query: searchQuery }),
        }
      );

      if (response.status === 429) {
        // Rate limited - use fallback and set cooldown
        setIsRateLimited(true);
        const fallback = getFallbackSuggestions(searchQuery);
        setSuggestions(fallback);
        setUsingFallback(true);
        setIsOpen(true);
        
        toast.warning('High traffic - showing cached suggestions', {
          description: 'AI suggestions will resume shortly',
          duration: 3000,
        });
        
        // Clear rate limit after 30 seconds
        if (rateLimitCooldown.current) clearTimeout(rateLimitCooldown.current);
        rateLimitCooldown.current = setTimeout(() => {
          setIsRateLimited(false);
        }, 30000);
        return;
      }

      const data = await response.json();
      
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setUsingFallback(false);
        // Cache the result
        suggestionCache.set(cacheKey, {
          suggestions: data.suggestions,
          timestamp: Date.now(),
        });
      } else {
        // No AI results, use fallback
        const fallback = getFallbackSuggestions(searchQuery);
        setSuggestions(fallback);
        setUsingFallback(fallback.length > 0);
      }
      setIsOpen(true);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      // Use fallback on error
      const fallback = getFallbackSuggestions(searchQuery);
      setSuggestions(fallback);
      setUsingFallback(true);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, [isRateLimited, getFallbackSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setHighlightedIndex(-1);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Longer debounce to reduce API calls (500ms instead of 200ms)
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 500);
  };

  const handleSelect = (suggestion: string) => {
    setQuery(suggestion);
    onChange(suggestion);
    setIsOpen(false);
    setSuggestions([]);

    // Save to recent searches
    const updated = [suggestion, ...recentSearches.filter(s => s !== suggestion)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentJobSearches', JSON.stringify(updated));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = suggestions.length > 0 ? suggestions : (query.length < 2 ? recentSearches : []);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && items[highlightedIndex]) {
          handleSelect(items[highlightedIndex]);
        } else if (query.trim()) {
          onChange(query.trim());
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleFocus = () => {
    if (query.length >= 2 && suggestions.length > 0) {
      setIsOpen(true);
    } else if (query.length < 2 && recentSearches.length > 0) {
      setIsOpen(true);
    }
  };

  const showDropdown = isOpen && (suggestions.length > 0 || (query.length < 2 && recentSearches.length > 0));

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="pl-9 pr-10"
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
        )}
        {!isLoading && isRateLimited && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warning" />
        )}
        {!isLoading && !isRateLimited && query.length >= 2 && (
          <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95">
          {/* AI/Fallback Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                {usingFallback ? (
                  <>
                    <Search className="w-3 h-3" />
                    Suggestions
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    AI Suggestions
                  </>
                )}
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  onClick={() => handleSelect(suggestion)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-md transition-colors",
                    highlightedIndex === index
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <Briefcase className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="p-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={search}
                  onClick={() => handleSelect(search)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-md transition-colors",
                    highlightedIndex === index
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <Search className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* Helper text */}
          <div className="px-3 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
            {usingFallback 
              ? "Showing common categories • AI will resume shortly"
              : "Type to search 30,000+ job categories worldwide"
            }
          </div>
        </div>
      )}
    </div>
  );
};
