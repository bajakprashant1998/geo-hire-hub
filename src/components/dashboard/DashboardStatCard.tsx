import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardStatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  subtitle?: string;
  accentColor: 'blue' | 'green' | 'amber' | 'purple';
  onClick?: () => void;
  delay?: number;
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
    gradient: 'from-primary/15 via-primary/5 to-transparent',
    border: 'border-primary/15 hover:border-primary/30',
    icon: 'text-primary',
    bg: 'bg-primary/10',
    glow: 'hover:shadow-[0_8px_40px_hsl(217,89%,61%,0.15)]',
    ring: 'ring-primary/15',
    dot: 'bg-primary',
    orbColor: 'bg-primary/20',
  },
  green: {
    gradient: 'from-success/15 via-success/5 to-transparent',
    border: 'border-success/15 hover:border-success/30',
    icon: 'text-success',
    bg: 'bg-success/10',
    glow: 'hover:shadow-[0_8px_40px_hsl(142,53%,43%,0.15)]',
    ring: 'ring-success/15',
    dot: 'bg-success',
    orbColor: 'bg-success/20',
  },
  amber: {
    gradient: 'from-warning/15 via-warning/5 to-transparent',
    border: 'border-warning/15 hover:border-warning/30',
    icon: 'text-warning-foreground',
    bg: 'bg-warning/10',
    glow: 'hover:shadow-[0_8px_40px_hsl(44,98%,50%,0.15)]',
    ring: 'ring-warning/15',
    dot: 'bg-warning',
    orbColor: 'bg-warning/20',
  },
  purple: {
    gradient: 'from-[hsl(262,83%,58%)]/15 via-[hsl(262,83%,58%)]/5 to-transparent',
    border: 'border-[hsl(262,83%,58%)]/15 hover:border-[hsl(262,83%,58%)]/30',
    icon: 'text-[hsl(262,83%,58%)]',
    bg: 'bg-[hsl(262,83%,58%)]/10',
    glow: 'hover:shadow-[0_8px_40px_hsl(262,83%,58%,0.15)]',
    ring: 'ring-[hsl(262,83%,58%)]/15',
    dot: 'bg-[hsl(262,83%,58%)]',
    orbColor: 'bg-[hsl(262,83%,58%)]/20',
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
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: delay * 0.1, type: 'spring', stiffness: 130, damping: 16 }}
      onClick={onClick}
      className={cn(
        "relative h-full rounded-2xl border transition-all duration-300 overflow-hidden group",
        "bg-card/50 backdrop-blur-2xl",
        "hover:-translate-y-1.5 active:scale-[0.97]",
        colors.border,
        colors.glow,
        onClick && "cursor-pointer"
      )}
    >
      {/* Glassmorphism gradient overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-80 transition-opacity duration-500",
        colors.gradient
      )} />
      
      {/* Decorative blur orb */}
      <div className={cn(
        "absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-700 group-hover:scale-110",
        colors.orbColor
      )} />

      {/* Frosted inner border line */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 dark:ring-white/5 pointer-events-none" />
      
      <div className="relative z-10 p-4 sm:p-5 flex flex-col justify-between h-full">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-2">
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", colors.dot)} />
              <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider truncate">{label}</p>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-foreground tabular-nums tracking-tight leading-none">{displayValue}</p>
          </div>
          <motion.div
            whileHover={{ scale: 1.15, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className={cn(
              "w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0",
              "bg-card/70 backdrop-blur-md ring-1 shadow-sm",
              colors.ring
            )}
          >
            <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", colors.icon)} />
          </motion.div>
        </div>
        {subtitle && (
          <p className={cn("text-[10px] sm:text-xs mt-2 font-medium opacity-70", colors.icon)}>{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
};
