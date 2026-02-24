import { motion } from 'framer-motion';
import { ViewMode, Candidate, Job } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users } from 'lucide-react';
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
      className="absolute bottom-[68px] left-0 right-0 z-30 px-2"
    >
      <div className="bg-card/90 backdrop-blur-md rounded-2xl border border-border/40 shadow-xl py-2.5 px-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide items-center">
          {/* View all button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onViewAll}
            className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted/50"
          >
            <Users className="w-5 h-5 text-muted-foreground" />
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
                transition={{ delay: 0.05 * i + 0.3 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onSelect(item)}
                className="flex flex-col items-center gap-0.5 flex-shrink-0 w-14"
              >
                <div className="relative">
                  <Avatar className={cn(
                    "w-12 h-12 border-2 shadow-md",
                    isCandidate ? "border-primary/40" : "border-destructive/40"
                  )}>
                    <AvatarImage src={avatarUrl || undefined} alt={name} />
                    <AvatarFallback className={cn(
                      "text-xs font-bold",
                      isCandidate
                        ? "bg-primary/15 text-primary"
                        : "bg-destructive/15 text-destructive"
                    )}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {distance !== undefined && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-foreground/90 text-background text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      {distance < 1 ? `${Math.round(distance * 1000)}m` : `${Math.round(distance)}km`}
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-medium text-foreground/70 truncate w-full text-center leading-tight mt-1">
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
