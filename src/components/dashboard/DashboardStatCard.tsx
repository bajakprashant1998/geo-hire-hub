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
      gradient: 'from-[hsl(217,89%,61%)]/20 via-[hsl(217,89%,61%)]/8 to-transparent',
      border: 'border-[hsl(217,89%,61%)]/20',
      icon: 'text-[hsl(217,89%,61%)]',
      bg: 'bg-[hsl(217,89%,61%)]/10',
      glow: 'shadow-[0_4px_30px_hsl(217,89%,61%,0.12)]',
      ring: 'ring-[hsl(217,89%,61%)]/20',
      dot: 'bg-[hsl(217,89%,61%)]',
    },
    green: {
      gradient: 'from-[hsl(142,53%,43%)]/20 via-[hsl(142,53%,43%)]/8 to-transparent',
      border: 'border-[hsl(142,53%,43%)]/20',
      icon: 'text-[hsl(142,53%,43%)]',
      bg: 'bg-[hsl(142,53%,43%)]/10',
      glow: 'shadow-[0_4px_30px_hsl(142,53%,43%,0.12)]',
      ring: 'ring-[hsl(142,53%,43%)]/20',
      dot: 'bg-[hsl(142,53%,43%)]',
    },
    amber: {
      gradient: 'from-[hsl(44,98%,50%)]/20 via-[hsl(44,98%,50%)]/8 to-transparent',
      border: 'border-[hsl(44,98%,50%)]/20',
      icon: 'text-[hsl(44,70%,45%)]',
      bg: 'bg-[hsl(44,98%,50%)]/10',
      glow: 'shadow-[0_4px_30px_hsl(44,98%,50%,0.12)]',
      ring: 'ring-[hsl(44,98%,50%)]/20',
      dot: 'bg-[hsl(44,98%,50%)]',
    },
    purple: {
      gradient: 'from-[hsl(262,83%,58%)]/20 via-[hsl(262,83%,58%)]/8 to-transparent',
      border: 'border-[hsl(262,83%,58%)]/20',
      icon: 'text-[hsl(262,83%,58%)]',
      bg: 'bg-[hsl(262,83%,58%)]/10',
      glow: 'shadow-[0_4px_30px_hsl(262,83%,58%,0.12)]',
      ring: 'ring-[hsl(262,83%,58%)]/20',
      dot: 'bg-[hsl(262,83%,58%)]',
    }
  };

  const colors = colorClasses[accentColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: delay * 0.1, type: 'spring', stiffness: 120 }}
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border transition-all duration-300 p-4 sm:p-5 overflow-hidden group",
        "bg-card/70 backdrop-blur-xl",
        "hover:shadow-xl hover:-translate-y-1 active:scale-[0.97]",
        colors.border,
        colors.glow,
        onClick && "cursor-pointer"
      )}
    >
      {/* Glassmorphism gradient overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-60 group-hover:opacity-100 transition-opacity duration-500",
        colors.gradient
      )} />
      
      {/* Decorative blur orb */}
      <div className={cn(
        "absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500",
        colors.bg
      )} />
      
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <div className={cn("w-1.5 h-1.5 rounded-full", colors.dot)} />
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold text-foreground mt-1.5 tabular-nums tracking-tight">{displayValue}</p>
          {subtitle && (
            <p className={cn("text-[10px] sm:text-xs mt-1.5 font-medium", colors.icon)}>{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center shrink-0",
          "bg-card/80 backdrop-blur-sm ring-1 transition-all duration-300",
          "group-hover:scale-110 group-hover:shadow-lg",
          colors.ring
        )}>
          <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", colors.icon)} />
        </div>
      </div>
    </motion.div>
  );
};
