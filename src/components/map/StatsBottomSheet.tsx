import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { ViewMode } from '@/types';
import { Users, Briefcase, ChevronUp, ChevronDown, List, Target, Landmark, Building2, Navigation, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  mode,
  candidateCount,
  jobCount,
  governmentJobCount,
  privateJobCount,
  radius,
  onRadiusChange,
  onToggleSidebar,
  onCenterOnUser,
}: StatsBottomSheetProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(0);
  const dragControls = useDragControls();

  const count = mode === 'hiring' ? candidateCount : jobCount;
  const Icon = mode === 'hiring' ? Users : Briefcase;

  // Animated counter effect
  useEffect(() => {
    const duration = 500;
    const steps = 20;
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
    if (info.offset.y < -50) {
      setIsExpanded(true);
    } else if (info.offset.y > 50) {
      setIsExpanded(false);
    }
  };

  const radiusOptions = [2, 10, 50, 100, 500];

  return (
    <motion.div
      className="fixed bottom-16 left-0 right-0 z-[100] md:hidden"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      <motion.div
        drag="y"
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={{ height: isExpanded ? 'auto' : 'auto' }}
        className={cn(
          "bg-card/95 backdrop-blur-xl border-t border-x border-border/40",
          "rounded-t-2xl shadow-2xl mx-3",
          "overflow-hidden"
        )}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="w-10 h-1 bg-muted-foreground/20 rounded-full" />
        </div>

        {/* Main Stats Row */}
        <div className="px-3 pb-2.5">
          <div className="flex items-center justify-between gap-2">
            {/* Stats Info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className={cn(
                "p-2 rounded-lg flex-shrink-0",
                mode === 'hiring' ? 'bg-primary/10' : 'bg-destructive/10'
              )}>
                <Icon className={cn(
                  "w-4 h-4",
                  mode === 'hiring' ? 'text-primary' : 'text-destructive'
                )} />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1">
                  <motion.span
                    key={displayedCount}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "text-xl font-bold tabular-nums",
                      mode === 'hiring' ? 'text-primary' : 'text-destructive'
                    )}
                  >
                    {displayedCount}
                  </motion.span>
                  <span className="text-xs text-muted-foreground truncate">
                    {mode === 'hiring' ? 'candidates' : 'jobs'}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground/70">
                  within {radius}km
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Center on User Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onCenterOnUser}
                className="h-8 w-8 rounded-lg bg-muted/50"
              >
                <Navigation className="w-3.5 h-3.5 text-primary" />
              </Button>

              {/* Expand Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 rounded-lg bg-muted/50"
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronUp className="w-4 h-4" />
                </motion.div>
              </Button>

              {/* View List Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleSidebar}
                className="h-8 px-2.5 gap-1 text-xs font-medium rounded-lg border-border/50"
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-3">
                {/* Category Breakdown - Only for Jobs */}
                {mode === 'seeking' && (
                  <div className="grid grid-cols-2 gap-2 mb-1">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
                      <Building2 className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-semibold">{privateJobCount}</p>
                        <p className="text-[10px] text-muted-foreground">Private</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-br from-success/5 to-success/10 border border-success/10">
                      <Landmark className="w-4 h-4 text-success" />
                      <div>
                        <p className="text-sm font-semibold">{governmentJobCount}</p>
                        <p className="text-[10px] text-muted-foreground">Government</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Radius Quick Select */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Search Radius</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground">{radius}km</span>
                  </div>
                  <div className="flex gap-1.5">
                    {radiusOptions.map((r) => (
                      <button
                        key={r}
                        onClick={() => onRadiusChange(r)}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                          "border touch-scale",
                          radius === r
                            ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                            : "bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50 hover:border-border/50"
                        )}
                      >
                        {r}km
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Action - AI Matches hint */}
                {mode === 'seeking' && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-warning/10 via-warning/5 to-transparent border border-warning/20">
                    <Sparkles className="w-4 h-4 text-warning flex-shrink-0" />
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">AI Matching</span> — Sign in to get personalized job recommendations
                    </p>
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
