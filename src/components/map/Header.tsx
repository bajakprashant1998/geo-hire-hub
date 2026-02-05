import { ViewMode } from '@/types';
import { ViewToggle } from './ViewToggle';
import { SearchBar } from './SearchBar';
import { LocationBadge } from './LocationBadge';
import { Button } from '@/components/ui/button';
 import { Menu, LogIn, UserPlus, LayoutDashboard, LogOut, Settings, ChevronDown } from 'lucide-react';
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
       className="absolute top-0 left-0 right-0 z-[100] p-2 sm:p-4 safe-area-pt"
    >
      {/* Glass Background */}
       <div className="glass-morphism rounded-2xl sm:rounded-3xl p-2.5 sm:p-4">
         {/* Top Row - Menu, Logo/Toggle, User */}
         <div className="flex items-center justify-between gap-2 sm:gap-3 mb-2.5 sm:mb-3">
          {/* Left - Menu & Logo */}
           <div className="flex items-center gap-1.5 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
               className="h-10 w-10 rounded-xl bg-muted/50 hover:bg-muted border border-border/30 touch-target touch-scale flex-shrink-0"
            >
               <Menu className="w-4 h-4" />
            </Button>
            
            <Link to="/" className="hidden sm:flex items-center gap-2.5 group">
              <img 
                src="/logo.png" 
                alt="Hire for Job" 
                className="w-10 h-10 rounded-xl object-contain shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105"
              />
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

             {/* Mobile: Compact Logo + Location */}
             <div className="sm:hidden flex items-center gap-1.5">
               <Link to="/" className="flex items-center">
                 <img 
                   src="/logo.png" 
                   alt="Hire for Job" 
                   className="w-8 h-8 rounded-lg object-contain shadow-md"
                 />
               </Link>
               {userLocation && (
                 <LocationBadge 
                   latitude={userLocation.lat} 
                   longitude={userLocation.lng}
                   className="text-[10px]"
                 />
               )}
             </div>
          </div>

          {/* Center - Mode Toggle (Desktop) */}
          <div className="hidden md:block">
            <ViewToggle mode={mode} onModeChange={onModeChange} />
          </div>

          {/* Right - Auth */}
           <div className="flex items-center gap-1.5 sm:gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                     className="h-10 rounded-xl bg-muted/50 hover:bg-muted border border-border/30 gap-1.5 px-2 touch-target touch-scale"
                  >
                     <Avatar className="w-6 h-6 sm:w-7 sm:h-7">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                     <span className="hidden sm:inline max-w-[80px] truncate text-xs font-medium">
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
               <div className="flex items-center gap-1.5">
                <Link to="/login" className="hidden sm:block">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                     className="h-9 rounded-xl bg-muted/50 hover:bg-muted border border-border/30 gap-1.5 text-xs touch-target-sm"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button 
                    size="sm" 
                     className="h-10 rounded-xl shadow-md bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary gap-1.5 touch-target touch-scale px-3 sm:px-4 text-xs sm:text-sm"
                  >
                     <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Get Started</span>
                    <span className="sm:hidden">Join</span>
                  </Button>
                </Link>
                <Link to="/login" className="sm:hidden">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                     className="h-10 w-10 rounded-xl bg-muted/50 hover:bg-muted border border-border/30 touch-target touch-scale"
                  >
                    <LogIn className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Mode Toggle */}
         <div className="md:hidden flex justify-center mb-2.5">
           <ViewToggle mode={mode} onModeChange={onModeChange} variant="compact" />
        </div>

        {/* Search Bar */}
         <div className="w-full max-w-2xl mx-auto px-0.5">
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
