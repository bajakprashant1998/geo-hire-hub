import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOptions) => void;
  entityType: 'employers' | 'candidates' | 'jobs' | 'applications' | 'users';
  availableFields: { key: string; label: string }[];
  isExporting?: boolean;
}

export interface ExportOptions {
  format: 'csv' | 'json';
  fields: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  includeAll: boolean;
}

export function ExportDialog({
  open,
  onOpenChange,
  onExport,
  entityType,
  availableFields,
  isExporting = false
}: ExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>(availableFields.map(f => f.key));
  const [includeAll, setIncludeAll] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const toggleField = (key: string) => {
    setSelectedFields(prev => 
      prev.includes(key) 
        ? prev.filter(f => f !== key)
        : [...prev, key]
    );
  };

  const handleExport = () => {
    onExport({
      format: exportFormat,
      fields: selectedFields,
      dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
      includeAll
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export {entityType}</DialogTitle>
          <DialogDescription>
            Configure your export options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as 'csv' | 'json')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="font-normal">CSV (Spreadsheet)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="font-normal">JSON (Data)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="includeAll"
                checked={includeAll}
                onCheckedChange={(checked) => setIncludeAll(checked === true)}
              />
              <Label htmlFor="includeAll" className="font-normal">Include all records</Label>
            </div>
            
            {!includeAll && (
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "From date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "To date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Field Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Fields to Export</Label>
              <Button 
                variant="link" 
                size="sm" 
                onClick={() => setSelectedFields(
                  selectedFields.length === availableFields.length 
                    ? [] 
                    : availableFields.map(f => f.key)
                )}
              >
                {selectedFields.length === availableFields.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {availableFields.map(field => (
                <div key={field.key} className="flex items-center gap-2">
                  <Checkbox 
                    id={field.key}
                    checked={selectedFields.includes(field.key)}
                    onCheckedChange={() => toggleField(field.key)}
                  />
                  <Label htmlFor={field.key} className="font-normal text-sm">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || selectedFields.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
