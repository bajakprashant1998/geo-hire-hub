import { Job } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, IndianRupee, Clock, MapPin, Send } from 'lucide-react';

interface JobPopupProps {
  job: Job;
  onApply: () => void;
}

export const JobPopup = ({ job, onApply }: JobPopupProps) => {
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

  return (
    <div className="marker-popup">
      {/* Header */}
      <div className="bg-destructive p-4">
        <h3 className="font-semibold text-destructive-foreground text-lg">{job.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          <Building2 className="w-4 h-4 text-destructive-foreground/80" />
          <span className="text-sm text-destructive-foreground/90">{job.company_name}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Job type and salary */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="badge-job">
            {job.job_type}
          </Badge>
          {job.salary_range && (
            <div className="flex items-center gap-1 text-sm font-medium text-foreground">
              <IndianRupee className="w-3.5 h-3.5" />
              <span>{job.salary_range}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {job.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {job.description}
          </p>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(job.created_at)}</span>
          </div>
          {job.distance_km !== undefined && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{job.distance_km.toFixed(1)} km away</span>
            </div>
          )}
        </div>

        {/* Action */}
        <Button onClick={onApply} className="w-full bg-destructive hover:bg-destructive/90" size="sm">
          <Send className="w-4 h-4 mr-2" />
          Apply Now
        </Button>
      </div>
    </div>
  );
};
