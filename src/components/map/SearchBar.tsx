import { Search, Navigation, X } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SearchSuggestions, saveRecentSearch } from './SearchSuggestions';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  onLocationClick?: () => void;
  resultCount?: number;
  showResultCount?: boolean;
}

export const SearchBar = ({ onSearch, placeholder = 'Search...', className, onLocationClick, resultCount, showResultCount = false }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (query.trim()) {
      saveRecentSearch(query.trim());
    }
    onSearch(query);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    onSearch('');
    setShowSuggestions(false);
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onSearch(value);
    }, 300);
  }, [onSearch]);

  const handleFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding suggestions to allow click events
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    saveRecentSearch(suggestion);
    onSearch(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <form
        onSubmit={handleSubmit}
        className={cn(
          "w-full bg-background rounded-xl border",
          "px-4 py-2.5 flex items-center gap-3",
          "transition-all duration-200",
          isFocused
            ? 'border-primary ring-2 ring-primary/20 shadow-md'
            : 'border-border hover:border-muted-foreground/30 shadow-sm'
        )}
      >
        <Search className={cn(
          "w-4 h-4 flex-shrink-0 transition-colors",
          isFocused ? "text-primary" : "text-muted-foreground"
        )} />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm min-w-0"
        />

        <AnimatePresence>
          {query && (
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={handleClear}
                  className="p-1 hover:bg-muted rounded-md transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent>Clear search</TooltipContent>
            </Tooltip>
          )}
        </AnimatePresence>

        {onLocationClick && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onLocationClick}
                className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0"
              >
                <Navigation className="w-4 h-4 text-primary" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Use current location</TooltipContent>
          </Tooltip>
        )}
      </form>

      {/* Result count feedback */}
      <AnimatePresence>
        {showResultCount && query && !showSuggestions && resultCount !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-1.5 px-1 w-full"
          >
            <div className={cn(
              "text-xs px-3 py-1.5 rounded-lg",
              resultCount > 0
                ? "text-muted-foreground bg-muted/50"
                : "text-destructive bg-destructive/10"
            )}>
              {resultCount > 0
                ? `${resultCount} result${resultCount !== 1 ? 's' : ''} found`
                : 'No results found — try a different search'
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchSuggestions
        isVisible={showSuggestions && isFocused}
        onSelect={handleSuggestionSelect}
        onClose={() => setShowSuggestions(false)}
        currentQuery={query}
      />
    </div>
  );
};
