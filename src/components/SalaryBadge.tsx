import { Badge } from '@/components/ui/badge';
import { TrendingUp, Minus } from 'lucide-react';

interface SalaryBadgeProps {
  salaryRange: string | null;
  currency?: string;
  compact?: boolean;
}

const parseSalaryNumber = (salary: string): number => {
  const cleaned = salary.replace(/[^0-9.kK]/g, '');
  const match = cleaned.match(/([\d.]+)\s*[kK]?/);
  if (!match) return 0;
  let num = parseFloat(match[1]);
  if (/[kK]/.test(salary) && num < 1000) num *= 1000;
  return num;
};

const getSalaryLevel = (salaryRange: string): 'competitive' | 'market' | null => {
  const parts = salaryRange.split(/[-–—to]/i).map(s => s.trim());
  const values = parts.map(parseSalaryNumber).filter(v => v > 0);
  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg >= 25000) return 'competitive';
  if (avg >= 8000) return 'market';
  return null;
};

export const SalaryBadge = ({ salaryRange, currency, compact = false }: SalaryBadgeProps) => {
  if (!salaryRange) return null;
  const level = getSalaryLevel(salaryRange);
  if (!level) return null;

  if (level === 'competitive') {
    return (
      <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-0.5 bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300">
        <TrendingUp className="w-2.5 h-2.5" />
        {compact ? '$$' : 'Competitive'}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-0.5 bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300">
      <Minus className="w-2.5 h-2.5" />
      {compact ? '$' : 'Market Rate'}
    </Badge>
  );
};
