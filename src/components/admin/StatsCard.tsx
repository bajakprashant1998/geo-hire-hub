import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

const useCountUp = (end: number, duration = 1000) => {
  const [count, setCount] = useState(0);
  const ref = useRef<boolean>(false);

  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    if (end === 0) { setCount(0); return; }
    const steps = 30;
    const increment = end / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [end, duration]);

  return count;
};

export const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  variant = 'default' 
}: StatsCardProps) => {
  const isNumber = typeof value === 'number';
  const animatedValue = useCountUp(isNumber ? value : 0);

  const iconStyles = {
    default: 'bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-primary/10',
    success: 'bg-gradient-to-br from-success/20 to-success/5 text-success shadow-success/10',
    warning: 'bg-gradient-to-br from-warning/20 to-warning/5 text-warning shadow-warning/10',
    destructive: 'bg-gradient-to-br from-destructive/20 to-destructive/5 text-destructive shadow-destructive/10',
  };

  return (
    <Card className="rounded-xl border-border/40 bg-card/80 backdrop-blur-sm shadow-sm hover:scale-[1.02] hover:shadow-md transition-all duration-200 overflow-hidden group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold tabular-nums">
              {isNumber ? animatedValue.toLocaleString() : value}
            </p>
            {trend && (
              <p className={cn(
                'text-xs font-medium',
                trend.value >= 0 ? 'text-success' : 'text-destructive'
              )}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
              </p>
            )}
          </div>
          <div className={cn(
            'p-2.5 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-200',
            iconStyles[variant]
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
