import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldCheck, AlertTriangle, Shield, Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface TrustScoreDisplayProps {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const getScoreConfig = (score: number) => {
  if (score >= 80) return {
    label: 'Highly Trusted',
    icon: ShieldCheck,
    color: 'text-success',
    bg: 'bg-success/10',
    ring: 'ring-success/30',
    track: 'text-success',
    grade: 'A',
  };
  if (score >= 60) return {
    label: 'Trusted',
    icon: Shield,
    color: 'text-primary',
    bg: 'bg-primary/10',
    ring: 'ring-primary/30',
    track: 'text-primary',
    grade: 'B',
  };
  if (score >= 40) return {
    label: 'Moderate',
    icon: Star,
    color: 'text-warning-foreground',
    bg: 'bg-warning/15',
    ring: 'ring-warning/30',
    track: 'text-warning-foreground',
    grade: 'C',
  };
  return {
    label: 'New Employer',
    icon: AlertTriangle,
    color: 'text-muted-foreground',
    bg: 'bg-muted/30',
    ring: 'ring-border',
    track: 'text-muted-foreground',
    grade: 'D',
  };
};

export const TrustScoreDisplay = ({ score, size = 'md', showLabel = true }: TrustScoreDisplayProps) => {
  if (score === null || score === undefined) return null;

  const config = getScoreConfig(score);
  const Icon = config.icon;
  const dimensions = { sm: 48, md: 64, lg: 80 }[size];
  const strokeWidth = { sm: 3, md: 3.5, lg: 4 }[size];
  const radius = (dimensions - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('flex items-center gap-2.5 cursor-default', size === 'lg' && 'flex-col')}>
          <div className="relative" style={{ width: dimensions, height: dimensions }}>
            <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${dimensions} ${dimensions}`}>
              <circle
                cx={dimensions / 2} cy={dimensions / 2} r={radius}
                fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth}
              />
              <motion.circle
                cx={dimensions / 2} cy={dimensions / 2} r={radius}
                fill="none" stroke="currentColor"
                strokeWidth={strokeWidth} strokeLinecap="round"
                className={config.track}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference - progress }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('font-bold leading-none', config.color, {
                'text-xs': size === 'sm',
                'text-sm': size === 'md',
                'text-lg': size === 'lg',
              })}>{score}</span>
              <span className="text-[8px] text-muted-foreground font-medium leading-none mt-0.5">/100</span>
            </div>
          </div>
          {showLabel && (
            <div className={cn(size === 'lg' ? 'text-center' : '')}>
              <div className="flex items-center gap-1">
                <Icon className={cn('shrink-0', config.color, {
                  'w-3 h-3': size === 'sm',
                  'w-3.5 h-3.5': size === 'md',
                  'w-4 h-4': size === 'lg',
                })} />
                <span className={cn('font-semibold', config.color, {
                  'text-[10px]': size === 'sm',
                  'text-xs': size === 'md',
                  'text-sm': size === 'lg',
                })}>{config.label}</span>
              </div>
              <p className={cn('text-muted-foreground leading-snug', {
                'text-[9px]': size === 'sm',
                'text-[10px]': size === 'md',
                'text-xs': size === 'lg',
              })}>Trust Score</p>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-[200px]">
        <p className="font-semibold">{config.label} — {score}/100</p>
        <p className="text-xs text-muted-foreground mt-1">
          Based on verification status, document checks, profile completeness, and platform activity.
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
