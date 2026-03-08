import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import {
  Bell, MessageSquare, Briefcase, Eye, Star, X, Check, Loader2, Sparkles, Clock,
  Trash2, BellOff, CheckCheck, Filter, ChevronRight, ArrowRight, Calendar,
  UserCheck, FileText, Zap, Settings, BellRing
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const NOTIFICATION_CONFIG: Record<string, { icon: React.ElementType; bg: string; color: string; label: string }> = {
  application_update: { icon: Briefcase, bg: 'bg-primary/10', color: 'text-primary', label: 'Application' },
  message: { icon: MessageSquare, bg: 'bg-[hsl(262,83%,58%)]/10', color: 'text-[hsl(262,83%,58%)]', label: 'Message' },
  shortlisted: { icon: Star, bg: 'bg-warning/15', color: 'text-warning-foreground', label: 'Shortlisted' },
  rejected: { icon: X, bg: 'bg-destructive/10', color: 'text-destructive', label: 'Rejected' },
  viewed: { icon: Eye, bg: 'bg-success/10', color: 'text-success', label: 'Profile View' },
  interview: { icon: Calendar, bg: 'bg-primary/10', color: 'text-primary', label: 'Interview' },
  task: { icon: FileText, bg: 'bg-warning/10', color: 'text-warning-foreground', label: 'Task' },
  match: { icon: Zap, bg: 'bg-success/10', color: 'text-success', label: 'Job Match' },
  default: { icon: Bell, bg: 'bg-muted', color: 'text-muted-foreground', label: 'Update' },
};

type FilterTab = 'all' | 'unread' | 'applications' | 'messages';

/* ── Stats summary ── */
const NotificationStats = ({ total, unread, todayCount }: { total: number; unread: number; todayCount: number }) => (
  <div className="grid grid-cols-3 gap-3">
    {[
      { label: 'Total', value: total, icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted/50' },
      { label: 'Unread', value: unread, icon: BellRing, color: 'text-primary', bg: 'bg-primary/10' },
      { label: 'Today', value: todayCount, icon: Zap, color: 'text-success', bg: 'bg-success/10' },
    ].map((stat, i) => (
      <motion.div
        key={stat.label}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
      >
        <Card className="border border-border/40">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', stat.bg)}>
              <stat.icon className={cn('w-4 h-4', stat.color)} />
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground leading-none">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    ))}
  </div>
);

/* ── Notification row ── */
const NotificationRow = ({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) => {
  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.default;
  const Icon = config.icon;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      className={cn(
        'group flex items-start gap-3 p-3.5 rounded-xl transition-all cursor-pointer mx-2',
        !notification.is_read
          ? 'bg-primary/5 hover:bg-primary/8 border border-primary/10'
          : 'hover:bg-muted/50'
      )}
      onClick={() => !notification.is_read && onMarkRead(notification.id)}
    >
      {/* Icon */}
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5', config.bg)}>
        <Icon className={cn('w-5 h-5', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className={cn('text-sm leading-tight line-clamp-1', !notification.is_read ? 'font-bold text-foreground' : 'font-medium text-foreground')}>
                {notification.title}
              </p>
              {!notification.is_read && (
                <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
              )}
            </div>
            {notification.message && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                {notification.message}
              </p>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
            {formatTime(notification.created_at)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className={cn('text-[10px] h-5 border-0 px-1.5', config.bg, config.color)}>
            {config.label}
          </Badge>
          {notification.link && (
            <Link
              to={notification.link === '/candidate-dashboard' ? '/candidate-dashboard?tab=jobs' : notification.link}
              className="text-xs text-primary hover:underline font-medium flex items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              View <ArrowRight className="w-3 h-3" />
            </Link>
          )}
          {!notification.is_read && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
              className="ml-auto text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Check className="w-3 h-3" /> Mark read
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ── Empty state ── */
const EmptyState = ({ filter }: { filter: FilterTab }) => {
  const config = {
    all: { icon: Sparkles, title: 'No notifications yet', desc: "We'll notify you when something happens" },
    unread: { icon: CheckCheck, title: 'All caught up!', desc: 'You have no unread notifications' },
    applications: { icon: Briefcase, title: 'No application updates', desc: 'Apply to jobs to see updates here' },
    messages: { icon: MessageSquare, title: 'No message notifications', desc: "You'll see message alerts here" },
  }[filter];

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-16 px-6"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4"
      >
        <Icon className="w-8 h-8 text-muted-foreground/40" />
      </motion.div>
      <h3 className="font-bold text-foreground mb-1">{config.title}</h3>
      <p className="text-sm text-muted-foreground">{config.desc}</p>
    </motion.div>
  );
};

/* ── Main Component ── */
export const NotificationCenter = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(50);
    setNotifications(data || []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (!error) setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    }
  };

  const clearAll = async () => {
    if (!user) return;
    const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
    if (!error) {
      setNotifications([]);
      toast.success('All notifications cleared');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'unread') return !n.is_read;
      if (filter === 'applications') return ['application_update', 'shortlisted', 'rejected', 'viewed', 'interview'].includes(n.type);
      if (filter === 'messages') return n.type === 'message';
      return true;
    });
  }, [notifications, filter]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; items: Notification[] }[] = [];
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const earlier: Notification[] = [];

    filtered.forEach((n) => {
      const d = new Date(n.created_at);
      if (isToday(d)) today.push(n);
      else if (isYesterday(d)) yesterday.push(n);
      else earlier.push(n);
    });

    if (today.length) groups.push({ label: 'Today', items: today });
    if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday });
    if (earlier.length) groups.push({ label: 'Earlier', items: earlier });
    return groups;
  }, [filtered]);

  const todayCount = notifications.filter(n => isToday(new Date(n.created_at))).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
        <div className="h-96 rounded-2xl bg-muted/20 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <NotificationStats total={notifications.length} unread={unreadCount} todayCount={todayCount} />

      {/* Main card */}
      <Card className="border border-border/40 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center relative">
              <Bell className="w-5 h-5 text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-foreground">Notifications</h3>
              <p className="text-xs text-muted-foreground">Stay updated on your job search</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={markAllAsRead} className="h-8 w-8 rounded-lg">
                    <CheckCheck className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mark all as read</TooltipContent>
              </Tooltip>
            )}
            {notifications.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={clearAll} className="h-8 w-8 rounded-lg text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear all</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-3 pt-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
            <TabsList className="w-full grid grid-cols-4 h-10 bg-muted/30 rounded-xl p-1">
              <TabsTrigger value="all" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1">
                Unread
                {unreadCount > 0 && (
                  <Badge className="h-4 px-1 text-[9px] bg-primary text-primary-foreground border-0">{unreadCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="applications" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                Jobs
              </TabsTrigger>
              <TabsTrigger value="messages" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                Messages
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Notification list */}
        <ScrollArea className="h-[420px]">
          <div className="py-2">
            {filtered.length === 0 ? (
              <EmptyState filter={filter} />
            ) : (
              grouped.map((group) => (
                <div key={group.label}>
                  <div className="sticky top-0 z-10 px-5 py-1.5 bg-muted/40 backdrop-blur-md">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{group.label}</p>
                  </div>
                  <div className="space-y-1 py-1">
                    <AnimatePresence>
                      {group.items.map((notification) => (
                        <NotificationRow
                          key={notification.id}
                          notification={notification}
                          onMarkRead={markAsRead}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Quick settings tip */}
      {notifications.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Link to="/candidate-dashboard?tab=alerts">
            <Card className="border border-border/40 hover:border-primary/30 transition-colors cursor-pointer group">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Manage notification preferences</p>
                  <p className="text-xs text-muted-foreground">Control what alerts you receive</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      )}
    </div>
  );
};
