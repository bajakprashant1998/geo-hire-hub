import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import {
  MessageCircle, Search, ArrowLeft, Send, Trash2, Phone, Video,
  Check, CheckCheck, Paperclip, Smile, MoreVertical, User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { TypingIndicator } from '@/components/messaging/TypingIndicator';
import { OnlineStatus } from '@/components/messaging/OnlineStatus';
import { EmojiReactions } from '@/components/messaging/EmojiReactions';
import { MessageAttachment } from '@/components/messaging/MessageAttachment';
import { AttachmentUpload, uploadAttachment } from '@/components/messaging/AttachmentUpload';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

export const DashboardMessaging = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ file: File; localPreview?: string } | null>(null);
  const [showConversationList, setShowConversationList] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<boolean>(false);

  const { isOnline, isTyping, setTyping } = usePresence(activeConversationId || undefined);
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
      .channel('dashboard-conversations-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Fetch messages
  useEffect(() => {
    if (!activeConversationId) {
      setActiveConversation(null);
      setMessages([]);
      return;
    }
    const fetchMessages = async () => {
      const { data: convData } = await supabase
        .from('conversations').select('*').eq('id', activeConversationId).maybeSingle();
      if (!convData) return;
      setActiveConversation(convData);

      const otherId = convData.participant_1 === user?.id ? convData.participant_2 : convData.participant_1;
      const { data: profileData } = await supabase
        .from('public_profiles').select('*').eq('user_id', otherId).maybeSingle();
      setOtherUser(profileData);

      const { data: messagesData } = await supabase
        .from('messages').select('*, read_at')
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true });

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

      await supabase.from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', activeConversationId)
        .neq('sender_id', user?.id).is('read_at', null);

      setTimeout(() => inputRef.current?.focus(), 100);
    };
    fetchMessages();
  }, [activeConversationId, user]);

  // Realtime messages
  useEffect(() => {
    if (!activeConversationId) return;
    const channel = supabase
      .channel(`dash-messages-${activeConversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${activeConversationId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        if ((payload.new as Message).sender_id !== user?.id) {
          supabase.from('messages').update({ is_read: true }).eq('id', (payload.new as Message).id);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId, user]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const MAX_MESSAGE_LENGTH = 10000;

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !pendingAttachment) || !user || !activeConversation) return;
    const content = newMessage.trim() || (pendingAttachment ? '📎 Attachment' : '');
    if (content.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`);
      return;
    }
    if (activeConversationId && lastTypingRef.current) {
      setTyping(activeConversationId, false);
      lastTypingRef.current = false;
    }
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
        const uploadedAttachment = await uploadAttachment(attachment.file, user.id, messageData.id);
        if (uploadedAttachment) {
          await supabase.from('message_attachments').insert({ message_id: messageData.id, ...uploadedAttachment });
        }
        if (attachment.localPreview) URL.revokeObjectURL(attachment.localPreview);
      }
      await supabase.from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeConversation.id);
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
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
        else { reactions.push({ emoji, count: 1, hasReacted: true }); }
        return { ...msg, reactions };
      }));
    } catch (error) { console.error('Failed to add reaction:', error); }
  };

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    try {
      await supabase.from('message_reactions').delete()
        .eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji);
      setMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;
        const reactions = [...(msg.reactions || [])].map(r => {
          if (r.emoji !== emoji) return r;
          return { ...r, count: r.count - 1, hasReacted: false };
        }).filter(r => r.count > 0);
        return { ...msg, reactions };
      }));
    } catch (error) { console.error('Failed to remove reaction:', error); }
  };

  const handleDeleteConversation = async () => {
    if (!deletingConvId || !user) return;
    setDeleting(true);
    try {
      await supabase.from('messages').delete().eq('conversation_id', deletingConvId);
      const { error } = await supabase.from('conversations').delete().eq('id', deletingConvId);
      if (error) throw error;
      toast.success('Chat deleted successfully');
      setConversations(prev => prev.filter(c => c.id !== deletingConvId));
      if (activeConversationId === deletingConvId) {
        setActiveConversationId(null);
        setActiveConversation(null);
        setMessages([]);
        setShowConversationList(true);
      }
    } catch (error: any) {
      toast.error('Failed to delete chat: ' + error.message);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingConvId(null);
    }
  };

  const handleMessageChange = (value: string) => {
    setNewMessage(value);
    if (activeConversationId && value.trim()) {
      if (!lastTypingRef.current) { setTyping(activeConversationId, true); lastTypingRef.current = true; }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (activeConversationId) { setTyping(activeConversationId, false); lastTypingRef.current = false; }
      }, 2000);
    } else if (activeConversationId && lastTypingRef.current) {
      setTyping(activeConversationId, false);
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

  const getInitials = (name?: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';

  const filteredConversations = conversations.filter((conv) =>
    conv.otherProfile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConversationSelect = (convId: string) => {
    setActiveConversationId(convId);
    setShowConversationList(false);
  };

  const handleBackToList = () => {
    setActiveConversationId(null);
    setShowConversationList(true);
  };

  const handleViewProfile = () => {
    if (!otherUser) return;
    navigate(otherUser.user_type === 'candidate' ? `/candidates/${otherUser.id}` : `/employers/${otherUser.id}`);
  };

  if (!user || !profile) return null;

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] max-h-[800px] bg-background rounded-2xl border overflow-hidden">
      {/* Conversation List */}
      <div className={cn(
        "w-full md:w-[340px] flex-col border-r border-border bg-card",
        showConversationList ? "flex" : "hidden md:flex"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Messages</h2>
            {conversations.filter(c => c.unreadCount > 0).length > 0 && (
              <Badge className="h-5 min-w-5 px-1.5 bg-primary text-primary-foreground text-xs font-bold">
                {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
              </Badge>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="pl-9 h-9 bg-muted/50 border-border/50 text-sm"
            />
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No matching conversations' : 'No conversations yet'}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Start by applying to jobs or messaging candidates
              </p>
            </div>
          ) : (
            <div className="p-1.5">
              {filteredConversations.map((conv) => (
                <div key={conv.id} className="group relative">
                  <button
                    onClick={() => handleConversationSelect(conv.id)}
                    className={cn(
                      "w-full p-3 text-left rounded-xl transition-all duration-200 hover:bg-muted/70",
                      activeConversationId === conv.id && 'bg-primary/8 border border-primary/20'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className={cn(
                          "w-11 h-11 ring-2 ring-offset-1 ring-offset-background transition-all",
                          activeConversationId === conv.id ? "ring-primary/50" : "ring-transparent"
                        )}>
                          <AvatarImage src={conv.otherProfile?.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                            {getInitials(conv.otherProfile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-background rounded-full">
                          <OnlineStatus isOnline={false} size="sm" />
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
                          <span className="text-[11px] text-muted-foreground ml-2 shrink-0">
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
                            <Badge className="h-5 min-w-5 px-1.5 bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                  {/* Delete button on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingConvId(conv.id);
                      setDeleteDialogOpen(true);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex-col bg-background",
        !showConversationList || activeConversationId ? "flex" : "hidden md:flex"
      )}>
        {activeConversation && otherUser ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-3 sm:p-4 border-b border-border bg-card">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8 text-muted-foreground"
                onClick={handleBackToList}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="relative cursor-pointer" onClick={handleViewProfile}>
                <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                  <AvatarImage src={otherUser.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {getInitials(otherUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-background rounded-full">
                  <OnlineStatus isOnline={otherUserId ? isOnline(otherUserId) : false} size="sm" />
                </div>
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={handleViewProfile}>
                <p className="font-semibold text-foreground text-sm truncate hover:underline">
                  {otherUser.full_name || 'Unknown User'}
                </p>
                <div className="flex items-center gap-1.5">
                  <OnlineStatus isOnline={otherUserId ? isOnline(otherUserId) : false} showLabel className="text-muted-foreground text-xs" />
                  <span className="text-muted-foreground/50 text-xs">•</span>
                  <span className="text-xs text-muted-foreground capitalize">{otherUser.user_type}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleViewProfile}>
                      <User className="w-4 h-4 mr-2" /> View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setDeletingConvId(activeConversationId);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-muted/20">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">Start the conversation</p>
                  <p className="text-xs text-muted-foreground">Send a message to {otherUser.full_name}</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.sender_id === user?.id;
                  const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={isOwn}
                      showAvatar={showAvatar}
                      otherUser={otherUser}
                      onAddReaction={handleAddReaction}
                      onRemoveReaction={handleRemoveReaction}
                    />
                  );
                })
              )}
              {otherUserId && activeConversationId && isTyping(otherUserId, activeConversationId) && (
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={otherUser?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(otherUser?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <TypingIndicator />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border bg-card p-3 sm:p-4">
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                {!pendingAttachment && (
                  <AttachmentUpload
                    userId={user?.id || ''}
                    conversationId={activeConversation.id}
                    onAttachmentReady={setPendingAttachment}
                    pendingAttachment={null}
                    onClearAttachment={() => setPendingAttachment(null)}
                  />
                )}
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 h-10 bg-muted/50 border-border/50 text-sm rounded-full px-4"
                  disabled={sending}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={(!newMessage.trim() && !pendingAttachment) || sending}
                  className={cn(
                    "rounded-full h-10 w-10 transition-all",
                    (newMessage.trim() || pendingAttachment) && !sending
                      ? "bg-primary hover:bg-primary/90 shadow-md"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              {pendingAttachment && (
                <div className="mt-2">
                  <AttachmentUpload
                    userId={user?.id || ''}
                    conversationId={activeConversation.id}
                    onAttachmentReady={setPendingAttachment}
                    pendingAttachment={pendingAttachment}
                    onClearAttachment={() => setPendingAttachment(null)}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <MessageCircle className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Your Messages</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Select a conversation from the list to start chatting, or connect with employers and candidates through job listings.
            </p>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
