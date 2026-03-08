import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Bell, Briefcase, MessageSquare, Calendar, Star, Clock, ChevronDown, ChevronUp,
  Loader2, Sparkles, CheckCheck, Trash2, Zap, Eye, Filter, MailOpen,
  TrendingUp, AlertCircle, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { isToday, isYesterday, format, formatDistanceToNow, differenceInHours } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; iconBg: string; color: string; priority: number }> = {
  interview: { label: 'Interviews', icon: Calendar, iconBg: 'bg-primary/10', color: 'text-primary', priority: 1 },
  application: { label: 'Applications', icon: Briefcase, iconBg: 'bg-[hsl(217,89%,61%)]/10', color: 'text-[hsl(217,89%,61%)]', priority: 2 },
  match: { label: 'Job Matches', icon: Zap, iconBg: 'bg-success/10', color: 'text-success', priority: 3 },
  message: { label: 'Messages', icon: MessageSquare, iconBg: 'bg-[hsl(262,83%,58%)]/10', color: 'text-[hsl(262,83%,58%)]', priority: 4 },
  other: { label: 'Other', icon: Bell, iconBg: 'bg-muted/50', color: 'text-muted-foreground', priority: 5 },
};

function categorize(type: string): string {
  if (type.includes('interview')) return 'interview';
  if (type.includes('match')) return 'match';
  if (type.includes('application') || type === 'shortlisted' || type === 'rejected' || type === 'viewed') return 'application';
  if (type.includes('message')) return 'message';
  return 'other';
}

