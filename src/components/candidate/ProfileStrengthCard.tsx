import { motion } from 'framer-motion';
import { Shield, ShieldCheck, Star, TrendingUp, ChevronRight, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProfileStrengthCardProps {
  score: number;
  onImprove: () => void;
}

const getConfig = (score: number) => {
  if (score >= 85) return {
    label: 'All-Star', sublabel: 'Your profile stands out!',
    icon: Star, gradient: 'from-amber-500/20 to-yellow-500/10',
    color: 'text-amber-600 dark:text-amber-400',
    ringColor: 'stroke-amber-500',
    bgRing: 'stroke-amber-500/15',
  };
  if (score >= 70) return {
    label: 'Strong', sublabel: 'Well above average',
    icon: ShieldCheck, gradient: 'from-green-500/15 to-emerald-500/10',
    color: 'text-green-600 dark:text-green-400',
    ringColor: 'stroke-green-500',
    bgRing: 'stroke-green-500/15',
  };
  if (score >= 50) return {
    label: 'Growing', sublabel: 'Add more to stand out',
    icon: TrendingUp, gradient: 'from-blue-500/15 to-cyan-500/10',
    color: 'text-blue-600 dark:text-blue-400',
    ringColor: 'stroke-blue-500',
    bgRing: 'stroke-blue-500/15',
  };
  if (score >= 30) return {
    label: 'Starter', sublabel: 'Complete key sections',
    icon: Shield, gradient: 'from-muted/60 to-muted/30',
    color: 'text-muted-foreground',
    ringColor: 'stroke-muted-foreground',
    bgRing: 'stroke-muted/40',
  };
  return {
    label: 'New', sublabel: 'Get started on your profile',
    icon: ShieldAlert, gradient: 'from-muted/40 to-muted/20',
    color: 'text-muted-foreground',
    ringColor: 'stroke-muted-foreground',
    bgRing: 'stroke-muted/30',
  };
};

export const ProfileStrengthCard = ({ score, onImprove }: ProfileStrengthCardProps) => {
  const config = getConfig(score);
  const Icon = config.icon;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className={cn(
        'rounded-2xl border border-border/30 bg-gradient-to-br p-4 relative overflow-hidden',
        config.gradient,
      )}
    >
      <div className="flex items-center gap-4">
        {/* Circular progress ring */}
        <div className="relative shrink-0">
          <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
            <circle cx="44" cy="44" r={radius} fill="none" strokeWidth="5" className={config.bgRing} />
            <motion.circle
              cx="44" cy="44" r={radius}
              fill="none" strokeWidth="5" strokeLinecap="round"
              className={config.ringColor}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className={cn('text-xl font-bold', config.color)}
            >
              {score}%
            </motion.span>
          </div>
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Icon className={cn('w-4 h-4', config.color)} />
            <span className={cn('font-bold text-sm', config.color)}>{config.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{config.sublabel}</p>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Profile Strength</p>
          {score < 85 && (
            <Button size="sm" variant="outline" className="h-7 text-[11px] rounded-lg gap-1 border-border/50" onClick={onImprove}>
              Improve <ChevronRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
