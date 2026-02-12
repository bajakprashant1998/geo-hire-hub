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

export const DashboardStatCard = ({
  icon: Icon,
  label,
  value,
  subtitle,
  accentColor,
  onClick
}: DashboardStatCardProps) => {
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
        "bg-card rounded-xl border-t-4 shadow-sm transition-all duration-200 p-3 sm:p-5",
        "hover:shadow-md active:scale-[0.98] active:shadow-sm",
        colors.border,
        onClick && "cursor-pointer touch-press"
      )}
    >
      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-sm text-muted-foreground font-medium leading-tight">{label}</p>
          <p className="text-xl sm:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">{value}</p>
          {subtitle && (
            <p className={cn("text-[9px] sm:text-xs mt-0.5 sm:mt-1 font-medium truncate", colors.icon)}>{subtitle}</p>
          )}
        </div>
        <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0", colors.bg)}>
          <Icon className={cn("w-3.5 h-3.5 sm:w-5 sm:h-5", colors.icon)} />
        </div>
      </div>
    </div>
  );
};
