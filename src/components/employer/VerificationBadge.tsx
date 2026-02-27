import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Clock, XCircle, Bot, Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface VerificationBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  verificationMethod?: string | null;
  googleBusinessVerified?: boolean;
}

export const VerificationBadge = ({ 
  status, 
  size = 'md',
  showLabel = true,
  verificationMethod,
  googleBusinessVerified,
}: VerificationBadgeProps) => {
  const isAiVerified = status === 'approved' && verificationMethod === 'ai_auto';

  const config = {
    pending: {
      icon: Clock,
      label: 'Pending Verification',
      className: 'bg-warning/10 text-warning border-warning/20',
    },
    approved: {
      icon: isAiVerified ? Bot : ShieldCheck,
      label: isAiVerified ? 'AI Verified Employer' : 'Verified Employer',
      className: isAiVerified
        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
        : 'bg-success/10 text-success border-success/20',
    },
    rejected: {
      icon: XCircle,
      label: 'Verification Rejected',
      className: 'bg-destructive/10 text-destructive border-destructive/20',
    },
  };

  const { icon: Icon, label, className } = config[status];

  const iconSize = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-5 h-5' }[size];
  const textSize = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }[size];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge variant="outline" className={cn(className, textSize, 'gap-1.5')}>
        <Icon className={iconSize} />
        {showLabel && label}
      </Badge>
      {googleBusinessVerified && status === 'approved' && (
        <Badge variant="outline" className={cn('bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1', textSize)}>
          <MapPin className={iconSize} />
          {showLabel && 'Google Verified'}
        </Badge>
      )}
    </div>
  );
};
