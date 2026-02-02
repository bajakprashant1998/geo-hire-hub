import { ViewMode } from '@/types';
import { Users, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ViewToggleProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  className?: string;
}

export const ViewToggle = ({ mode, onModeChange, className }: ViewToggleProps) => {
  return (
    <div className={cn("flex gap-2 bg-background/80 backdrop-blur-sm rounded-xl p-1 border border-border/50", className)}>
      <Button
        variant={mode === 'hiring' ? 'outline' : 'ghost'}
        size="sm"
        className={cn(
          "h-9 px-4 rounded-lg gap-2 font-semibold transition-all",
          mode === 'hiring' 
            ? 'border-2 border-primary text-primary bg-primary/5' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
        onClick={() => onModeChange('hiring')}
      >
        <Users className="w-4 h-4" />
        <span className="hidden sm:inline">I am Hiring</span>
        <span className="sm:hidden">Hiring</span>
      </Button>
      <Button
        variant={mode === 'seeking' ? 'default' : 'ghost'}
        size="sm"
        className={cn(
          "h-9 px-4 rounded-lg gap-2 font-semibold transition-all",
          mode === 'seeking' 
            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
        onClick={() => onModeChange('seeking')}
      >
        <Briefcase className="w-4 h-4" />
        <span className="hidden sm:inline">I need a Job</span>
        <span className="sm:hidden">Jobs</span>
      </Button>
    </div>
  );
};
