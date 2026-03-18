import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  content: string;
  is_admin: boolean;
  created_at: string;
  sender_id: string;
}

const LiveChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get or create active ticket
  const getOrCreateTicket = useCallback(async () => {
    if (!user) return null;
    setLoading(true);
    try {
      // Find existing open ticket
      const { data: existing } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setTicketId(existing.id);
        return existing.id;
      }

      // Create new ticket
      const { data: newTicket, error } = await supabase
        .from('support_tickets')
        .insert({ user_id: user.id, subject: 'Live Chat Support' })
        .select('id')
        .single();

      if (error) throw error;
      setTicketId(newTicket.id);
      return newTicket.id;
    } catch (err) {
      console.error('Error getting/creating ticket:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load messages for ticket
  const loadMessages = useCallback(async (tid: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', tid)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  }, []);

  // Open chat
  const handleOpen = async () => {
    setIsOpen(true);
    if (!ticketId) {
      const tid = await getOrCreateTicket();
      if (tid) await loadMessages(tid);
    } else {
      await loadMessages(ticketId);
    }
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  // Send message
  const handleSend = async () => {
    if (!message.trim() || !user || sending) return;
    const tid = ticketId || await getOrCreateTicket();
    if (!tid) { toast.error('Could not start chat'); return; }

    setSending(true);
    const content = message.trim();
    setMessage('');

    // Optimistic update
    const optimistic: Message = {
      id: crypto.randomUUID(),
      content,
      is_admin: false,
      created_at: new Date().toISOString(),
      sender_id: user.id,
    };
    setMessages(prev => [...prev, optimistic]);

    const { error } = await supabase
      .from('support_messages')
      .insert({ ticket_id: tid, sender_id: user.id, content, is_admin: false });

    if (error) {
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setMessage(content);
    }
    setSending(false);
  };

  // Realtime subscription
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`support-${ticketId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `ticket_id=eq.${ticketId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          // Avoid duplicates from optimistic updates
          if (prev.some(m => m.id === newMsg.id)) return prev;
          // Replace optimistic message if same content from same sender
          if (!newMsg.is_admin && newMsg.sender_id === user?.id) {
            const withoutOptimistic = prev.filter(
              m => !(m.sender_id === user?.id && m.content === newMsg.content && !m.id.includes('-'))
            );
            return [...withoutOptimistic, newMsg];
          }
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticketId, user?.id]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!user) return null;

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-[5.5rem] right-3 z-[60] md:bottom-6 md:right-6"
          >
            <Button
              onClick={handleOpen}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 p-0"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 right-2 z-[60] w-[calc(100vw-1rem)] max-w-sm md:bottom-6 md:right-6 md:w-96"
          >
            <div className="flex flex-col h-[28rem] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-8 w-8 border border-primary-foreground/20">
                      <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xs">CS</AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 border border-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">Support Chat</p>
                    <p className="text-[11px] opacity-80">We typically reply in minutes</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={() => setIsOpen(false)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-3 py-3" ref={scrollRef as any}>
                <div className="space-y-3">
                  {/* Welcome message */}
                  {messages.length === 0 && !loading && (
                    <div className="flex gap-2">
                      <Avatar className="h-7 w-7 mt-0.5 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">CS</AvatarFallback>
                      </Avatar>
                      <div className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm max-w-[80%]">
                        👋 Hi there! How can we help you today?
                      </div>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn('flex gap-2', !msg.is_admin && 'flex-row-reverse')}>
                      {msg.is_admin && (
                        <Avatar className="h-7 w-7 mt-0.5 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">CS</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          'rounded-2xl px-3 py-2 text-sm max-w-[80%]',
                          msg.is_admin
                            ? 'rounded-tl-sm bg-muted text-foreground'
                            : 'rounded-tr-sm bg-primary text-primary-foreground'
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="border-t border-border px-3 py-2.5 bg-card">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex items-center gap-2"
                >
                  <Input
                    ref={inputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 h-9 rounded-full text-sm bg-muted border-0 focus-visible:ring-1"
                    disabled={loading}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-9 w-9 rounded-full shrink-0"
                    disabled={!message.trim() || sending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LiveChatWidget;
