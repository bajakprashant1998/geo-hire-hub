import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PlanUsagePanelProps {
  employerId: string;
}

interface PlanData {
  planName: string;
  maxActiveJobs: number;
  activeJobCount: number;
  features: string[];
  priceMonthly: number;
}

export const PlanUsagePanel = ({ employerId }: PlanUsagePanelProps) => {
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlanData = async () => {
      try {
        // Fetch subscription with plan details
        const { data: subscription } = await supabase
          .from('employer_subscriptions')
          .select(`
            *,
            employer_plans (
              name,
              max_active_jobs,
              features,
              price_monthly
            )
          `)
          .eq('employer_id', employerId)
          .eq('status', 'active')
          .maybeSingle();

        // Count active jobs
        const { count } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('employer_id', employerId)
          .eq('is_active', true)
          .eq('status', 'open');

        if (subscription?.employer_plans) {
          setPlanData({
            planName: subscription.employer_plans.name,
            maxActiveJobs: subscription.employer_plans.max_active_jobs,
            activeJobCount: count || 0,
            features: subscription.employer_plans.features as string[],
            priceMonthly: Number(subscription.employer_plans.price_monthly),
          });
        } else {
          // Default to free plan
          setPlanData({
            planName: 'Free',
            maxActiveJobs: 1,
            activeJobCount: count || 0,
            features: ['1 active job', 'Basic applicant tracking', 'Email support'],
            priceMonthly: 0,
          });
        }
      } catch (error) {
        console.error('Error fetching plan data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (employerId) {
      fetchPlanData();
    }
  }, [employerId]);

  if (loading) {
    return (
      <Card className="shadow-google">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!planData) return null;

  const usagePercent = (planData.activeJobCount / planData.maxActiveJobs) * 100;
  const isAtLimit = planData.activeJobCount >= planData.maxActiveJobs;
  const isFree = planData.planName === 'Free';

  return (
    <Card className={`shadow-google ${isFree ? 'border-warning/50' : 'border-primary/50'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {isFree ? (
              <Zap className="w-5 h-5 text-warning" />
            ) : (
              <Crown className="w-5 h-5 text-primary" />
            )}
            Plan & Usage
          </span>
          <Badge variant={isFree ? 'secondary' : 'default'}>
            {planData.planName}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Job Slots Usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Active Jobs</span>
            <span className={isAtLimit ? 'text-destructive font-medium' : ''}>
              {planData.activeJobCount} / {planData.maxActiveJobs}
            </span>
          </div>
          <Progress 
            value={usagePercent} 
            className={isAtLimit ? '[&>div]:bg-destructive' : ''} 
          />
          {isAtLimit && (
            <p className="text-xs text-destructive">
              You've reached your job limit. Upgrade to post more.
            </p>
          )}
        </div>

        {/* Features */}
        <div className="space-y-1">
          {planData.features.slice(0, 3).map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-3 h-3 text-primary" />
              {feature}
            </div>
          ))}
        </div>

        {/* Upgrade Button */}
        {isFree && (
          <Link to="/plans">
            <Button className="w-full" variant="default">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
};
