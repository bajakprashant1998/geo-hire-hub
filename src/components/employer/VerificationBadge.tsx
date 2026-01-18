import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface VerificationBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const VerificationBadge = ({ 
  status, 
  size = 'md',
  showLabel = true 
}: VerificationBadgeProps) => {
  const config = {
    pending: {
      icon: Clock,
      label: 'Pending Verification',
      className: 'bg-warning/10 text-warning border-warning/20',
    },
    approved: {
      icon: ShieldCheck,
      label: 'Verified Employer',
      className: 'bg-success/10 text-success border-success/20',
    },
    rejected: {
      icon: XCircle,
      label: 'Verification Rejected',
      className: 'bg-destructive/10 text-destructive border-destructive/20',
    },
  };

  const { icon: Icon, label, className } = config[status];

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  const textSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }[size];

  return (
    <Badge 
      variant="outline" 
      className={cn(className, textSize, 'gap-1.5')}
    >
      <Icon className={iconSize} />
      {showLabel && label}
    </Badge>
  );
};
