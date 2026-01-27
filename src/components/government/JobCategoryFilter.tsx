import { Button } from '@/components/ui/button';
import { Building2, Briefcase, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export type JobCategoryFilterValue = 'all' | 'private' | 'government';

interface JobCategoryFilterProps {
  value: JobCategoryFilterValue;
  onChange: (value: JobCategoryFilterValue) => void;
  className?: string;
  showCounts?: boolean;
  privateCnt?: number;
  governmentCnt?: number;
}

export const JobCategoryFilter = ({
  value,
  onChange,
  className,
  showCounts = false,
  privateCnt = 0,
  governmentCnt = 0,
}: JobCategoryFilterProps) => {
  return (
    <div className={cn("flex items-center gap-1 p-1 bg-muted rounded-lg", className)}>
      <Button
        variant={value === 'all' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('all')}
        className="h-8 gap-1.5"
      >
        <LayoutGrid className="w-4 h-4" />
        <span>All</span>
        {showCounts && (
          <span className="text-xs opacity-70">({privateCnt + governmentCnt})</span>
        )}
      </Button>
      
      <Button
        variant={value === 'government' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('government')}
        className={cn(
          "h-8 gap-1.5",
          value === 'government' && "bg-emerald-600 hover:bg-emerald-700"
        )}
      >
        <Building2 className="w-4 h-4" />
        <span>Government</span>
        {showCounts && (
          <span className="text-xs opacity-70">({governmentCnt})</span>
        )}
      </Button>
      
      <Button
        variant={value === 'private' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('private')}
        className="h-8 gap-1.5"
      >
        <Briefcase className="w-4 h-4" />
        <span>Private</span>
        {showCounts && (
          <span className="text-xs opacity-70">({privateCnt})</span>
        )}
      </Button>
    </div>
  );
};
