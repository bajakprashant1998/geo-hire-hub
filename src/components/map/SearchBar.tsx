import { Search, MapPin, X, Mic } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SearchSuggestions, saveRecentSearch } from './SearchSuggestions';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar = ({ onSearch, placeholder = 'Search...', className }: SearchBarProps) => {
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

  const handleVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        saveRecentSearch(transcript);
        onSearch(transcript);
      };
      
      recognition.start();
    }
  };

  const supportsVoice = typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  return (
    <div className={cn("relative w-full", className)}>
      <motion.form 
        onSubmit={handleSubmit}
        animate={{ 
          scale: isFocused ? 1.02 : 1,
        }}
        transition={{ duration: 0.2 }}
        className={cn(
          "w-full glass-morphism rounded-2xl",
          "px-4 py-3 flex items-center gap-3",
          "transition-all duration-300",
          isFocused 
            ? 'ring-2 ring-primary/30 shadow-xl' 
            : 'shadow-lg hover:shadow-xl'
        )}
      >
        <Search className={cn(
          "w-5 h-5 flex-shrink-0 transition-colors",
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
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="button"
              onClick={handleClear}
              className="p-1.5 hover:bg-muted rounded-full transition-colors flex-shrink-0 touch-target-sm touch-scale"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          )}
        </AnimatePresence>

        <div className="w-px h-5 bg-border/50 flex-shrink-0" />

        {supportsVoice && (
          <button
            type="button"
            onClick={handleVoiceSearch}
            className="p-1.5 hover:bg-primary/10 rounded-full transition-colors flex-shrink-0 touch-target-sm touch-scale"
            title="Voice search"
          >
            <Mic className="w-5 h-5 text-primary" />
          </button>
        )}

        <button
          type="button"
          className="p-1.5 hover:bg-success/10 rounded-full transition-colors flex-shrink-0 touch-target-sm touch-scale"
          title="Use current location"
        >
          <MapPin className="w-5 h-5 text-success" />
        </button>
      </motion.form>

      <SearchSuggestions
        isVisible={showSuggestions && isFocused}
        onSelect={handleSuggestionSelect}
        onClose={() => setShowSuggestions(false)}
        currentQuery={query}
      />
    </div>
  );
};
