import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Loader2 } from 'lucide-react';

interface MapLoadingSkeletonProps {
  mode?: 'hiring' | 'job';
}

export const MapLoadingSkeleton = ({ mode = 'job' }: MapLoadingSkeletonProps) => {
  return (
    <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-card/90 shadow-xl border border-border/50">
        {/* Map icon with pulse animation */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <MapPin className="w-10 h-10 text-primary" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </div>
        </div>
        
        {/* Mode-aware text */}
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-lg text-foreground">Loading Map</h3>
          <p className="text-sm text-muted-foreground">
            {mode === 'hiring'
              ? 'Locating candidates near you…'
              : 'Discovering jobs nearby…'}
          </p>
        </div>
        
        {/* Animated dropping pin markers */}
        <div className="flex items-end gap-3 mt-2">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              className="flex flex-col items-center gap-2 animate-bounce"
              style={{ animationDelay: `${i * 200}ms`, animationDuration: '1.4s' }}
            >
              <MapPin
                className={`w-6 h-6 ${mode === 'hiring' ? 'text-blue-500' : 'text-destructive'}`}
                style={{ opacity: 1 - (i * 0.15) }}
              />
              <Skeleton 
                className="w-12 h-2 rounded" 
                style={{ 
                  animationDelay: `${i * 150}ms`,
                  opacity: 1 - (i * 0.15)
                }} 
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
