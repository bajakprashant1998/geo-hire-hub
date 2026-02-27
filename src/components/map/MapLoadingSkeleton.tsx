import { Loader2, Briefcase, Users } from 'lucide-react';

interface MapLoadingSkeletonProps {
  mode?: 'hiring' | 'job';
}

export const MapLoadingSkeleton = ({ mode = 'job' }: MapLoadingSkeletonProps) => {
  const isHiring = mode === 'hiring';

  return (
    <div className="absolute inset-0 z-20 bg-background/90 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card/95 shadow-xl border border-border/30 max-w-xs w-full mx-4">
        <div className="relative">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
            isHiring ? 'bg-primary/10' : 'bg-destructive/10'
          }`}>
            {isHiring ? (
              <Users className="w-8 h-8 text-primary" />
            ) : (
              <Briefcase className="w-8 h-8 text-destructive" />
            )}
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-card border-2 border-border shadow flex items-center justify-center">
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
          </div>
        </div>

        <div className="text-center space-y-1">
          <h3 className="font-semibold text-base text-foreground">
            {isHiring ? 'Finding Talent' : 'Discovering Jobs'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isHiring ? 'Scanning for candidates near you…' : 'Locating opportunities nearby…'}
          </p>
        </div>

        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full animate-pulse ${isHiring ? 'bg-primary' : 'bg-destructive'}`} style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  );
};
