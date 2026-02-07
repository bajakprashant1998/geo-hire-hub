import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, AlertTriangle, CheckCircle, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface PlatformNotificationBannerProps {
  userType: 'candidate' | 'employer';
}

export const PlatformNotificationBanner = ({ userType }: PlatformNotificationBannerProps) => {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const { data: notifications } = useQuery({
    queryKey: ['platform-notifications', userType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_notifications')
        .select('*')
        .eq('is_active', true)
        .in('target_audience', ['all', userType + 's'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const visibleNotifications = notifications?.filter(n => !dismissed.includes(n.id)) || [];

  if (visibleNotifications.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = (type: string): 'default' | 'destructive' => {
    return type === 'error' ? 'destructive' : 'default';
  };

  return (
    <div className="space-y-2">
      {visibleNotifications.map((notification) => (
        <Alert key={notification.id} variant={getVariant(notification.type || 'info')}>
          {getIcon(notification.type || 'info')}
          <AlertTitle className="flex items-center justify-between">
            {notification.title}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-2"
              onClick={() => setDismissed(prev => [...prev, notification.id])}
            >
              <X className="h-3 w-3" />
            </Button>
          </AlertTitle>
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
