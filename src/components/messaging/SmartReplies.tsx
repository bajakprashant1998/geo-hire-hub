import { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SmartRepliesProps {
  messages: { content: string; sender_id: string }[];
  currentUserId: string;
  userRole?: string;
  onSelect: (reply: string) => void;
  visible: boolean;
}

export const SmartReplies = ({ messages, currentUserId, userRole, onSelect, visible }: SmartRepliesProps) => {
  const [replies, setReplies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || messages.length === 0) {
      setReplies([]);
      return;
    }

    const lastMsg = messages[messages.length - 1];
    // Only suggest when the last message is from the other person
    if (lastMsg.sender_id === currentUserId) {
      setReplies([]);
      return;
    }

    const msgKey = `${messages.length}-${lastMsg.content?.slice(0, 20)}`;
    if (msgKey === lastMessageId) return;
    setLastMessageId(msgKey);

    const fetchReplies = async () => {
      setLoading(true);
      try {
        const recentMessages = messages.slice(-6).map(m => ({
          content: m.content,
          isOwn: m.sender_id === currentUserId,
        }));

        const { data, error } = await supabase.functions.invoke('ai-smart-replies', {
          body: { recentMessages, userRole },
        });

        if (!error && data?.replies?.length > 0) {
          setReplies(data.replies);
        } else {
          setReplies([]);
        }
      } catch {
        setReplies([]);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchReplies, 500);
    return () => clearTimeout(timeout);
  }, [messages, currentUserId, visible, userRole, lastMessageId]);

  if (!visible || (replies.length === 0 && !loading)) return null;

  return (
    <div className="px-3 md:px-4 pb-1">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-medium text-muted-foreground">Smart replies</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground"
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                Thinking...
              </motion.div>
            ) : (
              replies.map((reply, i) => (
                <motion.button
                  key={reply}
                  initial={{ opacity: 0, scale: 0.9, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    onSelect(reply);
                    setReplies([]);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium",
                    "bg-primary/10 text-primary border border-primary/20",
                    "hover:bg-primary/20 hover:border-primary/30 hover:scale-105",
                    "active:scale-95 transition-all"
                  )}
                >
                  {reply}
                </motion.button>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
