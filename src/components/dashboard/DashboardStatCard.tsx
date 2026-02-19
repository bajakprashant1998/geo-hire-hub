import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface DashboardStatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  subtitle?: string;
  accentColor: 'blue' | 'green' | 'amber' | 'purple';
  onClick?: () => void;
}

const useCountUp = (target: number, duration = 800) => {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current || target === 0) {
      setCount(target);
      return;
    }
    hasAnimated.current = true;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return count;
};

export const DashboardStatCard = ({
  icon: Icon,
  label,
  value,
  subtitle,
  accentColor,
  onClick
}: DashboardStatCardProps) => {
  const isNumber = typeof value === 'number';
  const animatedValue = useCountUp(isNumber ? value : 0);
  const displayValue = isNumber ? animatedValue : value;

  const colorClasses = {
    blue: {
      border: 'border-t-[hsl(217,89%,61%)]',
      icon: 'text-[hsl(217,89%,61%)]',
      bg: 'bg-[hsl(217,89%,61%)]/10'
    },
    green: {
      border: 'border-t-[hsl(142,53%,43%)]',
      icon: 'text-[hsl(142,53%,43%)]',
      bg: 'bg-[hsl(142,53%,43%)]/10'
    },
    amber: {
      border: 'border-t-[hsl(44,98%,50%)]',
      icon: 'text-[hsl(44,70%,45%)]',
      bg: 'bg-[hsl(44,98%,50%)]/10'
    },
    purple: {
      border: 'border-t-[hsl(262,83%,58%)]',
      icon: 'text-[hsl(262,83%,58%)]',
      bg: 'bg-[hsl(262,83%,58%)]/10'
    }
  };

  const colors = colorClasses[accentColor];

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl border-t-4 shadow-sm transition-all duration-200 p-2.5 sm:p-5",
        "hover:shadow-md active:scale-[0.98] active:shadow-sm overflow-hidden",
        colors.border,
        onClick && "cursor-pointer touch-press"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-sm text-muted-foreground font-medium leading-tight">{label}</p>
          <p className="text-lg sm:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">{displayValue}</p>
          {subtitle && (
            <p className={cn("text-[9px] sm:text-xs mt-0.5 sm:mt-1 font-medium truncate", colors.icon)}>{subtitle}</p>
          )}
        </div>
        <div className={cn("w-7 h-7 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0", colors.bg)}>
          <Icon className={cn("w-3 h-3 sm:w-5 sm:h-5", colors.icon)} />
        </div>
      </div>
    </div>
  );
};
