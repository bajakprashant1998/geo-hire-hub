import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, CheckCircle2, AlertCircle, MessageSquare, Briefcase, 
  Eye, Star, X, Check, Loader2, Sparkles, Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const notificationConfig: Record<string, { icon: React.ReactNode; gradient: string; iconBg: string }> = {
  application_update: { 
    icon: <Briefcase className="w-4 h-4" />, 
    gradient: 'from-blue-500 to-cyan-500',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
  },
  message: { 
    icon: <MessageSquare className="w-4 h-4" />, 
    gradient: 'from-violet-500 to-purple-500',
    iconBg: 'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400'
  },
  shortlisted: { 
    icon: <Star className="w-4 h-4" />, 
    gradient: 'from-amber-500 to-orange-500',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
  },
  rejected: { 
    icon: <X className="w-4 h-4" />, 
    gradient: 'from-rose-500 to-pink-500',
    iconBg: 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400'
  },
  viewed: { 
    icon: <Eye className="w-4 h-4" />, 
    gradient: 'from-emerald-500 to-teal-500',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
  },
  default: { 
    icon: <Bell className="w-4 h-4" />, 
    gradient: 'from-gray-500 to-slate-500',
    iconBg: 'bg-muted text-muted-foreground'
  },
};

export const NotificationCenter = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setNotifications(data || []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
      <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl overflow-hidden bg-gradient-to-br from-card via-card to-card/80">
      <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gradient-to-r from-primary/5 to-purple-500/5">
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
            <p className="text-xs font-normal text-muted-foreground mt-0.5">
              Stay updated on your applications
            </p>
          </div>
        </CardTitle>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="rounded-xl text-xs">
            <Check className="w-3.5 h-3.5 mr-1" />
            Mark all read
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[380px]">
          {notifications.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-medium mb-1">No notifications yet</h3>
              <p className="text-sm text-muted-foreground">
                We'll notify you when something happens
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((notification) => {
                const config = notificationConfig[notification.type] || notificationConfig.default;
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 transition-all cursor-pointer hover:bg-muted/50",
                      !notification.is_read && "bg-primary/5"
                    )}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        config.iconBg
                      )}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "font-medium text-sm line-clamp-1",
                            !notification.is_read && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5 animate-pulse" />
                          )}
                        </div>
                        {notification.message && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                            {notification.message}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(notification.created_at)}
                          </span>
                          {notification.link && (
                            <Link 
                              to={notification.link} 
                              className="text-xs text-primary hover:underline font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View details →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
