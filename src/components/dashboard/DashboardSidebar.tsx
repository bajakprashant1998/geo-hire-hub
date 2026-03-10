import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Home, Settings, LogOut, ChevronLeft, ChevronDown, Search, X, Sparkles,
  Plus, ArrowUpRight, Zap, Crown
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
  planName?: string;
}

const CANDIDATE_GROUPS: SidebarGroup[] = [
  { label: 'Job Search', items: ['map', 'job-radar', 'jobs', 'saved', 'recommended', 'auto-apply', 'compare-jobs', 'watchlist'] },
  { label: 'Communication', items: ['messages', 'interviews', 'tasks', 'follow-ups', 'availability'] },
  { label: 'Career Tools', items: ['career-buddy', 'app-tracker', 'salary-insights', 'interview-prep', 'skill-gap', 'career-path', 'culture-match', 'market-value'] },
  { label: 'Profile & Docs', items: ['resume', 'audio-resume', 'ai-resume', 'profile', 'public-profile', 'portfolio', 'badges', 'referrals'] },
  { label: 'Settings', items: ['notifications', 'alerts', 'security', 'smart-digest', 'leaderboard', 'assessments'] },
];

const EMPLOYER_GROUPS: SidebarGroup[] = [
  { label: 'Jobs & Hiring', items: ['jobs', 'candidates', 'drafts', 'post-job', 'bulk-import'] },
  { label: 'Communication', items: ['chat', 'interviews', 'tasks', 'team-notes', 'team-workflows'] },
  { label: 'AI & Analytics', items: ['ai-screening', 'analytics', 'jd-optimizer', 'ab-testing'] },
  { label: 'Company', items: ['company', 'branding', 'spotlight', 'offer-letters', 'compare-candidates', 'talent-pool'] },
  { label: 'Team & Settings', items: ['team', 'notifications', 'security', 'upgrade-plan'] },
];

const HIGHLIGHTED_ITEMS: Record<string, { bg: string; iconColor: string; activeBg: string }> = {
  'career-buddy': { bg: 'bg-violet-500/8', iconColor: 'text-violet-500', activeBg: 'bg-violet-500/15' },
  'skill-gap': { bg: 'bg-orange-500/8', iconColor: 'text-orange-500', activeBg: 'bg-orange-500/15' },
  'interview-prep': { bg: 'bg-emerald-500/8', iconColor: 'text-emerald-500', activeBg: 'bg-emerald-500/15' },
  'ai-resume': { bg: 'bg-cyan-500/8', iconColor: 'text-cyan-500', activeBg: 'bg-cyan-500/15' },
  'auto-apply': { bg: 'bg-blue-500/8', iconColor: 'text-blue-500', activeBg: 'bg-blue-500/15' },
  'market-value': { bg: 'bg-pink-500/8', iconColor: 'text-pink-500', activeBg: 'bg-pink-500/15' },
  'salary-insights': { bg: 'bg-amber-500/8', iconColor: 'text-amber-500', activeBg: 'bg-amber-500/15' },
  'ai-screening': { bg: 'bg-violet-500/8', iconColor: 'text-violet-500', activeBg: 'bg-violet-500/15' },
  'jd-optimizer': { bg: 'bg-cyan-500/8', iconColor: 'text-cyan-500', activeBg: 'bg-cyan-500/15' },
  'analytics': { bg: 'bg-blue-500/8', iconColor: 'text-blue-500', activeBg: 'bg-blue-500/15' },
  'ab-testing': { bg: 'bg-orange-500/8', iconColor: 'text-orange-500', activeBg: 'bg-orange-500/15' },
  'compare-candidates': { bg: 'bg-teal-500/8', iconColor: 'text-teal-500', activeBg: 'bg-teal-500/15' },
};

