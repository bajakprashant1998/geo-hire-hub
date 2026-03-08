import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Home, Settings, LogOut, ChevronLeft, ChevronDown, Search, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  value: string;
  badge?: number;
}

interface SidebarGroup {
  label: string;
  items: string[];
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

const CANDIDATE_GROUPS: SidebarGroup[] = [
  { label: 'Job Search', items: ['map', 'job-radar', 'jobs', 'saved', 'recommended', 'auto-apply', 'compare-jobs'] },
  { label: 'Communication', items: ['messages', 'interviews', 'tasks', 'follow-ups', 'availability'] },
  { label: 'Career Tools', items: ['career-buddy', 'app-tracker', 'salary-insights', 'interview-prep', 'skill-gap', 'career-path', 'culture-match', 'market-value'] },
  { label: 'Profile & Docs', items: ['resume', 'audio-resume', 'ai-resume', 'profile', 'public-profile', 'badges', 'referrals'] },
  { label: 'Settings', items: ['notifications', 'alerts', 'security', 'smart-digest', 'leaderboard', 'assessments'] },
];

const EMPLOYER_GROUPS: SidebarGroup[] = [
  { label: 'Jobs & Hiring', items: ['jobs', 'candidates', 'drafts', 'post-job'] },
  { label: 'Communication', items: ['chat', 'interviews', 'tasks'] },
  { label: 'AI & Analytics', items: ['ai-screening', 'analytics', 'jd-optimizer', 'ab-testing'] },
  { label: 'Company', items: ['company', 'spotlight', 'offer-letters', 'compare-candidates', 'talent-pool'] },
  { label: 'Settings', items: ['notifications', 'security', 'upgrade-plan'] },
];

const SidebarButton = ({ item, isActive, onItemClick }: { item: SidebarItem; isActive: boolean; onItemClick: (v: string) => void }) => (
  <button
    onClick={() => onItemClick(item.value)}
    className={cn(
      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 group/item relative",
      isActive
        ? "bg-primary/10 text-primary shadow-sm"
        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
    )}
  >
    {isActive && (
      <motion.div
        layoutId="sidebar-active"
        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary"
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      />
    )}
    <div className={cn(
      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
      isActive ? "bg-primary/15" : "bg-transparent group-hover/item:bg-muted/80"
    )}>
      <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground group-hover/item:text-foreground")} />
    </div>
    <span className="flex-1 text-left truncate">{item.label}</span>
    {item.badge !== undefined && item.badge > 0 && (
      <span className={cn(
        "min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0",
        isActive ? "bg-primary text-primary-foreground" : "bg-destructive/90 text-white"
      )}>
        {item.badge > 99 ? '99+' : item.badge}
      </span>
    )}
  </button>
);

const CollapsibleGroup = ({ label, items, activeItem, onItemClick, defaultOpen = false }: {
  label: string;
  items: SidebarItem[];
  activeItem: string | null;
  onItemClick: (v: string) => void;
  defaultOpen?: boolean;
}) => {
  const hasActive = items.some(i => i.value === activeItem);
  const [isOpen, setIsOpen] = useState(defaultOpen || hasActive);
  const totalBadge = items.reduce((sum, i) => sum + (i.badge || 0), 0);

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-1.5 group hover:bg-muted/30 rounded-lg transition-colors"
      >
        <ChevronDown className={cn("w-3 h-3 text-muted-foreground/50 transition-transform duration-200", !isOpen && "-rotate-90")} />
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.1em] flex-1 text-left">{label}</span>
        {!isOpen && totalBadge > 0 && (
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 py-0.5">
              {items.map((item) => (
                <SidebarButton key={item.value} item={item} isActive={activeItem === item.value} onItemClick={onItemClick} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
  const [searchQuery, setSearchQuery] = useState('');
  const groups = type === 'candidate' ? CANDIDATE_GROUPS : EMPLOYER_GROUPS;

  const itemMap = useMemo(() => {
    const map = new Map<string, SidebarItem>();
    items.forEach(i => map.set(i.value, i));
    return map;
  }, [items]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groups.map(g => ({
        ...g,
        resolvedItems: g.items.map(v => itemMap.get(v)).filter(Boolean) as SidebarItem[],
      })).filter(g => g.resolvedItems.length > 0);
    }
    const q = searchQuery.toLowerCase();
    const allFiltered = items.filter(i => i.label.toLowerCase().includes(q));
    return [{ label: 'Search Results', items: allFiltered.map(i => i.value), resolvedItems: allFiltered }];
  }, [searchQuery, groups, items, itemMap]);

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-50 w-[264px] transform transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "bg-card/95 backdrop-blur-2xl border-r border-border/30"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-3 flex items-center justify-between border-b border-border/20">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
                <img src="/logo.png" alt="Hire for Job" className="w-6 h-6 rounded-lg object-contain" />
              </div>
              <span className="font-bold text-foreground text-[15px] tracking-tight">Hire for Job</span>
            </Link>
            <Button variant="ghost" size="icon" className="lg:hidden h-7 w-7 rounded-lg" onClick={onClose}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* User Card */}
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Avatar className="w-9 h-9 ring-2 ring-primary/20 ring-offset-1 ring-offset-card">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-xs">
                    {userName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-[1.5px] border-card" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-xs text-foreground truncate">{userName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{userTitle || (type === 'candidate' ? 'Job Seeker' : 'Employer')}</p>
              </div>
              {profileCompleteness > 0 && profileCompleteness < 100 && (
                <div className="relative w-8 h-8 shrink-0">
                  <svg className="w-8 h-8 -rotate-90">
                    <circle cx="50%" cy="50%" r="12" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
                    <circle
                      cx="50%" cy="50%" r="12" fill="none"
                      stroke={profileCompleteness >= 70 ? 'hsl(var(--primary))' : profileCompleteness >= 40 ? 'hsl(44,98%,50%)' : 'hsl(var(--destructive))'}
                      strokeWidth="2"
                      strokeDasharray={`${profileCompleteness * 0.754} 75.4`}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-foreground">
                    {profileCompleteness}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu..."
                className="h-8 pl-8 pr-8 text-xs rounded-lg bg-muted/40 border-border/30 focus-visible:ring-primary/30"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-2">
            {/* Dashboard Home */}
            <div className="mb-1 px-0.5">
              <SidebarButton
                item={{ icon: Home, label: 'Dashboard', value: 'home' } as SidebarItem}
                isActive={activeItem === null || activeItem === 'home'}
                onItemClick={onItemClick}
              />
            </div>

            {/* Groups */}
            {filteredGroups.map((group, i) => (
              <CollapsibleGroup
                key={group.label}
                label={group.label}
                items={group.resolvedItems}
                activeItem={activeItem}
                onItemClick={onItemClick}
                defaultOpen={i < 2}
              />
            ))}
          </ScrollArea>

          {/* Footer */}
          <div className="px-2.5 pb-3 pt-2 border-t border-border/20 space-y-0.5">
            {type === 'candidate' && (
              <Link to="/" className="block">
                <Button variant="outline" size="sm" className="w-full justify-center gap-2 border-primary/20 text-primary hover:bg-primary/5 h-8 rounded-xl text-xs font-medium">
                  <Home className="w-3.5 h-3.5" />
                  Find Jobs on Map
                </Button>
              </Link>
            )}
            <div className="flex gap-1 mt-1">
              {type !== 'employer' && (
                <Link to="/candidate-settings" className="flex-1">
                  <Button variant="ghost" size="sm" className="w-full h-8 text-xs text-muted-foreground rounded-lg gap-1.5">
                    <Settings className="w-3.5 h-3.5" />
                    Settings
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={onSignOut} className="flex-1 h-8 text-xs text-destructive hover:bg-destructive/5 rounded-lg gap-1.5">
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};