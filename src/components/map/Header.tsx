import { ViewMode } from '@/types';
import { ViewToggle } from './ViewToggle';
import { SearchBar } from './SearchBar';
import { Button } from '@/components/ui/button';
import { Menu, LogIn, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  onSearch: (query: string) => void;
  onMenuClick: () => void;
}

export const Header = ({ mode, onModeChange, onSearch, onMenuClick }: HeaderProps) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-[1000] p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left - Menu button and logo */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            onClick={onMenuClick}
            className="shadow-google"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">GJ</span>
            </div>
            <span className="font-semibold text-lg text-foreground">GeoJobs</span>
          </div>
        </div>

        {/* Center - Toggle and Search */}
        <div className="flex-1 flex flex-col items-center gap-3 max-w-2xl mx-auto">
          <ViewToggle mode={mode} onModeChange={onModeChange} />
          <SearchBar
            onSearch={onSearch}
            placeholder={
              mode === 'hiring'
                ? 'Search candidates by skill or location...'
                : 'Search jobs by title or location...'
            }
          />
        </div>

        {/* Right - Auth buttons */}
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" className="shadow-google">
              <UserPlus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Get Started</span>
              <span className="sm:hidden">Join</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