function groupByDate(items: Notification[]): { label: string; items: Notification[] }[] {
  const groups: Record<string, Notification[]> = {};
  items.forEach(n => {
    const d = new Date(n.created_at);
    const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMM d, yyyy');
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

/* ── Stats Summary ── */
const StatPill = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) => (
  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-muted/20 border border-border/30 min-w-[120px]">
    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', color.replace('text-', 'bg-') + '/10')}>
      <Icon className={cn('w-4 h-4', color)} />
    </div>
    <div>
      <p className="text-lg font-extrabold text-foreground leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
    </div>
  </div>
);

/* ── Urgent Banner ── */
const UrgentBanner = ({ items }: { items: Notification[] }) => {
  if (items.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 p-3 rounded-xl bg-warning/10 border border-warning/20"
    >
      <div className="w-7 h-7 rounded-lg bg-warning/20 flex items-center justify-center shrink-0 mt-0.5">
        <AlertCircle className="w-4 h-4 text-warning-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">
          {items.length} urgent notification{items.length > 1 ? 's' : ''}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {items[0].title}{items.length > 1 ? ` and ${items.length - 1} more` : ''}
        </p>
      </div>
    </motion.div>
  );
};

/* ── Notification Item ── */
const NotificationItem = ({ n, onMarkRead }: { n: Notification; onMarkRead: (id: string) => void }) => {
  const cat = categorize(n.type);
  const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
  const Icon = config.icon;
  const timeAgo = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0 }}
      className={cn(
        'group flex items-start gap-3 p-3 rounded-xl transition-all cursor-default',
        !n.is_read ? 'bg-primary/5 border border-primary/10' : 'hover:bg-muted/30 border border-transparent'
      )}
    >
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5', config.iconBg)}>
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className={cn('text-sm line-clamp-1', !n.is_read ? 'font-bold text-foreground' : 'font-medium text-foreground/80')}>
                {n.title}
              </p>
              {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> {timeAgo}
          </span>
          <Badge variant="outline" className={cn('text-[9px] h-4 px-1.5 border-0', config.iconBg, config.color)}>
            {config.label}
          </Badge>
          {!n.is_read && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkRead(n.id); }}
              className="text-[10px] text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 hover:underline"
            >
              <Eye className="w-3 h-3" /> Mark read
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ── Category Group (Digest view) ── */
const CategoryGroup = ({
  category,
  items,
  isExpanded,
  onToggle,
  onMarkGroupRead,
}: {
  category: string;
  items: Notification[];
  isExpanded: boolean;
  onToggle: () => void;
  onMarkGroupRead: (ids: string[]) => void;
}) => {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
  const Icon = config.icon;
  const unread = items.filter(n => !n.is_read).length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/40 overflow-hidden bg-card/70"
    >
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-3.5 hover:bg-muted/30 transition-colors">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', config.iconBg)}>
          <Icon className={cn('w-5 h-5', config.color)} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{config.label}</span>
            {unread > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5 px-1.5 animate-pulse">
                {unread} new
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{items.length} notification{items.length > 1 ? 's' : ''}</p>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30 p-2 space-y-1">
              {unread > 0 && (
                <div className="flex justify-end px-2 py-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 gap-1 text-primary"
                    onClick={(e) => { e.stopPropagation(); onMarkGroupRead(items.filter(n => !n.is_read).map(n => n.id)); }}
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </Button>
                </div>
              )}
              {items.slice(0, 6).map(n => (
                <div
                  key={n.id}
                  className={cn('p-2.5 rounded-lg text-sm', !n.is_read && 'bg-primary/5')}
                >
                  <p className={cn('line-clamp-1', !n.is_read ? 'font-semibold text-foreground' : 'text-foreground/80')}>{n.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground line-clamp-1 flex-1">{n.message}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
              {items.length > 6 && (
                <p className="text-xs text-muted-foreground text-center py-2 font-medium">+{items.length - 6} more</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ── Empty State ── */
const EmptyState = () => (
  <div className="text-center py-16 px-6">
    <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
      <Bell className="w-8 h-8 text-muted-foreground/30" />
    </div>
    <h3 className="text-base font-bold text-foreground mb-1">All caught up!</h3>
    <p className="text-sm text-muted-foreground max-w-xs mx-auto">No notifications yet. We'll alert you about job matches, applications, and messages.</p>
  </div>
);

/* ── Main Component ── */
export const SmartNotificationDigest = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('digest');

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    const { data } = await supabase
      .from('notifications').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(200);
    setNotifications(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel('smart-digest-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications(prev => [payload.new as Notification, ...prev]))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  const totalUnread = notifications.filter(n => !n.is_read).length;
  const todayCount = notifications.filter(n => isToday(new Date(n.created_at))).length;

  const urgentItems = useMemo(() =>
    notifications.filter(n => {
      const hours = differenceInHours(new Date(), new Date(n.created_at));
      return hours < 4 && !n.is_read && (n.type.includes('interview') || n.type === 'shortlisted');
    }), [notifications]);

  const digestGroups = useMemo(() => {
    const grouped: Record<string, Notification[]> = {};
    notifications.forEach(n => {
      const cat = categorize(n.type);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(n);
    });
    return Object.entries(grouped)
      .map(([cat, items]) => ({ category: cat, items }))
      .sort((a, b) => (CATEGORY_CONFIG[a.category]?.priority ?? 99) - (CATEGORY_CONFIG[b.category]?.priority ?? 99));
  }, [notifications]);

  const dateGroups = useMemo(() => groupByDate(notifications), [notifications]);

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', ids);
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n));
  };

  const markAllRead = () => markRead(notifications.filter(n => !n.is_read).map(n => n.id));

  const clearAll = async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setNotifications([]);
  };

  if (loading) {
    return (
      <Card className="border border-border/40 shadow-xl bg-card/50 backdrop-blur-2xl rounded-2xl">
        <CardContent className="p-12 flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your digest…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/40 shadow-xl overflow-hidden bg-card/50 backdrop-blur-2xl relative rounded-2xl">
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-success/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 p-4 sm:p-5 border-b border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-success/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl relative">
              <Sparkles className="w-5 h-5 text-primary" />
              {totalUnread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center font-bold animate-pulse">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-foreground">Smart Digest</h2>
              <p className="text-xs text-muted-foreground">Notifications grouped by priority & time</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => fetchNotifications(true)} disabled={refreshing}>
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            </Button>
            {totalUnread > 0 && (
              <Button variant="ghost" size="sm" className="h-8 rounded-xl text-xs gap-1 text-primary" onClick={markAllRead}>
                <CheckCheck className="w-3.5 h-3.5" /> Read all
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <StatPill icon={Bell} label="Total" value={notifications.length} color="text-foreground" />
          <StatPill icon={MailOpen} label="Unread" value={totalUnread} color="text-primary" />
          <StatPill icon={TrendingUp} label="Today" value={todayCount} color="text-success" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Urgent Banner */}
        {urgentItems.length > 0 && (
          <div className="px-4 pt-3">
            <UrgentBanner items={urgentItems} />
          </div>
        )}

        {/* Tabs */}
        <div className="px-4 pt-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3 h-9 bg-muted/30 rounded-xl p-0.5">
              <TabsTrigger value="digest" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1">
                <Filter className="w-3.5 h-3.5" /> By Category
              </TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1">
                <Clock className="w-3.5 h-3.5" /> Timeline
              </TabsTrigger>
              <TabsTrigger value="unread" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1">
                <Star className="w-3.5 h-3.5" /> Unread
                {totalUnread > 0 && <Badge variant="destructive" className="text-[9px] h-4 px-1 ml-0.5">{totalUnread}</Badge>}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[420px] mt-3">
              {/* Digest View */}
              <TabsContent value="digest" className="mt-0">
                {notifications.length === 0 ? <EmptyState /> : (
                  <div className="space-y-2 pb-4">
                    {digestGroups.map(g => (
                      <CategoryGroup
                        key={g.category}
                        category={g.category}
                        items={g.items}
                        isExpanded={expandedGroups.has(g.category)}
                        onToggle={() => setExpandedGroups(prev => {
                          const next = new Set(prev);
                          next.has(g.category) ? next.delete(g.category) : next.add(g.category);
                          return next;
                        })}
                        onMarkGroupRead={markRead}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Timeline View */}
              <TabsContent value="timeline" className="mt-0">
                {notifications.length === 0 ? <EmptyState /> : (
                  <div className="space-y-4 pb-4">
                    <AnimatePresence>
                      {dateGroups.map(group => (
                        <div key={group.label}>
                          <div className="sticky top-0 z-10 py-1.5">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-card/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border/30">
                              {group.label}
                            </span>
                          </div>
                          <div className="space-y-1 mt-1">
                            {group.items.map(n => (
                              <NotificationItem key={n.id} n={n} onMarkRead={(id) => markRead([id])} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </TabsContent>

              {/* Unread View */}
              <TabsContent value="timeline" className="mt-0">
                {/* handled below */}
              </TabsContent>
              <TabsContent value="unread" className="mt-0">
                {(() => {
                  const unread = notifications.filter(n => !n.is_read);
                  if (unread.length === 0) return (
                    <div className="text-center py-16 px-6">
                      <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-3">
                        <CheckCheck className="w-7 h-7 text-success" />
                      </div>
                      <h3 className="text-base font-bold text-foreground mb-1">You're all caught up!</h3>
                      <p className="text-sm text-muted-foreground">No unread notifications</p>
                    </div>
                  );
                  return (
                    <div className="space-y-1 pb-4">
                      <AnimatePresence>
                        {unread.map(n => (
                          <NotificationItem key={n.id} n={n} onMarkRead={(id) => markRead([id])} />
                        ))}
                      </AnimatePresence>
                    </div>
                  );
                })()}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Footer Actions */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-border/30 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </p>
            <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive/70 hover:text-destructive gap-1" onClick={clearAll}>
              <Trash2 className="w-3 h-3" /> Clear all
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
