import { ViewMode } from '@/types';
import { Users, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export const ViewToggle = ({ mode, onModeChange }: ViewToggleProps) => {
  return (
    <div className="glass-morphism rounded-2xl p-1.5 inline-flex items-center gap-1 shadow-xl">
      <motion.button
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold",
          "transition-all duration-300 touch-target touch-scale",
          mode === 'hiring' 
            ? 'text-primary-foreground' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
        onClick={() => onModeChange('hiring')}
      >
        {mode === 'hiring' && (
          <motion.div
            layoutId="toggle-bg"
            className="absolute inset-0 bg-primary rounded-xl shadow-lg"
            initial={false}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">I am Hiring</span>
          <span className="sm:hidden">Hiring</span>
        </span>
      </motion.button>
      
      <motion.button
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold",
          "transition-all duration-300 touch-target touch-scale",
          mode === 'seeking' 
            ? 'text-destructive-foreground' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
        onClick={() => onModeChange('seeking')}
      >
        {mode === 'seeking' && (
          <motion.div
            layoutId="toggle-bg"
            className="absolute inset-0 bg-destructive rounded-xl shadow-lg"
            initial={false}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          <Briefcase className="w-4 h-4" />
          <span className="hidden sm:inline">I need a Job</span>
          <span className="sm:hidden">Jobs</span>
        </span>
      </motion.button>
    </div>
  );
};
