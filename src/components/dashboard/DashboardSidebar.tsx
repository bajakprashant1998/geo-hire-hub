import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Home, Briefcase, FileText, Bell, Shield, Users, Star, 
  Settings, LogOut, MapPin, Building2, Plus, CreditCard,
  BarChart3, BookOpen, ChevronLeft
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
  const themeColor = type === 'employer' ? 'emerald' : 'blue';

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
          type === 'employer' 
            ? "bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-900" 
            : "bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Close Button */}
          <div className="p-5 flex items-center justify-between border-b border-white/10">
            <Link to="/" className="flex items-center gap-2">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shadow-lg",
                type === 'employer' 
                  ? "bg-white/20" 
                  : "bg-white/20"
              )}>
                {type === 'employer' ? (
                  <Building2 className="w-5 h-5 text-white" />
                ) : (
                  <MapPin className="w-5 h-5 text-white" />
                )}
              </div>
              <span className="font-bold text-white text-lg">Hire for Job</span>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden text-white hover:bg-white/10"
              onClick={onClose}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </div>

          {/* User Profile Mini */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-white/20">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className={cn(
                  "text-white font-semibold",
                  type === 'employer' ? "bg-emerald-600" : "bg-blue-600"
                )}>
                  {userName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate text-sm">{userName}</p>
                {userTitle && (
                  <p className="text-white/60 text-xs truncate">{userTitle}</p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {/* Dashboard Home */}
            <button
              onClick={() => onItemClick('home')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                activeItem === null || activeItem === 'home'
                  ? "bg-white/20 text-white shadow-lg"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
            </button>

            {/* Dynamic Menu Items */}
            {items.map((item) => (
              <button
                key={item.value}
                onClick={() => onItemClick(item.value)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  activeItem === item.value
                    ? "bg-white/20 text-white shadow-lg"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-semibold">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}

            {/* Post Job Button for Employers */}
            {type === 'employer' && (
              <Link to="/post-job" className="block mt-4">
                <Button className="w-full bg-white text-emerald-700 hover:bg-white/90 rounded-xl font-semibold shadow-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Post New Job
                </Button>
              </Link>
            )}
          </nav>

          {/* Footer Links */}
          <div className="p-3 border-t border-white/10 space-y-1">
            <Link 
              to={type === 'employer' ? '/company-profile' : '/candidate-settings'}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Link>
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
