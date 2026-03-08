import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, AlertTriangle, CheckCircle, XCircle, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface PlatformNotificationBannerProps {
  userType: 'candidate' | 'employer';
}

export const PlatformNotificationBanner = ({ userType }: PlatformNotificationBannerProps) => {
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed-banners') || '[]');
    } catch { return []; }
  });

  const { data: banners } = useQuery({
    queryKey: ['platform-banners', userType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_banners')
        .select('*')
        .eq('is_active', true)
        .in('target_audience', ['all', userType + 's'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const handleDismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem('dismissed-banners', JSON.stringify(next));
  };

  const visibleBanners = banners?.filter(b => !dismissed.includes(b.id)) || [];

  if (visibleBanners.length === 0) return null;

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
      {visibleBanners.map((banner) => (
        <Alert key={banner.id} variant={getVariant(banner.type || 'info')}>
          {getIcon(banner.type || 'info')}
          <AlertTitle className="flex items-center justify-between">
            {banner.title}
            {banner.is_dismissible && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-2"
                onClick={() => handleDismiss(banner.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            {banner.message}
            {banner.link_url && (
              <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium">
                {banner.link_text || 'Learn more'} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
