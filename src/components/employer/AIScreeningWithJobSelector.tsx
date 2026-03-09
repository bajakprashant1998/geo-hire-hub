import { useState } from 'react';
import { Brain } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AIScreeningPanel } from '@/components/employer/AIScreeningPanel';

export const AIScreeningWithJobSelector = ({ jobs }: { jobs: any[] }) => {
  const [selectedJobId, setSelectedJobId] = useState('');
  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const activeJobs = jobs.filter(j => j.is_active);

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl bg-card/60 backdrop-blur border border-border/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Select Job</p>
              <p className="text-[10px] text-muted-foreground">{activeJobs.length} active job{activeJobs.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger className="w-full sm:max-w-md rounded-xl h-10">
              <SelectValue placeholder="Choose a job to screen applicants..." />
            </SelectTrigger>
            <SelectContent>
              {activeJobs.map(j => (
                <SelectItem key={j.id} value={j.id}>
                  <span className="font-medium">{j.title}</span>
                </SelectItem>
              ))}
              {activeJobs.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-3 px-2">No active jobs found</div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedJobId ? (
        <AIScreeningPanel jobId={selectedJobId} jobTitle={selectedJob?.title || ''} />
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-border/50 rounded-xl">
          <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-primary/30" />
          </div>
          <p className="text-foreground font-semibold mb-1">Choose a Job to Start</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Select one of your active jobs above and AI will analyze all applicants for the best matches.
          </p>
        </div>
      )}
    </div>
  );
};
