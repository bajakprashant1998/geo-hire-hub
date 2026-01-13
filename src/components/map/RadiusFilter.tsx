import { Slider } from '@/components/ui/slider';
import { Navigation } from 'lucide-react';

interface RadiusFilterProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
  maxRadius?: number;
}

export const RadiusFilter = ({ radius, onRadiusChange, maxRadius = 100 }: RadiusFilterProps) => {
  return (
    <div className="floating-panel p-4 w-64 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Navigation className="w-4 h-4 text-primary" />
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
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>5 km</span>
          <span className="font-medium text-foreground">{radius} km</span>
          <span>{maxRadius} km</span>
        </div>
      </div>
    </div>
  );
};
