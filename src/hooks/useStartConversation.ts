import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useStartConversation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const startConversation = useCallback(async (otherUserId: string, jobId?: string) => {
    if (!user) {
      toast.error('Please log in to send messages');
      navigate('/login');
      return null;
    }

    if (user.id === otherUserId) {
      toast.error("You can't message yourself");
      return null;
    }

    try {
      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`
        )
        .maybeSingle();

      if (existingConv) {
        navigate(`/messages/${existingConv.id}`);
        return existingConv.id;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          participant_1: user.id,
          participant_2: otherUserId,
          job_id: jobId || null,
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      navigate(`/messages/${newConv.id}`);
      return newConv.id;
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
      return null;
    }
  }, [user, navigate]);

  return { startConversation };
};
