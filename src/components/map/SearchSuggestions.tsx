import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, TrendingUp, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'hfj_recent_searches';
const MAX_RECENT = 5;

interface SearchSuggestionsProps {
  isVisible: boolean;
  onSelect: (query: string) => void;
  onClose: () => void;
  currentQuery: string;
}

const trendingSearches = [
  'Software Developer',
  'Data Analyst',
  'Marketing Manager',
  'React Developer',
  'Customer Support',
];

export const SearchSuggestions = ({ 
  isVisible, 
  onSelect, 
  onClose,
  currentQuery 
}: SearchSuggestionsProps) => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        setRecentSearches([]);
      }
    }
  }, [isVisible]);

  const clearRecent = (e: React.MouseEvent, search: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== search);
    setRecentSearches(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Filter suggestions based on current query
  const filteredTrending = currentQuery 
    ? trendingSearches.filter(s => 
        s.toLowerCase().includes(currentQuery.toLowerCase())
      )
    : trendingSearches;

  const filteredRecent = currentQuery
    ? recentSearches.filter(s =>
        s.toLowerCase().includes(currentQuery.toLowerCase())
      )
    : recentSearches;

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          "absolute top-full left-0 right-0 mt-2",
          "bg-card/98 backdrop-blur-xl rounded-2xl",
          "border border-border/50 shadow-2xl",
          "max-h-[60vh] overflow-y-auto",
          "z-50"
        )}
      >
        {/* Recent Searches */}
        {filteredRecent.length > 0 && (
          <div className="p-3 border-b border-border/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>Recent Searches</span>
              </div>
              <button
                onClick={clearAllRecent}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="space-y-1">
              {filteredRecent.map((search, index) => (
                <motion.button
                  key={search}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelect(search)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2.5",
                    "rounded-xl hover:bg-muted/50 transition-colors",
                    "text-left group"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{search}</span>
                  </div>
                  <button
                    onClick={(e) => clearRecent(e, search)}
                    className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Trending Searches */}
        {filteredTrending.length > 0 && (
          <div className="p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Popular Searches</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredTrending.map((search, index) => (
                <motion.button
                  key={search}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelect(search)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium",
                    "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
                    "transition-colors touch-scale"
                  )}
                >
                  {search}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {filteredRecent.length === 0 && filteredTrending.length === 0 && currentQuery && (
          <div className="p-6 text-center">
            <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No suggestions for "{currentQuery}"
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

// Utility to save a search to recent
export const saveRecentSearch = (query: string) => {
  if (!query.trim()) return;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  let recent: string[] = [];
  
  try {
    recent = stored ? JSON.parse(stored) : [];
  } catch {
    recent = [];
  }

  // Remove if exists and add to front
  recent = [query, ...recent.filter(s => s !== query)].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
};

export default SearchSuggestions;
