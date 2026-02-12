import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Smile, Mic, Send, Video, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

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

          // Try to get employer company name
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
      .limit(5);

    setMessages(data || []);
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
      <div className="bg-card rounded-xl shadow-sm border p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Messages Yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Start applying to jobs to connect with employers</p>
          <Link to="/">
            <Button variant="outline" size="sm">Browse Jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
      {/* Conversation Header */}
      {selectedConversation && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b gap-3">
          <div className="flex items-center gap-3">
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
          {/* Mobile-optimized action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 sm:flex-none gap-1.5 text-success border-success hover:bg-success/10 touch-target-sm touch-scale text-xs sm:text-sm px-2 sm:px-3"
            >
              <Phone className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Connect on WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 sm:flex-none gap-1.5 text-primary border-primary hover:bg-primary/10 touch-target-sm touch-scale text-xs sm:text-sm px-2 sm:px-3"
            >
              <Video className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Start Video Interview</span>
              <span className="sm:hidden">Video</span>
            </Button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="h-44 sm:h-52 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-muted/30">
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
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 border-t bg-card">
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
    </div>
  );
};
