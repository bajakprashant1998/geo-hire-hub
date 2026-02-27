import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseRealtimeMarkersProps {
  onNewJob?: (job: any) => void;
  onNewCandidate?: (candidate: any) => void;
  enabled?: boolean;
}

export const useRealtimeMarkers = ({ onNewJob, onNewCandidate, enabled = true }: UseRealtimeMarkersProps) => {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('map-live-markers')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'jobs' },
        (payload) => {
          if (payload.new && payload.new.is_active && payload.new.status === 'open') {
            onNewJob?.(payload.new);
            toast.info(`New job posted: ${payload.new.title}`, { duration: 3000 });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'candidates' },
        (payload) => {
          if (payload.new) {
            onNewCandidate?.(payload.new);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [enabled, onNewJob, onNewCandidate]);

  return channelRef;
};