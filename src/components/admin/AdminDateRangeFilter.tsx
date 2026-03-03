import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, X } from 'lucide-react';
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DateRange {
  from: Date;
  to: Date;
}

interface AdminDateRangeFilterProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  className?: string;
}

const presets = [
  { label: 'Today', range: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: '7 days', range: () => ({ from: startOfDay(subDays(new Date(), 7)), to: endOfDay(new Date()) }) },
  { label: '30 days', range: () => ({ from: startOfDay(subDays(new Date(), 30)), to: endOfDay(new Date()) }) },
  { label: '3 months', range: () => ({ from: startOfDay(subMonths(new Date(), 3)), to: endOfDay(new Date()) }) },
];

export function AdminDateRangeFilter({ value, onChange, className }: AdminDateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState<Date | undefined>(value?.from);
  const [tempTo, setTempTo] = useState<Date | undefined>(value?.to);

  const apply = () => {
    if (tempFrom && tempTo) {
      onChange({ from: tempFrom, to: tempTo });
      setOpen(false);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn('gap-2 text-xs h-9', value && 'border-primary/40 bg-primary/5')}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {value
              ? `${format(value.from, 'MMM d')} – ${format(value.to, 'MMM d')}`
              : 'Date Range'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <p className="text-xs font-medium text-muted-foreground mb-2">Quick Presets</p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <Badge
                  key={p.label}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-colors"
                  onClick={() => {
                    const r = p.range();
                    onChange(r);
                    setOpen(false);
                  }}
                >
                  {p.label}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-0 divide-x">
            <div className="p-1">
              <p className="text-[10px] font-medium text-center text-muted-foreground py-1">From</p>
              <Calendar mode="single" selected={tempFrom} onSelect={setTempFrom} />
            </div>
            <div className="p-1">
              <p className="text-[10px] font-medium text-center text-muted-foreground py-1">To</p>
              <Calendar mode="single" selected={tempTo} onSelect={setTempTo} />
            </div>
          </div>
          <div className="p-3 border-t flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={apply} disabled={!tempFrom || !tempTo}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>
      {value && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onChange(null)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
