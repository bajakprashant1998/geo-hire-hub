import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const PushNotificationToggle = ({ compact = false }: { compact?: boolean }) => {
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) return null;

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast.success('Push notifications disabled');
    } else {
      const success = await subscribe();
      if (success) {
        toast.success('Push notifications enabled!');
      } else if (permission === 'denied') {
        toast.error('Notifications blocked. Please enable them in your browser settings.');
      }
    }
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BellRing className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Push Notifications</span>
        </div>
        <Switch checked={isSubscribed} onCheckedChange={handleToggle} />
      </div>
    );
  }

  return (
    <Card className={cn(
      'border transition-all',
      isSubscribed 
        ? 'border-primary/30 bg-primary/5' 
        : 'border-border'
    )}>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="w-5 h-5 text-primary" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-muted">
              <BellOff className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium">Browser Push Notifications</p>
            <p className="text-xs text-muted-foreground">
              {isSubscribed
                ? 'You\'ll receive real-time alerts for messages, matches & interviews'
                : 'Get notified instantly about new matches, messages, and updates'}
            </p>
          </div>
        </div>
        <Button
          variant={isSubscribed ? 'outline' : 'default'}
          size="sm"
          onClick={handleToggle}
        >
          {isSubscribed ? 'Disable' : 'Enable'}
        </Button>
      </CardContent>
    </Card>
  );
};
