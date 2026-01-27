import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Heart, Users, Calendar } from 'lucide-react';

interface CompanyCultureSectionProps {
  culture: string;
  hiringProcess: string;
  teamSize: string;
  foundingYear: number | null;
  onCultureChange: (value: string) => void;
  onHiringProcessChange: (value: string) => void;
  onTeamSizeChange: (value: string) => void;
  onFoundingYearChange: (value: number | null) => void;
}

const teamSizes = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '501-1000', label: '501-1000 employees' },
  { value: '1000+', label: '1000+ employees' },
];

export const CompanyCultureSection = ({
  culture,
  hiringProcess,
  teamSize,
  foundingYear,
  onCultureChange,
  onHiringProcessChange,
  onTeamSizeChange,
  onFoundingYearChange,
}: CompanyCultureSectionProps) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  return (
    <Card className="shadow-google border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="w-5 h-5 text-primary" />
          Company Culture & Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Team Size
            </Label>
            <Select value={teamSize} onValueChange={onTeamSizeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select team size" />
              </SelectTrigger>
              <SelectContent>
                {teamSizes.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Year Founded
            </Label>
            <Select
              value={foundingYear?.toString() || ''}
              onValueChange={(val) => onFoundingYearChange(val ? parseInt(val) : null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Company Culture</Label>
          <Textarea
            value={culture}
            onChange={(e) => onCultureChange(e.target.value)}
            placeholder="Describe your company culture, work environment, and what makes your team special..."
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Help candidates understand what it's like to work at your company
          </p>
        </div>

        <div className="space-y-2">
          <Label>Hiring Process</Label>
          <Textarea
            value={hiringProcess}
            onChange={(e) => onHiringProcessChange(e.target.value)}
            placeholder="Describe your typical hiring process (e.g., Application review → Phone screen → Technical interview → Final round → Offer)..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Transparency about the hiring process helps set candidate expectations
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
