import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseRealtimeDashboardProps {
  userId?: string;
  candidateId?: string;
  employerId?: string;
}

export const useRealtimeDashboard = ({ userId, candidateId, employerId }: UseRealtimeDashboardProps) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('dashboard-realtime');

    // Listen for new notifications
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new as any;
        toast.info(notification.title || 'New notification', {
          description: notification.message,
        });
        triggerRefresh();
      }
    );

    // Listen for new tasks assigned to candidate
    if (candidateId) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `candidate_id=eq.${candidateId}`,
        },
        (payload) => {
          const task = payload.new as any;
          toast.info('New task assigned', {
            description: task.title,
          });
          triggerRefresh();
        }
      );

      // Listen for application status changes for candidate
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applications',
          filter: `candidate_id=eq.${candidateId}`,
        },
        (payload) => {
          const app = payload.new as any;
          toast.info('Application status updated', {
            description: `Status changed to ${app.status}`,
          });
          triggerRefresh();
        }
      );
    }

    // Listen for new applications to employer's jobs
    if (employerId) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'applications',
        },
        (payload) => {
          // We'll check server-side if this application belongs to the employer's jobs
          toast.info('New application received', {
            description: 'A candidate has applied to one of your jobs.',
          });
          triggerRefresh();
        }
      );

      // Listen for task status updates from candidates
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `employer_id=eq.${employerId}`,
        },
        (payload) => {
          const task = payload.new as any;
          toast.info('Task updated', {
            description: `"${task.title}" is now ${task.status}`,
          });
          triggerRefresh();
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, candidateId, employerId, triggerRefresh]);

  return { refreshTrigger };
};
