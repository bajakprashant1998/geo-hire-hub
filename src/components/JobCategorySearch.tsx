import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Briefcase, Sparkles, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Extensive fallback job categories covering all major industries
const COMMON_CATEGORIES = [
  // Technology
  "Software Engineer", "Software Developer", "Software Architect", "Full Stack Developer",
  "Frontend Developer", "Backend Developer", "Mobile Developer", "iOS Developer", "Android Developer",
  "DevOps Engineer", "Site Reliability Engineer", "Cloud Engineer", "Data Engineer",
  "Data Scientist", "Data Analyst", "Machine Learning Engineer", "AI Engineer", "AI Researcher",
  "Cybersecurity Analyst", "Security Engineer", "Network Engineer", "Systems Administrator",
  "Database Administrator", "QA Engineer", "Test Engineer", "Technical Writer",
  "Product Manager", "Technical Product Manager", "Scrum Master", "Agile Coach",
  
  // Design
  "UX Designer", "UI Designer", "Product Designer", "Graphic Designer", "Visual Designer",
  "Interior Designer", "Web Designer", "Motion Designer", "Brand Designer",
  "Creative Director", "Art Director", "Illustrator", "3D Artist", "Game Designer",
  
  // Business & Finance
  "Business Analyst", "Financial Analyst", "Investment Banker", "Accountant", "Auditor",
  "Tax Consultant", "Financial Controller", "CFO", "Treasurer", "Risk Analyst",
  "Management Consultant", "Strategy Consultant", "Operations Manager", "Project Manager",
  "Program Manager", "CEO", "COO", "General Manager", "Administrative Assistant",
  
  // Marketing & Sales
  "Marketing Manager", "Digital Marketing Specialist", "SEO Specialist", "SEM Specialist",
  "Content Writer", "Copywriter", "Social Media Manager", "Brand Manager",
  "Sales Representative", "Sales Manager", "Account Executive", "Business Development Manager",
  "Customer Success Manager", "Public Relations Specialist", "Communications Manager",
  
  // Human Resources
  "HR Manager", "Recruiter", "Talent Acquisition Specialist", "HR Business Partner",
  "Compensation Analyst", "Training Specialist", "Organizational Development Specialist",
  
  // Healthcare
  "Doctor", "Physician", "Surgeon", "Nurse", "Registered Nurse", "Nurse Practitioner",
  "Medical Assistant", "Pharmacist", "Physical Therapist", "Occupational Therapist",
  "Dentist", "Dental Hygienist", "Radiologist", "Lab Technician", "Healthcare Administrator",
  "Cardiac Nurse", "Pediatric Nurse", "Emergency Room Nurse", "Anesthesiologist",
  
  // Education
  "Teacher", "Professor", "Lecturer", "Tutor", "Education Consultant", "School Principal",
  "Curriculum Developer", "Instructional Designer", "Academic Advisor", "Librarian",
  
  // Legal
  "Lawyer", "Attorney", "Legal Counsel", "Paralegal", "Legal Assistant", "Judge",
  "Compliance Officer", "Contract Specialist", "Patent Attorney", "Immigration Lawyer",
  
  // Engineering
  "Mechanical Engineer", "Civil Engineer", "Electrical Engineer", "Chemical Engineer",
  "Structural Engineer", "Environmental Engineer", "Industrial Engineer", "Aerospace Engineer",
  "AutoCAD Designer", "CAD Technician", "Architect", "Surveyor", "Construction Manager",
  
  // Trades & Services
  "Electrician", "Plumber", "Carpenter", "Mechanic", "HVAC Technician", "Welder",
  "Car Mechanic", "Auto Technician", "Maintenance Technician", "Handyman",
  
  // Hospitality & Food
  "Chef", "Cook", "Sous Chef", "Restaurant Manager", "Hotel Manager", "Concierge",
  "Bartender", "Server", "Barista", "Event Planner", "Catering Manager",
  
  // Transportation & Logistics
  "Driver", "Truck Driver", "Delivery Driver", "Pilot", "Flight Attendant",
  "Logistics Manager", "Supply Chain Manager", "Warehouse Manager", "Inventory Manager",
  "Cargo Supervisor", "Shipping Coordinator", "Customs Broker",
  
  // Creative & Media
  "Photographer", "Videographer", "Video Editor", "Film Director", "Producer",
  "Journalist", "Editor", "Reporter", "Broadcaster", "Voice Actor",
  
  // Real Estate
  "Real Estate Agent", "Property Manager", "Real Estate Broker", "Appraiser",
  "Leasing Consultant", "Real Estate Developer",
  
  // Fitness & Wellness
  "Personal Trainer", "Fitness Instructor", "Yoga Instructor", "Nutritionist",
  "Physical Therapist", "Massage Therapist", "Life Coach", "Wellness Consultant",
  
  // Science & Research
  "Research Scientist", "Laboratory Technician", "Chemist", "Biologist", "Physicist",
  "Environmental Scientist", "Geologist", "Archaeologist", "Microbiologist",
  
  // Customer Service
  "Customer Service Representative", "Support Specialist", "Call Center Agent",
  "Help Desk Technician", "Client Relations Manager", "Customer Experience Manager",
];

