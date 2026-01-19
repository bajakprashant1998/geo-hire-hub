import { ViewMode } from '@/types';
import { ViewToggle } from './ViewToggle';
import { SearchBar } from './SearchBar';
import { Button } from '@/components/ui/button';
import { Menu, LogIn, UserPlus, LayoutDashboard, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  onSearch: (query: string) => void;
  onMenuClick: () => void;
}

export const Header = ({ mode, onModeChange, onSearch, onMenuClick }: HeaderProps) => {
  const { user, profile } = useAuth();

  return (
    <header className="absolute top-0 left-0 right-0 z-[100] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        {/* Left - Menu button and logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            variant="secondary"
            size="icon"
            onClick={onMenuClick}
            className="shadow-lg bg-card hover:bg-card/90 border border-border/50"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <Link to="/" className="hidden sm:flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">Hire for Job</span>
          </Link>
        </div>

        {/* Center - Toggle and Search */}
        <div className="flex-1 flex flex-col items-center gap-2 sm:gap-3 max-w-2xl mx-auto min-w-0">
          <ViewToggle mode={mode} onModeChange={onModeChange} />
          <div className="w-full max-w-md">
            <SearchBar
              onSearch={onSearch}
              placeholder={
                mode === 'hiring'
                  ? 'Search candidates...'
                  : 'Search jobs...'
              }
            />
          </div>
        </div>

        {/* Right - Auth buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <Link to="/candidate-dashboard">
              <Button size="sm" className="shadow-lg bg-card text-foreground hover:bg-card/90 border border-border/50">
                <LayoutDashboard className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="bg-card/80 hover:bg-card border border-border/50">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="shadow-lg bg-primary hover:bg-primary/90">
                  <UserPlus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Get Started</span>
                  <span className="sm:hidden">Join</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
