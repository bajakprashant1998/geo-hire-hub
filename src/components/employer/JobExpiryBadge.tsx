import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { differenceInDays, isPast, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface JobExpiryBadgeProps {
  expiresAt: string;
  onRenew?: () => void;
  showRenewButton?: boolean;
}

export const JobExpiryBadge = ({ 
  expiresAt, 
  onRenew,
  showRenewButton = false 
}: JobExpiryBadgeProps) => {
  const expiryDate = new Date(expiresAt);
  const daysRemaining = differenceInDays(expiryDate, new Date());
  const isExpired = isPast(expiryDate);

  const getConfig = () => {
    if (isExpired) {
      return {
        icon: XCircle,
        label: 'Expired',
        className: 'bg-destructive/10 text-destructive border-destructive/20',
        urgent: true,
      };
    }
    if (daysRemaining <= 3) {
      return {
        icon: AlertTriangle,
        label: `Expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
        className: 'bg-destructive/10 text-destructive border-destructive/20',
        urgent: true,
      };
    }
    if (daysRemaining <= 7) {
      return {
        icon: AlertTriangle,
        label: `Expires in ${daysRemaining} days`,
        className: 'bg-warning/10 text-warning border-warning/20',
        urgent: true,
      };
    }
    return {
      icon: Clock,
      label: `Expires ${format(expiryDate, 'MMM d, yyyy')}`,
      className: 'bg-muted text-muted-foreground',
      urgent: false,
    };
  };

  const { icon: Icon, label, className, urgent } = getConfig();

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={cn(className, 'gap-1.5')}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
      
      {showRenewButton && urgent && onRenew && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={onRenew}
          className="h-6 text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Renew
        </Button>
      )}
    </div>
  );
};
