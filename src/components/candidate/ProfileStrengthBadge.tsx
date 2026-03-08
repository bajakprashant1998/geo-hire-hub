import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, ShieldCheck, ShieldAlert, Star, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfileStrengthBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

const getConfig = (score: number) => {
  if (score >= 85) return {
    label: 'All-Star',
    icon: Star,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-gradient-to-r from-amber-500/15 to-yellow-500/10',
    border: 'border-amber-500/25',
    ring: 'from-amber-400 to-yellow-400',
  };
  if (score >= 70) return {
    label: 'Strong',
    icon: ShieldCheck,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    ring: 'from-green-400 to-emerald-400',
  };
  if (score >= 50) return {
    label: 'Growing',
    icon: TrendingUp,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    ring: 'from-blue-400 to-cyan-400',
  };
  if (score >= 30) return {
    label: 'Starter',
    icon: Shield,
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
    border: 'border-border',
    ring: 'from-muted-foreground to-muted-foreground',
  };
  return {
    label: 'New',
    icon: ShieldAlert,
    color: 'text-muted-foreground',
    bg: 'bg-muted/30',
    border: 'border-border/60',
    ring: 'from-muted-foreground to-muted-foreground',
  };
};

export const ProfileStrengthBadge = ({ score, size = 'sm' }: ProfileStrengthBadgeProps) => {
  const config = getConfig(score);
  const Icon = config.icon;
  const radius = size === 'sm' ? 11 : 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border cursor-default',
            config.bg, config.border,
            size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1'
          )}
        >
          {/* Mini ring */}
          <svg
            className={cn('shrink-0', size === 'sm' ? 'w-6 h-6' : 'w-7 h-7')}
            viewBox={`0 0 ${(radius + 3) * 2} ${(radius + 3) * 2}`}
          >
            <circle
              cx={radius + 3} cy={radius + 3} r={radius}
              fill="none" strokeWidth="2.5"
              className="stroke-muted/40"
            />
            <motion.circle
              cx={radius + 3} cy={radius + 3} r={radius}
              fill="none" strokeWidth="2.5" strokeLinecap="round"
              className={cn('stroke-current', config.color)}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
              transform={`rotate(-90 ${radius + 3} ${radius + 3})`}
            />
            <text
              x={radius + 3} y={radius + 3}
              textAnchor="middle" dominantBaseline="central"
              className={cn('fill-current font-bold', config.color)}
              fontSize={size === 'sm' ? '8' : '9'}
            >
              {score}
            </text>
          </svg>
          <span className={cn('font-semibold leading-none', config.color, size === 'sm' ? 'text-[11px]' : 'text-xs')}>
            {config.label}
          </span>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px]">
        <div className="space-y-1">
          <p className="font-semibold text-xs">Profile Strength: {score}%</p>
          <p className="text-[10px] text-muted-foreground">
            {score >= 85 ? 'Exceptional profile — stands out to employers'
              : score >= 70 ? 'Strong profile — well above average'
              : score >= 50 ? 'Good progress — add more details to stand out'
              : 'Complete your profile to improve visibility'}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
