import { Slider } from '@/components/ui/slider';
import { Navigation, Target } from 'lucide-react';

interface RadiusFilterProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
  maxRadius?: number;
}

export const RadiusFilter = ({ radius, onRadiusChange, maxRadius = 100 }: RadiusFilterProps) => {
  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-2xl p-4 w-56 shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-primary/10 rounded-lg">
          <Target className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-medium">Search Radius</span>
      </div>
      <div className="space-y-3">
        <Slider
          value={[radius]}
          onValueChange={(value) => onRadiusChange(value[0])}
          max={maxRadius}
          min={5}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">5 km</span>
          <span className="font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">{radius} km</span>
          <span className="text-muted-foreground">{maxRadius} km</span>
        </div>
      </div>
    </div>
  );
};
