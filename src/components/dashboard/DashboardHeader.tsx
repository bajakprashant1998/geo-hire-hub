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
import { Menu, Bell, Moon, User, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const settingsPath = type === 'employer' ? '/company-profile' : '/candidate-settings';
  const firstName = userName?.split(' ')[0] || 'User';

  return (
    <header className="sticky top-0 z-30 h-16 bg-card border-b shadow-sm">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        {/* Left - Menu Button (Mobile) + Welcome Message */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-foreground">
              Welcome back, <span className="text-primary">{firstName}</span>
            </h1>
            <p className="text-sm text-muted-foreground">Let's find your dream job today</p>
          </div>
        </div>

        {/* Right - Profile Completeness, Notifications, Theme, Profile */}
        <div className="flex items-center gap-3">
          {/* Profile Completeness Circle */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
            <div className="relative w-8 h-8">
              <svg className="w-8 h-8 -rotate-90">
                <circle 
                  cx="16" cy="16" r="12" 
                  fill="none" 
                  stroke="hsl(var(--border))" 
                  strokeWidth="3" 
                />
                <circle 
                  cx="16" cy="16" r="12" 
                  fill="none" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth="3"
                  strokeDasharray={`${profileCompleteness * 0.75} 75`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
                {profileCompleteness}%
              </span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">Profile</span>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center font-semibold">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Button>

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon">
            <Moon className="w-5 h-5 text-muted-foreground" />
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="w-9 h-9 ring-2 ring-border">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
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
              <DropdownMenuItem asChild>
                <Link to={settingsPath} className="flex items-center gap-2 cursor-pointer">
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
