import { ViewMode } from '@/types';
import { RadiusFilter } from './RadiusFilter';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { List, Navigation, Users, Briefcase, Landmark, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface FloatingControlsProps {
  mode: ViewMode;
  radius: number;
  onRadiusChange: (radius: number) => void;
  onToggleSidebar: () => void;
  onCenterOnUser: () => void;
  candidateCount: number;
  jobCount: number;
  governmentJobCount?: number;
  privateJobCount?: number;
}

export const FloatingControls = ({
  mode,
  radius,
  onRadiusChange,
  onToggleSidebar,
  onCenterOnUser,
  candidateCount,
  jobCount,
  governmentJobCount = 0,
  privateJobCount = 0,
}: FloatingControlsProps) => {
  const [displayedCount, setDisplayedCount] = useState(0);
  const count = mode === 'hiring' ? candidateCount : jobCount;
  const Icon = mode === 'hiring' ? Users : Briefcase;

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

  return (
    <>
      {/* Radius filter - Desktop & Tablet only */}
      <div className="absolute bottom-28 left-4 z-[100] hidden md:block">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <RadiusFilter radius={radius} onRadiusChange={onRadiusChange} />
        </motion.div>
      </div>

      {/* Stats Card - Desktop only */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[100] hidden md:block"
      >
        <div className="glass-morphism rounded-2xl px-5 py-4 shadow-2xl">
          <div className="flex items-center gap-6">
            {/* Main Stat */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-xl",
                mode === 'hiring' ? 'bg-primary/10' : 'bg-destructive/10'
              )}>
                <Icon className={cn(
                  "w-6 h-6",
                  mode === 'hiring' ? 'text-primary' : 'text-destructive'
                )} />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <motion.span 
                    key={displayedCount}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "text-3xl font-bold tabular-nums",
                      mode === 'hiring' ? 'text-primary' : 'text-destructive'
                    )}
                  >
                    {displayedCount}
                  </motion.span>
                  <span className="text-sm text-muted-foreground">
                    {mode === 'hiring' ? 'candidates' : 'jobs'} nearby
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/70">
                  within {radius}km of your location
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-12 bg-border/50" />

            {/* Category Breakdown - Jobs only */}
            {mode === 'seeking' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">{privateJobCount}</span>
                  <span className="text-xs text-muted-foreground">Private</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10">
                  <Landmark className="w-4 h-4 text-success" />
                  <span className="text-sm font-semibold text-success">{governmentJobCount}</span>
                  <span className="text-xs text-muted-foreground">Govt</span>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="w-px h-12 bg-border/50" />

            {/* View List Button */}
            <Button 
              variant="outline" 
              onClick={onToggleSidebar}
              className="h-11 px-4 rounded-xl gap-2 hover:bg-muted touch-target touch-scale"
            >
              <List className="w-4 h-4" />
              <span>View List</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Navigation Button - Always visible */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, type: 'spring' }}
        className="absolute bottom-28 md:bottom-28 right-4 z-[100]"
      >
        <Tooltip><TooltipTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          onClick={onCenterOnUser}
          className="glass-morphism rounded-full w-12 h-12 md:w-14 md:h-14 shadow-xl hover:shadow-2xl touch-target touch-scale border-border/30"
        >
          <Navigation className="w-5 h-5 md:w-6 md:h-6 text-primary" />
        </Button>
        </TooltipTrigger><TooltipContent>Center on my location</TooltipContent></Tooltip>
      </motion.div>
    </>
  );
};
