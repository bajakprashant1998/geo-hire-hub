import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyBenefitsSectionProps {
  benefits: string[];
  onChange: (benefits: string[]) => void;
}

const commonBenefits = [
  'Health Insurance',
  'Dental & Vision',
  'Paid Time Off',
  'Remote Work',
  'Flexible Hours',
  '401(k) / Retirement',
  'Stock Options',
  'Annual Bonus',
  'Professional Development',
  'Gym Membership',
  'Meal Allowance',
  'Transport Allowance',
  'Parental Leave',
  'Mental Health Support',
  'Life Insurance',
  'Relocation Assistance',
];

export const CompanyBenefitsSection = ({ benefits, onChange }: CompanyBenefitsSectionProps) => {
  const toggleBenefit = (benefit: string) => {
    if (benefits.includes(benefit)) {
      onChange(benefits.filter((b) => b !== benefit));
    } else {
      onChange([...benefits, benefit]);
    }
  };

  return (
    <Card className="shadow-google border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="w-5 h-5 text-primary" />
          Benefits & Perks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Select the benefits your company offers to attract top talent
        </p>
        
        <div className="flex flex-wrap gap-2">
          {commonBenefits.map((benefit) => {
            const isSelected = benefits.includes(benefit);
            return (
              <button
                key={benefit}
                type="button"
                onClick={() => toggleBenefit(benefit)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
                {benefit}
              </button>
            );
          })}
        </div>

        {benefits.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {benefits.length} benefit{benefits.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
