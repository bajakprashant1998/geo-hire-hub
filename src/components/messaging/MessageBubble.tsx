import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, CheckCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EmojiReactions } from './EmojiReactions';
import { MessageAttachment } from './MessageAttachment';

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

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    is_read: boolean;
    read_at?: string | null;
    attachments?: Attachment[];
    reactions?: Reaction[];
  };
  isOwn: boolean;
  showAvatar: boolean;
  otherUser?: {
    full_name?: string;
    avatar_url?: string;
  } | null;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

export const MessageBubble = ({
  message,
  isOwn,
  showAvatar,
  otherUser,
  onAddReaction,
  onRemoveReaction
}: MessageBubbleProps) => {
  const getInitials = (name?: string) =>
    name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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

  const readTime = formatReadTime(message.read_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group flex",
        isOwn ? 'justify-end' : 'justify-start',
        !showAvatar && 'mt-0.5'
      )}
    >
      {!isOwn && showAvatar && (
        <Avatar className="w-8 h-8 mr-2 flex-shrink-0 shadow-sm">
          <AvatarImage src={otherUser?.avatar_url || ''} />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-semibold">
            {getInitials(otherUser?.full_name)}
          </AvatarFallback>
        </Avatar>
      )}
      {!isOwn && !showAvatar && <div className="w-8 mr-2" />}

      <div className="max-w-[75%] md:max-w-[70%]">
        <div
          className={cn(
            "relative px-4 py-2.5 shadow-sm",
            isOwn
              ? 'bg-gradient-to-br from-primary to-primary/90 text-white rounded-2xl rounded-br-md shadow-[0_2px_10px_rgba(59,130,246,0.2)]'
              : 'bg-card border border-border/50 text-foreground rounded-2xl rounded-bl-md'
          )}
        >
          {/* Subtle inner glow for own messages */}
          {isOwn && (
            <div className="absolute inset-0 rounded-2xl rounded-br-md bg-gradient-to-t from-black/5 to-white/10 pointer-events-none" />
          )}

          {message.content !== '📎 Attachment' && (
            <p className={cn(
              "text-sm whitespace-pre-wrap break-words relative z-10",
              isOwn ? "text-white" : "text-foreground"
            )}>
              {message.content}
            </p>
          )}

          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-2 relative z-10">
              {message.attachments.map(att => (
                <MessageAttachment key={att.id} attachment={att} isOwn={isOwn} />
              ))}
            </div>
          )}

          <div className={cn(
            "flex items-center gap-1.5 mt-1.5 relative z-10",
            isOwn && 'justify-end'
          )}>
            <p className={cn(
              "text-[10px]",
              isOwn ? 'text-white/80' : 'text-muted-foreground'
            )}>
              {formatTime(message.created_at)}
            </p>
            {isOwn && (
              message.is_read ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center cursor-help">
                      <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    {readTime ? `Seen ${readTime}` : 'Seen'}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center cursor-help">
                      <Check className="w-3.5 h-3.5 text-white/50" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    Delivered
                  </TooltipContent>
                </Tooltip>
              )
            )}
          </div>
        </div>

        <EmojiReactions
          reactions={message.reactions || []}
          onAddReaction={(emoji) => onAddReaction(message.id, emoji)}
          onRemoveReaction={(emoji) => onRemoveReaction(message.id, emoji)}
          isOwn={isOwn}
        />
      </div>
    </motion.div>
  );
};