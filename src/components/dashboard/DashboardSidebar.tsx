import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Home, Briefcase, FileText, Bell, Shield, MessageSquare,
  Settings, LogOut, MapPin, Building2, Plus, Calendar,
  Bookmark, User, ChevronLeft, Users, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  profileCompleteness?: number;
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
  onClose,
  profileCompleteness = 0
}: DashboardSidebarProps) => {
  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-50 w-72 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "bg-card border-r border-border"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 flex items-center justify-between border-b">
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

          {/* User Profile Card */}
          <div className="p-3 border-b">
            <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-11 h-11 ring-2 ring-primary/30 ring-offset-2 ring-offset-card">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                    {userName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{userTitle || 'Job Seeker'}</p>
                </div>
              </div>
              {profileCompleteness > 0 && profileCompleteness < 100 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground font-medium">Profile</span>
                    <span className="text-[10px] font-bold text-primary">{profileCompleteness}%</span>
                  </div>
                  <Progress value={profileCompleteness} className="h-1.5" />
                </div>
              )}
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {/* Dashboard Home */}
            <button
              onClick={() => onItemClick('home')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                activeItem === null || activeItem === 'home'
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Home className="w-4.5 h-4.5 shrink-0" />
              <span>Dashboard</span>
            </button>

            {/* Grouped Menu Items */}
            <div className="pt-1">
              <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Activity</p>
              {items.filter(i => ['jobs', 'messages', 'chat', 'interviews', 'tasks', 'saved', 'recommended', 'candidates', 'drafts'].includes(i.value)).map((item) => (
                <SidebarButton key={item.value} item={item} activeItem={activeItem} onItemClick={onItemClick} />
              ))}
            </div>

            <div className="pt-1">
              <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Profile</p>
              {items.filter(i => ['resume', 'audio-resume', 'ai-resume', 'profile', 'public-profile', 'company', 'analytics'].includes(i.value)).map((item) => (
                <SidebarButton key={item.value} item={item} activeItem={activeItem} onItemClick={onItemClick} />
              ))}
            </div>

            <div className="pt-1">
              <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Settings</p>
              {items.filter(i => ['notifications', 'alerts', 'security', 'upgrade-plan'].includes(i.value)).map((item) => (
                <SidebarButton key={item.value} item={item} activeItem={activeItem} onItemClick={onItemClick} />
              ))}
            </div>
          </nav>

          {/* CTA Button */}
          <div className="p-3 border-t">
            {type === 'candidate' ? (
              <Link to="/" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 border-primary/30 text-primary hover:bg-primary/10 h-10 rounded-xl"
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">Find Jobs on Map</span>
                </Button>
              </Link>
            ) : (
              <Link to="/post-job" className="block">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-10 rounded-xl">
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="truncate">Post New Job</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t space-y-0.5">
            <Link
              to={type === 'employer' ? '/employer-settings' : '/candidate-settings'}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <Settings className="w-4.5 h-4.5 shrink-0" />
              <span>Settings</span>
            </Link>
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
            >
              <LogOut className="w-4.5 h-4.5 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

const SidebarButton = ({ item, activeItem, onItemClick }: { item: SidebarItem; activeItem: string | null; onItemClick: (v: string) => void }) => (
  <button
    onClick={() => onItemClick(item.value)}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
      activeItem === item.value
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    )}
  >
    <item.icon className="w-4.5 h-4.5 shrink-0" />
    <span className="flex-1 text-left truncate">{item.label}</span>
    {item.badge !== undefined && item.badge > 0 && (
      <span className={cn(
        "min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0",
        activeItem === item.value
          ? "bg-primary-foreground/20 text-primary-foreground"
          : "bg-destructive text-destructive-foreground"
      )}>
        {item.badge > 99 ? '99+' : item.badge}
      </span>
    )}
  </button>
);
