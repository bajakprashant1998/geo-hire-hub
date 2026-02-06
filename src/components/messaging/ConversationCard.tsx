import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { OnlineStatus } from './OnlineStatus';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ConversationCardProps {
  conversation: {
    id: string;
    otherProfile?: {
      full_name?: string;
      avatar_url?: string;
      user_type?: string;
      user_id?: string;
    };
    unreadCount: number;
    lastMessage?: string;
    last_message_at: string;
  };
  isActive: boolean;
  isOnline: boolean;
  onClick: () => void;
  formatTime: (date: string) => string;
}

export const ConversationCard = ({ 
  conversation, 
  isActive, 
  isOnline, 
  onClick, 
  formatTime 
}: ConversationCardProps) => {
  const getInitials = (name?: string) => 
    name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={cn(
        "w-full p-3.5 text-left transition-all duration-200 rounded-xl mx-2 my-1",
        "hover:bg-primary/5 group",
        isActive && 'bg-primary/10 shadow-sm'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className={cn(
            "w-12 h-12 ring-2 ring-offset-2 ring-offset-background transition-all",
            isActive ? "ring-primary" : "ring-transparent group-hover:ring-primary/30"
          )}>
            <AvatarImage src={conversation.otherProfile?.avatar_url || ''} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
              {getInitials(conversation.otherProfile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-background rounded-full">
            <OnlineStatus isOnline={isOnline} size="md" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <p className={cn(
              "font-medium truncate text-sm",
              conversation.unreadCount > 0 && 'text-foreground font-semibold'
            )}>
              {conversation.otherProfile?.full_name || 'Unknown User'}
            </p>
            <span className="text-xs text-muted-foreground ml-2 shrink-0">
              {formatTime(conversation.last_message_at)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-xs truncate flex-1",
              conversation.unreadCount > 0 
                ? 'text-foreground font-medium' 
                : 'text-muted-foreground'
            )}>
              {conversation.lastMessage || 'No messages yet'}
            </p>
            
            {conversation.unreadCount > 0 && (
              <Badge className="h-5 min-w-5 px-1.5 flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold shrink-0">
                {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
              </Badge>
            )}
          </div>
          
          <div className="mt-1.5">
            <Badge 
              variant="secondary" 
              className={cn(
                "text-[10px] px-2 py-0 h-4 capitalize",
                conversation.otherProfile?.user_type === 'employer' 
                  ? 'bg-blue-500/10 text-blue-600' 
                  : 'bg-green-500/10 text-green-600'
              )}
            >
              {conversation.otherProfile?.user_type}
            </Badge>
          </div>
        </div>
      </div>
    </motion.button>
  );
};