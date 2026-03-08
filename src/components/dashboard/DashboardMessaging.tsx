import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Check, CheckCheck, Paperclip, Smile, MoreVertical, User, Pin, PinOff,
  Filter, Star, Archive, Clock, MessageSquare, Users, Mail, Zap, X, Loader2,
  ChevronDown, ArrowDown, Sparkles, Copy, Reply
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
  DropdownMenuSeparator,
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

const QUICK_REPLIES_EMPLOYER = [
  { emoji: '👋', text: "Thanks for reaching out!" },
  { emoji: '📅', text: "Let's schedule an interview." },
  { emoji: '🕐', text: "Can you share your availability?" },
  { emoji: '⏳', text: "I'll get back to you shortly." },
  { emoji: '📄', text: "Could you send your updated resume?" },
  { emoji: '✅', text: "You've been shortlisted!" },
  { emoji: '🎯', text: "Your profile looks great for this role." },
];

type FilterType = 'all' | 'unread' | 'pinned';

// Date separator helper
const getDateLabel = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined });
};

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
  const [pinnedConversations, setPinnedConversations] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadDividerIndex, setUnreadDividerIndex] = useState<number | null>(null);

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

  // Load pinned from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`pinned-conversations-${user?.id}`);
    if (saved) setPinnedConversations(new Set(JSON.parse(saved)));
  }, [user?.id]);

  const togglePin = (convId: string) => {
    setPinnedConversations(prev => {
      const next = new Set(prev);
      if (next.has(convId)) { next.delete(convId); toast.success('Chat unpinned'); }
      else { next.add(convId); toast.success('Chat pinned'); }
      localStorage.setItem(`pinned-conversations-${user?.id}`, JSON.stringify([...next]));
      return next;
    });
  };

  // Stats
  const stats = useMemo(() => {
    const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
    const totalConversations = conversations.length;
    const activeToday = conversations.filter(c => {
      const d = new Date(c.last_message_at);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;
    return { totalUnread, totalConversations, activeToday };
  }, [conversations]);

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
              supabase.from('messages').select('content, sender_id').eq('conversation_id', conv.id)
                .order('created_at', { ascending: false }).limit(1).maybeSingle()
            ]);
            return {
              ...conv,
              otherProfile: profileResult.data,
              unreadCount: unreadResult.count || 0,
              lastMessage: lastMessageResult.data?.content,
              lastMessageIsOwn: lastMessageResult.data?.sender_id === user.id,
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

        const enriched = messagesData.map(msg => ({
          ...msg,
          attachments: attachmentsByMessage.get(msg.id) || [],
          reactions: Array.from(reactionsByMessage.get(msg.id)?.entries() || []).map(([emoji, data]) => ({
            emoji, count: data.count, hasReacted: data.users.includes(user?.id || '')
          }))
        }));

        // Find unread divider position
        const firstUnread = enriched.findIndex(m => !m.is_read && m.sender_id !== user?.id);
        setUnreadDividerIndex(firstUnread > 0 ? firstUnread : null);

        setMessages(enriched);
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
          supabase.from('messages').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', (payload.new as Message).id);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId, user]);

  // Auto-scroll + scroll bottom button
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 120);
  }, []);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

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

  const sendQuickReply = (text: string) => {
    setNewMessage(text);
    setShowQuickReplies(false);
    setTimeout(() => inputRef.current?.focus(), 50);
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

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied');
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

  const filteredConversations = useMemo(() => {
    let filtered = conversations.filter((conv) =>
      conv.otherProfile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filterType === 'unread') {
      filtered = filtered.filter(c => c.unreadCount > 0);
    } else if (filterType === 'pinned') {
      filtered = filtered.filter(c => pinnedConversations.has(c.id));
    }

    // Sort: pinned first, then by last_message_at
    filtered.sort((a, b) => {
      const aPinned = pinnedConversations.has(a.id);
      const bPinned = pinnedConversations.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });

    return filtered;
  }, [conversations, searchQuery, filterType, pinnedConversations]);

  // Group conversations into pinned/recent sections
  const { pinnedList, recentList } = useMemo(() => {
    const pinned = filteredConversations.filter(c => pinnedConversations.has(c.id));
    const recent = filteredConversations.filter(c => !pinnedConversations.has(c.id));
    return { pinnedList: pinned, recentList: recent };
  }, [filteredConversations, pinnedConversations]);

  // Message search results
  const messageSearchResults = useMemo(() => {
    if (!messageSearchQuery.trim()) return [];
    return messages.filter(m =>
      m.content.toLowerCase().includes(messageSearchQuery.toLowerCase())
    );
  }, [messages, messageSearchQuery]);

  // Messages with date separators
  const messagesWithDates = useMemo(() => {
    const result: { type: 'date' | 'message' | 'unread-divider'; date?: string; message?: Message; index?: number }[] = [];
    let lastDate = '';
    messages.forEach((msg, idx) => {
      const dateLabel = getDateLabel(msg.created_at);
      if (dateLabel !== lastDate) {
        result.push({ type: 'date', date: dateLabel });
        lastDate = dateLabel;
      }
      if (unreadDividerIndex !== null && idx === unreadDividerIndex) {
        result.push({ type: 'unread-divider' });
      }
      result.push({ type: 'message', message: msg, index: idx });
    });
    return result;
  }, [messages, unreadDividerIndex]);

  const handleConversationSelect = (convId: string) => {
    setActiveConversationId(convId);
    setShowConversationList(false);
    setShowQuickReplies(false);
    setShowMessageSearch(false);
    setMessageSearchQuery('');
  };

  const handleBackToList = () => {
    setActiveConversationId(null);
    setShowConversationList(true);
  };

  const handleViewProfile = () => {
    if (!otherUser) return;
    navigate(otherUser.user_type === 'candidate' ? `/candidates/${otherUser.id}` : `/employers/${otherUser.id}`);
  };

  const scrollToMessage = (messageId: string) => {
    setHighlightedMessageId(messageId);
    const el = document.getElementById(`msg-${messageId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setHighlightedMessageId(null), 2000);
  };

  if (!user || !profile) return null;

  const renderConversationItem = (conv: any) => {
    const isPinned = pinnedConversations.has(conv.id);
    const isActive = activeConversationId === conv.id;
    return (
      <motion.div
        key={conv.id}
        layout
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="group relative"
      >
        <button
          onClick={() => handleConversationSelect(conv.id)}
          className={cn(
            "w-full p-3 pr-9 text-left rounded-xl transition-all duration-200",
            "hover:bg-accent/60",
            isActive && 'bg-primary/8 ring-1 ring-primary/20',
          )}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className={cn(
                "w-11 h-11 ring-2 ring-offset-1 ring-offset-background transition-all",
                isActive ? "ring-primary/50" : "ring-transparent"
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
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <p className={cn(
                    "font-medium truncate text-sm",
                    conv.unreadCount > 0 && 'font-semibold text-foreground'
                  )}>
                    {conv.otherProfile?.full_name || 'Unknown User'}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                  {formatTime(conv.last_message_at)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <p className={cn(
                  "text-xs truncate flex-1",
                  conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}>
                  {conv.lastMessageIsOwn && <span className="text-muted-foreground mr-0.5">You: </span>}
                  {conv.lastMessage || 'No messages yet'}
                </p>
                {conv.unreadCount > 0 && (
                  <Badge className="h-5 min-w-5 px-1.5 bg-primary text-primary-foreground text-[10px] font-bold shrink-0 animate-in fade-in">
                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {conv.otherProfile?.user_type && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] px-2 py-0 h-4 capitalize rounded-full",
                      conv.otherProfile.user_type === 'employer'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border border-[hsl(var(--success))]/20'
                    )}
                  >
                    {conv.otherProfile.user_type === 'employer' ? '🏢 Employer' : '👤 Candidate'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </button>
        {/* Hover actions */}
        <div className="absolute top-2 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-all flex gap-0.5 bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-sm p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); togglePin(conv.id); }}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{isPinned ? 'Unpin' : 'Pin'}</TooltipContent>
          </Tooltip>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeletingConvId(conv.id);
              setDeleteDialogOpen(true);
            }}
            className="p-1.5 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { icon: MessageSquare, label: 'Conversations', value: stats.totalConversations, color: 'bg-primary/10 text-primary', delay: 0 },
          { icon: Mail, label: 'Unread', value: stats.totalUnread, color: 'bg-destructive/10 text-destructive', delay: 0.05 },
          { icon: Clock, label: 'Active Today', value: stats.activeToday, color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]', delay: 0.1 },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stat.delay }}
            className="bg-card border border-border rounded-xl p-2.5 sm:p-3.5 flex items-center gap-2 sm:gap-3 hover:shadow-md transition-shadow"
          >
            <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0", stat.color)}>
              <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{stat.label}</p>
              <p className="text-lg sm:text-xl font-bold text-foreground">{stat.value}</p>
            </div>
            {stat.label === 'Unread' && stat.value > 0 && (
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse ml-auto shrink-0" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Main Chat Area */}
      <div className="flex h-[calc(100vh-380px)] sm:h-[calc(100vh-320px)] min-h-[400px] bg-background rounded-2xl border overflow-hidden shadow-sm">
        {/* Conversation List */}
        <div className={cn(
          "w-full md:w-[340px] lg:w-[380px] flex-col border-r border-border bg-card overflow-hidden",
          showConversationList ? "flex" : "hidden md:flex"
        )}>
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Messages</h2>
                {stats.totalUnread > 0 && (
                  <Badge className="h-5 min-w-5 px-1.5 bg-primary text-primary-foreground text-xs font-bold animate-in zoom-in">
                    {stats.totalUnread}
                  </Badge>
                )}
              </div>
            </div>
            <div className="relative mb-2.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
                className="pl-9 h-9 bg-secondary/50 border-border/50 text-sm rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {/* Filter Chips */}
            <div className="flex gap-1.5">
              {([
                { key: 'all' as FilterType, label: 'All', icon: MessageSquare, count: stats.totalConversations },
                { key: 'unread' as FilterType, label: 'Unread', icon: Mail, count: stats.totalUnread },
                { key: 'pinned' as FilterType, label: 'Pinned', icon: Pin, count: pinnedConversations.size },
              ]).map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilterType(f.key)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all",
                    filterType === f.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <f.icon className="w-3 h-3" />
                  {f.label}
                  {f.count > 0 && (
                    <span className={cn(
                      "ml-0.5 rounded-full px-1.5 text-[10px] leading-relaxed",
                      filterType === f.key ? "bg-primary-foreground/20" : "bg-background"
                    )}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                    <div className="w-11 h-11 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-full bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {searchQuery ? 'No results found' : filterType === 'unread' ? 'All caught up! 🎉' : filterType === 'pinned' ? 'No pinned chats' : 'No conversations yet'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {searchQuery ? 'Try a different search term' : filterType === 'unread' ? 'You have no unread messages' : filterType === 'pinned' ? 'Pin important conversations to access them quickly' : 'Apply to jobs or connect with employers to start chatting'}
                </p>
              </div>
            ) : (
              <div className="p-1.5">
                {/* Pinned section */}
                {filterType === 'all' && pinnedList.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                      <Pin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pinned</span>
                    </div>
                    <AnimatePresence mode="popLayout">
                      {pinnedList.map(renderConversationItem)}
                    </AnimatePresence>
                    {recentList.length > 0 && (
                      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent</span>
                      </div>
                    )}
                  </>
                )}
                {/* Recent / filtered list */}
                <AnimatePresence mode="popLayout">
                  {(filterType === 'all' ? recentList : filteredConversations).map(renderConversationItem)}
                </AnimatePresence>
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
              <div className="flex items-center gap-3 p-3 sm:p-4 border-b border-border bg-card/80 backdrop-blur-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-8 w-8 text-muted-foreground"
                  onClick={handleBackToList}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="relative cursor-pointer group" onClick={handleViewProfile}>
                  <Avatar className="w-10 h-10 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all">
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
                  <p className="font-semibold text-foreground text-sm truncate hover:text-primary transition-colors">
                    {otherUser.full_name || 'Unknown User'}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <OnlineStatus isOnline={otherUserId ? isOnline(otherUserId) : false} showLabel className="text-muted-foreground text-xs" />
                    <span className="text-muted-foreground/50 text-xs">•</span>
                    <span className="text-xs text-muted-foreground capitalize">{otherUser.user_type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8", showMessageSearch ? "text-primary bg-primary/10" : "text-muted-foreground")}
                        onClick={() => { setShowMessageSearch(!showMessageSearch); if (showMessageSearch) setMessageSearchQuery(''); }}
                      >
                        <Search className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Search in chat</TooltipContent>
                  </Tooltip>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={handleViewProfile}>
                        <User className="w-4 h-4 mr-2" /> View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => activeConversationId && togglePin(activeConversationId)}>
                        {activeConversationId && pinnedConversations.has(activeConversationId)
                          ? <><PinOff className="w-4 h-4 mr-2" /> Unpin Chat</>
                          : <><Pin className="w-4 h-4 mr-2" /> Pin Chat</>
                        }
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
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

              {/* Message Search Bar */}
              <AnimatePresence>
                {showMessageSearch && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-b border-border bg-muted/30 overflow-hidden"
                  >
                    <div className="p-2 flex items-center gap-2">
                      <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Input
                        value={messageSearchQuery}
                        onChange={(e) => setMessageSearchQuery(e.target.value)}
                        placeholder="Search in this conversation..."
                        className="h-8 text-sm border-none bg-transparent shadow-none focus-visible:ring-0"
                        autoFocus
                      />
                      {messageSearchQuery && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {messageSearchResults.length} found
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => { setShowMessageSearch(false); setMessageSearchQuery(''); }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {messageSearchResults.length > 0 && (
                      <div className="px-2 pb-2 flex gap-1 overflow-x-auto">
                        {messageSearchResults.slice(0, 5).map(m => (
                          <button
                            key={m.id}
                            onClick={() => scrollToMessage(m.id)}
                            className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-full shrink-0 hover:bg-primary/20 transition-colors"
                          >
                            {m.content.slice(0, 30)}{m.content.length > 30 ? '...' : ''}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1 bg-muted/20 relative"
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <MessageCircle className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">Start the conversation</p>
                    <p className="text-xs text-muted-foreground mb-4">Send a message to {otherUser.full_name}</p>
                    <div className="flex flex-wrap gap-1.5 justify-center max-w-xs">
                      {QUICK_REPLIES_EMPLOYER.slice(0, 3).map((qr, i) => (
                        <button
                          key={i}
                          onClick={() => sendQuickReply(qr.text)}
                          className="text-xs px-3 py-1.5 bg-card border border-border rounded-full hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
                        >
                          {qr.emoji} {qr.text}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messagesWithDates.map((item, i) => {
                    if (item.type === 'date') {
                      return (
                        <div key={`date-${i}`} className="flex items-center gap-3 py-3">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full">
                            {item.date}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      );
                    }
                    if (item.type === 'unread-divider') {
                      return (
                        <div key="unread-divider" className="flex items-center gap-3 py-2">
                          <div className="flex-1 h-px bg-primary/40" />
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                            New messages
                          </span>
                          <div className="flex-1 h-px bg-primary/40" />
                        </div>
                      );
                    }
                    const message = item.message!;
                    const idx = item.index!;
                    const isOwn = message.sender_id === user?.id;
                    const showAvatar = idx === 0 || messages[idx - 1].sender_id !== message.sender_id;
                    return (
                      <div
                        key={message.id}
                        id={`msg-${message.id}`}
                        className={cn(
                          "group/msg relative transition-all duration-500 py-0.5",
                          highlightedMessageId === message.id && "bg-primary/10 rounded-xl -mx-1 px-1"
                        )}
                      >
                        <MessageBubble
                          message={message}
                          isOwn={isOwn}
                          showAvatar={showAvatar}
                          otherUser={otherUser}
                          onAddReaction={handleAddReaction}
                          onRemoveReaction={handleRemoveReaction}
                        />
                        {/* Copy action on hover */}
                        {message.content !== '📎 Attachment' && (
                          <div className={cn(
                            "absolute top-1 opacity-0 group-hover/msg:opacity-100 transition-opacity",
                            isOwn ? "left-0" : "right-0"
                          )}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => copyMessage(message.content)}
                                  className="p-1 rounded-md bg-card/90 border border-border shadow-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">Copy</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                {otherUserId && activeConversationId && isTyping(otherUserId, activeConversationId) && (
                  <div className="flex items-center gap-2 py-1">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={otherUser?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(otherUser?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <TypingIndicator />
                  </div>
                )}

                {/* Scroll to bottom FAB */}
                <AnimatePresence>
                  {showScrollBottom && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={scrollToBottom}
                      className="sticky bottom-2 left-1/2 -translate-x-1/2 z-20 w-9 h-9 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors mx-auto"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Quick Replies */}
              <AnimatePresence>
                {showQuickReplies && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border bg-muted/30 overflow-hidden"
                  >
                    <div className="p-2.5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Zap className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Quick Replies</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_REPLIES_EMPLOYER.map((reply, i) => (
                          <button
                            key={i}
                            onClick={() => sendQuickReply(reply.text)}
                            className="text-xs px-3 py-1.5 bg-card border border-border rounded-full hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all flex items-center gap-1"
                          >
                            <span>{reply.emoji}</span>
                            <span>{reply.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input */}
              <div className="border-t border-border bg-card p-3 sm:p-4">
                {pendingAttachment && (
                  <div className="mb-2">
                    <AttachmentUpload
                      userId={user?.id || ''}
                      conversationId={activeConversation.id}
                      onAttachmentReady={setPendingAttachment}
                      pendingAttachment={pendingAttachment}
                      onClearAttachment={() => setPendingAttachment(null)}
                    />
                  </div>
                )}
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-9 w-9 shrink-0 rounded-xl transition-colors",
                          showQuickReplies ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
                        )}
                        onClick={() => setShowQuickReplies(!showQuickReplies)}
                      >
                        <Zap className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Quick replies</TooltipContent>
                  </Tooltip>
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={newMessage}
                      onChange={(e) => handleMessageChange(e.target.value)}
                      placeholder="Type a message..."
                      className="h-10 bg-secondary/50 border-border/50 text-sm rounded-full px-4 pr-12"
                      disabled={sending}
                    />
                    {newMessage.length > 0 && (
                      <span className={cn(
                        "absolute right-3 top-1/2 -translate-y-1/2 text-[10px]",
                        newMessage.length > MAX_MESSAGE_LENGTH * 0.9 ? "text-destructive" : "text-muted-foreground/50"
                      )}>
                        {newMessage.length.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    disabled={(!newMessage.trim() && !pendingAttachment) || sending}
                    className={cn(
                      "rounded-full h-10 w-10 transition-all shrink-0",
                      (newMessage.trim() || pendingAttachment) && !sending
                        ? "bg-primary hover:bg-primary/90 shadow-md"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center max-w-sm"
              >
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 shadow-sm">
                  <MessageCircle className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Your Messages</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Select a conversation to start chatting. Connect with candidates through job applications.
                </p>
                <div className="grid grid-cols-1 gap-2 w-full text-left">
                  {[
                    { icon: Zap, label: 'Quick replies', desc: 'Respond faster with templates', color: 'text-primary' },
                    { icon: Paperclip, label: 'File sharing', desc: 'Send resumes & documents', color: 'text-primary' },
                    { icon: Search, label: 'Message search', desc: 'Find any conversation instantly', color: 'text-primary' },
                  ].map((tip, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/50">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <tip.icon className={cn("w-4 h-4", tip.color)} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{tip.label}</p>
                        <p className="text-[10px] text-muted-foreground">{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
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
    </div>
  );
};
