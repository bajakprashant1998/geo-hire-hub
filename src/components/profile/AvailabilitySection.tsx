import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, Calendar, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvailabilitySectionProps {
  status: string;
  onChange: (status: string) => void;
}

const statusOptions = [
  {
    value: 'available',
    label: 'Available Now',
    description: 'Actively looking and can start immediately',
    icon: CheckCircle2,
    color: 'text-google-green',
    bgColor: 'bg-google-green/10',
  },
  {
    value: 'open',
    label: 'Open to Offers',
    description: 'Not actively searching but open to opportunities',
    icon: Clock,
    color: 'text-google-blue',
    bgColor: 'bg-google-blue/10',
  },
  {
    value: 'notice',
    label: 'Serving Notice',
    description: 'Currently in notice period',
    icon: Calendar,
    color: 'text-google-yellow',
    bgColor: 'bg-google-yellow/10',
  },
  {
    value: 'not_looking',
    label: 'Not Looking',
    description: 'Happy in current role',
    icon: XCircle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
];

export const AvailabilitySection = ({ status, onChange }: AvailabilitySectionProps) => {
  return (
    <Card className="shadow-google border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5 text-primary" />
          Job Search Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={status} onValueChange={onChange} className="space-y-3">
          {statusOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = status === option.value;
            
            return (
              <label
                key={option.value}
                className={cn(
                  "flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all",
                  isSelected 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                )}
              >
                <RadioGroupItem value={option.value} className="mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", option.bgColor)}>
                      <Icon className={cn("w-4 h-4", option.color)} />
                    </div>
                    <span className="font-medium">{option.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-10">
                    {option.description}
                  </p>
                </div>
              </label>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};
