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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Menu, Bell, Moon, Sun, User, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

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
  onNotificationClick?: () => void;
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
  profileCompleteness = 75,
  onNotificationClick
}: DashboardHeaderProps) => {
  const profilePath = type === 'employer' ? '/company-profile' : '/candidate-profile';
  const settingsPath = type === 'employer' ? '/employer-dashboard?tab=security' : '/candidate-settings';
  const firstName = userName?.split(' ')[0] || 'User';
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="sticky top-0 z-30 bg-card/60 backdrop-blur-2xl border-b border-border/40 shadow-sm safe-area-pt">
      <div className="h-14 sm:h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden shrink-0 rounded-xl"
                onClick={onMenuClick}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open menu</TooltipContent>
          </Tooltip>

          {/* Mobile compact */}
          <h1 className="sm:hidden text-sm font-semibold text-foreground truncate">
            Hi, <span className="text-primary">{firstName}</span> 👋
          </h1>
          {/* Desktop */}
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden sm:block min-w-0"
          >
            <h1 className="text-base sm:text-lg font-bold text-foreground truncate">
              {getGreeting()}, <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">{firstName}</span> 👋
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {type === 'candidate' ? "Let's find your dream job today" : "Manage your hiring pipeline"}
            </p>
          </motion.div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Profile completeness ring */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border/40 cursor-default">
                <div className="relative w-7 h-7">
                  <svg className="w-7 h-7 -rotate-90">
                    <circle cx="50%" cy="50%" r="10" fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
                    <circle
                      cx="50%" cy="50%" r="10" fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="2.5"
                      strokeDasharray={`${profileCompleteness * 0.63} 63`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-foreground">
                    {profileCompleteness}%
                  </span>
                </div>
                <span className="text-xs font-medium text-muted-foreground hidden md:inline">Profile</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Profile completeness: {profileCompleteness}%</TooltipContent>
          </Tooltip>

          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-xl" onClick={onNotificationClick}>
                <Bell className="w-5 h-5 text-muted-foreground" />
                {notificationCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center font-bold shadow-lg shadow-destructive/30"
                  >
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </motion.span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifications{notificationCount > 0 ? ` (${notificationCount} unread)` : ''}</TooltipContent>
          </Tooltip>

          <LanguageSelector className="hidden sm:flex" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl hidden sm:flex"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4.5 h-4.5 text-muted-foreground" />
                ) : (
                  <Moon className="w-4.5 h-4.5 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</TooltipContent>
          </Tooltip>

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="w-8 h-8 ring-2 ring-primary/20 ring-offset-1 ring-offset-card">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-semibold text-sm">
                    {userName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl backdrop-blur-xl bg-card/95 border-border/50">
              <DropdownMenuLabel>
                <div>
                  <p className="font-semibold">{userName}</p>
                  {userTitle && <p className="text-xs text-muted-foreground font-normal">{userTitle}</p>}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={profilePath} className="flex items-center gap-2 cursor-pointer">
                  <User className="w-4 h-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={settingsPath} className="flex items-center gap-2 cursor-pointer">
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onSignOut}
                className="text-destructive focus:text-destructive cursor-pointer"
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
