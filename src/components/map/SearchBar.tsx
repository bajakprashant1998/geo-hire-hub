import { Search, MapPin, X, Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const SearchBar = ({ onSearch, placeholder = 'Search...' }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    // Debounced search on type
    const timeoutId = setTimeout(() => {
      onSearch(value);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [onSearch]);

  return (
    <form 
      onSubmit={handleSubmit} 
      className={`
        w-full bg-card/95 backdrop-blur-md rounded-full border shadow-lg
        px-4 py-2.5 flex items-center gap-3 transition-all duration-200
        ${isFocused 
          ? 'border-primary/50 shadow-xl ring-2 ring-primary/20' 
          : 'border-border/50 hover:border-border'
        }
      `}
    >
      <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm min-w-0"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="p-1.5 hover:bg-accent rounded-full transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
      <div className="w-px h-5 bg-border/50 flex-shrink-0" />
      <button
        type="button"
        className="p-1.5 hover:bg-accent rounded-full transition-colors flex-shrink-0"
        title="Use current location"
      >
        <MapPin className="w-5 h-5 text-primary" />
      </button>
    </form>
  );
};
