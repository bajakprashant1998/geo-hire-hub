import { Candidate } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Briefcase, Clock, MapPin } from 'lucide-react';

interface CandidatePopupProps {
  candidate: Candidate;
  onContact: () => void;
}

export const CandidatePopup = ({ candidate, onContact }: CandidatePopupProps) => {
  return (
    <div className="marker-popup">
      {/* Header with avatar */}
      <div className="bg-primary p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary-foreground/20 overflow-hidden flex-shrink-0">
          {candidate.avatar_url ? (
            <img
              src={candidate.avatar_url}
              alt={candidate.full_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary-foreground text-xl font-semibold">
              {candidate.full_name.charAt(0)}
            </div>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-primary-foreground">{candidate.full_name}</h3>
          <p className="text-sm text-primary-foreground/80">{candidate.job_title}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{candidate.experience_years} years exp</span>
          </div>
          {candidate.distance_km !== undefined && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{candidate.distance_km.toFixed(1)} km away</span>
            </div>
          )}
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5">
          {candidate.skills.slice(0, 4).map((skill, index) => (
            <Badge key={index} variant="secondary" className="badge-candidate text-xs">
              {skill}
            </Badge>
          ))}
          {candidate.skills.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{candidate.skills.length - 4}
            </Badge>
          )}
        </div>

        {/* Action */}
        <Button onClick={onContact} className="w-full" size="sm">
          <Mail className="w-4 h-4 mr-2" />
          Contact Candidate
        </Button>
      </div>
    </div>
  );
};
