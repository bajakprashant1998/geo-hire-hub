import { motion } from 'framer-motion';
import { ViewMode, Candidate, Job } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, MapPin, Briefcase, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NearbyAvatarRowProps {
  mode: ViewMode;
  candidates: Candidate[];
  jobs: Job[];
  onSelect: (item: Candidate | Job) => void;
  onViewAll: () => void;
}

export const NearbyAvatarRow = ({ mode, candidates, jobs, onSelect, onViewAll }: NearbyAvatarRowProps) => {
  const items = mode === 'hiring' ? candidates.slice(0, 15) : jobs.slice(0, 15);
  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', damping: 25 }}
      className="fixed bottom-[68px] left-0 right-0 z-[45] px-2 pb-2 md:hidden pointer-events-none"
    >
      <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/20 shadow-2xl py-2.5 px-2.5 pointer-events-auto">
        {/* Section label */}
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-1.5">
            {mode === 'hiring' ? (
              <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                <Users className="w-3 h-3 text-primary" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-md bg-destructive/10 flex items-center justify-center">
                <Briefcase className="w-3 h-3 text-destructive" />
              </div>
            )}
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {mode === 'hiring' ? 'Nearby Talent' : 'Nearby Jobs'}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground/60">
              ({items.length})
            </span>
          </div>
          <button
            onClick={onViewAll}
            className="flex items-center gap-0.5 text-[10px] font-semibold text-primary hover:underline"
          >
            View All
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide items-center pb-0.5">
          {/* View all button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onViewAll}
            className="flex-shrink-0 w-12 h-12 rounded-xl border-2 border-dashed border-border/40 flex items-center justify-center bg-muted/20 hover:bg-muted/40 transition-colors"
          >
            <Users className="w-4 h-4 text-muted-foreground" />
          </motion.button>

          {items.map((item, i) => {
            const isCandidate = 'full_name' in item;
            const name = isCandidate ? (item as Candidate).full_name : (item as Job).company_name;
            const subtitle = isCandidate ? (item as Candidate).job_title : (item as Job).title;
            const avatarUrl = isCandidate ? (item as Candidate).avatar_url : undefined;
            const initials = name?.charAt(0)?.toUpperCase() || '?';
            const distance = item.distance_km;

            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.04 * i + 0.3 }}
                whileTap={{ scale: 0.88 }}
                onClick={() => onSelect(item)}
                className="flex flex-col items-center gap-0.5 flex-shrink-0 w-14"
              >
                <div className="relative">
                  <Avatar className={cn(
                    "w-11 h-11 border-2 shadow-md transition-all duration-200 hover:scale-110 hover:shadow-lg",
                    isCandidate ? "border-primary/25" : "border-destructive/25"
                  )}>
                    <AvatarImage src={avatarUrl || undefined} alt={name} />
                    <AvatarFallback className={cn(
                      "text-xs font-bold",
                      isCandidate
                        ? "bg-gradient-to-br from-primary/15 to-primary/5 text-primary"
                        : "bg-gradient-to-br from-destructive/15 to-destructive/5 text-destructive"
                    )}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {distance !== undefined && (
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-card text-foreground text-[7px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap border border-border/30 shadow-sm">
                      <MapPin className="w-2 h-2" />
                      {distance < 1 ? `${Math.round(distance * 1000)}m` : `${Math.round(distance)}km`}
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-medium text-muted-foreground truncate w-full text-center leading-tight mt-1.5">
                  {name?.split(' ')[0] || subtitle?.split(' ')[0]}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};