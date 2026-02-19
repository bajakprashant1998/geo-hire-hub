import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { 
  MessageCircle, Search, X, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { TypingIndicator } from './TypingIndicator';
import { OnlineStatus } from './OnlineStatus';
import { uploadAttachment } from './AttachmentUpload';
import { ChatHeader } from './ChatHeader';
import { ConversationCard } from './ConversationCard';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { cn } from '@/lib/utils';

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

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConversationId?: string;
}

export const ChatModal = ({ isOpen, onClose, initialConversationId }: ChatModalProps) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId || null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ file: File; localPreview?: string } | null>(null);
  const [showConversationList, setShowConversationList] = useState(!initialConversationId);
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
    if (!user || !isOpen) return;

    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (data && !error) {
        const convosWithProfiles = await Promise.all(
          data.map(async (conv) => {
            const otherUserId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
            
            const [profileResult, unreadResult, lastMessageResult] = await Promise.all([
              supabase.from('public_profiles').select('*').eq('user_id', otherUserId).maybeSingle(),
              supabase.from('messages').select('id', { count: 'exact' })
                .eq('conversation_id', conv.id)
                .eq('is_read', false)
                .neq('sender_id', user.id),
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
      .channel('modal-conversations-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isOpen]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConversationId || !isOpen) {
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      const { data: convData } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', activeConversationId)
        .maybeSingle();

      if (convData) {
        setActiveConversation(convData);

        const otherUserId = convData.participant_1 === user?.id ? convData.participant_2 : convData.participant_1;
        const { data: profileData } = await supabase
          .from('public_profiles')
          .select('*')
          .eq('user_id', otherUserId)
          .maybeSingle();
        setOtherUser(profileData);

        const { data: messagesData } = await supabase
          .from('messages')
          .select('*, read_at')
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

          const messagesWithData = messagesData.map(msg => ({
            ...msg,
            attachments: attachmentsByMessage.get(msg.id) || [],
            reactions: Array.from(reactionsByMessage.get(msg.id)?.entries() || []).map(([emoji, data]) => ({
              emoji,
              count: data.count,
              hasReacted: data.users.includes(user?.id || '')
            }))
          }));

          setMessages(messagesWithData);
        }

        const now = new Date().toISOString();
        await supabase
          .from('messages')
          .update({ is_read: true, read_at: now })
          .eq('conversation_id', activeConversationId)
          .neq('sender_id', user?.id)
          .is('read_at', null);

        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };

    fetchMessages();
  }, [activeConversationId, user, isOpen]);

  // Subscribe to new messages
  useEffect(() => {
    if (!activeConversationId || !isOpen) return;

    const channel = supabase
      .channel(`modal-messages-${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          if ((payload.new as Message).sender_id !== user?.id) {
            supabase.from('messages').update({ is_read: true }).eq('id', (payload.new as Message).id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, user, isOpen]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveConversationId(initialConversationId || null);
      setShowConversationList(!initialConversationId);
      setNewMessage('');
      setPendingAttachment(null);
    }
  }, [isOpen, initialConversationId]);

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
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setSending(true);
    setNewMessage('');
    const attachment = pendingAttachment;
    setPendingAttachment(null);

    try {
      const { data: messageData, error } = await supabase.from('messages').insert({
        conversation_id: activeConversation.id,
        sender_id: user.id,
        content,
      }).select().single();

      if (error) throw error;

      if (attachment && messageData) {
        const uploadedAttachment = await uploadAttachment(
          attachment.file,
          user.id,
          messageData.id
        );
        
        if (uploadedAttachment) {
          await supabase.from('message_attachments').insert({
            message_id: messageData.id,
            ...uploadedAttachment
          });
        }
        
        if (attachment.localPreview) {
          URL.revokeObjectURL(attachment.localPreview);
        }
      }

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeConversation.id);
    } catch (error: any) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    
    try {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji
      });
      
      setMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;
        const reactions = [...(msg.reactions || [])];
        const existing = reactions.find(r => r.emoji === emoji);
        if (existing) {
          existing.count++;
          existing.hasReacted = true;
        } else {
          reactions.push({ emoji, count: 1, hasReacted: true });
        }
        return { ...msg, reactions };
      }));
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    
    try {
      await supabase.from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
      
      setMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;
        const reactions = [...(msg.reactions || [])].map(r => {
          if (r.emoji !== emoji) return r;
          return { ...r, count: r.count - 1, hasReacted: false };
        }).filter(r => r.count > 0);
        return { ...msg, reactions };
      }));
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.otherProfile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';

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
    onClose();
    navigate(otherUser.user_type === 'candidate' ? `/candidates/${otherUser.id}` : `/employers/${otherUser.id}`);
  };

  const handleMessageChange = (value: string) => {
    setNewMessage(value);
    
    if (activeConversationId && value.trim()) {
      if (!lastTypingRef.current) {
        setTyping(activeConversationId, true);
        lastTypingRef.current = true;
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        if (activeConversationId) {
          setTyping(activeConversationId, false);
          lastTypingRef.current = false;
        }
      }, 2000);
    } else if (activeConversationId && lastTypingRef.current) {
      setTyping(activeConversationId, false);
      lastTypingRef.current = false;
    }
  };

  if (!user || !profile) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        hideClose
        className={cn(
          "p-0 gap-0 overflow-hidden border-0 shadow-2xl",
          "md:max-w-5xl md:h-[85vh] md:max-h-[750px] md:rounded-2xl",
          "max-w-full h-full max-h-full rounded-none w-full"
        )}
      >
        <div className="flex h-full w-full bg-background">
          {/* Conversation List Sidebar */}
          <div 
            className={cn(
              "w-full md:w-[320px] flex-col border-r border-border/50",
              "bg-gradient-to-b from-card to-card/95",
              showConversationList ? "flex" : "hidden md:flex"
            )}
          >
            {/* Sidebar Header */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-primary/90" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white/15 via-transparent to-transparent" />
              
              <div className="relative p-4 pb-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <h1 className="text-xl font-bold text-primary-foreground">Messages</h1>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClose}
                    className="text-primary-foreground hover:bg-white/20 md:hidden h-9 w-9"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/60" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="pl-10 h-10 bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:bg-white/20 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* My Profile Card */}
            <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                  <AvatarImage src={profile.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{profile.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Online
                  </p>
                </div>
              </div>
            </div>

            {/* Conversation List */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-3">Loading chats...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-primary" />
                  </div>
                  <p className="font-medium text-foreground mb-1">
                    {searchQuery ? 'No results found' : 'No conversations yet'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'Try a different search' : 'Start chatting from profiles'}
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {filteredConversations.map((conv) => (
                    <ConversationCard
                      key={conv.id}
                      conversation={conv}
                      isActive={activeConversationId === conv.id}
                      isOnline={isOnline(conv.otherProfile?.user_id || '')}
                      onClick={() => handleConversationSelect(conv.id)}
                      formatTime={formatTime}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div 
            className={cn(
              "flex-1 flex-col",
              "bg-gradient-to-b from-muted/30 via-background to-muted/20",
              !showConversationList ? "flex" : "hidden md:flex"
            )}
          >
            {activeConversation ? (
              <>
                <ChatHeader
                  otherUser={otherUser}
                  isOnline={otherUserId ? isOnline(otherUserId) : false}
                  onBack={handleBackToList}
                  onClose={onClose}
                  onViewProfile={handleViewProfile}
                  showBackButton={true}
                />

                {/* Messages */}
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  <div className="max-w-3xl mx-auto space-y-2">
                    <AnimatePresence initial={false}>
                      {messages.map((message, index) => {
                        const isOwn = message.sender_id === user.id;
                        const showAvatar = index === 0 || messages[index - 1]?.sender_id !== message.sender_id;
                        
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
                      })}
                    </AnimatePresence>
                    
                    <AnimatePresence>
                      {otherUserId && activeConversationId && isTyping(otherUserId, activeConversationId) && (
                        <TypingIndicator userName={otherUser?.full_name?.split(' ')[0]} />
                      )}
                    </AnimatePresence>
                  </div>
                </ScrollArea>

                <ChatInput
                  value={newMessage}
                  onChange={handleMessageChange}
                  onSubmit={sendMessage}
                  sending={sending}
                  userId={user.id}
                  conversationId={activeConversationId || ''}
                  pendingAttachment={pendingAttachment}
                  onAttachmentReady={setPendingAttachment}
                  onClearAttachment={() => {
                    if (pendingAttachment?.localPreview) {
                      URL.revokeObjectURL(pendingAttachment.localPreview);
                    }
                    setPendingAttachment(null);
                  }}
                  inputRef={inputRef}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
                      <MessageCircle className="w-12 h-12 text-primary" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">Your Messages</h2>
                  <p className="text-sm max-w-[280px] mx-auto">
                    Select a conversation to start messaging, or visit a profile to begin a new chat.
                  </p>
                </motion.div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={onClose}
                  className="absolute top-4 right-4 hidden md:flex"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};