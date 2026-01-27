import { Candidate, Job, ViewMode } from '@/types';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MapPin, 
  Briefcase, 
  Clock, 
  DollarSign, 
  ArrowRight,
  User,
  Building2,
  Star
} from 'lucide-react';
import { GovernmentJobBadge, GovernmentEmployerBadge } from '@/components/government';

interface MarkerPreviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ViewMode;
  item: Candidate | Job | null;
}

export const MarkerPreviewSheet = ({ 
  isOpen, 
  onClose, 
  mode, 
  item 
}: MarkerPreviewSheetProps) => {
  const navigate = useNavigate();

  if (!item) return null;

  const isCandidate = 'job_title' in item && 'full_name' in item;

  const handleViewDetails = () => {
    onClose();
    if (isCandidate) {
      navigate(`/candidates/${item.id}`);
    } else {
      navigate(`/jobs/${item.id}`);
    }
  };

  const renderCandidatePreview = (candidate: Candidate) => (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="w-16 h-16 border-2 border-primary/20">
          <AvatarImage src={candidate.avatar_url} alt={candidate.full_name} />
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
            {candidate.full_name?.charAt(0) || 'C'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold truncate">{candidate.full_name}</h3>
          <p className="text-muted-foreground truncate">{candidate.job_title || 'Job Seeker'}</p>
          {candidate.distance_km && (
            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>{candidate.distance_km.toFixed(1)} km away</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{candidate.experience_years || 0}+ years</span>
        </div>
        {candidate.skills && candidate.skills.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
            <Star className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium">{candidate.skills.length} skills</span>
          </div>
        )}
      </div>

      {/* Skills */}
      {candidate.skills && candidate.skills.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Skills</p>
          <div className="flex flex-wrap gap-2">
            {candidate.skills.slice(0, 5).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {candidate.skills.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{candidate.skills.length - 5} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Action */}
      <Button 
        onClick={handleViewDetails} 
        className="w-full gap-2 mt-2"
        size="lg"
      >
        View Full Profile
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );

  const renderJobPreview = (job: Job) => {
    const isGovernmentJob = job.job_category === 'government';
    
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Government Job Banner */}
        {isGovernmentJob && (
          <div className="flex justify-center">
            <GovernmentJobBadge variant="large" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isGovernmentJob ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-destructive/10'
          }`}>
            <Briefcase className={`w-7 h-7 ${isGovernmentJob ? 'text-emerald-600' : 'text-destructive'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate">{job.title}</h3>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate">{job.company_name}</span>
            </div>
            {job.distance_km && (
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>{job.distance_km.toFixed(1)} km away</span>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-wrap gap-2">
          {job.job_type && (
            <Badge variant="secondary" className="gap-1">
              <Briefcase className="w-3 h-3" />
              {job.job_type}
            </Badge>
          )}
          {job.salary_range && (
            <Badge variant="outline" className="gap-1 bg-success/5 text-success border-success/20">
              <DollarSign className="w-3 h-3" />
              {job.salary_range}
            </Badge>
          )}
          {isGovernmentJob && job.is_government_employer && (
            <GovernmentEmployerBadge variant="compact" />
          )}
        </div>

        {/* Description Preview */}
        {job.description && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">About this role</p>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {job.description}
            </p>
          </div>
        )}

        {/* Action */}
        <Button 
          onClick={handleViewDetails} 
          className={`w-full gap-2 mt-2 ${isGovernmentJob ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
          size="lg"
        >
          View Job Details
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-2xl px-6 pt-6 pb-8 max-h-[70vh] overflow-auto"
      >
        {/* Drag handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
        
        {isCandidate 
          ? renderCandidatePreview(item as Candidate)
          : renderJobPreview(item as Job)
        }
      </SheetContent>
    </Sheet>
  );
};
