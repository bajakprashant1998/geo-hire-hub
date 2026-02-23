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
}

export const EmployerHeader = ({
  companyName,
  planName = 'Free Plan',
  avatarUrl,
  onMenuClick,
  onSignOut,
  notificationCount = 0,
  profileCompleteness = 75,
  onNotificationClick
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
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b shadow-sm safe-area-pt">
      <div className="h-14 sm:h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0 rounded-xl"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>

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
              {getGreeting()}, <span className="text-primary">{firstName}</span> 👋
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Manage your hiring pipeline
            </p>
          </motion.div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Profile completeness ring */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
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

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative rounded-xl" onClick={onNotificationClick}>
            <Bell className="w-5 h-5 text-muted-foreground" />
            {notificationCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center font-bold"
              >
                {notificationCount > 9 ? '9+' : notificationCount}
              </motion.span>
            )}
          </Button>

          <LanguageSelector className="hidden sm:flex" />

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

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="w-8 h-8 ring-2 ring-primary/20 ring-offset-1 ring-offset-card">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                    {companyName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel>
                <div>
                  <p className="font-semibold">{companyName}</p>
                  <p className="text-xs text-muted-foreground font-normal">{planName}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/company-profile" className="flex items-center gap-2 cursor-pointer">
                  <User className="w-4 h-4" />
                  Company Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/employer-settings" className="flex items-center gap-2 cursor-pointer">
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
