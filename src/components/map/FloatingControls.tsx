import { motion } from 'framer-motion';
import { Navigation, List, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface FloatingControlsProps {
  onCenterOnUser: () => void;
  onToggleSidebar: () => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
}

export const FloatingControls = ({
  onCenterOnUser, onToggleSidebar, radius, onRadiusChange,
}: FloatingControlsProps) => {
  const radiusCycle = [5, 10, 50, 100, 500];

  const cycleRadius = () => {
    const currentIndex = radiusCycle.indexOf(radius);
    const nextIndex = (currentIndex + 1) % radiusCycle.length;
    onRadiusChange(radiusCycle[nextIndex]);
  };

  const buttons = [
    { icon: Navigation, tooltip: 'My location', onClick: onCenterOnUser, highlight: true, label: undefined },
    { icon: Target, tooltip: `${radius}km radius`, onClick: cycleRadius, highlight: false, label: `${radius}` },
    { icon: List, tooltip: 'View list', onClick: onToggleSidebar, highlight: false, label: undefined },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4, duration: 0.3 }}
      className="absolute right-3 top-1/2 -translate-y-1/2 z-[90] flex flex-col gap-2.5"
    >
      {buttons.map((btn, i) => (
        <Tooltip key={btn.tooltip}>
          <TooltipTrigger asChild>
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              whileTap={{ scale: 0.9 }}
              onClick={btn.onClick}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center",
                "bg-card/90 backdrop-blur-md border border-border/40 shadow-xl",
                "active:bg-muted transition-colors",
                btn.highlight && "ring-2 ring-primary/30"
              )}
            >
              {btn.label ? (
                <span className="text-[10px] font-bold text-foreground">{btn.label}</span>
              ) : (
                <btn.icon className={cn(
                  "w-5 h-5",
                  btn.highlight ? "text-primary" : "text-foreground"
                )} />
              )}
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="left">{btn.tooltip}</TooltipContent>
        </Tooltip>
      ))}
    </motion.div>
  );
};
