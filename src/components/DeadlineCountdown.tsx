import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, XCircle, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeadlineCountdownProps {
  expiresAt: string;
  variant?: 'badge' | 'inline' | 'card';
  className?: string;
}

const getTimeRemaining = (expiresAt: string) => {
  const now = new Date().getTime();
  const deadline = new Date(expiresAt).getTime();
  const diff = deadline - now;

  if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, total: 0 };

  return {
    expired: false,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    total: diff,
  };
};

export const DeadlineCountdown = ({ expiresAt, variant = 'badge', className }: DeadlineCountdownProps) => {
  const [time, setTime] = useState(() => getTimeRemaining(expiresAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeRemaining(expiresAt));
    }, 60000); // update every minute
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (time.expired) {
    if (variant === 'badge') {
      return (
        <Badge variant="outline" className={cn('gap-1 bg-destructive/10 text-destructive border-destructive/20', className)}>
          <XCircle className="w-3 h-3" />
          Deadline passed
        </Badge>
      );
    }
    return (
      <span className={cn('text-xs text-destructive flex items-center gap-1', className)}>
        <XCircle className="w-3 h-3" /> Deadline passed
      </span>
    );
  }

  const isUrgent = time.days <= 2;
  const isWarning = time.days <= 5;

  const getLabel = () => {
    if (time.days > 0) {
      return `${time.days}d ${time.hours}h left`;
    }
    if (time.hours > 0) {
      return `${time.hours}h ${time.minutes}m left`;
    }
    return `${time.minutes}m left`;
  };

  const Icon = isUrgent ? AlertTriangle : isWarning ? Timer : Clock;

  if (variant === 'card') {
    return (
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        isUrgent ? 'bg-destructive/5 border-destructive/20' :
        isWarning ? 'bg-warning/5 border-warning/20' :
        'bg-muted/50 border-border',
        className
      )}>
        <div className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
          isUrgent ? 'bg-destructive/10 text-destructive' :
          isWarning ? 'bg-warning/10 text-warning' :
          'bg-primary/10 text-primary'
        )}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <p className={cn(
            'text-sm font-semibold',
            isUrgent ? 'text-destructive' : isWarning ? 'text-warning' : 'text-foreground'
          )}>
            {getLabel()}
          </p>
          <p className="text-xs text-muted-foreground">
            Apply before {new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={cn(
        'text-xs flex items-center gap-1 font-medium',
        isUrgent ? 'text-destructive' : isWarning ? 'text-warning' : 'text-muted-foreground',
        isUrgent && 'animate-pulse',
        className
      )}>
        <Icon className="w-3 h-3" />
        {getLabel()}
      </span>
    );
  }

  // badge variant (default)
  return (
    <Badge variant="outline" className={cn(
      'gap-1',
      isUrgent ? 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse' :
      isWarning ? 'bg-warning/10 text-warning border-warning/20' :
      'bg-muted text-muted-foreground',
      className
    )}>
      <Icon className="w-3 h-3" />
      {getLabel()}
    </Badge>
  );
};
