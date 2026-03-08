import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Zap, MessageCircle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface ResponseRateBadgeProps {
  responseRate: number | null;
  avgResponseHours?: number | null;
  size?: 'sm' | 'md';
}

const getConfig = (rate: number) => {
  if (rate >= 90) return {
    label: 'Very Responsive',
    icon: Zap,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    dot: 'bg-green-500',
  };
  if (rate >= 70) return {
    label: 'Responsive',
    icon: MessageCircle,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    dot: 'bg-blue-500',
  };
  if (rate >= 50) return {
    label: 'Moderately Responsive',
    icon: TrendingUp,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    dot: 'bg-amber-500',
  };
  return {
    label: 'Slow to Respond',
    icon: Clock,
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
    border: 'border-border',
    dot: 'bg-muted-foreground',
  };
};

const formatResponseTime = (hours: number) => {
  if (hours < 1) return 'under 1 hour';
  if (hours < 24) return `~${Math.round(hours)} hours`;
  const days = Math.round(hours / 24);
  return `~${days} day${days > 1 ? 's' : ''}`;
};

export const ResponseRateBadge = ({ responseRate, avgResponseHours, size = 'sm' }: ResponseRateBadgeProps) => {
  if (responseRate === null || responseRate === undefined) return null;

  const config = getConfig(responseRate);
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 cursor-default',
            config.bg, config.border,
            size === 'md' && 'px-3 py-1.5'
          )}
        >
          <Icon className={cn('shrink-0', config.color, size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
          <span className={cn('font-semibold leading-none', config.color, size === 'sm' ? 'text-[11px]' : 'text-xs')}>
            {config.label}
          </span>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[220px]">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-xs">Response rate</span>
            <span className="font-bold text-xs">{responseRate}%</span>
          </div>
          {avgResponseHours !== null && avgResponseHours !== undefined && avgResponseHours > 0 && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground text-xs">Avg. reply time</span>
              <span className="font-bold text-xs">{formatResponseTime(avgResponseHours)}</span>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground pt-0.5">
            Based on application responses in the last 90 days
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
