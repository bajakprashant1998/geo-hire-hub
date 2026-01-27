import { Badge } from '@/components/ui/badge';
import { Shield, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GovernmentJobBadgeProps {
  variant?: 'default' | 'compact' | 'large';
  className?: string;
}

export const GovernmentJobBadge = ({ 
  variant = 'default',
  className 
}: GovernmentJobBadgeProps) => {
  if (variant === 'compact') {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
          className
        )}
      >
        <Shield className="w-3 h-3 mr-1" />
        Govt
      </Badge>
    );
  }

  if (variant === 'large') {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md",
        className
      )}>
        <Building2 className="w-5 h-5" />
        <span className="font-semibold">Official Government Job</span>
        <Shield className="w-5 h-5" />
      </div>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
        className
      )}
    >
      <Shield className="w-3.5 h-3.5 mr-1.5" />
      Government Job
    </Badge>
  );
};
