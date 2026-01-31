import { Slider } from '@/components/ui/slider';
import { Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RadiusFilterProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
  maxRadius?: number;
}

export const RadiusFilter = ({ radius, onRadiusChange, maxRadius = 100 }: RadiusFilterProps) => {
  const presets = [5, 10, 25, 50, 100];

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-morphism rounded-2xl p-4 w-64 shadow-2xl"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Target className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-semibold">Search Radius</span>
      </div>

      {/* Quick Presets */}
      <div className="flex gap-1.5 mb-4">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => onRadiusChange(preset)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-medium transition-all touch-scale",
              radius === preset
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Slider */}
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
          <motion.span 
            key={radius}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full"
          >
            {radius} km
          </motion.span>
          <span className="text-muted-foreground">{maxRadius} km</span>
        </div>
      </div>
    </motion.div>
  );
};
