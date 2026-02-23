import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Eye, Zap, CheckCircle, AlertCircle, Target } from 'lucide-react';

interface PerformanceInsightsPanelProps {
  title: string;
  description: string;
  skills: string[];
  salaryMin: string;
  salaryMax: string;
  location: string;
  benefits?: string[];
}

export const PerformanceInsightsPanel = ({
  title, description, skills, salaryMin, salaryMax, location, benefits = [],
}: PerformanceInsightsPanelProps) => {
  const calculateReachScore = () => {
    let score = 0;
    if (title.length > 3) score += 15;
    if (description.length > 50) score += 20;
    if (description.length > 200) score += 5;
    if (skills.length >= 3) score += 15;
    if (skills.length >= 5) score += 5;
    if (salaryMin || salaryMax) score += 15;
    if (location) score += 15;
    if (benefits.length >= 3) score += 10;
    return Math.min(score, 100);
  };

  const reachScore = calculateReachScore();

  const getSalaryInsight = () => {
    const max = parseInt(salaryMax) || 0;
    if (!parseInt(salaryMin) && !max) return { message: 'Add salary to attract candidates', color: 'text-warning', icon: '💰' };
    if (max > 0 && max < 15000) return { message: 'Below market average', color: 'text-warning', icon: '📉' };
    if (max >= 25000) return { message: 'Competitive salary!', color: 'text-success', icon: '🎯' };
    return { message: 'Market average range', color: 'text-muted-foreground', icon: '📊' };
  };

  const salaryInsight = getSalaryInsight();

  const checklist = [
    { label: 'Job title', done: title.length > 3 },
    { label: 'Description (50+ chars)', done: description.length >= 50 },
    { label: '3+ skills', done: skills.length >= 3 },
    { label: 'Salary range', done: !!(salaryMin || salaryMax) },
    { label: 'Location', done: !!location },
  ];

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Insights Hub
        </h3>
      </div>

      <div className="p-4 space-y-5">
        {/* Reach Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-muted-foreground" />
              Job Reach
            </span>
            <span className="font-bold">{reachScore}%</span>
          </div>
          <Progress value={reachScore} className="h-2" />
          <Badge variant="outline" className={`text-xs ${
            reachScore >= 80 ? 'border-success/40 text-success' :
            reachScore >= 50 ? 'border-warning/40 text-warning' :
            'border-destructive/40 text-destructive'
          }`}>
            {reachScore >= 80 ? '🚀 Excellent' : reachScore >= 50 ? '📈 Good' : '📉 Low'}
          </Badge>
        </div>

        {/* Estimated Views */}
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium">Est. Views (7 days)</span>
          </div>
          <p className="text-xl font-bold">
            {reachScore >= 80 ? '500+' : reachScore >= 50 ? '200-500' : '50-200'}
          </p>
        </div>

        {/* Salary Insight */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium">Salary Insight</span>
          </div>
          <p className={`text-xs ${salaryInsight.color}`}>
            {salaryInsight.icon} {salaryInsight.message}
          </p>
        </div>

        {/* Checklist */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium">Quick Check</span>
          {checklist.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {item.done ? <CheckCircle className="w-3.5 h-3.5 text-success" /> : <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/40" />}
              <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">💡 Pro tip:</strong> Adding 5+ skills and benefits gets 3× more applications.
          </p>
        </div>
      </div>
    </div>
  );
};
