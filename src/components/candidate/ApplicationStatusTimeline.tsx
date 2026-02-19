import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

const STEPS = [
  { key: 'pending', label: 'Applied' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'hired', label: 'Hired' },
];

interface ApplicationStatusTimelineProps {
  status: string;
}

export const ApplicationStatusTimeline = ({ status }: ApplicationStatusTimelineProps) => {
  const isRejected = status === 'rejected';
  const currentIndex = STEPS.findIndex(s => s.key === status);
  // For rejected, show progress up to the rejection point (at least "Applied")
  const activeIndex = isRejected ? 0 : currentIndex;

  return (
    <div className="flex items-center gap-0 w-full mt-3">
      {STEPS.map((step, i) => {
        const isActive = i <= activeIndex;
        const isCurrent = i === activeIndex;
        const showRejected = isRejected && i === 0;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            {/* Dot */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all",
                  isActive && !isRejected
                    ? "bg-primary text-primary-foreground"
                    : showRejected
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isActive && !isRejected ? (
                  <Check className="w-3 h-3" />
                ) : showRejected ? (
                  <X className="w-3 h-3" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "text-[9px] sm:text-[10px] font-medium leading-tight text-center whitespace-nowrap",
                  isActive && !isRejected
                    ? "text-primary"
                    : showRejected
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {showRejected ? 'Rejected' : step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1 rounded-full transition-all",
                  i < activeIndex && !isRejected ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
