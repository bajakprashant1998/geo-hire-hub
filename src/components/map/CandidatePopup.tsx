import { Candidate } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Clock, MapPin } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface CandidatePopupProps {
  candidate: Candidate;
  onContact: () => void;
}

export const CandidatePopup = ({ candidate, onContact }: CandidatePopupProps) => {
  const initials = candidate.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2) || 'C';

  return (
    <div className="marker-popup">
      {/* Header with avatar - Google Blue */}
      <div className="bg-google-blue p-4 flex items-center gap-3">
        <Avatar className="w-12 h-12 border-2 border-white/20">
          <AvatarImage
            src={candidate.avatar_url || ''}
            alt={candidate.full_name}
            className="object-cover"
          />
          <AvatarFallback className="bg-white/20 text-white text-xl font-heading font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-heading font-semibold text-white">{candidate.full_name}</h3>
          <p className="text-sm text-white/80">{candidate.job_title}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-google-blue" />
            <span>{candidate.experience_years} years exp</span>
          </div>
          {candidate.distance_km !== undefined && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-google-red" />
              <span>{candidate.distance_km.toFixed(1)} km away</span>
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5">
          {candidate.skills.slice(0, 4).map((skill, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="text-xs bg-google-blue/10 text-google-blue border-0"
            >
              {skill}
            </Badge>
          ))}
          {candidate.skills.length > 4 && (
            <Badge variant="secondary" className="text-xs bg-muted">
              +{candidate.skills.length - 4}
            </Badge>
          )}
        </div>

        {/* Action */}
        <Button 
          onClick={onContact} 
          className="w-full bg-google-blue hover:bg-google-blue/90" 
          size="sm"
        >
          <Mail className="w-4 h-4 mr-2" />
          Contact Candidate
        </Button>
      </div>
    </div>
  );
};
