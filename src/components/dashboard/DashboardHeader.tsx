import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, Bell, Moon, Sun, User, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useTranslation } from 'react-i18next';

interface DashboardHeaderProps {
  type: 'candidate' | 'employer';
  userName: string;
  userTitle?: string;
  avatarUrl?: string | null;
  onMenuClick: () => void;
  onSignOut: () => void;
  notificationCount?: number;
  messageCount?: number;
  profileCompleteness?: number;
}

export const DashboardHeader = ({
  type,
  userName,
  userTitle,
  avatarUrl,
  onMenuClick,
  onSignOut,
  notificationCount = 0,
  messageCount = 0,
  profileCompleteness = 75
}: DashboardHeaderProps) => {
  const profilePath = type === 'employer' ? '/company-profile' : '/candidate-profile';
  const settingsPath = type === 'employer' ? '/employer-settings' : '/candidate-settings';
  const firstName = userName?.split(' ')[0] || 'User';
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 bg-card border-b shadow-sm safe-area-pt">
      <div className="h-full px-3 sm:px-4 lg:px-6 flex items-center justify-between">
        {/* Left - Menu Button (Mobile) + Welcome Message */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden touch-target touch-scale shrink-0"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Mobile compact greeting */}
          <h1 className="sm:hidden text-sm font-semibold text-foreground truncate">
            Hi, <span className="text-primary">{firstName}</span>
          </h1>
          {/* Desktop full greeting */}
          <div className="hidden sm:block min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">
              Welcome back, <span className="text-primary">{firstName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Let's find your dream job today</p>
          </div>
        </div>

        {/* Right - Profile Completeness, Notifications, Theme, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Profile Completeness Circle - Hidden on small mobile */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-muted/50">
            <div className="relative w-7 h-7 sm:w-8 sm:h-8">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 -rotate-90">
                <circle
                  cx="50%" cy="50%" r="10"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="3"
                />
                <circle
                  cx="50%" cy="50%" r="10"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  strokeDasharray={`${profileCompleteness * 0.63} 63`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-foreground">
                {profileCompleteness}%
              </span>
            </div>
            <span className="text-xs font-medium text-muted-foreground hidden md:inline">Profile</span>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative touch-target touch-scale">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-destructive text-white text-[10px] sm:text-xs flex items-center justify-center font-semibold">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Button>

          {/* Language Selector */}
          <LanguageSelector className="hidden sm:flex" />

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="touch-target touch-scale hidden sm:flex"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Moon className="w-5 h-5 text-muted-foreground" />
            )}
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full touch-target touch-scale">
                <Avatar className="w-8 h-8 sm:w-9 sm:h-9 ring-2 ring-border">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                    {userName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-semibold">{userName}</p>
                  {userTitle && <p className="text-xs text-muted-foreground font-normal">{userTitle}</p>}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="touch-target-sm">
                <Link to={profilePath} className="flex items-center gap-2 cursor-pointer">
                  <User className="w-4 h-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="touch-target-sm">
                <Link to={settingsPath} className="flex items-center gap-2 cursor-pointer">
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onSignOut}
                className="text-destructive focus:text-destructive cursor-pointer touch-target-sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
