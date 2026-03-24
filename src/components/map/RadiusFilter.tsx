import { forwardRef } from 'react';
import { Slider } from '@/components/ui/slider';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RadiusFilterProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
  maxRadius?: number;
  className?: string;
}

export const RadiusFilter = forwardRef<HTMLDivElement, RadiusFilterProps>(({ radius, onRadiusChange, maxRadius = 500, className }, ref) => {
  const presets = [2, 10, 50, 100, 500];

  return (
    <div ref={ref} className={cn("bg-background rounded-xl p-4 shadow-lg border border-border/50", className)}>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Target className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground">Search Radius</span>
      </div>

      {/* Quick Presets */}
      <div className="flex gap-1.5 mb-4">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => onRadiusChange(preset)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
              radius === preset
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <Slider
          value={[radius]}
          onValueChange={(value) => onRadiusChange(value[0])}
          max={maxRadius}
          min={2}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">2 km</span>
          <span className="font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
            {radius} km
          </span>
          <span className="text-muted-foreground">{maxRadius} km</span>
        </div>
      </div>
    </div>
  );
});

RadiusFilter.displayName = 'RadiusFilter';
