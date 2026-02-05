import { ViewMode } from '@/types';
import { Users, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
 import { motion } from 'framer-motion';

interface ViewToggleProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  className?: string;
   variant?: 'default' | 'compact';
}

 export const ViewToggle = ({ mode, onModeChange, className, variant = 'default' }: ViewToggleProps) => {
   const isCompact = variant === 'compact';
   
  return (
     <div className={cn(
       "relative flex bg-muted/80 backdrop-blur-sm rounded-full p-1 border border-border/30",
       isCompact ? "gap-0" : "gap-1",
       className
     )}>
       {/* Animated background pill */}
       <motion.div
         layoutId="view-toggle-pill"
         className={cn(
           "absolute inset-y-1 rounded-full z-0",
           mode === 'hiring' ? 'bg-primary shadow-lg shadow-primary/25' : 'bg-destructive shadow-lg shadow-destructive/25'
         )}
         initial={false}
         animate={{
           left: mode === 'hiring' ? '4px' : '50%',
           right: mode === 'hiring' ? '50%' : '4px',
         }}
         transition={{ type: 'spring', stiffness: 400, damping: 30 }}
       />
       
       <button
         className={cn(
           "relative z-10 flex items-center justify-center gap-1.5 font-semibold transition-colors touch-target",
           isCompact ? "h-9 px-3 text-xs" : "h-10 px-4 text-sm",
           "rounded-full flex-1",
           mode === 'hiring' 
             ? 'text-primary-foreground' 
             : 'text-muted-foreground hover:text-foreground'
         )}
        onClick={() => onModeChange('hiring')}
      >
         <Users className={cn(isCompact ? "w-3.5 h-3.5" : "w-4 h-4")} />
         <span className="hidden sm:inline">I am Hiring</span>
         <span className="sm:hidden">Hiring</span>
       </button>
       
       <button
         className={cn(
           "relative z-10 flex items-center justify-center gap-1.5 font-semibold transition-colors touch-target",
           isCompact ? "h-9 px-3 text-xs" : "h-10 px-4 text-sm",
           "rounded-full flex-1",
           mode === 'seeking' 
             ? 'text-destructive-foreground' 
             : 'text-muted-foreground hover:text-foreground'
         )}
        onClick={() => onModeChange('seeking')}
      >
         <Briefcase className={cn(isCompact ? "w-3.5 h-3.5" : "w-4 h-4")} />
         <span className="hidden sm:inline">I need a Job</span>
         <span className="sm:hidden">Jobs</span>
       </button>
    </div>
  );
};
