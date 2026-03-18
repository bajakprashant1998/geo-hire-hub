import { Job } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, IndianRupee, Clock, MapPin, Send, Bookmark, Landmark } from 'lucide-react';
import { GovernmentJobBadge } from '@/components/government';
import { cn } from '@/lib/utils';

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
  const isNew = new Date(job.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);

  return (
    <div className="marker-popup touch-none">
      {/* Header with gradient */}
      <div className={cn(
        "relative p-4 sm:p-5 overflow-hidden",
        isGovernmentJob
          ? 'bg-gradient-to-br from-success to-success/80'
          : 'bg-gradient-to-br from-destructive to-destructive/80'
      )}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white text-base sm:text-lg truncate tracking-tight">{job.title}</h3>
              {isNew && (
                <Badge className="bg-white/20 text-white text-[10px] px-2 py-0 font-bold border-0 backdrop-blur-sm">NEW</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              {isGovernmentJob ? (
                <Landmark className="w-3.5 h-3.5 text-white/70 shrink-0" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-white/70 shrink-0" />
              )}
              <span className="text-xs sm:text-sm text-white/85 truncate font-medium">{job.company_name}</span>
            </div>
          </div>
          {isGovernmentJob && <GovernmentJobBadge variant="compact" className="bg-white/15 border-white/25 text-white shrink-0 backdrop-blur-sm" />}
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 sm:p-4 space-y-3.5">
        {/* Job type and salary */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs rounded-lg px-2.5 py-1 font-semibold">
            {job.job_type}
          </Badge>
          {job.salary_range && (
            <div className="flex items-center gap-1 text-xs sm:text-sm font-bold text-foreground">
              <IndianRupee className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-success" />
              <span>{job.salary_range}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {job.description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {job.description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/50">
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="font-medium">{formatDate(job.created_at)}</span>
          </div>
          {job.distance_km !== undefined && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-destructive/5">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-destructive" />
              <span className="font-medium">{job.distance_km.toFixed(1)} km</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button 
            onClick={onApply} 
            className={cn(
              "flex-1 touch-scale h-10 sm:h-11 text-xs sm:text-sm font-bold rounded-xl shadow-md",
              isGovernmentJob ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'
            )}
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Apply Now
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
