import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileCompletenessBarProps {
  completeness: number;
  missingFields?: string[];
  compact?: boolean;
}

export const ProfileCompletenessBar = ({ 
  completeness, 
  missingFields = [],
  compact = false 
}: ProfileCompletenessBarProps) => {
  const getStatusColor = () => {
    if (completeness >= 100) return 'text-success';
    if (completeness >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getStatusIcon = () => {
    if (completeness >= 100) return <CheckCircle2 className="w-5 h-5 text-success" />;
    if (completeness >= 60) return <AlertCircle className="w-5 h-5 text-warning" />;
    return <XCircle className="w-5 h-5 text-destructive" />;
  };

  const getProgressClass = () => {
    if (completeness >= 100) return '[&>div]:bg-success';
    if (completeness >= 60) return '[&>div]:bg-warning';
    return '[&>div]:bg-destructive';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <div className="flex-1">
          <Progress value={completeness} className={cn('h-2', getProgressClass())} />
        </div>
        <span className={cn('text-sm font-medium', getStatusColor())}>
          {completeness}%
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium">Profile Completeness</span>
        </div>
        <span className={cn('text-lg font-bold', getStatusColor())}>
          {completeness}%
        </span>
      </div>
      
      <Progress value={completeness} className={cn('h-3', getProgressClass())} />
      
      {completeness < 100 && missingFields.length > 0 && (
        <div className="text-sm text-muted-foreground">
          <p className="mb-1">Missing:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {missingFields.map((field, i) => (
              <li key={i}>{field}</li>
            ))}
          </ul>
        </div>
      )}
      
      {completeness < 100 && (
        <p className="text-sm text-destructive">
          Complete your profile to 100% before posting jobs.
        </p>
      )}
    </div>
  );
};
