import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export const RecentMessagesWidget = ({ profileId, onOpenChat }: { profileId: string; onOpenChat: () => void }) => {
  const [convos, setConvos] = useState<{ id: string; name: string; avatar: string | null; lastMsg: string; time: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('conversations')
          .select('id, participant_1, participant_2, last_message_at')
          .or(`participant_1.eq.${profileId},participant_2.eq.${profileId}`)
          .order('last_message_at', { ascending: false })
          .limit(4);

        if (!data || data.length === 0) { setLoading(false); return; }

        const results = await Promise.all(data.map(async (c) => {
          const otherId = c.participant_1 === profileId ? c.participant_2 : c.participant_1;
          const { data: prof } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', otherId).maybeSingle();
          const { data: msg } = await supabase.from('messages').select('content').eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
          return { id: c.id, name: prof?.full_name || 'Unknown', avatar: prof?.avatar_url || null, lastMsg: msg?.content || 'No messages', time: c.last_message_at };
        }));
        setConvos(results);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [profileId]);

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted/40 animate-pulse rounded-xl" />)}</div>;
  if (convos.length === 0) return (
    <div className="text-center py-6">
      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
      <p className="text-xs text-muted-foreground">No conversations yet</p>
    </div>
  );

  return (
    <div className="space-y-1.5">
      {convos.map((c, i) => (
        <motion.button
          key={c.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          onClick={onOpenChat}
          className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-muted/40 transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {c.avatar ? <img src={c.avatar} className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-primary">{c.name.slice(0,2).toUpperCase()}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{c.lastMsg}</p>
          </div>
          <span className="text-[9px] text-muted-foreground/50 shrink-0">
            {c.time ? formatDistanceToNow(new Date(c.time), { addSuffix: false }) : ''}
          </span>
        </motion.button>
      ))}
    </div>
  );
};
