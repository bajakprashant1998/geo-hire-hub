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

  const colorClasses = {
    blue: {
      gradient: 'from-[hsl(217,89%,61%)]/15 to-[hsl(217,89%,61%)]/5',
      border: 'border-[hsl(217,89%,61%)]/30',
      icon: 'text-[hsl(217,89%,61%)]',
      bg: 'bg-[hsl(217,89%,61%)]/10',
      glow: 'shadow-[0_0_20px_hsl(217,89%,61%,0.1)]',
      ring: 'ring-[hsl(217,89%,61%)]/20',
    },
    green: {
      gradient: 'from-[hsl(142,53%,43%)]/15 to-[hsl(142,53%,43%)]/5',
      border: 'border-[hsl(142,53%,43%)]/30',
      icon: 'text-[hsl(142,53%,43%)]',
      bg: 'bg-[hsl(142,53%,43%)]/10',
      glow: 'shadow-[0_0_20px_hsl(142,53%,43%,0.1)]',
      ring: 'ring-[hsl(142,53%,43%)]/20',
    },
    amber: {
      gradient: 'from-[hsl(44,98%,50%)]/15 to-[hsl(44,98%,50%)]/5',
      border: 'border-[hsl(44,98%,50%)]/30',
      icon: 'text-[hsl(44,70%,45%)]',
      bg: 'bg-[hsl(44,98%,50%)]/10',
      glow: 'shadow-[0_0_20px_hsl(44,98%,50%,0.1)]',
      ring: 'ring-[hsl(44,98%,50%)]/20',
    },
    purple: {
      gradient: 'from-[hsl(262,83%,58%)]/15 to-[hsl(262,83%,58%)]/5',
      border: 'border-[hsl(262,83%,58%)]/30',
      icon: 'text-[hsl(262,83%,58%)]',
      bg: 'bg-[hsl(262,83%,58%)]/10',
      glow: 'shadow-[0_0_20px_hsl(262,83%,58%,0.1)]',
      ring: 'ring-[hsl(262,83%,58%)]/20',
    }
  };

  const colors = colorClasses[accentColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1 }}
      onClick={onClick}
      className={cn(
        "relative bg-card rounded-2xl border shadow-sm transition-all duration-300 p-3 sm:p-5 overflow-hidden group",
        "hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]",
        colors.border,
        colors.glow,
        onClick && "cursor-pointer"
      )}
    >
      {/* Gradient background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-80 transition-opacity",
        colors.gradient
      )} />
      
      <div className="relative flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight uppercase tracking-wider">{label}</p>
          <p className="text-2xl sm:text-4xl font-bold text-foreground mt-1 sm:mt-2 tabular-nums">{displayValue}</p>
          {subtitle && (
            <p className={cn("text-[9px] sm:text-xs mt-1 sm:mt-1.5 font-medium", colors.icon)}>{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ring-1 transition-transform group-hover:scale-110",
          colors.bg,
          colors.ring
        )}>
          <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", colors.icon)} />
        </div>
      </div>
    </motion.div>
  );
};
