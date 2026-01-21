import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  trend?: string;
  trendUp?: boolean;
  iconColor?: string;
  onClick?: () => void;
}

export const StatCard = ({
  icon: Icon,
  label,
  value,
  trend,
  trendUp = true,
  iconColor = 'bg-blue-500',
  onClick
}: StatCardProps) => {
  return (
    <Card 
      className={cn(
        "bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconColor)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
              trendUp 
                ? "bg-green-100 text-green-700" 
                : "bg-red-100 text-red-700"
            )}>
              {trendUp ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {trend}
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
};
