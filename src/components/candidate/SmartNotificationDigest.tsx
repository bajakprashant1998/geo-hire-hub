import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell, Briefcase, MessageSquare, Calendar, Star, Clock, ChevronDown, ChevronUp,
  Settings2, Loader2, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { isToday, isYesterday, format, differenceInHours } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

interface DigestGroup {
  category: string;
  icon: React.ReactNode;
  iconBg: string;
  items: Notification[];
  priority: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; iconBg: string; priority: number }> = {
  interview: { label: 'Interviews', icon: Calendar, iconBg: 'bg-primary/10 text-primary', priority: 1 },
  application: { label: 'Applications', icon: Briefcase, iconBg: 'bg-[hsl(217,89%,61%)]/10 text-[hsl(217,89%,61%)]', priority: 2 },
  message: { label: 'Messages', icon: MessageSquare, iconBg: 'bg-[hsl(262,83%,58%)]/10 text-[hsl(262,83%,58%)]', priority: 3 },
  other: { label: 'Other', icon: Bell, iconBg: 'bg-muted text-muted-foreground', priority: 4 },
};

function categorize(type: string): string {
  if (type.includes('interview')) return 'interview';
  if (type.includes('application') || type === 'shortlisted' || type === 'rejected' || type === 'viewed') return 'application';
  if (type.includes('message')) return 'message';
  return 'other';
}

export const SmartNotificationDigest = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [digestMode, setDigestMode] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(100);
    setNotifications(data || []);
    setLoading(false);
  };

  const digestGroups = useMemo<DigestGroup[]>(() => {
    if (!digestMode) return [];
    const grouped: Record<string, Notification[]> = {};
    notifications.forEach(n => {
      const cat = categorize(n.type);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(n);
    });

    return Object.entries(grouped)
      .map(([cat, items]) => {
        const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
        const Icon = config.icon;
        return {
          category: config.label,
          icon: <Icon className="w-4 h-4" />,
          iconBg: config.iconBg,
          items,
          priority: config.priority,
        };
      })
      .sort((a, b) => a.priority - b.priority);
  }, [notifications, digestMode]);

  const toggleGroup = (category: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const markGroupRead = async (items: Notification[]) => {
    const unreadIds = items.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n));
  };

  const totalUnread = notifications.filter(n => !n.is_read).length;
  const recentHighPriority = notifications.filter(n => {
    const hours = differenceInHours(new Date(), new Date(n.created_at));
    return hours < 4 && !n.is_read && (n.type.includes('interview') || n.type === 'shortlisted');
  });

  if (loading) {
    return (
      <Card className="border border-border/40 shadow-xl bg-card/50 backdrop-blur-2xl rounded-2xl">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/40 shadow-xl overflow-hidden bg-card/50 backdrop-blur-2xl relative rounded-2xl">
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gradient-to-r from-primary/5 to-[hsl(262,83%,58%)]/5 relative z-10">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl relative">
            <Sparkles className="w-5 h-5 text-primary" />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center font-bold">
                {totalUnread}
              </span>
            )}
          </div>
          <div>
            <span>Smart Digest</span>
            <p className="text-xs font-normal text-muted-foreground mt-0.5">Notifications grouped by priority</p>
          </div>
        </CardTitle>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Digest</span>
            <Switch checked={digestMode} onCheckedChange={setDigestMode} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 relative z-10">
        {/* Urgent alerts banner */}
        {recentHighPriority.length > 0 && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-warning-foreground" />
              <span className="text-sm font-semibold text-foreground">
                {recentHighPriority.length} urgent notification{recentHighPriority.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {recentHighPriority[0].title}
              {recentHighPriority.length > 1 && ` and ${recentHighPriority.length - 1} more`}
            </p>
          </div>
        )}

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <h3 className="font-medium mb-1">No notifications</h3>
              <p className="text-sm text-muted-foreground">We'll notify you when something happens</p>
            </div>
          ) : digestMode ? (
            <div className="p-3 space-y-2">
              {digestGroups.map((group) => {
                const unread = group.items.filter(n => !n.is_read).length;
                const isExpanded = expandedGroups.has(group.category);
                return (
                  <motion.div
                    key={group.category}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border/40 overflow-hidden bg-card/70"
                  >
                    <button
                      onClick={() => toggleGroup(group.category)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", group.iconBg)}>
                        {group.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{group.category}</span>
                          {unread > 0 && (
                            <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                              {unread} new
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{group.items.length} notification{group.items.length > 1 ? 's' : ''}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border/30 px-3 pb-2">
                            {unread > 0 && (
                              <div className="py-2 flex justify-end">
                                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => markGroupRead(group.items)}>
                                  Mark all read
                                </Button>
                              </div>
                            )}
                            {group.items.slice(0, 5).map(n => (
                              <div
                                key={n.id}
                                className={cn(
                                  "py-2 px-2 rounded-lg text-sm",
                                  !n.is_read && "bg-primary/5"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className={cn("text-sm line-clamp-1", !n.is_read && "font-semibold")}>{n.title}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-1">{n.message}</p>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(n.created_at), 'h:mm a')}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {group.items.length > 5 && (
                              <p className="text-xs text-muted-foreground text-center py-2">
                                +{group.items.length - 5} more
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {notifications.slice(0, 20).map(n => (
                <div key={n.id} className={cn("p-3 rounded-lg text-sm", !n.is_read && "bg-primary/5")}>
                  <p className={cn("line-clamp-1", !n.is_read && "font-semibold")}>{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
