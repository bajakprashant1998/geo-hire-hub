import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, Send, User, MessageCircle, Search, Check, CheckCheck, 
  X, Maximize2, Minimize2 
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

  // Presence hook for online status and typing
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

  const formatReadTime = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    });
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

  if (!user || !profile) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={cn(
          "p-0 gap-0 overflow-hidden border-0",
          // Desktop
          "md:max-w-5xl md:h-[80vh] md:max-h-[700px] md:rounded-xl",
          // Mobile - full screen
          "max-w-full h-full max-h-full rounded-none w-full"
        )}
      >
        <div className="flex h-full w-full">
          {/* Conversation List */}
          <div 
            className={cn(
              "w-full md:w-80 bg-card border-r border-border flex-col",
              showConversationList ? "flex" : "hidden md:flex"
            )}
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-primary text-primary-foreground">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-heading font-semibold">Messages</h1>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose}
                  className="text-primary-foreground hover:bg-primary-foreground/20 md:hidden"
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
                  className="pl-10 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 focus:bg-primary-foreground/20"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No conversations found' : 'No conversations yet'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start chatting from a candidate or job page
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredConversations.map((conv) => (
                    <motion.button
                      key={conv.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => handleConversationSelect(conv.id)}
                      className={cn(
                        "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                        activeConversationId === conv.id && 'bg-primary/5 border-l-4 border-primary'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12 border-2 border-background shadow">
                            <AvatarImage src={conv.otherProfile?.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary font-heading">
                              {getInitials(conv.otherProfile?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute bottom-0 right-0 p-0.5 bg-card rounded-full">
                            <OnlineStatus isOnline={isOnline(conv.otherProfile?.user_id || '')} size="md" />
                          </div>
                          {conv.unreadCount > 0 && (
                            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={cn("font-medium truncate", conv.unreadCount > 0 && 'text-foreground')}>
                              {conv.otherProfile?.full_name || 'Unknown User'}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(conv.last_message_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              "text-sm truncate",
                              conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                            )}>
                              {conv.lastMessage || 'No messages yet'}
                            </p>
                          </div>
                          <Badge variant="secondary" className="mt-1 text-xs capitalize bg-muted">
                            {conv.otherProfile?.user_type}
                          </Badge>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div 
            className={cn(
              "flex-1 flex-col bg-muted/30",
              !showConversationList ? "flex" : "hidden md:flex"
            )}
          >
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border bg-card shadow-sm flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden" 
                    onClick={handleBackToList}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="relative">
                    <Avatar className="w-10 h-10 border-2 border-background">
                      <AvatarImage src={otherUser?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary font-heading">
                        {getInitials(otherUser?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 p-0.5 bg-card rounded-full">
                      <OnlineStatus isOnline={otherUserId ? isOnline(otherUserId) : false} size="sm" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-heading font-semibold">{otherUser?.full_name || 'Unknown User'}</p>
                    <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                      <OnlineStatus isOnline={otherUserId ? isOnline(otherUserId) : false} showLabel />
                      <span className="mx-1">•</span>
                      {otherUser?.user_type}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      onClose();
                      navigate(otherUser?.user_type === 'candidate' ? `/candidates/${otherUser?.id}` : `/employers/${otherUser?.id}`);
                    }}
                    className="hidden sm:flex"
                  >
                    View Profile
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={onClose}
                    className="hidden md:flex"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  <div className="max-w-3xl mx-auto space-y-3">
                    <AnimatePresence>
                      {messages.map((message, index) => {
                        const isOwn = message.sender_id === user.id;
                        const showAvatar = index === 0 || messages[index - 1]?.sender_id !== message.sender_id;
                        const readTime = formatReadTime(message.read_at);
                        
                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn("group flex", isOwn ? 'justify-end' : 'justify-start', !showAvatar && 'mt-1')}
                          >
                            {!isOwn && showAvatar && (
                              <Avatar className="w-8 h-8 mr-2 flex-shrink-0">
                                <AvatarImage src={otherUser?.avatar_url || ''} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {getInitials(otherUser?.full_name)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            {!isOwn && !showAvatar && <div className="w-8 mr-2" />}
                            
                            <div className="max-w-[70%]">
                              <div
                                className={cn(
                                  "rounded-2xl px-4 py-2.5",
                                  isOwn
                                    ? 'bg-primary text-primary-foreground rounded-br-md'
                                    : 'bg-card border border-border rounded-bl-md shadow-sm'
                                )}
                              >
                                {message.content !== '📎 Attachment' && (
                                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                )}
                                
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="space-y-2">
                                    {message.attachments.map(att => (
                                      <MessageAttachment key={att.id} attachment={att} isOwn={isOwn} />
                                    ))}
                                  </div>
                                )}
                                
                                <div className={cn("flex items-center gap-1 mt-1", isOwn && 'justify-end')}>
                                  <p className={cn("text-xs", isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                    {formatTime(message.created_at)}
                                  </p>
                                  {isOwn && (
                                    message.is_read ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex items-center cursor-help">
                                            <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/70" />
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="text-xs">
                                          {readTime ? `Seen ${readTime}` : 'Seen'}
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Check className="w-3.5 h-3.5 text-primary-foreground/70" />
                                    )
                                  )}
                                </div>
                              </div>
                              
                              <EmojiReactions
                                reactions={message.reactions || []}
                                onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                                onRemoveReaction={(emoji) => handleRemoveReaction(message.id, emoji)}
                                isOwn={isOwn}
                              />
                            </div>
                          </motion.div>
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

                {/* Input */}
                <form onSubmit={sendMessage} className="p-4 border-t border-border bg-card">
                  <div className="max-w-3xl mx-auto">
                    {pendingAttachment && (
                      <div className="mb-2">
                        <AttachmentUpload
                          userId={user.id}
                          conversationId={activeConversationId || ''}
                          onAttachmentReady={setPendingAttachment}
                          pendingAttachment={pendingAttachment}
                          onClearAttachment={() => {
                            if (pendingAttachment?.localPreview) {
                              URL.revokeObjectURL(pendingAttachment.localPreview);
                            }
                            setPendingAttachment(null);
                          }}
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {!pendingAttachment && (
                        <AttachmentUpload
                          userId={user.id}
                          conversationId={activeConversationId || ''}
                          onAttachmentReady={setPendingAttachment}
                          pendingAttachment={null}
                          onClearAttachment={() => setPendingAttachment(null)}
                        />
                      )}
                      <Input
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          
                          if (activeConversationId && e.target.value.trim()) {
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
                        }}
                        placeholder="Type a message..."
                        className="flex-1 rounded-full px-4"
                      />
                      <Button 
                        type="submit" 
                        disabled={(!newMessage.trim() && !pendingAttachment) || sending}
                        className="rounded-full w-10 h-10 p-0"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <MessageCircle className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-xl font-heading font-semibold text-foreground mb-2">Your Messages</h2>
                <p className="text-center max-w-sm">
                  Select a conversation to start messaging, or contact a candidate/employer from their profile page.
                </p>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={onClose}
                  className="absolute top-4 right-4"
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
