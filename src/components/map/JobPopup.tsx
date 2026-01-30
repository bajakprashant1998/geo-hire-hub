import { Job } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, IndianRupee, Clock, MapPin, Send, Bookmark } from 'lucide-react';
import { GovernmentJobBadge } from '@/components/government';

interface JobPopupProps {
  job: Job;
  onApply: () => void;
  onSave?: () => void;
  isSaved?: boolean;
}

export const JobPopup = ({ job, onApply, onSave, isSaved = false }: JobPopupProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const isGovernmentJob = job.job_category === 'government';
  const headerBg = isGovernmentJob ? 'bg-emerald-600' : 'bg-destructive';
  const isNew = new Date(job.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);

  return (
    <div className="marker-popup touch-none">
      {/* Header */}
      <div className={`${headerBg} p-3 sm:p-4`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-white text-base sm:text-lg truncate">{job.title}</h3>
              {isNew && (
                <Badge className="bg-white/20 text-white text-[10px] px-1.5 py-0">NEW</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="w-3.5 h-3.5 text-white/80 shrink-0" />
              <span className="text-xs sm:text-sm text-white/90 truncate">{job.company_name}</span>
            </div>
          </div>
          {isGovernmentJob && <GovernmentJobBadge variant="compact" className="bg-white/20 border-white/30 text-white shrink-0" />}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 space-y-3">
        {/* Job type and salary */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Badge variant="secondary" className="badge-job text-xs">
            {job.job_type}
          </Badge>
          {job.salary_range && (
            <div className="flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground">
              <IndianRupee className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{job.salary_range}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {job.description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
            {job.description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>{formatDate(job.created_at)}</span>
          </div>
          {job.distance_km !== undefined && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>{job.distance_km.toFixed(1)} km</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button 
            onClick={onApply} 
            className={`flex-1 ${isGovernmentJob ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-destructive hover:bg-destructive/90'} touch-scale h-9 sm:h-10 text-xs sm:text-sm`}
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Apply Now
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
