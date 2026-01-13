import { ViewMode, Candidate, Job } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Users, Briefcase, MapPin, Clock, ChevronRight } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ViewMode;
  candidates: Candidate[];
  jobs: Job[];
  onSelectCandidate: (candidate: Candidate) => void;
  onSelectJob: (job: Job) => void;
}

export const Sidebar = ({
  isOpen,
  onClose,
  mode,
  candidates,
  jobs,
  onSelectCandidate,
  onSelectJob,
}: SidebarProps) => {
  if (!isOpen) return null;

  return (
    <div className="absolute left-0 top-0 h-full w-80 md:w-96 z-[1000] animate-slide-in-right">
      <div className="floating-panel h-full flex flex-col m-4 mr-0">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode === 'hiring' ? (
              <>
                <Users className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Candidates Nearby</h2>
              </>
            ) : (
              <>
                <Briefcase className="w-5 h-5 text-destructive" />
                <h2 className="font-semibold">Jobs Nearby</h2>
              </>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Count */}
        <div className="px-4 py-2 bg-secondary/50 text-sm text-muted-foreground">
          {mode === 'hiring'
            ? `${candidates.length} candidates found`
            : `${jobs.length} jobs found`}
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {mode === 'hiring'
              ? candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => onSelectCandidate(candidate)}
                    className="w-full card-google p-3 text-left hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex-shrink-0">
                        {candidate.avatar_url ? (
                          <img
                            src={candidate.avatar_url}
                            alt={candidate.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary font-semibold">
                            {candidate.full_name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{candidate.full_name}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {candidate.job_title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs py-0">
                            {candidate.experience_years}y exp
                          </Badge>
                          {candidate.distance_km !== undefined && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" />
                              {candidate.distance_km.toFixed(1)} km
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </button>
                ))
              : jobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => onSelectJob(job)}
                    className="w-full card-google p-3 text-left hover:border-destructive/50 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm truncate">{job.title}</h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {job.company_name}
                          </p>
                        </div>
                        <Badge variant="secondary" className="badge-job text-xs flex-shrink-0">
                          {job.job_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {job.salary_range && (
                          <span className="font-medium text-foreground">{job.salary_range}</span>
                        )}
                        {job.distance_km !== undefined && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />
                            {job.distance_km.toFixed(1)} km
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
