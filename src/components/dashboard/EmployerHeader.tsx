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
import { Menu, Bell, Moon, Sun, User, Settings, LogOut, Plus, ChevronRight, Sparkles, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { LanguageSelector } from '@/components/LanguageSelector';
import { motion } from 'framer-motion';

interface EmployerHeaderProps {
  companyName: string;
  planName?: string;
  avatarUrl?: string | null;
  onMenuClick: () => void;
  onSignOut: () => void;
  notificationCount?: number;
  profileCompleteness?: number;
  onNotificationClick?: () => void;
  onPostJob?: () => void;
  onSearch?: () => void;
}

export const EmployerHeader = ({
  companyName,
  planName = 'Free Plan',
  avatarUrl,
  onMenuClick,
  onSignOut,
  notificationCount = 0,
  profileCompleteness = 75,
  onNotificationClick,
  onPostJob,
  onSearch
}: EmployerHeaderProps) => {
  const firstName = companyName?.split(' ')[0] || 'Company';
  const { theme, setTheme } = useTheme();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-2xl border-b border-border/30 safe-area-pt">
      <div className="h-14 sm:h-[60px] px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2">
        {/* Left */}
        <div className="flex items-center gap-2.5 min-w-0 flex-shrink">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden shrink-0 rounded-xl h-9 w-9 hover:bg-muted/60"
                onClick={onMenuClick}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open menu</TooltipContent>
          </Tooltip>

          {/* Mobile compact */}
          <div className="sm:hidden min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate">
              Hi, <span className="text-primary">{firstName}</span> 👋
            </h1>
          </div>
          {/* Desktop */}
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
              <p className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary/50" />
                Manage your hiring pipeline
                <span className="text-primary/70 font-medium">• {planName}</span>
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Post Job CTA - Desktop */}
          {onPostJob && (
            <Button
              onClick={onPostJob}
              size="sm"
              className="hidden md:flex gap-1.5 h-9 rounded-xl text-xs font-semibold shadow-sm shadow-primary/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Post Job
            </Button>
          )}

          {/* Profile completeness ring - Desktop */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-muted/50 border border-border/30 cursor-default select-none">
                <div className="relative w-8 h-8">
                  <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
                    <motion.circle
                      cx="18" cy="18" r="14" fill="none"
                      stroke={profileCompleteness >= 80 ? "hsl(var(--success, var(--primary)))" : profileCompleteness >= 50 ? "hsl(var(--warning, 40 96% 53%))" : "hsl(var(--destructive))"}
                      strokeWidth="2.5"
                      strokeDasharray={`${profileCompleteness * 0.88} 88`}
                      strokeLinecap="round"
                      initial={{ strokeDasharray: '0 88' }}
                      animate={{ strokeDasharray: `${profileCompleteness * 0.88} 88` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-foreground">
                    {profileCompleteness}%
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground leading-none mb-0.5">Profile</p>
                  <p className="text-[11px] font-bold text-foreground leading-none">
                    {profileCompleteness >= 80 ? 'Strong' : profileCompleteness >= 50 ? 'Good' : 'Needs work'}
                  </p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">Profile {profileCompleteness}% complete</p>
              {profileCompleteness < 100 && <p className="text-xs text-muted-foreground">Complete your profile for better visibility</p>}
            </TooltipContent>
          </Tooltip>

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

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-2 ring-offset-card">
                <Avatar className="w-9 h-9 sm:w-10 sm:h-10 ring-2 ring-primary/20 ring-offset-2 ring-offset-card transition-all hover:ring-primary/40 hover:scale-105">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-sm">
                    {companyName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
              <div className="px-3 py-3 flex items-center gap-3">
                <Avatar className="w-10 h-10 ring-1 ring-border">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-sm">
                    {companyName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{companyName}</p>
                  <p className="text-[11px] text-muted-foreground font-normal truncate">{planName}</p>
                </div>
              </div>

              {/* Mobile profile completeness */}
              {profileCompleteness < 100 && (
                <div className="mx-2 mb-1.5 lg:hidden">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-muted-foreground">Profile</span>
                    <span className="text-[10px] font-bold text-foreground">{profileCompleteness}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        profileCompleteness >= 80 ? "bg-success" : profileCompleteness >= 50 ? "bg-warning" : "bg-destructive"
                      )}
                      style={{ width: `${profileCompleteness}%` }}
                    />
                  </div>
                </div>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-xl h-10">
                <Link to="/company-profile" className="flex items-center gap-2.5 cursor-pointer">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="flex-1 text-sm">Company Profile</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl h-10">
                <Link to="/employer-dashboard?tab=security" className="flex items-center gap-2.5 cursor-pointer">
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
