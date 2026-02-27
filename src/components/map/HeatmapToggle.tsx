import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HeatmapToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export const HeatmapToggle = ({ enabled, onToggle }: HeatmapToggleProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <motion.button
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: 1.05 }}
        onClick={onToggle}
        className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center",
          "backdrop-blur-xl border shadow-xl transition-all duration-200",
          enabled
            ? "bg-orange-500/90 border-orange-400/50 text-white shadow-orange-500/20"
            : "bg-card/95 border-border/30 text-foreground hover:bg-card"
        )}
      >
        <Flame className="w-[18px] h-[18px]" />
      </motion.button>
    </TooltipTrigger>
    <TooltipContent side="left" className="text-xs">
      {enabled ? 'Hide heatmap' : 'Show job density heatmap'}
    </TooltipContent>
  </Tooltip>
);