import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

interface DashboardStatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  subtitle?: string;
  accentColor: 'blue' | 'green' | 'amber' | 'purple';
  onClick?: () => void;
  delay?: number;
}

const useCountUp = (target: number, duration = 600) => {
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
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return count;
};

const colorClasses = {
  blue: {
    gradient: 'from-primary/12 to-primary/3',
    border: 'border-primary/10 hover:border-primary/25',
    icon: 'text-primary',
    iconBg: 'bg-primary/10',
    glow: 'hover:shadow-lg hover:shadow-primary/10',
    dot: 'bg-primary',
  },
  green: {
    gradient: 'from-success/12 to-success/3',
    border: 'border-success/10 hover:border-success/25',
    icon: 'text-success',
    iconBg: 'bg-success/10',
    glow: 'hover:shadow-lg hover:shadow-success/10',
    dot: 'bg-success',
  },
  amber: {
    gradient: 'from-warning/12 to-warning/3',
    border: 'border-warning/10 hover:border-warning/25',
    icon: 'text-warning-foreground',
    iconBg: 'bg-warning/10',
    glow: 'hover:shadow-lg hover:shadow-warning/10',
    dot: 'bg-warning',
  },
  purple: {
    gradient: 'from-[hsl(262,83%,58%)]/12 to-[hsl(262,83%,58%)]/3',
    border: 'border-[hsl(262,83%,58%)]/10 hover:border-[hsl(262,83%,58%)]/25',
    icon: 'text-[hsl(262,83%,58%)]',
    iconBg: 'bg-[hsl(262,83%,58%)]/10',
    glow: 'hover:shadow-lg hover:shadow-[hsl(262,83%,58%)]/10',
    dot: 'bg-[hsl(262,83%,58%)]',
  }
};

export const DashboardStatCard = ({
  icon: Icon,
  label,
  value,
  subtitle,
  accentColor,
  onClick,
  delay = 0
}: DashboardStatCardProps) => {
  const isNumber = typeof value === 'number';
  const animatedValue = useCountUp(isNumber ? value : 0);
  const displayValue = isNumber ? animatedValue : value;
  const colors = colorClasses[accentColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: delay * 0.08, type: 'spring', stiffness: 150, damping: 18 }}
      onClick={onClick}
      className={cn(
        "relative h-full rounded-2xl border transition-all duration-200 overflow-hidden group",
        "bg-card/60 backdrop-blur-xl",
        "hover:-translate-y-1 active:scale-[0.98]",
        colors.border,
        colors.glow,
        onClick && "cursor-pointer"
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", colors.gradient)} />
      
      <div className="relative z-10 p-3 sm:p-4 flex flex-col justify-between h-full gap-2">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold uppercase tracking-wider truncate mb-1">{label}</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums tracking-tight leading-none">{displayValue}</p>
          </div>
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0", colors.iconBg)}
          >
            <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", colors.icon)} />
          </motion.div>
        </div>
        {subtitle && (
          <p className={cn("text-[10px] sm:text-[11px] font-medium truncate", colors.icon, "opacity-70")}>{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
};