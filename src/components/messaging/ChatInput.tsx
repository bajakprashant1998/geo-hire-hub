import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Smile, Paperclip } from 'lucide-react';
import { AttachmentUpload } from './AttachmentUpload';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
  sending?: boolean;
  userId: string;
  conversationId: string;
  pendingAttachment: { file: File; localPreview?: string } | null;
  onAttachmentReady: (attachment: { file: File; localPreview?: string } | null) => void;
  onClearAttachment: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export const ChatInput = ({
  value,
  onChange,
  onSubmit,
  disabled,
  sending,
  userId,
  conversationId,
  pendingAttachment,
  onAttachmentReady,
  onClearAttachment,
  inputRef
}: ChatInputProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="p-3 md:p-4">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence>
            {pendingAttachment && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-3"
              >
                <AttachmentUpload
                  userId={userId}
                  conversationId={conversationId}
                  onAttachmentReady={onAttachmentReady}
                  pendingAttachment={pendingAttachment}
                  onClearAttachment={onClearAttachment}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className={cn(
            "flex items-center gap-2 p-1.5 rounded-full border-2 transition-all duration-200",
            isFocused 
              ? "border-primary bg-background shadow-lg shadow-primary/10" 
              : "border-border bg-muted/50"
          )}>
            {!pendingAttachment && (
              <div className="pl-1">
                <AttachmentUpload
                  userId={userId}
                  conversationId={conversationId}
                  onAttachmentReady={onAttachmentReady}
                  pendingAttachment={null}
                  onClearAttachment={onClearAttachment}
                />
              </div>
            )}
            
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Type a message..."
              className={cn(
                "flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 h-10 text-sm",
                pendingAttachment && "pl-3"
              )}
              disabled={disabled}
            />
            
            <Button 
              type="submit" 
              disabled={(!value.trim() && !pendingAttachment) || sending || disabled}
              size="icon"
              className={cn(
                "rounded-full h-9 w-9 transition-all duration-200",
                (value.trim() || pendingAttachment) && !sending
                  ? "bg-primary hover:bg-primary/90 shadow-md"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Send className={cn(
                "w-4 h-4 transition-transform",
                sending && "animate-pulse"
              )} />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};