const SidebarButton = ({ item, isActive, onItemClick }: { item: SidebarItem; isActive: boolean; onItemClick: (v: string) => void }) => {
  const highlight = HIGHLIGHTED_ITEMS[item.value];
  
  return (
    <button
      onClick={() => onItemClick(item.value)}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 group/item relative",
        isActive
          ? highlight
            ? `${highlight.activeBg} ${highlight.iconColor} shadow-sm`
            : "bg-primary/10 text-primary shadow-sm shadow-primary/5"
          : highlight
            ? `text-muted-foreground hover:${highlight.bg} hover:text-foreground`
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full",
            highlight ? highlight.iconColor.replace('text-', 'bg-') : "bg-primary"
          )}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        />
      )}
      <div className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
        isActive 
          ? highlight ? `${highlight.activeBg}` : "bg-primary/15" 
          : highlight ? `${highlight.bg}` : "bg-transparent group-hover/item:bg-muted/80"
      )}>
        <item.icon className={cn(
          "w-4 h-4 transition-colors",
          isActive 
            ? highlight ? highlight.iconColor : "text-primary" 
            : highlight ? highlight.iconColor : "text-muted-foreground group-hover/item:text-foreground"
        )} />
      </div>
      <span className="flex-1 text-left truncate">{item.label}</span>
      {highlight && !isActive && (
        <Sparkles className={cn("w-3 h-3 opacity-40", highlight.iconColor)} />
      )}
      {item.badge !== undefined && item.badge > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            "min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0",
            isActive ? "bg-primary text-primary-foreground" : "bg-destructive/90 text-white"
          )}
        >
          {item.badge > 99 ? '99+' : item.badge}
        </motion.span>
      )}
    </button>
  );
};

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
    <div className="mb-0.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 group hover:bg-muted/30 rounded-lg transition-colors"
      >
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
        </motion.div>
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.1em] flex-1 text-left">{label}</span>
        {!isOpen && totalBadge > 0 && (
          <span className="min-w-[16px] h-4 px-1 rounded-full bg-destructive/80 text-white text-[9px] font-bold flex items-center justify-center">
            {totalBadge > 9 ? '9+' : totalBadge}
          </span>
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

/* ── Quick Action Button (employer-only) ── */
const QuickAction = ({ icon: Icon, label, onClick, variant = 'default' }: {
  icon: React.ElementType; label: string; onClick: () => void; variant?: 'default' | 'primary';
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={onClick}
        className={cn(
          "flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-semibold transition-all duration-200",
          variant === 'primary'
            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
            : "bg-muted/50 text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-border/30"
        )}
      >
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </button>
    </TooltipTrigger>
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
);

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
  profileCompleteness = 0,
  planName
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

  const completenessColor = profileCompleteness >= 80 ? 'bg-success' : profileCompleteness >= 50 ? 'bg-warning' : 'bg-destructive';
  const completenessLabel = profileCompleteness >= 80 ? 'Strong' : profileCompleteness >= 50 ? 'Good' : 'Incomplete';

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
          "fixed top-0 left-0 h-full z-50 w-[272px] transform transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "bg-card/95 backdrop-blur-2xl border-r border-border/30"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header / Brand */}
          <div className="p-3 flex items-center justify-between border-b border-border/20">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20 group-hover:shadow-lg group-hover:shadow-primary/30 transition-shadow">
                <img src="/logo.png" alt="Hire for Job" className="w-6 h-6 rounded-lg object-contain" />
              </div>
              <div>
                <span className="font-bold text-foreground text-[15px] tracking-tight block leading-tight">Hire for Job</span>
                {type === 'employer' && planName && (
                  <span className="text-[9px] font-semibold text-primary/70 uppercase tracking-wider">{planName}</span>
                )}
              </div>
            </Link>
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 rounded-lg hover:bg-muted/60" onClick={onClose}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* User Card */}
          <div className="px-3 py-3">
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/20">
              <div className="relative">
                <Avatar className="w-10 h-10 ring-2 ring-primary/20 ring-offset-1 ring-offset-card">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-xs">
                    {userName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-foreground truncate leading-tight">{userName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{userTitle || (type === 'candidate' ? 'Job Seeker' : 'Employer')}</p>
                {profileCompleteness > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-border/50 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${profileCompleteness}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                        className={cn("h-full rounded-full", completenessColor)}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground tabular-nums">{profileCompleteness}%</span>
                  </div>
                )}
                {profileCompleteness > 0 && profileCompleteness < 80 && (
                  <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                    Profile: <span className={cn("font-semibold", profileCompleteness >= 50 ? "text-warning" : "text-destructive")}>{completenessLabel}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Employer Quick Actions */}
          {type === 'employer' && (
            <div className="px-3 pb-2">
              <div className="flex gap-1.5">
                <QuickAction icon={Plus} label="Post Job" onClick={() => onItemClick('post-job')} variant="primary" />
                <QuickAction icon={Search} label="Find Talent" onClick={() => onItemClick('candidates')} />
                <QuickAction icon={Zap} label="AI Screen" onClick={() => onItemClick('ai-screening')} />
              </div>
            </div>
          )}

          {/* Search */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu..."
                className="h-9 pl-8 pr-8 text-xs rounded-xl bg-muted/40 border-border/30 focus-visible:ring-primary/30 placeholder:text-muted-foreground/40"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-muted/60 transition-colors">
                  <X className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-foreground" />
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
          <div className="px-3 pb-3 pt-2 border-t border-border/20 space-y-2">
            {/* Upgrade CTA for employer */}
            {type === 'employer' && (
              <button
                onClick={() => onItemClick('upgrade-plan')}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 hover:border-primary/40 transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Crown className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[11px] font-semibold text-foreground">Upgrade Plan</p>
                  <p className="text-[9px] text-muted-foreground truncate">Unlock more features</p>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-primary/60 group-hover:text-primary transition-colors shrink-0" />
              </button>
            )}

            {type === 'candidate' && (
              <Link to="/" className="block">
                <Button variant="outline" size="sm" className="w-full justify-center gap-2 border-primary/20 text-primary hover:bg-primary/5 h-9 rounded-xl text-xs font-semibold group">
                  <Sparkles className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  Find Jobs on Map
                </Button>
              </Link>
            )}

            <div className="flex gap-1.5">
              {type !== 'employer' && (
                <Link to="/candidate-settings" className="flex-1">
                  <Button variant="ghost" size="sm" className="w-full h-9 text-xs text-muted-foreground rounded-xl gap-1.5 hover:bg-muted/50">
                    <Settings className="w-3.5 h-3.5" />
                    Settings
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={onSignOut} className={cn("h-9 text-xs text-destructive hover:bg-destructive/5 rounded-xl gap-1.5", type === 'employer' ? 'flex-1' : 'flex-1')}>
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
