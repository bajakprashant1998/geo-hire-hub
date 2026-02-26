import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell, MessageSquare, Briefcase, Eye, Star, X, Check, Loader2, Sparkles, Clock, Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { isToday, isYesterday } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const notificationConfig: Record<string, { icon: React.ReactNode; iconBg: string }> = {
  application_update: {
    icon: <Briefcase className="w-4 h-4" />,
    iconBg: 'bg-primary/10 text-primary'
  },
  message: {
    icon: <MessageSquare className="w-4 h-4" />,
    iconBg: 'bg-[hsl(262,83%,58%)]/10 text-[hsl(262,83%,58%)]'
  },
  shortlisted: {
    icon: <Star className="w-4 h-4" />,
    iconBg: 'bg-warning/10 text-warning-foreground'
  },
  rejected: {
    icon: <X className="w-4 h-4" />,
    iconBg: 'bg-destructive/10 text-destructive'
  },
  viewed: {
    icon: <Eye className="w-4 h-4" />,
    iconBg: 'bg-success/10 text-success'
  },
  default: {
    icon: <Bell className="w-4 h-4" />,
    iconBg: 'bg-muted text-muted-foreground'
  },
};

type FilterTab = 'all' | 'unread' | 'applications';

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
    if (!error) setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const clearAll = async () => {
    if (!user) return;
    const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
    if (!error) setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'applications') return ['application_update', 'shortlisted', 'rejected', 'viewed'].includes(n.type);
    return true;
  });

  // Group by date
  const grouped: { label: string; items: Notification[] }[] = [];
  const todayItems: Notification[] = [];
  const yesterdayItems: Notification[] = [];
  const earlierItems: Notification[] = [];

  filtered.forEach((n) => {
    const d = new Date(n.created_at);
    if (isToday(d)) todayItems.push(n);
    else if (isYesterday(d)) yesterdayItems.push(n);
    else earlierItems.push(n);
  });

  if (todayItems.length) grouped.push({ label: 'Today', items: todayItems });
  if (yesterdayItems.length) grouped.push({ label: 'Yesterday', items: yesterdayItems });
  if (earlierItems.length) grouped.push({ label: 'Earlier', items: earlierItems });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-xl bg-card/50 backdrop-blur-2xl">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/40 shadow-xl overflow-hidden bg-card/50 backdrop-blur-2xl relative rounded-2xl">
      {/* Decorative orbs */}
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[hsl(262,83%,58%)]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 dark:ring-white/5 pointer-events-none" />

      <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gradient-to-r from-primary/5 to-[hsl(262,83%,58%)]/5 relative z-10">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl relative">
            <Bell className="w-5 h-5 text-primary" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full text-[10px] text-white flex items-center justify-center font-bold animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <span>Notifications</span>
            <p className="text-xs font-normal text-muted-foreground mt-0.5">Stay updated on your applications</p>
          </div>
        </CardTitle>
        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="rounded-xl text-xs">
              <Check className="w-3.5 h-3.5 mr-1" /> Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="rounded-xl text-xs text-destructive hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear All
            </Button>
          )}
        </div>
      </CardHeader>

      <div className="px-4 pt-2 pb-1 relative z-10">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
          <TabsList className="w-full bg-muted/50 rounded-xl">
            <TabsTrigger value="all" className="flex-1 rounded-lg text-xs">All</TabsTrigger>
            <TabsTrigger value="unread" className="flex-1 rounded-lg text-xs">
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex-1 rounded-lg text-xs">Applications</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <CardContent className="p-0 relative z-10">
        <ScrollArea className="h-[380px]">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              className="text-center py-12 px-6"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Sparkles className="w-8 h-8 text-muted-foreground/50" />
              </motion.div>
              <h3 className="font-medium mb-1">
                {filter === 'unread' ? 'All caught up!' : filter === 'applications' ? 'No application updates' : 'No notifications yet'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {filter === 'unread' ? 'You have no unread notifications' : "We'll notify you when something happens"}
              </p>
            </motion.div>
          ) : (
            <div>
              {grouped.map((group) => (
                <div key={group.label}>
                  <div className="sticky top-0 z-10 px-4 py-1.5 bg-muted/60 backdrop-blur-md">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</p>
                  </div>
                  <AnimatePresence>
                    {group.items.map((notification, i) => {
                      const config = notificationConfig[notification.type] || notificationConfig.default;
                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          transition={{ delay: i * 0.02 }}
                          className={cn(
                            "p-4 transition-all cursor-pointer hover:bg-muted/50 border-b border-border/30",
                            !notification.is_read && "bg-primary/5"
                          )}
                          onClick={() => !notification.is_read && markAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", config.iconBg)}>
                              {config.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={cn("font-medium text-sm line-clamp-1", !notification.is_read && "font-semibold")}>
                                  {notification.title}
                                </p>
                                {!notification.is_read && (
                                  <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5 animate-pulse" />
                                )}
                              </div>
                              {notification.message && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{notification.message}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(notification.created_at)}
                                </span>
                                {notification.link && (
                                  <Link
                                    to={notification.link === '/candidate-dashboard' ? '/candidate-dashboard?tab=jobs' : notification.link}
                                    className="text-xs text-primary hover:underline font-medium"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    View details →
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
