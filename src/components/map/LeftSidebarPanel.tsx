import { ViewMode } from '@/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  MapPin, 
  LogIn, 
  UserPlus, 
  Users, 
  Briefcase, 
  Target, 
  List, 
  Building2, 
  Landmark,
  Search,
  Navigation,
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronDown,
  Menu
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LocationBadge } from './LocationBadge';
import { useState, useRef, useEffect, useCallback } from 'react';
import { SearchSuggestions, saveRecentSearch } from './SearchSuggestions';

interface LeftSidebarPanelProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  candidateCount: number;
  jobCount: number;
  governmentJobCount: number;
  privateJobCount: number;
  onViewList: () => void;
  onCenterOnUser: () => void;
  userLocation: { lat: number; lng: number } | null;
}

export const LeftSidebarPanel = ({
  mode,
  onModeChange,
  searchQuery,
  onSearchChange,
  radius,
  onRadiusChange,
  candidateCount,
  jobCount,
  governmentJobCount,
  privateJobCount,
  onViewList,
  onCenterOnUser,
  userLocation,
}: LeftSidebarPanelProps) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const radiusPresets = [5, 10, 25, 50, 100];
  const count = mode === 'hiring' ? candidateCount : jobCount;

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const dashboardPath = profile?.user_type === 'employer' ? '/employer-dashboard' : '/candidate-dashboard';
  const settingsPath = profile?.user_type === 'employer' ? '/company-profile' : '/candidate-settings';
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = userName.charAt(0).toUpperCase();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (query.trim()) {
      saveRecentSearch(query.trim());
    }
    onSearchChange(query);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 300);
  }, [onSearchChange]);

  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    saveRecentSearch(suggestion);
    onSearchChange(suggestion);
    setShowSuggestions(false);
  };

  const handleUseLocation = () => {
    onCenterOnUser();
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-y-auto">
      {/* Logo + Location Section */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onViewList}
            className="h-10 w-10 rounded-xl bg-muted/50 hover:bg-muted border border-border/30"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <Link to="/" className="flex items-center gap-2.5 group flex-1">
            <div className="w-10 h-10 bg-gradient-to-br from-primary via-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-lg text-foreground tracking-tight block leading-tight">
                Hire for Job
              </span>
              {userLocation && (
                <LocationBadge 
                  latitude={userLocation.lat} 
                  longitude={userLocation.lng}
                  className="mt-0.5"
                />
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* Mode Toggle Section */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-2">
          <Button
            variant={mode === 'hiring' ? 'outline' : 'ghost'}
            className={cn(
              "flex-1 h-11 rounded-xl gap-2 font-semibold transition-all",
              mode === 'hiring' 
                ? 'border-2 border-primary text-primary bg-primary/5' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
            onClick={() => onModeChange('hiring')}
          >
            <Users className="w-4 h-4" />
            I am Hiring
          </Button>
          <Button
            variant={mode === 'seeking' ? 'default' : 'ghost'}
            className={cn(
              "flex-1 h-11 rounded-xl gap-2 font-semibold transition-all",
              mode === 'seeking' 
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
            onClick={() => onModeChange('seeking')}
          >
            <Briefcase className="w-4 h-4" />
            I need a Job
          </Button>
        </div>
      </div>

      {/* Auth Buttons Section */}
      {!user && (
        <div className="p-4 border-b border-border">
          <div className="flex gap-2">
            <Link to="/login" className="flex-1">
              <Button 
                variant="outline" 
                className="w-full h-11 rounded-xl gap-2 font-medium border-border"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Button>
            </Link>
            <Link to="/signup" className="flex-1">
              <Button 
                className="w-full h-11 rounded-xl gap-2 font-medium shadow-md bg-primary hover:bg-primary/90"
              >
                <UserPlus className="w-4 h-4" />
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* User Profile Section (when logged in) */}
      {user && (
        <div className="p-4 border-b border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full h-auto p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/30 justify-start gap-3"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[calc(300px-2rem)] rounded-xl">
              <DropdownMenuItem asChild className="rounded-lg mx-1">
                <Link to={dashboardPath} className="cursor-pointer gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-lg mx-1">
                <Link to={settingsPath} className="cursor-pointer gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive cursor-pointer rounded-lg mx-1 gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Search Bar Section */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleSearchInputChange}
                onFocus={() => { setIsFocused(true); setShowSuggestions(true); }}
                onBlur={() => { setIsFocused(false); setTimeout(() => setShowSuggestions(false), 200); }}
                placeholder={
                  mode === 'hiring'
                    ? 'Search candidates...'
                    : 'Search jobs...'
                }
                className={cn(
                  "w-full h-11 pl-10 pr-10 rounded-xl border bg-background text-sm",
                  "placeholder:text-muted-foreground outline-none",
                  "transition-all duration-200",
                  isFocused 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-border hover:border-muted-foreground/30'
                )}
              />
              <button
                type="button"
                onClick={handleUseLocation}
                className="absolute right-2 p-1.5 hover:bg-muted rounded-lg transition-colors"
                title="Use current location"
              >
                <Navigation className="w-4 h-4 text-primary" />
              </button>
            </div>
          </form>
          
          <SearchSuggestions
            isVisible={showSuggestions && isFocused}
            onSelect={handleSuggestionSelect}
            onClose={() => setShowSuggestions(false)}
            currentQuery={query}
          />
        </div>
      </div>

      {/* Search Radius Section */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Search Radius</span>
        </div>

        {/* Quick Presets */}
        <div className="flex gap-1.5 mb-4">
          {radiusPresets.map((preset) => (
            <button
              key={preset}
              onClick={() => onRadiusChange(preset)}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                radius === preset
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Slider */}
        <div className="space-y-2">
          <Slider
            value={[radius]}
            onValueChange={(value) => onRadiusChange(value[0])}
            max={100}
            min={5}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">5 km</span>
            <span className="font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
              {radius} km
            </span>
            <span className="text-muted-foreground">100 km</span>
          </div>
        </div>
      </div>

      {/* Stats Card Section */}
      <div className="p-4 flex-1">
        <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "p-3 rounded-xl",
              mode === 'hiring' ? 'bg-primary/10' : 'bg-destructive/10'
            )}>
              {mode === 'hiring' ? (
                <Users className={cn("w-6 h-6 text-primary")} />
              ) : (
                <Briefcase className={cn("w-6 h-6 text-destructive")} />
              )}
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className={cn(
                  "text-2xl font-bold tabular-nums",
                  mode === 'hiring' ? 'text-primary' : 'text-destructive'
                )}>
                  {count}
                </span>
                <span className="text-sm text-muted-foreground">
                  {mode === 'hiring' ? 'candidates' : 'jobs'} nearby
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                within {radius}km of your location
              </p>
            </div>
          </div>

          {/* Category Breakdown - Jobs only */}
          {mode === 'seeking' && (
            <div className="flex gap-2 mb-4">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary/10">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">{privateJobCount}</span>
                <span className="text-xs text-muted-foreground">Private</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-success/10">
                <Landmark className="w-3.5 h-3.5 text-success" />
                <span className="text-xs font-semibold text-success">{governmentJobCount}</span>
                <span className="text-xs text-muted-foreground">Govt</span>
              </div>
            </div>
          )}

          {/* View List Button */}
          <Button 
            variant="outline" 
            onClick={onViewList}
            className="w-full h-10 rounded-xl gap-2 font-medium"
          >
            <List className="w-4 h-4" />
            View List
          </Button>
        </div>
      </div>
    </div>
  );
};
