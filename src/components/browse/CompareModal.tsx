import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Scale, Banknote, Briefcase, MapPin, Globe, GraduationCap, Clock, Building2, Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { getJobUrl } from '@/components/browse/JobCard';

interface CompareModalProps {
  open: boolean;
  onClose: () => void;
  jobs: any[];
}

const FIELDS = [
  { key: 'salary', label: 'Salary', icon: Banknote, color: 'text-emerald-500' },
  { key: 'type', label: 'Job Type', icon: Briefcase, color: 'text-primary' },
  { key: 'location', label: 'Location', icon: MapPin, color: 'text-destructive' },
  { key: 'remote', label: 'Remote', icon: Globe, color: 'text-amber-500' },
  { key: 'experience', label: 'Experience', icon: GraduationCap, color: 'text-primary' },
  { key: 'company', label: 'Company', icon: Building2, color: 'text-muted-foreground' },
  { key: 'posted', label: 'Posted', icon: Clock, color: 'text-muted-foreground' },
];

function getValue(job: any, key: string): string {
  const employer = (job.employers as any);
  switch (key) {
    case 'salary': return job.salary_range || '—';
    case 'type': return job.job_type || '—';
    case 'location': return job.job_address || [job.location_city, job.location_country].filter(Boolean).join(', ') || '—';
    case 'remote': return job.is_remote ? '✅ Remote' : '🏢 On-site';
    case 'experience': return job.experience_level || '—';
    case 'company': return employer?.company_name || '—';
    case 'posted': {
      const d = new Date(job.created_at);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    default: return '—';
  }
}

export const CompareModal = ({ open, onClose, jobs }: CompareModalProps) => {
  const dotColors = ['bg-primary', 'bg-emerald-500', 'bg-amber-500'];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Job Comparison</DialogTitle>
              <p className="text-xs text-muted-foreground">Comparing {jobs.length} jobs side by side</p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-120px)]">
          <div className="p-5 space-y-1">
            {/* Job headers */}
            <div className={cn("grid gap-3 mb-4", jobs.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
              {jobs.map((job, i) => {
                const companyName = (job.employers as any)?.company_name || 'Company';
                return (
                  <div key={job.id} className="p-3 rounded-xl border border-border/50 bg-secondary/30">
                    <div className="flex items-start gap-2">
                      <div className={cn("w-2.5 h-2.5 rounded-full mt-1 shrink-0", dotColors[i])} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground line-clamp-2">{job.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{companyName}</p>
                        <Link
                          to={getJobUrl(job)}
                          className="text-[10px] text-primary hover:underline mt-1 inline-block"
                          onClick={onClose}
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison rows */}
            {FIELDS.map((field) => (
              <div key={field.key} className="rounded-xl border border-border/30 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/40 border-b border-border/20">
                  <field.icon className={cn("w-3.5 h-3.5", field.color)} />
                  <span className="text-xs font-semibold text-muted-foreground">{field.label}</span>
                </div>
                <div className={cn("grid", jobs.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
                  {jobs.map((job, i) => {
                    const val = getValue(job, field.key);
                    return (
                      <div
                        key={job.id}
                        className={cn(
                          "px-3 py-2.5 text-xs text-foreground",
                          i < jobs.length - 1 && "border-r border-border/20"
                        )}
                      >
                        {val === '—' ? (
                          <span className="text-muted-foreground/40">—</span>
                        ) : field.key === 'salary' ? (
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">{val}</span>
                        ) : (
                          val
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t p-4 flex justify-end">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
