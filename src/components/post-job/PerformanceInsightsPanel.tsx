import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Eye, Zap, CheckCircle, AlertCircle } from 'lucide-react';

interface PerformanceInsightsPanelProps {
  title: string;
  description: string;
  skills: string[];
  salaryMin: string;
  salaryMax: string;
  location: string;
}

export const PerformanceInsightsPanel = ({
  title,
  description,
  skills,
  salaryMin,
  salaryMax,
  location,
}: PerformanceInsightsPanelProps) => {
  // Calculate job reach score based on completeness
  const calculateReachScore = () => {
    let score = 0;
    if (title.length > 3) score += 20;
    if (description.length > 50) score += 25;
    if (skills.length >= 3) score += 20;
    if (salaryMin || salaryMax) score += 15;
    if (location) score += 20;
    return Math.min(score, 100);
  };

  const reachScore = calculateReachScore();

  // Get salary insight
  const getSalaryInsight = () => {
    const min = parseInt(salaryMin) || 0;
    const max = parseInt(salaryMax) || 0;

    if (!min && !max) {
      return {
        status: 'missing',
        message: 'Add salary to attract more candidates',
        color: 'text-warning',
      };
    }

    if (max > 0 && max < 15000) {
      return {
        status: 'low',
        message: 'Below market average. Consider increasing for better reach.',
        color: 'text-warning',
      };
    }

    if (max >= 25000) {
      return {
        status: 'competitive',
        message: 'Competitive salary! Expect high-quality applicants.',
        color: 'text-success',
      };
    }

    return {
      status: 'average',
      message: 'Market average salary range.',
      color: 'text-muted-foreground',
    };
  };

  const salaryInsight = getSalaryInsight();

  // Checklist items
  const checklist = [
    { label: 'Job title added', done: title.length > 3 },
    { label: 'Description (50+ chars)', done: description.length >= 50 },
    { label: 'At least 3 skills', done: skills.length >= 3 },
    { label: 'Salary range specified', done: !!(salaryMin || salaryMax) },
    { label: 'Location selected', done: !!location },
  ];

  const getReachColor = () => {
    if (reachScore >= 80) return 'bg-success';
    if (reachScore >= 50) return 'bg-warning';
    return 'bg-destructive';
  };

  const getReachLabel = () => {
    if (reachScore >= 80) return 'Excellent Reach';
    if (reachScore >= 50) return 'Good Reach';
    return 'Low Reach';
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-google-lg sticky top-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Performance Insights Hub
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Job Reach Meter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Job Reach Meter</span>
              </div>
              <span className="text-sm font-semibold">{reachScore}%</span>
            </div>
            <Progress value={reachScore} className={`h-2 ${getReachColor()}`} />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Based on your inputs</span>
              <span className={reachScore >= 80 ? 'text-success' : reachScore >= 50 ? 'text-warning' : 'text-destructive'}>
                {getReachLabel()}
              </span>
            </div>
          </div>

          {/* Estimated Views */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Estimated Views</span>
            </div>
            <p className="text-2xl font-bold">
              {reachScore >= 80 ? '500+' : reachScore >= 50 ? '200-500' : '50-200'}
            </p>
            <p className="text-xs text-muted-foreground">In first 7 days</p>
          </div>

          {/* Salary Trend */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Salary Insight</span>
            </div>
            <div className={`text-sm ${salaryInsight.color}`}>
              {salaryInsight.message}
            </div>
            {title && (
              <p className="text-xs text-muted-foreground">
                Market range for {title || 'this role'}: ₹15,000 - ₹35,000/month
              </p>
            )}
          </div>

          {/* Completion Checklist */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Quick Checklist</span>
            <div className="space-y-1.5">
              {checklist.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {item.done ? (
                    <CheckCircle className="w-4 h-4 text-success" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">💡 Tip:</strong> Jobs with complete details get 3x more applications. Add at least 5 relevant skills for best results.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
