import { ViewMode } from '@/types';
import { ViewToggle } from './ViewToggle';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { LocationBadge } from './LocationBadge';
import { Button } from '@/components/ui/button';
import { Menu, LogIn, UserPlus, LayoutDashboard, LogOut, Settings, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  const { theme, setTheme } = useTheme();

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
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="absolute top-0 left-0 right-0 z-[100] p-2 safe-area-pt"
    >
      <div className="bg-card/90 backdrop-blur-2xl rounded-2xl border border-border/30 shadow-xl p-2.5">
        {/* Top Row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* Left */}
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMenuClick}
                  className="h-10 w-10 rounded-xl bg-muted/40 hover:bg-muted border border-border/20"
                >
                  <Menu className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open sidebar</TooltipContent>
            </Tooltip>
            
            {/* Mobile Logo + Location */}
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/">
                    <img 
                      src="/logo.png" 
                      alt="Hire for Job" 
                      className="w-8 h-8 rounded-lg object-contain shadow-sm"
                    />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Home</TooltipContent>
              </Tooltip>
              {userLocation && (
                <LocationBadge 
                  latitude={userLocation.lat} 
                  longitude={userLocation.lng}
                  className="text-[10px]"
                />
              )}
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="h-9 w-9 rounded-xl bg-muted/40 hover:bg-muted border border-border/20"
                >
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</TooltipContent>
            </Tooltip>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 rounded-xl bg-muted/40 hover:bg-muted border border-border/20 gap-1 px-1.5"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold truncate">{userName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
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
            ) : (
              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/login">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-xl bg-muted/40 hover:bg-muted border border-border/20"
                      >
                        <LogIn className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Sign in</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/signup">
                      <Button 
                        size="sm" 
                        className="h-9 rounded-xl shadow-sm gap-1 px-3 text-xs font-semibold"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Get Started</span>
                        <span className="sm:hidden">Join</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Create an account</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-2">
          <ViewToggle mode={mode} onModeChange={onModeChange} variant="compact" />
        </div>

        {/* Search */}
        <SearchBar
          onSearch={onSearch}
          placeholder={
            mode === 'hiring'
              ? 'Search candidates by skill, title...'
              : 'Search jobs by title, company...'
          }
        />
      </div>
    </motion.header>
  );
};