// In-memory cache with longer TTL
const suggestionCache = new Map<string, { suggestions: string[]; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Global rate limit tracker
let globalRateLimitUntil = 0;

// Popular categories cache
let popularCategoriesCache: string[] = [];
let popularCacheTimestamp = 0;
const POPULAR_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
  const [popularCategories, setPopularCategories] = useState<string[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load recent searches and popular categories
  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentJobSearches');
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      }
    } catch (e) {
      console.error('Failed to load recent searches:', e);
    }

    // Load popular categories
    loadPopularCategories();
  }, []);

  const loadPopularCategories = async () => {
    // Check cache first
    if (popularCategoriesCache.length > 0 && Date.now() - popularCacheTimestamp < POPULAR_CACHE_TTL) {
      setPopularCategories(popularCategoriesCache);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_popular_categories', { p_limit: 10 });
      
      if (!error && data && data.length > 0) {
        // Capitalize each word for display
        const categories = data.map((item: { category_name: string }) => 
          item.category_name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        );
        popularCategoriesCache = categories;
        popularCacheTimestamp = Date.now();
        setPopularCategories(categories);
      }
    } catch (e) {
      console.error('Failed to load popular categories:', e);
    }
  };

  // Track category selection
  const trackCategoryUsage = async (categoryName: string, isSelection: boolean) => {
    try {
      await supabase.rpc('track_category_usage', {
        p_category_name: categoryName,
        p_is_selection: isSelection
      });
    } catch (e) {
      // Silent fail - tracking is not critical
      console.debug('Failed to track category usage:', e);
    }
  };

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

  // Fallback filtering using local categories + popular - smart fuzzy matching
  const getFallbackSuggestions = useCallback((searchQuery: string): string[] => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const words = normalizedQuery.split(/\s+/);
    
    // Combine popular categories with common categories, prioritizing popular ones
    const allCategories = [...new Set([...popularCategories, ...COMMON_CATEGORIES])];
    
    // Score each category based on match quality
    const scored = allCategories.map((cat, index) => {
      const catLower = cat.toLowerCase();
      let score = 0;
      
      // Boost popular categories (first 10 in the list)
      if (index < popularCategories.length) score += 20;
      
      // Exact match at start gets highest score
      if (catLower.startsWith(normalizedQuery)) score += 100;
      // Contains full query
      else if (catLower.includes(normalizedQuery)) score += 50;
      // Contains all words
      else if (words.every(w => catLower.includes(w))) score += 30;
      // Contains some words
      else {
        const matchedWords = words.filter(w => catLower.includes(w));
        score += matchedWords.length * 10;
      }
      
      return { cat, score };
    });
    
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(s => s.cat);
  }, [popularCategories]);

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setUsingFallback(false);
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const cacheKey = searchQuery.toLowerCase().trim();
    
    // Check cache first
    const cached = suggestionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setSuggestions(cached.suggestions);
      setIsOpen(true);
      setUsingFallback(false);
      return;
    }

    // Check if we're in global rate limit cooldown
    if (Date.now() < globalRateLimitUntil) {
      const fallback = getFallbackSuggestions(searchQuery);
      setSuggestions(fallback);
      setUsingFallback(true);
      setIsOpen(true);
      return;
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();
    
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
          signal: abortControllerRef.current.signal,
        }
      );

      if (response.status === 429 || response.status === 402) {
        // Rate limited - set global cooldown for 60 seconds
        globalRateLimitUntil = Date.now() + 60000;
        const fallback = getFallbackSuggestions(searchQuery);
        setSuggestions(fallback);
        setUsingFallback(true);
        setIsOpen(true);
        return;
      }

      if (!response.ok) {
        throw new Error('Request failed');
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
        const fallback = getFallbackSuggestions(searchQuery);
        setSuggestions(fallback);
        setUsingFallback(fallback.length > 0);
      }
      setIsOpen(true);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      console.error('Failed to fetch suggestions:', error);
      const fallback = getFallbackSuggestions(searchQuery);
      setSuggestions(fallback);
      setUsingFallback(true);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, [getFallbackSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setHighlightedIndex(-1);

    // Cancel pending request immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Show instant fallback results while waiting for AI
    if (newValue.trim().length >= 2) {
      const instantFallback = getFallbackSuggestions(newValue);
      if (instantFallback.length > 0) {
        setSuggestions(instantFallback);
        setUsingFallback(true);
        setIsOpen(true);
      }
    }

    // Longer debounce (800ms) to reduce API calls
    debounceRef.current = setTimeout(() => {
      // Only call AI if not rate limited
      if (Date.now() >= globalRateLimitUntil) {
        fetchSuggestions(newValue);
      }
    }, 800);
  };

  const handleSelect = (suggestion: string) => {
    setQuery(suggestion);
    onChange(suggestion);
    setIsOpen(false);
    setSuggestions([]);

    // Track selection for popularity
    trackCategoryUsage(suggestion, true);

    // Save to recent searches
    try {
      const updated = [suggestion, ...recentSearches.filter(s => s !== suggestion)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentJobSearches', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save recent search:', e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = suggestions.length > 0 
      ? suggestions 
      : (query.length < 2 ? [...popularCategories.slice(0, 5), ...recentSearches].slice(0, 8) : []);
    
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
    if (query.length >= 2) {
      const fallback = getFallbackSuggestions(query);
      if (fallback.length > 0) {
        setSuggestions(fallback);
        setUsingFallback(true);
        setIsOpen(true);
      }
    } else if (popularCategories.length > 0 || recentSearches.length > 0) {
      setIsOpen(true);
    }
  };

  const showDropdown = isOpen && (
    suggestions.length > 0 || 
    (query.length < 2 && (popularCategories.length > 0 || recentSearches.length > 0))
  );
  const isRateLimited = Date.now() < globalRateLimitUntil;

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
          <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
        {!isLoading && !isRateLimited && query.length >= 2 && (
          <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 max-h-[350px] overflow-y-auto">
          {/* Suggestions when typing */}
          {suggestions.length > 0 && (
            <div className="p-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                {usingFallback ? (
                  <>
                    <Search className="w-3 h-3" />
                    Matching Categories
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

          {/* Popular & Recent when not typing */}
          {query.length < 2 && (
            <>
              {/* Popular Categories */}
              {popularCategories.length > 0 && (
                <div className="p-1">
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3" />
                    Trending Categories
                  </div>
                  {popularCategories.slice(0, 5).map((category, index) => (
                    <button
                      key={`popular-${category}`}
                      onClick={() => handleSelect(category)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-md transition-colors",
                        highlightedIndex === index
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      <TrendingUp className="w-4 h-4 flex-shrink-0 text-orange-500" />
                      <span className="flex-1 truncate">{category}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="p-1 border-t border-border">
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Recent Searches
                  </div>
                  {recentSearches.map((search, index) => (
                    <button
                      key={`recent-${search}`}
                      onClick={() => handleSelect(search)}
                      onMouseEnter={() => setHighlightedIndex(popularCategories.length + index)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-md transition-colors",
                        highlightedIndex === popularCategories.length + index
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      <Clock className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{search}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Helper text */}
          <div className="px-3 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
            {isRateLimited 
              ? "Showing cached suggestions • AI resumes soon"
              : "Search 100+ job categories"
            }
          </div>
        </div>
      )}
    </div>
  );
};
