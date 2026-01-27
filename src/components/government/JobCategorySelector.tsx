import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building2, Briefcase, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GovernmentEmployerBadge } from './GovernmentEmployerBadge';

interface JobCategorySelectorProps {
  value: 'private' | 'government';
  onChange: (value: 'private' | 'government') => void;
  isGovernmentEmployer: boolean;
  className?: string;
}

export const JobCategorySelector = ({
  value,
  onChange,
  isGovernmentEmployer,
  className,
}: JobCategorySelectorProps) => {
  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-base font-medium">Job Category</Label>
      
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as 'private' | 'government')}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {/* Private Job Option */}
        <div>
          <RadioGroupItem
            value="private"
            id="category-private"
            className="peer sr-only"
          />
          <Label
            htmlFor="category-private"
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all",
              "hover:border-primary/50 hover:bg-accent/50",
              "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
            )}
          >
            <Briefcase className="w-8 h-8 text-muted-foreground" />
            <span className="font-medium">Private Job</span>
            <span className="text-xs text-muted-foreground text-center">
              Standard job posting for private sector
            </span>
          </Label>
        </div>

        {/* Government Job Option */}
        <div>
          <RadioGroupItem
            value="government"
            id="category-government"
            className="peer sr-only"
            disabled={!isGovernmentEmployer}
          />
          <Label
            htmlFor="category-government"
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-4 border-2 rounded-xl transition-all",
              isGovernmentEmployer 
                ? "cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30" 
                : "cursor-not-allowed opacity-60",
              "peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-50 dark:peer-data-[state=checked]:bg-emerald-950/50"
            )}
          >
            <Building2 className={cn(
              "w-8 h-8",
              isGovernmentEmployer ? "text-emerald-600" : "text-muted-foreground"
            )} />
            <span className="font-medium flex items-center gap-2">
              Government Job
              {!isGovernmentEmployer && <Lock className="w-4 h-4" />}
            </span>
            <span className="text-xs text-muted-foreground text-center">
              {isGovernmentEmployer 
                ? "Official government position posting"
                : "Only verified government employers"
              }
            </span>
          </Label>
        </div>
      </RadioGroup>

      {!isGovernmentEmployer && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Lock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Government jobs require verification
            </p>
            <p className="text-amber-700 dark:text-amber-300 text-xs mt-0.5">
              Only employers with verified government email domains (e.g., @gov.in, @nic.in) 
              can post government jobs.
            </p>
          </div>
        </div>
      )}

      {isGovernmentEmployer && (
        <div className="flex items-center gap-2">
          <GovernmentEmployerBadge variant="compact" showTooltip={false} />
          <span className="text-sm text-muted-foreground">
            You can post both private and government jobs
          </span>
        </div>
      )}
    </div>
  );
};
