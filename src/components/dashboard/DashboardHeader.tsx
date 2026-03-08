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

const ProfileRing = ({ completeness, label }: { completeness: number; label?: string }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const filled = (completeness / 100) * circumference;
  const color = completeness >= 80 ? 'hsl(var(--primary))' : completeness >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border/50 shadow-sm cursor-default select-none">
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
          <motion.circle
            cx="22" cy="22" r={radius} fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - filled }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-foreground">
          {completeness}%
        </span>
      </div>
      {label && <span className="text-sm font-semibold text-foreground hidden md:inline">{label}</span>}
    </div>
  );
};

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
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-2xl border-b border-border/40 safe-area-pt">
      <div className="h-14 sm:h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2">
        {/* Left: Menu + Greeting */}
        <div className="flex items-center gap-2.5 min-w-0 flex-shrink">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0 rounded-xl h-9 w-9"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Mobile greeting */}
          <h1 className="sm:hidden text-sm font-semibold text-foreground truncate">
            Hi, <span className="text-primary">{firstName}</span> 👋
          </h1>
          {/* Desktop greeting */}
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden sm:block min-w-0"
          >
            <h1 className="text-base font-bold text-foreground truncate leading-tight">
              {getGreeting()}, <span className="text-primary">{firstName}</span> 👋
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {type === 'candidate' ? "Let's find your dream job today" : "Manage your hiring pipeline"}
            </p>
          </motion.div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Profile Completeness Ring */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden sm:block">
                <ProfileRing completeness={profileCompleteness} label="Profile" />
              </div>
            </TooltipTrigger>
            <TooltipContent>Profile {profileCompleteness}% complete</TooltipContent>
          </Tooltip>

          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-xl h-9 w-9 sm:h-10 sm:w-10"
                onClick={onNotificationClick}
              >
                <Bell className="w-[18px] h-[18px] text-muted-foreground" />
                {notificationCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold px-1 shadow-lg"
                  >
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </motion.span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {notificationCount > 0 ? `${notificationCount} unread` : 'Notifications'}
            </TooltipContent>
          </Tooltip>

          {/* Language */}
          <LanguageSelector className="hidden sm:flex" />

          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl h-9 w-9 sm:h-10 sm:w-10 hidden sm:inline-flex"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? (
                  <Sun className="w-[18px] h-[18px] text-muted-foreground" />
                ) : (
                  <Moon className="w-[18px] h-[18px] text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
          </Tooltip>

          {/* User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-2 ring-offset-card">
                <Avatar className="w-9 h-9 sm:w-10 sm:h-10 ring-2 ring-primary/20 ring-offset-2 ring-offset-card transition-transform hover:scale-105">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                    {userName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel>
                <p className="font-semibold truncate">{userName}</p>
                {userTitle && <p className="text-xs text-muted-foreground font-normal truncate">{userTitle}</p>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={profilePath} className="flex items-center gap-2 cursor-pointer">
                  <User className="w-4 h-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={settingsPath} className="flex items-center gap-2 cursor-pointer">
                  <Settings className="w-4 h-4" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onSignOut}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
