import { cn } from '@/lib/utils';
import { MapPin, Building2, Briefcase, User } from 'lucide-react';

interface MapLegendProps {
  mode: 'hiring' | 'seeking';
  className?: string;
}

export const MapLegend = ({ mode, className }: MapLegendProps) => {
  return (
    <div className={cn(
      "bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg",
      className
    )}>
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
        Map Legend
      </p>
      
      {mode === 'seeking' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
              <Briefcase className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-sm">Private Jobs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <Building2 className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-sm">Government Jobs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow" />
            <span className="text-sm">Your Location</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
              <User className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-sm">Candidates</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow" />
            <span className="text-sm">Your Location</span>
          </div>
        </div>
      )}
    </div>
  );
};
