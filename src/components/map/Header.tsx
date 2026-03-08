import { ViewMode } from '@/types';
import { useTheme } from 'next-themes';
import { Sun, Moon, LogIn, UserPlus, LayoutDashboard, LogOut, Settings, Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { LocationBadge } from './LocationBadge';
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
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="absolute top-0 left-0 right-0 z-[100] safe-area-pt"
    >
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        {/* Left - User Avatar / Login */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.92 }}
                className="relative group"
              >
                <Avatar className="w-11 h-11 border-2 border-card shadow-xl transition-transform group-hover:scale-105">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[hsl(var(--success))] rounded-full border-2 border-card" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-2xl p-1.5">
              <div className="px-3 py-2.5">
                <p className="text-sm font-bold truncate text-foreground">{userName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-xl mx-0.5 h-10">
                <Link to={dashboardPath} className="cursor-pointer gap-2.5">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl mx-0.5 h-10">
                <Link to={settingsPath} className="cursor-pointer gap-2.5">
                  <Settings className="w-4 h-4" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive cursor-pointer rounded-xl mx-0.5 gap-2.5 h-10"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to="/login">
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="w-11 h-11 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/30 flex items-center justify-center shadow-xl hover:shadow-2xl transition-all"
            >
              <LogIn className="w-[18px] h-[18px] text-muted-foreground" />
            </motion.div>
          </Link>
        )}

        {/* Center - Location / Brand */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.12, type: 'spring', stiffness: 300 }}
          className="flex flex-col items-center"
        >
          {userLocation ? (
            <LocationBadge
              latitude={userLocation.lat}
              longitude={userLocation.lng}
              className="text-xs bg-card/85 backdrop-blur-xl border border-border/30 px-4 py-1.5 rounded-2xl text-foreground font-bold shadow-lg"
            />
          ) : (
            <span className="text-sm font-extrabold text-foreground drop-shadow-md bg-card/85 backdrop-blur-xl px-4 py-1.5 rounded-2xl border border-border/30 shadow-lg tracking-tight">
              HireForJob
            </span>
          )}
        </motion.div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-11 h-11 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/30 flex items-center justify-center shadow-xl hover:shadow-2xl transition-all"
          >
            <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-foreground" />
            <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-foreground" />
          </motion.button>
          {!user && (
            <Link to="/signup">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 hover:shadow-2xl transition-all"
              >
                <UserPlus className="w-[18px] h-[18px] text-primary-foreground" />
              </motion.div>
            </Link>
          )}
        </div>
      </div>
    </motion.header>
  );
};
