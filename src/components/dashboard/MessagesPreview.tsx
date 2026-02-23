import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Paperclip, Smile, Mic, Send, Video, Phone, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface Conversation {
  id: string;
  participant_name: string;
  participant_title: string;
  participant_avatar: string | null;
  last_message: string;
  last_message_at: string;
}

interface MessagesPreviewProps {
  profileId: string;
  onOpenChat?: () => void;
}

export const MessagesPreview = ({ profileId, onOpenChat }: MessagesPreviewProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [profileId]);

  const fetchConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select(`
        id,
        participant_1,
        participant_2,
        last_message_at
      `)
      .or(`participant_1.eq.${profileId},participant_2.eq.${profileId}`)
      .order('last_message_at', { ascending: false })
      .limit(3);

    if (data && data.length > 0) {
      const conversationsWithDetails = await Promise.all(
        data.map(async (conv) => {
          const otherParticipantId = conv.participant_1 === profileId ? conv.participant_2 : conv.participant_1;
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', otherParticipantId)
            .maybeSingle();

          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: employerData } = await supabase
            .from('employers')
            .select('company_name')
            .eq('profile_id', otherParticipantId)
            .maybeSingle();

          return {
            id: conv.id,
            participant_name: profileData?.full_name || 'Unknown',
            participant_title: employerData?.company_name ? `Recruiter at ${employerData.company_name}` : 'Job Seeker',
            participant_avatar: profileData?.avatar_url,
            last_message: lastMessage?.content || 'No messages yet',
            last_message_at: conv.last_message_at
          };
        })
      );

      setConversations(conversationsWithDetails);
      if (conversationsWithDetails.length > 0) {
        setSelectedConversation(conversationsWithDetails[0]);
        fetchMessages(conversationsWithDetails[0].id);
      }
    }
    setLoading(false);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50);

    setMessages(data || []);
  };

  const handleDeleteChat = async () => {
    if (!deletingConvId) return;
    setDeleting(true);
    try {
      // Delete all messages first
      await supabase.from('messages').delete().eq('conversation_id', deletingConvId);
      // Then delete conversation
      const { error } = await supabase.from('conversations').delete().eq('id', deletingConvId);
      if (error) throw error;

      toast.success('Chat deleted successfully');
      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== deletingConvId));
      if (selectedConversation?.id === deletingConvId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (error: any) {
      toast.error('Failed to delete chat: ' + error.message);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingConvId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-sm border p-6 animate-pulse">
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="bg-card/70 backdrop-blur-xl rounded-2xl shadow-lg border border-border/40 p-4 sm:p-6">
        <div className="text-center py-8 sm:py-12">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg shadow-primary/10">
            <Send className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5 sm:mb-2">No Messages Yet</h3>
          <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4 px-2">Start applying to jobs to connect with employers</p>
          <Link to="/">
            <Button variant="outline" size="sm" className="rounded-xl">Browse Jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/70 backdrop-blur-xl rounded-2xl shadow-lg border border-border/40 overflow-hidden flex flex-col" style={{ maxHeight: '500px' }}>
      {/* Conversation Header */}
      {selectedConversation && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="w-10 h-10 shrink-0">
              <AvatarImage src={selectedConversation.participant_avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {selectedConversation.participant_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{selectedConversation.participant_name}</p>
              <p className="text-xs text-muted-foreground truncate">{selectedConversation.participant_title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 sm:flex-none gap-1.5 text-success border-success hover:bg-success/10 text-xs sm:text-sm px-2 sm:px-3"
            >
              <Phone className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 sm:flex-none gap-1.5 text-primary border-primary hover:bg-primary/10 text-xs sm:text-sm px-2 sm:px-3"
            >
              <Video className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Video</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive border-destructive hover:bg-destructive/10 text-xs sm:text-sm px-2 sm:px-3"
              onClick={() => {
                setDeletingConvId(selectedConversation.id);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>
      )}

      {/* Messages Area - scrollable */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 bg-muted/30">
          {messages.map((message) => {
            const isOwn = message.sender_id === profileId;
            return (
              <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                  isOwn 
                    ? 'bg-primary text-primary-foreground rounded-br-md' 
                    : 'bg-card border shadow-sm rounded-bl-md'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No messages yet</p>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 sm:p-4 border-t bg-card shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Paperclip className="w-5 h-5" />
          </Button>
          <Input
            placeholder="Type a message..."
            className="flex-1 bg-muted/50 border-0 focus-visible:ring-1"
          />
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Smile className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Mic className="w-5 h-5" />
          </Button>
          <Button 
            size="icon" 
            className="rounded-full bg-primary hover:bg-primary/90"
            onClick={onOpenChat}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
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
              onClick={handleDeleteChat}
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
