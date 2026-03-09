import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';

export const useMessageNotifications = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const notifiedMessages = useRef<Set<string>>(new Set());
  const pathnameRef = useRef(location.pathname);

  useEffect(() => { pathnameRef.current = location.pathname; }, [location.pathname]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages for the current user
    const channel = supabase
      .channel('global-message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const message = payload.new as {
            id: string;
            sender_id: string;
            conversation_id: string;
            content: string;
          };

          // Don't notify for own messages
          if (message.sender_id === user.id) return;

          // Don't notify if already notified
          if (notifiedMessages.current.has(message.id)) return;
          notifiedMessages.current.add(message.id);

          // Check if user is part of this conversation
          const { data: conversation } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', message.conversation_id)
            .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
            .maybeSingle();

          if (!conversation) return;

          // Don't show notification if already viewing this conversation
          if (pathnameRef.current === `/messages/${message.conversation_id}`) return;

          // Get sender info
          const { data: senderProfile } = await supabase
            .from('public_profiles')
            .select('full_name, avatar_url')
            .eq('user_id', message.sender_id)
            .maybeSingle();

          // Show toast notification
          toast.message(senderProfile?.full_name || 'New message', {
            description: message.content.length > 50 
              ? message.content.substring(0, 50) + '...' 
              : message.content,
            action: {
              label: 'View',
              onClick: () => navigate(`/messages/${message.conversation_id}`),
            },
            duration: 5000,
          });

          // Play notification sound via Web Audio API
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 440;
              gain.gain.value = 0.3;
              osc.start();
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
              osc.stop(ctx.currentTime + 0.15);
            }
          } catch {
            // Ignore audio errors
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);
};
