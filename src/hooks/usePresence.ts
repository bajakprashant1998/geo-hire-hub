import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  onlineUsers: Set<string>;
  typingUsers: Map<string, { conversationId: string; timestamp: number }>;
}

interface UsePresenceReturn {
  isOnline: (userId: string) => boolean;
  isTyping: (userId: string, conversationId: string) => boolean;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  onlineCount: number;
}

export const usePresence = (conversationId?: string): UsePresenceReturn => {
  const { user } = useAuth();
  const [state, setState] = useState<PresenceState>({
    onlineUsers: new Set(),
    typingUsers: new Map(),
  });
  // Ref holds the already-subscribed typing channel so setTyping reuses it
  const typingChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;

    // Create presence channel
    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState();
        const onlineIds = new Set<string>();
        
        Object.keys(newState).forEach((key) => {
          onlineIds.add(key);
        });
        
        setState((prev) => ({ ...prev, onlineUsers: onlineIds }));
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setState((prev) => {
          const newOnline = new Set(prev.onlineUsers);
          newOnline.add(key);
          return { ...prev, onlineUsers: newOnline };
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setState((prev) => {
          const newOnline = new Set(prev.onlineUsers);
          newOnline.delete(key);
          const newTyping = new Map(prev.typingUsers);
          newTyping.delete(key);
          return { onlineUsers: newOnline, typingUsers: newTyping };
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);

  // Typing indicator channel — store in ref so setTyping can reuse the same object
  useEffect(() => {
    if (!user || !conversationId) return;

    const typingChannel = supabase.channel(`typing-${conversationId}`);

    typingChannel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === user.id) return;
        
        setState((prev) => {
          const newTyping = new Map(prev.typingUsers);
          if (payload.isTyping) {
            newTyping.set(payload.userId, {
              conversationId: payload.conversationId,
              timestamp: Date.now(),
            });
          } else {
            newTyping.delete(payload.userId);
          }
          return { ...prev, typingUsers: newTyping };
        });
      })
      .subscribe();

    // Store the subscribed channel so setTyping can send through it
    typingChannelRef.current = typingChannel;

    return () => {
      typingChannelRef.current = null;
      supabase.removeChannel(typingChannel);
    };
  }, [user, conversationId]);

  // Clear stale typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        const now = Date.now();
        const newTyping = new Map(prev.typingUsers);
        let changed = false;
        
        newTyping.forEach((value, key) => {
          if (now - value.timestamp > 5000) {
            newTyping.delete(key);
            changed = true;
          }
        });
        
        return changed ? { ...prev, typingUsers: newTyping } : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const setTyping = useCallback(
    (convId: string, isTyping: boolean) => {
      if (!user) return;

      // Reuse the subscribed channel ref; do not create a new channel
      typingChannelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: user.id,
          conversationId: convId,
          isTyping,
        },
      });
    },
    [user]
  );

  const isOnline = useCallback(
    (userId: string) => state.onlineUsers.has(userId),
    [state.onlineUsers]
  );

  const isTyping = useCallback(
    (userId: string, convId: string) => {
      const typingInfo = state.typingUsers.get(userId);
      return typingInfo?.conversationId === convId;
    },
    [state.typingUsers]
  );

  return {
    isOnline,
    isTyping,
    setTyping,
    onlineCount: state.onlineUsers.size,
  };
};
