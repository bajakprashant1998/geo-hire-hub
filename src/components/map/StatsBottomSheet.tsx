import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { ViewMode } from '@/types';
import { Users, Briefcase, ChevronUp, List, Target, Landmark, Building2, Navigation, Sparkles, MapPin, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface StatsBottomSheetProps {
  mode: ViewMode;
  candidateCount: number;
  jobCount: number;
  governmentJobCount: number;
  privateJobCount: number;
  radius: number;
  onRadiusChange: (radius: number) => void;
  onToggleSidebar: () => void;
  onCenterOnUser: () => void;
}

export const StatsBottomSheet = ({
  mode, candidateCount, jobCount, governmentJobCount, privateJobCount,
  radius, onRadiusChange, onToggleSidebar, onCenterOnUser,
}: StatsBottomSheetProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(0);
  const dragControls = useDragControls();

  const count = mode === 'hiring' ? candidateCount : jobCount;
  const Icon = mode === 'hiring' ? Users : Briefcase;
  const accentColor = mode === 'hiring' ? 'primary' : 'destructive';

  // Animated counter
  useEffect(() => {
    const duration = 400;
    const steps = 15;
    const increment = count / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= count) {
        setDisplayedCount(count);
        clearInterval(timer);
      } else {
        setDisplayedCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [count]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y < -40) setIsExpanded(true);
    else if (info.offset.y > 40) setIsExpanded(false);
  };

  const radiusOptions = [2, 10, 50, 100, 500];

  return (
    <motion.div
      className="fixed bottom-[72px] left-0 right-0 z-30 md:hidden px-2.5"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      <motion.div
        drag="y"
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        className={cn(
          "bg-card border border-border",
          "rounded-2xl shadow-2xl",
          "overflow-hidden"
        )}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="w-9 h-1 bg-muted-foreground/20 rounded-full" />
        </div>

        {/* Main Row */}
        <div className="px-3.5 pb-3">
          <div className="flex items-center justify-between gap-2">
            {/* Stats */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className={cn(
                "p-2.5 rounded-xl flex-shrink-0",
                accentColor === 'primary' ? 'bg-primary/10' : 'bg-destructive/10'
              )}>
                <Icon className={cn(
                  "w-5 h-5",
                  accentColor === 'primary' ? 'text-primary' : 'text-destructive'
                )} />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <motion.span
                    key={displayedCount}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "text-2xl font-bold tabular-nums",
                      accentColor === 'primary' ? 'text-primary' : 'text-destructive'
                    )}
                  >
                    {displayedCount}
                  </motion.span>
                  <span className="text-xs font-semibold text-foreground/70">
                    {mode === 'hiring' ? 'candidates' : 'jobs'}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-2.5 h-2.5 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground">
                    within {radius}km
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onCenterOnUser}
                    className="h-9 w-9 rounded-xl bg-muted/40 hover:bg-muted"
                  >
                    <Navigation className="w-4 h-4 text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Center on my location</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-9 w-9 rounded-xl bg-muted/40 hover:bg-muted"
                  >
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </motion.div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isExpanded ? 'Collapse details' : 'Expand details'}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onToggleSidebar}
                    className="h-9 px-3 gap-1.5 text-xs font-semibold rounded-xl shadow-sm"
                  >
                    <List className="w-3.5 h-3.5" />
                    View List
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View all results as list</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Quick Category Tags */}
          {mode === 'seeking' && !isExpanded && (
            <div className="flex gap-1.5 mt-2.5">
              <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] bg-primary/15 border border-primary/20 text-foreground">
                <Building2 className="w-2.5 h-2.5 text-primary" />
                {privateJobCount} Private
              </Badge>
              <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] bg-emerald-500/15 border border-emerald-500/20 text-foreground">
                <Landmark className="w-2.5 h-2.5 text-emerald-500" />
                {governmentJobCount} Govt
              </Badge>
            </div>
          )}
        </div>

        {/* Expanded */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-3.5 pb-3.5 space-y-3 border-t border-border pt-3">
                {/* Category Breakdown */}
                {mode === 'seeking' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <Building2 className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-base font-bold text-foreground">{privateJobCount}</p>
                        <p className="text-[10px] text-muted-foreground">Private Jobs</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <Landmark className="w-5 h-5 text-emerald-500" />
                      <div>
                        <p className="text-base font-bold text-foreground">{governmentJobCount}</p>
                        <p className="text-[10px] text-muted-foreground">Govt Jobs</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Radius Quick Select */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">Search Radius</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] h-5 px-2 font-bold">
                      {radius}km
                    </Badge>
                  </div>
                  <div className="flex gap-1.5">
                    {radiusOptions.map((r) => (
                      <button
                        key={r}
                        onClick={() => onRadiusChange(r)}
                        className={cn(
                          "flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200",
                          "border active:scale-95",
                          radius === r
                            ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        )}
                      >
                        {r}km
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Hint */}
                {mode === 'seeking' && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="p-1.5 rounded-lg bg-warning/10">
                      <Sparkles className="w-4 h-4 text-warning" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-foreground">AI Job Matching</p>
                      <p className="text-[10px] text-muted-foreground">
                        Sign in for personalized recommendations
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default StatsBottomSheet;
