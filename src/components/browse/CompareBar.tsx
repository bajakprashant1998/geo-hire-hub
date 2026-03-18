import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scale, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompareBarProps {
  selectedJobs: any[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onCompare: () => void;
}

export const CompareBar = ({ selectedJobs, onRemove, onClear, onCompare }: CompareBarProps) => {
  if (selectedJobs.length === 0) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/10 safe-area-pb"
    >
      <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3 max-w-6xl">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Icon + count */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scale className="w-4 h-4 text-primary" />
            </div>
            <Badge className="rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs px-2 sm:px-2.5">
              {selectedJobs.length}/3
            </Badge>
          </div>

          {/* Selected job pills - scroll on mobile */}
          <div className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide min-w-0">
            <AnimatePresence mode="popLayout">
              {selectedJobs.map((job, i) => {
                const dotColors = ['bg-primary', 'bg-emerald-500', 'bg-amber-500'];
                const companyName = (job.employers as any)?.company_name || 'Company';
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="shrink-0 flex items-center gap-1.5 sm:gap-2 bg-secondary/60 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 border border-border/40 max-w-[140px] sm:max-w-[200px]"
                  >
                    <div className={cn("w-2 h-2 rounded-full shrink-0", dotColors[i])} />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-semibold text-foreground truncate">{job.title}</p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate hidden sm:block">{companyName}</p>
                    </div>
                    <button
                      onClick={() => onRemove(job.id)}
                      className="shrink-0 p-0.5 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-destructive h-8 px-2"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={onCompare}
              disabled={selectedJobs.length < 2}
              className="rounded-xl gap-1.5 px-3 sm:px-4 h-8 sm:h-9 text-xs"
            >
              <Scale className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compare</span> ({selectedJobs.length})
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
