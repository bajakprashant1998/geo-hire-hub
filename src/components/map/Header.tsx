import { ViewMode } from '@/types';
import { ViewToggle } from './ViewToggle';
import { SearchBar } from './SearchBar';
import { LocationBadge } from './LocationBadge';
import { Button } from '@/components/ui/button';
import { Menu, LogIn, UserPlus, LayoutDashboard, MapPin, LogOut, Settings, ChevronDown } from 'lucide-react';
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
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HeaderProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  onSearch: (query: string) => void;
  onMenuClick: () => void;
  userLocation?: { lat: number; lng: number } | null;
}

export const Header = ({ mode, onModeChange, onSearch, onMenuClick, userLocation }: HeaderProps) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const dashboardPath = profile?.user_type === 'employer' ? '/employer-dashboard' : '/candidate-dashboard';
  const settingsPath = profile?.user_type === 'employer' ? '/company-profile' : '/candidate-settings';
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = userName.charAt(0).toUpperCase();

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="absolute top-0 left-0 right-0 z-[100] p-3 sm:p-4 safe-area-pt"
    >
      {/* Glass Background */}
      <div className="glass-morphism rounded-2xl sm:rounded-3xl p-3 sm:p-4">
        {/* Top Row - Menu, Logo, User */}
        <div className="flex items-center justify-between gap-3 mb-3">
          {/* Left - Menu & Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="h-11 w-11 rounded-xl bg-muted/50 hover:bg-muted border border-border/30 touch-target touch-scale"
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <Link to="/" className="hidden sm:flex items-center gap-2.5 group">
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

            {/* Mobile Logo */}
            <Link to="/" className="sm:hidden flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                <MapPin className="w-4.5 h-4.5 text-primary-foreground" />
              </div>
            </Link>
          </div>

          {/* Center - Mode Toggle (Desktop) */}
          <div className="hidden md:block">
            <ViewToggle mode={mode} onModeChange={onModeChange} />
          </div>

          {/* Right - Auth */}
          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-11 rounded-xl bg-muted/50 hover:bg-muted border border-border/30 gap-2 px-2 sm:px-3 touch-target touch-scale"
                  >
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline max-w-[80px] truncate text-sm font-medium">
                      {userName}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold truncate">{userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="rounded-lg mx-1 touch-target-sm">
                    <Link to={dashboardPath} className="cursor-pointer gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg mx-1 touch-target-sm">
                    <Link to={settingsPath} className="cursor-pointer gap-2">
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive cursor-pointer rounded-lg mx-1 touch-target-sm gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="hidden sm:block">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 rounded-xl bg-muted/50 hover:bg-muted border border-border/30 gap-2 touch-target-sm"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button 
                    size="sm" 
                    className="h-11 rounded-xl shadow-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary gap-2 touch-target touch-scale px-4 sm:px-5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Get Started</span>
                    <span className="sm:hidden">Join</span>
                  </Button>
                </Link>
                <Link to="/login" className="sm:hidden">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-11 w-11 rounded-xl bg-muted/50 hover:bg-muted border border-border/30 touch-target touch-scale"
                  >
                    <LogIn className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Mode Toggle */}
        <div className="md:hidden flex justify-center mb-3">
          <ViewToggle mode={mode} onModeChange={onModeChange} />
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-2xl mx-auto">
          <SearchBar
            onSearch={onSearch}
            placeholder={
              mode === 'hiring'
                ? 'Search candidates by skill, title...'
                : 'Search jobs by title, company...'
            }
          />
        </div>
      </div>
    </motion.header>
  );
};
