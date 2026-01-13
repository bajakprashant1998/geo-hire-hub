import { ViewMode } from '@/types';
import { RadiusFilter } from './RadiusFilter';
import { Button } from '@/components/ui/button';
import { List, Navigation, Layers } from 'lucide-react';

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
  return (
    <>
      {/* Bottom left - Radius filter */}
      <div className="absolute bottom-24 left-4 z-[1000]">
        <RadiusFilter radius={radius} onRadiusChange={onRadiusChange} />
      </div>

      {/* Bottom center - Stats and list toggle */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
        <div className="floating-panel px-4 py-3 flex items-center gap-4 animate-fade-in">
          <div className="text-sm">
            {mode === 'hiring' ? (
              <span>
                <span className="font-semibold text-primary">{candidateCount}</span>
                <span className="text-muted-foreground"> candidates nearby</span>
              </span>
            ) : (
              <span>
                <span className="font-semibold text-destructive">{jobCount}</span>
                <span className="text-muted-foreground"> jobs nearby</span>
              </span>
            )}
          </div>
          <div className="w-px h-5 bg-border" />
          <Button variant="ghost" size="sm" onClick={onToggleSidebar}>
            <List className="w-4 h-4 mr-2" />
            View List
          </Button>
        </div>
      </div>

      {/* Bottom right - Quick actions */}
      <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={onCenterOnUser}
          className="shadow-google rounded-full w-12 h-12"
          title="Center on my location"
        >
          <Navigation className="w-5 h-5" />
        </Button>
      </div>
    </>
  );
};
