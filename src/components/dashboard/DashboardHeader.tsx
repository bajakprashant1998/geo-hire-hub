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
import { Menu, Bell, Moon, Sun, User, Settings, LogOut, Sparkles, ChevronRight } from 'lucide-react';
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

const ProfileRing = ({ completeness }: { completeness: number }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const filled = (completeness / 100) * circumference;
  const color = completeness >= 80 ? 'hsl(var(--success))' : completeness >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-muted/50 border border-border/30 hover:bg-muted/80 transition-colors cursor-default select-none"
        >
          <div className="relative w-9 h-9">
            <svg className="w-9 h-9 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
              <motion.circle
                cx="24" cy="24" r={radius} fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeLinecap="round"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference - filled }}
                transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
              {completeness}%
            </span>
          </div>
          <div className="hidden lg:block">
            <p className="text-[10px] font-semibold text-muted-foreground leading-none mb-0.5">Profile</p>
            <p className="text-[11px] font-bold text-foreground leading-none">
              {completeness >= 80 ? 'Strong' : completeness >= 50 ? 'Good' : 'Needs work'}
            </p>
          </div>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="font-medium">Profile {completeness}% complete</p>
        {completeness < 100 && <p className="text-xs text-muted-foreground">Complete your profile to get more visibility</p>}
      </TooltipContent>
    </Tooltip>
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
    <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-2xl border-b border-border/30 safe-area-pt">
      <div className="h-14 sm:h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2">
        {/* Left: Menu + Greeting */}
        <div className="flex items-center gap-2.5 min-w-0 flex-shrink">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0 rounded-xl h-9 w-9 hover:bg-muted/60"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Mobile greeting */}
          <div className="sm:hidden flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate">
              Hi, <span className="text-primary">{firstName}</span> 👋
            </h1>
          </div>

          {/* Desktop greeting */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 16 }}
            className="hidden sm:flex items-center gap-3 min-w-0"
          >
            <div className="min-w-0">
              <h1 className="text-base font-bold text-foreground truncate leading-tight">
                {getGreeting()}, <span className="text-primary">{firstName}</span> 👋
              </h1>
              <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                {type === 'candidate' ? (
                  <>
                    <Sparkles className="w-3 h-3 text-primary/60" />
                    Let's find your dream job today
                  </>
                ) : (
                  'Manage your hiring pipeline'
                )}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Profile Completeness Ring - Hidden on mobile */}
          <div className="hidden sm:block">
            <ProfileRing completeness={profileCompleteness} />
          </div>

          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-xl h-9 w-9 sm:h-10 sm:w-10 hover:bg-muted/60"
                onClick={onNotificationClick}
              >
                <Bell className="w-[18px] h-[18px] text-muted-foreground" />
                {notificationCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold px-1 shadow-lg shadow-destructive/30"
                  >
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </motion.span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {notificationCount > 0 ? `${notificationCount} unread notification${notificationCount > 1 ? 's' : ''}` : 'No new notifications'}
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
                className="rounded-xl h-9 w-9 sm:h-10 sm:w-10 hidden sm:inline-flex hover:bg-muted/60"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <motion.div
                  key={theme}
                  initial={{ scale: 0.5, rotate: -90, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                >
                  {theme === 'dark' ? (
                    <Sun className="w-[18px] h-[18px] text-muted-foreground" />
                  ) : (
                    <Moon className="w-[18px] h-[18px] text-muted-foreground" />
                  )}
                </motion.div>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</TooltipContent>
          </Tooltip>

          {/* User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-2 ring-offset-card">
                <Avatar className="w-9 h-9 sm:w-10 sm:h-10 ring-2 ring-primary/20 ring-offset-2 ring-offset-card transition-all hover:ring-primary/40 hover:scale-105">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-sm">
                    {userName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
              <div className="px-3 py-3 flex items-center gap-3">
                <Avatar className="w-10 h-10 ring-1 ring-border">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-sm">
                    {userName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{userName}</p>
                  {userTitle && <p className="text-[11px] text-muted-foreground font-normal truncate">{userTitle}</p>}
                </div>
              </div>

              {/* Mobile-only profile completeness */}
              {profileCompleteness < 100 && (
                <div className="mx-2 mb-1.5 sm:hidden">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-muted-foreground">Profile</span>
                    <span className="text-[10px] font-bold text-foreground">{profileCompleteness}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${profileCompleteness}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={cn(
                        "h-full rounded-full",
                        profileCompleteness >= 80 ? "bg-success" : profileCompleteness >= 50 ? "bg-warning" : "bg-destructive"
                      )}
                    />
                  </div>
                </div>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-xl h-10">
                <Link to={profilePath} className="flex items-center gap-2.5 cursor-pointer">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="flex-1 text-sm">My Profile</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl h-10">
                <Link to={settingsPath} className="flex items-center gap-2.5 cursor-pointer">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                    <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span className="flex-1 text-sm">Settings</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onSignOut}
                className="text-destructive focus:text-destructive cursor-pointer rounded-xl h-10"
              >
                <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center mr-0.5">
                  <LogOut className="w-3.5 h-3.5" />
                </div>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
