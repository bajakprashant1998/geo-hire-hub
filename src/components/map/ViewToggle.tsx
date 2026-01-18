import { ViewMode } from '@/types';
import { Users, Briefcase } from 'lucide-react';

interface ViewToggleProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export const ViewToggle = ({ mode, onModeChange }: ViewToggleProps) => {
  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-full p-1 inline-flex items-center gap-1 shadow-xl">
      <button
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
          mode === 'hiring' 
            ? 'bg-primary text-primary-foreground shadow-lg' 
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
        }`}
        onClick={() => onModeChange('hiring')}
      >
        <Users className="w-4 h-4" />
        <span className="hidden sm:inline">I am Hiring</span>
        <span className="sm:hidden">Hiring</span>
      </button>
      <button
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
          mode === 'seeking' 
            ? 'bg-destructive text-destructive-foreground shadow-lg' 
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
        }`}
        onClick={() => onModeChange('seeking')}
      >
        <Briefcase className="w-4 h-4" />
        <span className="hidden sm:inline">I need a Job</span>
        <span className="sm:hidden">Jobs</span>
      </button>
    </div>
  );
};
