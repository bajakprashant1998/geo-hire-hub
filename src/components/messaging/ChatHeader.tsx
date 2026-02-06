import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, X, Phone, Video, MoreVertical } from 'lucide-react';
import { OnlineStatus } from './OnlineStatus';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  otherUser: {
    full_name?: string;
    avatar_url?: string;
    user_type?: string;
    id?: string;
  } | null;
  isOnline: boolean;
  onBack: () => void;
  onClose: () => void;
  onViewProfile: () => void;
  showBackButton?: boolean;
}

export const ChatHeader = ({ 
  otherUser, 
  isOnline, 
  onBack, 
  onClose, 
  onViewProfile,
  showBackButton = true 
}: ChatHeaderProps) => {
  const getInitials = (name?: string) => 
    name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';

  return (
    <div className="relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-primary/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
      
      <div className="relative p-4 flex items-center gap-3">
        {showBackButton && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-primary-foreground hover:bg-white/20" 
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        
        <div className="relative cursor-pointer" onClick={onViewProfile}>
          <Avatar className="w-11 h-11 border-2 border-white/30 shadow-lg">
            <AvatarImage src={otherUser?.avatar_url || ''} />
            <AvatarFallback className="bg-white/20 text-primary-foreground font-semibold">
              {getInitials(otherUser?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-primary rounded-full border-2 border-primary">
            <OnlineStatus isOnline={isOnline} size="sm" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0" onClick={onViewProfile}>
          <p className="font-semibold text-primary-foreground truncate cursor-pointer hover:underline">
            {otherUser?.full_name || 'Unknown User'}
          </p>
          <div className="flex items-center gap-1.5">
            <OnlineStatus isOnline={isOnline} showLabel className="text-primary-foreground/80" />
            <span className="text-primary-foreground/60 text-xs">•</span>
            <span className="text-xs text-primary-foreground/80 capitalize">
              {otherUser?.user_type}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            className="hidden sm:flex text-primary-foreground hover:bg-white/20 h-9 w-9"
            onClick={onViewProfile}
          >
            <Phone className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="hidden sm:flex text-primary-foreground hover:bg-white/20 h-9 w-9"
            onClick={onViewProfile}
          >
            <Video className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            className="text-primary-foreground hover:bg-white/20 h-9 w-9"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};