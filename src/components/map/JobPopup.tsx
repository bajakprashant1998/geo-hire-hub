import { Job } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, IndianRupee, Clock, MapPin, Send } from 'lucide-react';
import { GovernmentJobBadge } from '@/components/government';

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

  const isGovernmentJob = job.job_category === 'government';
  const headerBg = isGovernmentJob ? 'bg-emerald-600' : 'bg-destructive';

  return (
    <div className="marker-popup">
      {/* Header */}
      <div className={`${headerBg} p-4`}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white text-lg">{job.title}</h3>
          {isGovernmentJob && <GovernmentJobBadge variant="compact" className="bg-white/20 border-white/30 text-white" />}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Building2 className="w-4 h-4 text-white/80" />
          <span className="text-sm text-white/90">{job.company_name}</span>
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
        <Button onClick={onApply} className={`w-full ${isGovernmentJob ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-destructive hover:bg-destructive/90'}`} size="sm">
          <Send className="w-4 h-4 mr-2" />
          Apply Now
        </Button>
      </div>
    </div>
  );
};
