import { ViewMode } from '@/types';
import { RadiusFilter } from './RadiusFilter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { List, Navigation, Users, Briefcase } from 'lucide-react';

interface FloatingControlsProps {
  mode: ViewMode;
  radius: number;
  onRadiusChange: (radius: number) => void;
  onToggleSidebar: () => void;
  onCenterOnUser: () => void;
  candidateCount: number;
  jobCount: number;
}

export const FloatingControls = ({
  mode,
  radius,
  onRadiusChange,
  onToggleSidebar,
  onCenterOnUser,
  candidateCount,
  jobCount,
}: FloatingControlsProps) => {
  const count = mode === 'hiring' ? candidateCount : jobCount;
  const Icon = mode === 'hiring' ? Users : Briefcase;

  return (
    <>
      {/* Bottom left - Radius filter */}
      <div className="absolute bottom-24 sm:bottom-28 left-3 sm:left-4 z-[100]">
        <RadiusFilter radius={radius} onRadiusChange={onRadiusChange} />
      </div>

      {/* Bottom center - Stats and list toggle */}
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-6rem)] sm:w-auto max-w-md">
        <div className="bg-card/95 backdrop-blur-md border border-border/50 shadow-xl rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 sm:p-2 rounded-lg ${mode === 'hiring' ? 'bg-primary/10' : 'bg-destructive/10'}`}>
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${mode === 'hiring' ? 'text-primary' : 'text-destructive'}`} />
            </div>
            <div className="text-xs sm:text-sm">
              <span className={`font-bold ${mode === 'hiring' ? 'text-primary' : 'text-destructive'}`}>
                {count}
              </span>
              <span className="text-muted-foreground ml-1">
                <span className="hidden sm:inline">{mode === 'hiring' ? 'candidates' : 'jobs'} nearby</span>
                <span className="sm:hidden">{mode === 'hiring' ? 'candidates' : 'jobs'}</span>
              </span>
            </div>
          </div>
          <div className="w-px h-5 sm:h-6 bg-border/50" />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleSidebar}
            className="hover:bg-accent touch-target-sm px-2 sm:px-3"
          >
            <List className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">View List</span>
          </Button>
        </div>
      </div>

      {/* Bottom right - Quick actions */}
      <div className="absolute bottom-24 sm:bottom-28 right-3 sm:right-4 z-[100] flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={onCenterOnUser}
          className="shadow-xl bg-card hover:bg-card/90 border border-border/50 rounded-full w-11 h-11 sm:w-12 sm:h-12 touch-target touch-scale"
          title="Center on my location"
        >
          <Navigation className="w-5 h-5" />
        </Button>
      </div>
    </>
  );
};
