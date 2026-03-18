import { motion } from 'framer-motion';
import { ViewMode } from '@/types';
import { Briefcase, Users, Landmark, Building2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickFilterChipsProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  jobCount: number;
  candidateCount: number;
  governmentJobCount: number;
  privateJobCount: number;
}

export const QuickFilterChips = ({
  mode, onModeChange, jobCount, candidateCount, governmentJobCount, privateJobCount,
}: QuickFilterChipsProps) => {
  const chips = [
    {
      icon: Briefcase,
      label: `${jobCount} Jobs`,
      active: mode === 'seeking',
      onClick: () => onModeChange('seeking'),
      activeClass: 'bg-destructive text-destructive-foreground border-destructive shadow-destructive/20',
      dotColor: 'bg-destructive',
    },
    {
      icon: Users,
      label: `${candidateCount} Talent`,
      active: mode === 'hiring',
      onClick: () => onModeChange('hiring'),
      activeClass: 'bg-primary text-primary-foreground border-primary shadow-primary/20',
      dotColor: 'bg-primary',
    },
    {
      icon: Landmark,
      label: `${governmentJobCount} Govt`,
      active: false,
      onClick: () => onModeChange('seeking'),
      activeClass: '',
      dotColor: 'bg-[hsl(var(--success))]',
    },
    {
      icon: Building2,
      label: `${privateJobCount} Private`,
      active: false,
      onClick: () => onModeChange('seeking'),
      activeClass: '',
      dotColor: 'bg-primary',
    },
    {
      icon: Sparkles,
      label: 'AI Match',
      active: false,
      onClick: () => {},
      activeClass: '',
      dotColor: 'bg-[hsl(var(--warning))]',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className="absolute top-[58px] left-0 right-0 z-[99] safe-area-pt px-3 overflow-hidden"
    >
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-0.5 px-0.5">
        {chips.map((chip, i) => (
          <motion.button
            key={chip.label}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.06 * i + 0.2, type: 'spring', stiffness: 350 }}
            whileTap={{ scale: 0.88 }}
            onClick={chip.onClick}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[11px] font-bold whitespace-nowrap",
              "backdrop-blur-xl transition-all duration-200",
              "border",
              chip.active
                ? cn(chip.activeClass, "shadow-lg")
                : "bg-card/90 text-foreground border-border/30 shadow-lg hover:bg-card active:bg-muted"
            )}
          >
            <chip.icon className="w-3.5 h-3.5" />
            {chip.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default QuickFilterChips;
