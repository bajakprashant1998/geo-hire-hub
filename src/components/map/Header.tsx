import { ViewMode } from '@/types';
import { useTheme } from 'next-themes';
import { Sun, Moon, ChevronDown, LogIn, UserPlus, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LocationBadge } from './LocationBadge';

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
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="absolute top-0 left-0 right-0 z-[100] safe-area-pt"
    >
      {/* Main header row - Snapchat style */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        {/* Left - User Avatar */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative">
                <Avatar className="w-10 h-10 border-2 border-background shadow-lg">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {/* Online dot */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-background" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 rounded-xl">
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
          <Link to="/login">
            <div className="w-10 h-10 rounded-full bg-muted/80 backdrop-blur-sm border border-border/40 flex items-center justify-center shadow-lg">
              <LogIn className="w-4.5 h-4.5 text-muted-foreground" />
            </div>
          </Link>
        )}

        {/* Center - Location Name */}
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col items-center"
        >
          {userLocation ? (
            <LocationBadge
              latitude={userLocation.lat}
              longitude={userLocation.lng}
              className="text-xs bg-transparent border-0 px-0 py-0 text-foreground font-bold shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
            />
          ) : (
            <span className="text-sm font-bold text-foreground drop-shadow-md">HireForJob</span>
          )}
        </motion.div>

        {/* Right - Theme + Sign up or logo */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 rounded-full bg-muted/80 backdrop-blur-sm border border-border/40 flex items-center justify-center shadow-lg"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>
          {!user && (
            <Link to="/signup">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                <UserPlus className="w-4 h-4 text-primary-foreground" />
              </div>
            </Link>
          )}
        </div>
      </div>
    </motion.header>
  );
};
