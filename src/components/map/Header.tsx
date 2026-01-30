import { ViewMode } from '@/types';
import { ViewToggle } from './ViewToggle';
import { SearchBar } from './SearchBar';
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

interface HeaderProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  onSearch: (query: string) => void;
  onMenuClick: () => void;
}

export const Header = ({ mode, onModeChange, onSearch, onMenuClick }: HeaderProps) => {
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
    <header className="absolute top-0 left-0 right-0 z-[100] p-2 sm:p-3 md:p-4 safe-area-pt">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* Left - Menu button and logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            variant="secondary"
            size="icon"
            onClick={onMenuClick}
            className="shadow-lg bg-card hover:bg-card/90 border border-border/50 touch-target touch-scale"
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
        <div className="flex-1 flex flex-col items-center gap-1.5 sm:gap-2 md:gap-3 max-w-2xl mx-auto min-w-0">
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
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="shadow-lg bg-card hover:bg-card/90 border border-border/50 gap-1.5 sm:gap-2 pr-1.5 sm:pr-2 touch-target touch-scale h-10 sm:h-9"
                >
                  <Avatar className="w-6 h-6 sm:w-7 sm:h-7">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline max-w-[100px] truncate text-sm">{userName}</span>
                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-medium truncate">
                  {userName}
                </div>
                <div className="px-2 pb-2 text-xs text-muted-foreground truncate">
                  {user.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="touch-target-sm">
                  <Link to={dashboardPath} className="cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="touch-target-sm">
                  <Link to={settingsPath} className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive cursor-pointer touch-target-sm"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="bg-card/80 hover:bg-card border border-border/50 touch-target-sm">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="shadow-lg bg-primary hover:bg-primary/90 touch-target touch-scale h-10 sm:h-9 px-3 sm:px-4">
                  <UserPlus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Get Started</span>
                  <span className="sm:hidden">Join</span>
                </Button>
              </Link>
              {/* Mobile sign in link */}
              <Link to="/login" className="sm:hidden">
                <Button variant="ghost" size="icon" className="bg-card/80 hover:bg-card border border-border/50 touch-target touch-scale h-10 w-10">
                  <LogIn className="w-4 h-4" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};