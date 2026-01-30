import { Candidate } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Clock, MapPin, Bookmark } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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
      {/* Header with avatar - Google Blue */}
      <div className="bg-google-blue p-3 sm:p-4 flex items-center gap-3">
        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-white/20 shrink-0">
          <AvatarImage
            src={candidate.avatar_url || ''}
            alt={candidate.full_name}
            className="object-cover"
          />
          <AvatarFallback className="bg-white/20 text-white text-base sm:text-xl font-heading font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-semibold text-white text-sm sm:text-base truncate">{candidate.full_name}</h3>
          <p className="text-xs sm:text-sm text-white/80 truncate">{candidate.job_title}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 space-y-3">
        {/* Stats */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-google-blue shrink-0" />
            <span>{candidate.experience_years} years exp</span>
          </div>
          {candidate.distance_km !== undefined && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-google-red shrink-0" />
              <span>{candidate.distance_km.toFixed(1)} km</span>
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {candidate.skills.slice(0, 3).map((skill, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="text-[10px] sm:text-xs bg-google-blue/10 text-google-blue border-0 px-1.5 sm:px-2 py-0.5"
            >
              {skill}
            </Badge>
          ))}
          {candidate.skills.length > 3 && (
            <Badge variant="secondary" className="text-[10px] sm:text-xs bg-muted px-1.5 sm:px-2 py-0.5">
              +{candidate.skills.length - 3}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button 
            onClick={onContact} 
            className="flex-1 bg-google-blue hover:bg-google-blue/90 touch-scale h-9 sm:h-10 text-xs sm:text-sm" 
          >
            <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Contact
          </Button>
          {onSave && (
            <Button
              variant="outline"
              size="icon"
              onClick={onSave}
              className={`h-9 w-9 sm:h-10 sm:w-10 touch-scale shrink-0 ${isSaved ? 'text-warning border-warning bg-warning/10' : ''}`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
