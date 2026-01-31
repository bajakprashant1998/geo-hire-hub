import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { ViewMode } from '@/types';
import { Users, Briefcase, ChevronUp, ChevronDown, List, Target, Landmark, Building2 } from 'lucide-react';
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

  const radiusOptions = [5, 10, 25, 50, 100];

  return (
    <motion.div
      className="fixed bottom-16 left-0 right-0 z-[100] md:hidden safe-area-pb"
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
          "bg-card/98 backdrop-blur-xl border-t border-x border-border/50",
          "rounded-t-3xl shadow-2xl mx-2",
          "overflow-hidden"
        )}
      >
        {/* Drag Handle */}
        <div 
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Main Stats Row */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2.5 rounded-xl",
                mode === 'hiring' ? 'bg-primary/10' : 'bg-destructive/10'
              )}>
                <Icon className={cn(
                  "w-5 h-5",
                  mode === 'hiring' ? 'text-primary' : 'text-destructive'
                )} />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <motion.span 
                    key={displayedCount}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "text-2xl font-bold",
                      mode === 'hiring' ? 'text-primary' : 'text-destructive'
                    )}
                  >
                    {displayedCount}
                  </motion.span>
                  <span className="text-sm text-muted-foreground">
                    {mode === 'hiring' ? 'candidates' : 'jobs'} nearby
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  within {radius}km of you
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-9 w-9"
              >
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronUp className="w-5 h-5" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleSidebar}
                className="h-9 px-3 gap-1.5"
              >
                <List className="w-4 h-4" />
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
              <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">
                {/* Category Breakdown - Only for Jobs */}
                {mode === 'seeking' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                      <Building2 className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-semibold">{privateJobCount}</p>
                        <p className="text-xs text-muted-foreground">Private</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                      <Landmark className="w-4 h-4 text-success" />
                      <div>
                        <p className="text-sm font-semibold">{governmentJobCount}</p>
                        <p className="text-xs text-muted-foreground">Government</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Radius Quick Select */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Search Radius</span>
                  </div>
                  <div className="flex gap-2">
                    {radiusOptions.map((r) => (
                      <button
                        key={r}
                        onClick={() => onRadiusChange(r)}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                          "border touch-scale",
                          radius === r
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                        )}
                      >
                        {r}km
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default StatsBottomSheet;
