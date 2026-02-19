import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Home, Briefcase, FileText, Bell, Shield, MessageSquare, 
  Settings, LogOut, MapPin, Building2, Plus, Calendar,
  Bookmark, User, ChevronLeft, Users
} from 'lucide-react';

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  value: string;
  badge?: number;
}

interface DashboardSidebarProps {
  type: 'candidate' | 'employer';
  items: SidebarItem[];
  activeItem: string | null;
  onItemClick: (value: string) => void;
  userName: string;
  userTitle?: string;
  avatarUrl?: string | null;
  onSignOut: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const DashboardSidebar = ({
  type,
  items,
  activeItem,
  onItemClick,
  userName,
  userTitle,
  avatarUrl,
  onSignOut,
  isOpen,
  onClose
}: DashboardSidebarProps) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed top-0 left-0 h-full z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "bg-card border-r border-border"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 flex items-center justify-between border-b">
            <Link to="/" className="flex items-center gap-2.5">
              <img 
                src="/logo.png" 
                alt="Hire for Job" 
                className="w-9 h-9 rounded-xl object-contain"
              />
              <div>
                <span className="font-bold text-foreground text-lg leading-none">Hire for Job</span>
                <p className="text-xs text-muted-foreground capitalize">{type}</p>
              </div>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden text-muted-foreground hover:bg-muted"
              onClick={onClose}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-2 sm:p-3 space-y-0.5 sm:space-y-1 overflow-y-auto">
            {/* Dashboard Home */}
            <button
              onClick={() => onItemClick('home')}
              className={cn(
                "w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm font-medium transition-all duration-200 touch-target-sm touch-scale",
                activeItem === null || activeItem === 'home'
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted active:bg-muted hover:text-foreground"
              )}
            >
              <Home className="w-5 h-5 shrink-0" />
              <span>Dashboard</span>
            </button>

            {/* Dynamic Menu Items */}
            {items.map((item) => (
              <button
                key={item.value}
                onClick={() => onItemClick(item.value)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm font-medium transition-all duration-200 touch-target-sm touch-scale",
                  activeItem === item.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted active:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-semibold shrink-0",
                    activeItem === item.value 
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  )}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Employer View / Find Jobs Button */}
          <div className="p-2 sm:p-3 border-t">
            {type === 'candidate' ? (
              <Link to="/" className="block">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 border-primary text-primary hover:bg-primary/10 touch-target-sm touch-scale h-10 sm:h-11"
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">Find Jobs on Map</span>
                </Button>
              </Link>
            ) : (
              <Link to="/post-job" className="block">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 touch-target-sm touch-scale h-10 sm:h-11">
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="truncate">Post New Job</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Footer Links */}
          <div className="p-2 sm:p-3 border-t space-y-0.5 sm:space-y-1">
            <Link 
              to={type === 'employer' ? '/company-profile' : '/candidate-settings'}
              className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted active:bg-muted hover:text-foreground transition-all touch-target-sm touch-scale"
            >
              <Settings className="w-5 h-5 shrink-0" />
              <span>Settings</span>
            </Link>
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 active:bg-destructive/15 transition-all touch-target-sm touch-scale"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span>Logout</span>
            </button>
          </div>

          {/* Collapse Button - Desktop only */}
          <div className="p-2 sm:p-3 border-t hidden lg:block pb-[env(safe-area-inset-bottom)]">
            <button className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-all">
              <ChevronLeft className="w-5 h-5 shrink-0" />
              <span>Collapse</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
