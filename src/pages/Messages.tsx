import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, MessageCircle, Search, Trash2, Sparkles, Image, Users } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { TypingIndicator } from '@/components/messaging/TypingIndicator';
import { OnlineStatus } from '@/components/messaging/OnlineStatus';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { ChatInput } from '@/components/messaging/ChatInput';
import { SmartReplies } from '@/components/messaging/SmartReplies';
import { uploadAttachment } from '@/components/messaging/AttachmentUpload';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { SEOHead } from '@/components/SEOHead';

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  read_at?: string | null;
  attachments?: Attachment[];
  reactions?: Reaction[];
}

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  job_id: string | null;
  last_message_at: string;
}

const DateSeparator = ({ date }: { date: Date }) => {
  let label = format(date, 'MMMM d, yyyy');
  if (isToday(date)) label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex-1 h-px bg-border/60" />
      <span className="text-[11px] font-medium text-muted-foreground bg-background/80 px-3 py-1 rounded-full border border-border/40">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
};

const Messages = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ file: File; localPreview?: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<boolean>(false);

  const handleDeleteConversation = async () => {
    if (!deletingConvId || !user) return;
    setDeleting(true);
    try {
      await supabase.from('messages').delete().eq('conversation_id', deletingConvId);
      const { error } = await supabase.from('conversations').delete().eq('id', deletingConvId);
      if (error) throw error;
      toast.success('Chat deleted');
      setConversations(prev => prev.filter(c => c.id !== deletingConvId));
      if (conversationId === deletingConvId) navigate('/messages');
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingConvId(null);
    }
  };

  const { isOnline, isTyping, setTyping } = usePresence(conversationId);
  const otherUserId = activeConversation
    ? (activeConversation.participant_1 === user?.id
      ? activeConversation.participant_2
      : activeConversation.participant_1)
    : null;

  // Fetch conversations
  useEffect(() => {
    if (!user) return;
    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (data && !error) {
        const convosWithProfiles = await Promise.all(
          data.map(async (conv) => {
            const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
            const [profileResult, unreadResult, lastMessageResult] = await Promise.all([
              supabase.from('public_profiles').select('*').eq('user_id', otherId).maybeSingle(),
              supabase.from('messages').select('id', { count: 'exact' })
                .eq('conversation_id', conv.id).eq('is_read', false).neq('sender_id', user.id),
              supabase.from('messages').select('content').eq('conversation_id', conv.id)
                .order('created_at', { ascending: false }).limit(1).maybeSingle()
            ]);
            return {
              ...conv,
              otherProfile: profileResult.data,
              unreadCount: unreadResult.count || 0,
              lastMessage: lastMessageResult.data?.content
            };
          })
        );
        setConversations(convosWithProfiles);
      }
      setLoading(false);
    };
    fetchConversations();

    const channel = supabase
      .channel('conversations-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Fetch messages
  useEffect(() => {
    if (!conversationId) { setActiveConversation(null); setMessages([]); return; }
    const fetchMessages = async () => {
      const { data: convData } = await supabase.from('conversations').select('*').eq('id', conversationId).maybeSingle();
      if (convData) {
        setActiveConversation(convData);
        const otherId = convData.participant_1 === user?.id ? convData.participant_2 : convData.participant_1;
        const { data: profileData } = await supabase.from('public_profiles').select('*').eq('user_id', otherId).maybeSingle();
        setOtherUser(profileData);

        const { data: messagesData } = await supabase.from('messages').select('*, read_at').eq('conversation_id', conversationId).order('created_at', { ascending: true });
        if (messagesData) {
          const messageIds = messagesData.map(m => m.id);
          const [attachmentsResult, reactionsResult] = await Promise.all([
            supabase.from('message_attachments').select('*').in('message_id', messageIds),
            supabase.from('message_reactions').select('*').in('message_id', messageIds)
          ]);
          const attachmentsByMessage = new Map<string, Attachment[]>();
          attachmentsResult.data?.forEach(att => {
            const existing = attachmentsByMessage.get(att.message_id) || [];
            existing.push(att);
            attachmentsByMessage.set(att.message_id, existing);
          });
          const reactionsByMessage = new Map<string, Map<string, { count: number; users: string[] }>>();
          reactionsResult.data?.forEach(r => {
            const msgReactions = reactionsByMessage.get(r.message_id) || new Map();
            const emojiData = msgReactions.get(r.emoji) || { count: 0, users: [] };
            emojiData.count++;
            emojiData.users.push(r.user_id);
            msgReactions.set(r.emoji, emojiData);
            reactionsByMessage.set(r.message_id, msgReactions);
          });
          setMessages(messagesData.map(msg => ({
            ...msg,
            attachments: attachmentsByMessage.get(msg.id) || [],
            reactions: Array.from(reactionsByMessage.get(msg.id)?.entries() || []).map(([emoji, data]) => ({
              emoji, count: data.count, hasReacted: data.users.includes(user?.id || '')
            }))
          })));
        }
        const now = new Date().toISOString();
        await supabase.from('messages').update({ is_read: true, read_at: now })
          .eq('conversation_id', conversationId).neq('sender_id', user?.id).is('read_at', null);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    fetchMessages();
  }, [conversationId, user]);

  // Realtime messages
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          if ((payload.new as Message).sender_id !== user?.id) {
            supabase.from('messages').update({ is_read: true }).eq('id', (payload.new as Message).id);
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const MAX_MESSAGE_LENGTH = 10000;

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !pendingAttachment) || !user || !activeConversation) return;
    const content = newMessage.trim() || (pendingAttachment ? '📎 Attachment' : '');
    if (content.length > MAX_MESSAGE_LENGTH) { toast.error(`Max ${MAX_MESSAGE_LENGTH} chars`); return; }
    if (conversationId && lastTypingRef.current) { setTyping(conversationId, false); lastTypingRef.current = false; }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setSending(true);
    setNewMessage('');
    const attachment = pendingAttachment;
    setPendingAttachment(null);

    try {
      const { data: messageData, error } = await supabase.from('messages').insert({
        conversation_id: activeConversation.id, sender_id: user.id, content,
      }).select().single();
      if (error) throw error;
      if (attachment && messageData) {
        const uploaded = await uploadAttachment(attachment.file, user.id, messageData.id);
        if (uploaded) await supabase.from('message_attachments').insert({ message_id: messageData.id, ...uploaded });
        if (attachment.localPreview) URL.revokeObjectURL(attachment.localPreview);
      }
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', activeConversation.id);
    } catch { toast.error('Failed to send message'); }
    finally { setSending(false); }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    try {
      await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji });
      setMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;
        const reactions = [...(msg.reactions || [])];
        const existing = reactions.find(r => r.emoji === emoji);
        if (existing) { existing.count++; existing.hasReacted = true; }
        else reactions.push({ emoji, count: 1, hasReacted: true });
        return { ...msg, reactions };
      }));
    } catch (error) { console.error('Failed to add reaction:', error); }
  };

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    try {
      await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji);
      setMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;
        const reactions = (msg.reactions || []).map(r => r.emoji !== emoji ? r : { ...r, count: r.count - 1, hasReacted: false }).filter(r => r.count > 0);
        return { ...msg, reactions };
      }));
    } catch (error) { console.error('Failed to remove reaction:', error); }
  };

  const handleMessageChange = (value: string) => {
    setNewMessage(value);
    if (conversationId && value.trim()) {
      if (!lastTypingRef.current) { setTyping(conversationId, true); lastTypingRef.current = true; }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (conversationId) { setTyping(conversationId, false); lastTypingRef.current = false; }
      }, 2000);
    } else if (conversationId && lastTypingRef.current) {
      setTyping(conversationId, false);
      lastTypingRef.current = false;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.otherProfile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';

  if (!user || !profile) {
    return (
      <div className="h-dvh bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <MessageCircle className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Sign in to Messages</h2>
          <p className="text-sm text-muted-foreground mb-5">Log in to view and send messages</p>
          <Button onClick={() => navigate('/login')} className="rounded-full px-8">Log In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-background flex flex-col md:flex-row overflow-hidden">
      {/* ── Conversation List ── */}
      <div className={cn(
        "w-full md:w-[360px] lg:w-[400px] flex-col border-r border-border/50 bg-card",
        conversationId ? 'hidden md:flex' : 'flex'
      )}>
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(profile?.user_type === 'employer' ? '/employer-dashboard' : '/candidate-dashboard')}
                className="text-primary-foreground hover:bg-white/20 h-9 w-9 shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-lg font-bold">Messages</h1>
                <p className="text-xs text-primary-foreground/70">
                  {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/50" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="pl-10 h-10 bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:bg-white/20 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[300px]">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <p className="font-medium text-foreground mb-1">
                {searchQuery ? 'No results found' : 'No conversations yet'}
              </p>
              <p className="text-xs text-muted-foreground max-w-[220px]">
                {searchQuery ? 'Try a different search term' : 'Start chatting from a candidate or job page'}
              </p>
            </div>
          ) : (
            <div className="py-1">
              {filteredConversations.map((conv) => {
                const isActive = conversationId === conv.id;
                return (
                  <motion.button
                    key={conv.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => navigate(`/messages/${conv.id}`)}
                    className={cn(
                      "w-full px-3 py-3 text-left transition-all duration-150 flex items-center gap-3",
                      "hover:bg-accent/50 active:bg-accent/70",
                      isActive && 'bg-primary/8 border-l-[3px] border-primary'
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className={cn(
                        "w-12 h-12 ring-2 ring-offset-2 ring-offset-card transition-all",
                        isActive ? "ring-primary" : "ring-transparent"
                      )}>
                        <AvatarImage src={conv.otherProfile?.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {getInitials(conv.otherProfile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-card rounded-full">
                        <OnlineStatus isOnline={isOnline(conv.otherProfile?.user_id || '')} size="md" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={cn(
                          "font-medium truncate text-sm",
                          conv.unreadCount > 0 && 'font-semibold text-foreground'
                        )}>
                          {conv.otherProfile?.full_name || 'Unknown User'}
                        </p>
                        <span className="text-[11px] text-muted-foreground ml-2 shrink-0 tabular-nums">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "text-xs truncate flex-1",
                          conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                        )}>
                          {conv.lastMessage || 'No messages yet'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge className="h-5 min-w-5 px-1.5 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold shrink-0 rounded-full">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1">
                        <Badge variant="secondary" className={cn(
                          "text-[10px] px-2 py-0 h-4 capitalize font-medium",
                          conv.otherProfile?.user_type === 'employer'
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-emerald-500/10 text-emerald-600'
                        )}>
                          {conv.otherProfile?.user_type}
                        </Badge>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8 text-muted-foreground/50 hover:text-destructive opacity-0 group-hover:opacity-100 md:opacity-0 md:hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setDeletingConvId(conv.id); setDeleteDialogOpen(true); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </motion.button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── Chat Area ── */}
      <div className={cn(
        "flex-1 flex flex-col min-h-0 overflow-hidden",
        conversationId ? 'flex' : 'hidden md:flex'
      )}>
        {activeConversation && otherUser ? (
          <>
            {/* Chat Header */}
            <div className="shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-primary/90" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
              <div className="relative px-3 py-3 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-primary-foreground hover:bg-white/20 h-9 w-9 shrink-0"
                  onClick={() => navigate('/messages')}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div
                  className="relative cursor-pointer"
                  onClick={() => navigate(otherUser?.user_type === 'candidate' ? `/candidates/${otherUser?.id}` : `/employers/${otherUser?.id}`)}
                >
                  <Avatar className="w-10 h-10 border-2 border-white/30 shadow-lg">
                    <AvatarImage src={otherUser?.avatar_url || ''} />
                    <AvatarFallback className="bg-white/20 text-primary-foreground font-semibold text-sm">
                      {getInitials(otherUser?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-primary rounded-full border border-primary">
                    <OnlineStatus isOnline={otherUserId ? isOnline(otherUserId) : false} size="sm" />
                  </div>
                </div>
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(otherUser?.user_type === 'candidate' ? `/candidates/${otherUser?.id}` : `/employers/${otherUser?.id}`)}
                >
                  <p className="font-semibold text-primary-foreground truncate text-sm">{otherUser?.full_name || 'Unknown'}</p>
                  <div className="flex items-center gap-1.5">
                    <OnlineStatus isOnline={otherUserId ? isOnline(otherUserId) : false} showLabel className="text-primary-foreground/80 text-xs" />
                    <span className="text-primary-foreground/50 text-xs">•</span>
                    <span className="text-xs text-primary-foreground/70 capitalize">{otherUser?.user_type}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary-foreground/70 hover:bg-white/20 hover:text-primary-foreground h-9 w-9 shrink-0"
                  onClick={() => { setDeletingConvId(activeConversation.id); setDeleteDialogOpen(true); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-muted/20" ref={scrollRef}>
              <div className="max-w-3xl mx-auto px-3 py-4 space-y-1">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                      <MessageCircle className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-sm font-medium mb-1">Start the conversation</p>
                    <p className="text-xs text-muted-foreground">Say hello to {otherUser?.full_name?.split(' ')[0] || 'them'}!</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {messages.map((message, index) => {
                      const isOwn = message.sender_id === user.id;
                      const showAvatar = index === 0 || messages[index - 1]?.sender_id !== message.sender_id;
                      const currentDate = new Date(message.created_at);
                      const showDateSep = index === 0 || !isSameDay(currentDate, new Date(messages[index - 1].created_at));

                      return (
                        <div key={message.id}>
                          {showDateSep && <DateSeparator date={currentDate} />}
                          <MessageBubble
                            message={message}
                            isOwn={isOwn}
                            showAvatar={showAvatar}
                            otherUser={otherUser}
                            onAddReaction={handleAddReaction}
                            onRemoveReaction={handleRemoveReaction}
                          />
                        </div>
                      );
                    })}
                  </AnimatePresence>
                )}
                <AnimatePresence>
                  {otherUserId && conversationId && isTyping(otherUserId, conversationId) && (
                    <TypingIndicator userName={otherUser?.full_name?.split(' ')[0]} />
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Smart Replies */}
            <SmartReplies
              messages={messages}
              currentUserId={user.id}
              userRole={profile?.user_type}
              onSelect={(reply) => setNewMessage(reply)}
              visible={messages.length > 0 && messages[messages.length - 1]?.sender_id !== user.id}
            />

            {/* Chat Input */}
            <div className="shrink-0">
              <ChatInput
                value={newMessage}
                onChange={handleMessageChange}
                onSubmit={sendMessage}
                disabled={false}
                sending={sending}
                userId={user.id}
                conversationId={conversationId || ''}
                pendingAttachment={pendingAttachment}
                onAttachmentReady={setPendingAttachment}
                onClearAttachment={() => {
                  if (pendingAttachment?.localPreview) URL.revokeObjectURL(pendingAttachment.localPreview);
                  setPendingAttachment(null);
                }}
                inputRef={inputRef}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <MessageCircle className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Your Messages</h2>
            <p className="text-sm text-center max-w-xs text-muted-foreground">
              Select a conversation to start messaging, or contact someone from their profile page.
            </p>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl max-w-[340px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete Chat</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will permanently delete this conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Messages;
