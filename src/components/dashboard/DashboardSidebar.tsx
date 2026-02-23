import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Home, Settings, LogOut, ChevronLeft
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

const SidebarButton = ({ item, activeItem, onItemClick, index }: { item: SidebarItem; activeItem: string | null; onItemClick: (v: string) => void; index: number }) => {
  const isActive = activeItem === item.value;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02, duration: 0.25 }}
          onClick={() => onItemClick(item.value)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group/item relative",
            isActive
              ? "bg-primary/12 text-primary border border-primary/20 shadow-[0_2px_12px_hsl(var(--primary)/0.1)]"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          {isActive && (
            <motion.div
              layoutId="sidebar-active-indicator"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            />
          )}
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
            isActive
              ? "bg-primary/15"
              : "bg-transparent group-hover/item:bg-muted"
          )}>
            <item.icon className={cn(
              "w-[17px] h-[17px] transition-colors",
              isActive ? "text-primary" : "text-muted-foreground group-hover/item:text-foreground"
            )} />
          </div>
          <span className="flex-1 text-left truncate">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                "min-w-[22px] h-[22px] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-destructive text-destructive-foreground"
              )}
            >
              {item.badge > 99 ? '99+' : item.badge}
            </motion.span>
          )}
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
    </Tooltip>
  );
};

const SectionLabel = ({ label }: { label: string }) => (
  <div className="px-3 pt-4 pb-1.5 flex items-center gap-2">
    <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-[0.12em]">{label}</span>
    <div className="flex-1 h-px bg-border/40" />
  </div>
);

const ACTIVITY_ITEMS = ['jobs', 'messages', 'chat', 'interviews', 'tasks', 'saved', 'recommended', 'candidates', 'drafts', 'career-buddy'];
const PROFILE_ITEMS = ['resume', 'audio-resume', 'ai-resume', 'profile', 'public-profile', 'company', 'analytics'];
const SETTINGS_ITEMS = ['notifications', 'alerts', 'security', 'upgrade-plan', 'salary-insights'];

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
  const activityItems = items.filter(i => ACTIVITY_ITEMS.includes(i.value));
  const profileItems = items.filter(i => PROFILE_ITEMS.includes(i.value));
  const settingsItems = items.filter(i => SETTINGS_ITEMS.includes(i.value));

  let globalIndex = 0;

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-50 w-[272px] transform transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "bg-card/90 backdrop-blur-2xl border-r border-border/40"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
                <img
                  src="/logo.png"
                  alt="Hire for Job"
                  className="w-7 h-7 rounded-lg object-contain"
                />
              </div>
              <div>
                <span className="font-bold text-foreground text-[17px] leading-none tracking-tight">Hire for Job</span>
                <p className="text-[10px] text-muted-foreground capitalize font-medium mt-0.5">{type}</p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-muted-foreground hover:bg-muted rounded-xl h-8 w-8"
              onClick={onClose}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* User Profile Card */}
          <div className="px-3 pb-3">
            <div className="rounded-2xl bg-gradient-to-br from-primary/8 via-primary/4 to-accent/6 p-3.5 border border-primary/10 relative overflow-hidden">
              {/* Decorative orb */}
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-primary/8 blur-2xl" />
              
              <div className="relative flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-11 h-11 ring-2 ring-primary/25 ring-offset-2 ring-offset-card shadow-md">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-sm">
                      {userName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[13px] text-foreground truncate leading-tight">{userName}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{userTitle || (type === 'candidate' ? 'Job Seeker' : 'Employer')}</p>
                </div>
              </div>
              {profileCompleteness > 0 && profileCompleteness < 100 && (
                <div className="mt-3 relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground font-medium">Profile Strength</span>
                    <span className={cn(
                      "text-[10px] font-bold",
                      profileCompleteness >= 70 ? "text-emerald-600 dark:text-emerald-400" : profileCompleteness >= 40 ? "text-amber-600 dark:text-amber-400" : "text-destructive"
                    )}>
                      {profileCompleteness}%
                    </span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-muted/80 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${profileCompleteness}%` }}
                      transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full",
                        profileCompleteness >= 70
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                          : profileCompleteness >= 40
                          ? "bg-gradient-to-r from-amber-500 to-amber-400"
                          : "bg-gradient-to-r from-destructive to-destructive/80"
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-2.5 overflow-y-auto scrollbar-thin">
            {/* Dashboard Home */}
            <div className="mb-1">
              <SidebarButton
                item={{ icon: Home, label: 'Dashboard', value: 'home' }}
                activeItem={activeItem === null ? 'home' : activeItem}
                onItemClick={onItemClick}
                index={0}
              />
            </div>

            {/* Activity Group */}
            {activityItems.length > 0 && (
              <div>
                <SectionLabel label="Activity" />
                {activityItems.map((item) => {
                  globalIndex++;
                  return (
                    <SidebarButton key={item.value} item={item} activeItem={activeItem} onItemClick={onItemClick} index={globalIndex} />
                  );
                })}
              </div>
            )}

            {/* Profile Group */}
            {profileItems.length > 0 && (
              <div>
                <SectionLabel label="Profile" />
                {profileItems.map((item) => {
                  globalIndex++;
                  return (
                    <SidebarButton key={item.value} item={item} activeItem={activeItem} onItemClick={onItemClick} index={globalIndex} />
                  );
                })}
              </div>
            )}

            {/* Settings Group */}
            {settingsItems.length > 0 && (
              <div>
                <SectionLabel label="Settings" />
                {settingsItems.map((item) => {
                  globalIndex++;
                  return (
                    <SidebarButton key={item.value} item={item} activeItem={activeItem} onItemClick={onItemClick} index={globalIndex} />
                  );
                })}
              </div>
            )}
          </nav>

          {/* CTA Button */}
          <div className="p-3">
            {type === 'candidate' ? (
              <Link to="/" className="block">
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 border-primary/25 text-primary hover:bg-primary/8 h-10 rounded-xl font-medium text-[13px]"
                >
                  <Home className="w-4 h-4 shrink-0" />
                  Find Jobs on Map
                </Button>
              </Link>
            ) : (
              <Link to="/post-job" className="block">
                <Button className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90 gap-2 h-10 rounded-xl shadow-lg shadow-primary/15 font-medium text-[13px]">
                  <Home className="w-4 h-4 shrink-0" />
                  Post New Job
                </Button>
              </Link>
            )}
          </div>

          {/* Footer */}
          <div className="px-2.5 pb-3 pt-1 border-t border-border/40 space-y-0.5">
            <Link
              to={type === 'employer' ? '/employer-settings' : '/candidate-settings'}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:bg-muted transition-all">
                <Settings className="w-[17px] h-[17px] shrink-0" />
              </div>
              <span>Settings</span>
            </Link>
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/8 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:bg-destructive/10 transition-all">
                <LogOut className="w-[17px] h-[17px] shrink-0" />
              </div>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
