import { Search, MapPin, X } from 'lucide-react';
import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const SearchBar = ({ onSearch, placeholder = 'Search by location or keyword...' }: SearchBarProps) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className="search-bar-google w-full max-w-xl">
      <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="p-1 hover:bg-secondary rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
      <div className="w-px h-6 bg-border" />
      <button
        type="button"
        className="p-1 hover:bg-secondary rounded-full transition-colors"
        title="Use current location"
      >
        <MapPin className="w-5 h-5 text-primary" />
      </button>
    </form>
  );
};
