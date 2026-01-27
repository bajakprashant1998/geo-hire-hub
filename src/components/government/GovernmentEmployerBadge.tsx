import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface GovernmentEmployerBadgeProps {
  variant?: 'default' | 'compact' | 'large';
  showTooltip?: boolean;
  domain?: string;
  className?: string;
}

export const GovernmentEmployerBadge = ({ 
  variant = 'default',
  showTooltip = true,
  domain,
  className 
}: GovernmentEmployerBadgeProps) => {
  const badge = (
    <>
      {variant === 'compact' && (
        <Badge 
          variant="outline" 
          className={cn(
            "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
            className
          )}
        >
          <ShieldCheck className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      )}

      {variant === 'large' && (
        <div className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md",
          className
        )}>
          <Building className="w-5 h-5" />
          <span className="font-semibold">Verified Government Employer</span>
          <ShieldCheck className="w-5 h-5" />
        </div>
      )}

      {variant === 'default' && (
        <Badge 
          variant="outline" 
          className={cn(
            "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
            className
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
          Government Employer
        </Badge>
      )}
    </>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Verified Government Employer</p>
          {domain && (
            <p className="text-xs text-muted-foreground">
              Domain: {domain}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            This employer has been verified through their official government email domain.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
