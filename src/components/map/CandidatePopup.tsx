import { Candidate } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Clock, MapPin, Bookmark, Sparkles } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface CandidatePopupProps {
  candidate: Candidate;
  onContact: () => void;
  onSave?: () => void;
  isSaved?: boolean;
}

export const CandidatePopup = ({ candidate, onContact, onSave, isSaved = false }: CandidatePopupProps) => {
  const initials = candidate.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2) || 'C';

  return (
    <div className="marker-popup touch-none">
      {/* Header with gradient */}
      <div className="relative bg-gradient-to-br from-primary to-primary/80 p-4 sm:p-5 overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="relative flex items-center gap-3.5">
          <div className="relative">
            <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border-[2.5px] border-white/25 shadow-lg shrink-0">
              <AvatarImage src={candidate.avatar_url || ''} alt={candidate.full_name} className="object-cover" />
              <AvatarFallback className="bg-white/15 text-white text-lg sm:text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-success rounded-full border-2 border-primary flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-white text-sm sm:text-base truncate tracking-tight">{candidate.full_name}</h3>
            <p className="text-xs sm:text-sm text-white/75 truncate mt-0.5">{candidate.job_title}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 sm:p-4 space-y-3.5">
        {/* Stats */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/5">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            <span className="font-semibold">{candidate.experience_years} yrs exp</span>
          </div>
          {candidate.distance_km !== undefined && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-destructive/5">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive shrink-0" />
              <span className="font-medium">{candidate.distance_km.toFixed(1)} km</span>
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {candidate.skills.slice(0, 4).map((skill, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="text-[10px] sm:text-xs rounded-lg px-2 sm:px-2.5 py-0.5 font-medium"
            >
              {skill}
            </Badge>
          ))}
          {candidate.skills.length > 4 && (
            <Badge variant="outline" className="text-[10px] sm:text-xs rounded-lg px-2 sm:px-2.5 py-0.5 text-muted-foreground">
              +{candidate.skills.length - 4}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button 
            onClick={onContact} 
            className="flex-1 bg-primary hover:bg-primary/90 touch-scale h-10 sm:h-11 text-xs sm:text-sm font-bold rounded-xl shadow-md" 
          >
            <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Contact
          </Button>
          {onSave && (
            <Button
              variant="outline"
              size="icon"
              onClick={onSave}
              className={cn(
                "h-10 w-10 sm:h-11 sm:w-11 touch-scale shrink-0 rounded-xl",
                isSaved ? 'text-warning border-warning/30 bg-warning/10' : 'border-border/40'
              )}
            >
              <Bookmark className={cn("w-4 h-4", isSaved && 'fill-current')} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
