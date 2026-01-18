import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Crown, Zap, TrendingUp, Check, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

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
      <Card className="shadow-md border-0 overflow-hidden">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-muted rounded-lg w-2/3"></div>
            <div className="h-8 bg-muted rounded-lg"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded-lg w-full"></div>
              <div className="h-4 bg-muted rounded-lg w-3/4"></div>
            </div>
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className={`shadow-md border-0 overflow-hidden ${isFree ? 'ring-1 ring-warning/30' : 'ring-1 ring-primary/20'}`}>
        {/* Gradient top border */}
        <div className={`h-1.5 ${isFree ? 'bg-gradient-to-r from-warning to-warning/60' : 'bg-gradient-to-r from-primary to-primary/60'}`} />
        
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${isFree ? 'bg-warning/10' : 'bg-primary/10'}`}>
                {isFree ? (
                  <Zap className="w-5 h-5 text-warning" />
                ) : (
                  <Crown className="w-5 h-5 text-primary" />
                )}
              </div>
              <span className="font-semibold">Plan & Usage</span>
            </span>
            <Badge 
              variant={isFree ? 'secondary' : 'default'}
              className="rounded-lg font-medium"
            >
              {planData.planName}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-5">
          {/* Job Slots Usage */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground font-medium">Active Jobs</span>
              <span className={`text-lg font-bold tabular-nums ${isAtLimit ? 'text-destructive' : ''}`}>
                {planData.activeJobCount}
                <span className="text-muted-foreground font-normal text-sm"> / {planData.maxActiveJobs}</span>
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={usagePercent} 
                className={`h-2.5 rounded-full ${isAtLimit ? '[&>div]:bg-destructive' : ''}`} 
              />
            </div>
            {isAtLimit && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive flex items-center gap-1.5 bg-destructive/10 px-3 py-2 rounded-lg"
              >
                <span className="font-medium">You've reached your job limit.</span>
                <Link to="/plans" className="underline hover:no-underline">
                  Upgrade to post more.
                </Link>
              </motion.p>
            )}
          </div>

          <Separator />

          {/* Features */}
          <div className="space-y-2.5">
            {planData.features.slice(0, 3).map((feature, i) => (
              <div 
                key={i} 
                className="flex items-center gap-2.5 text-sm text-muted-foreground group"
              >
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="group-hover:text-foreground transition-colors">{feature}</span>
              </div>
            ))}
          </div>

          {/* Upgrade Button */}
          {isFree && (
            <Link to="/plans" className="block">
              <Button className="w-full gap-2 rounded-xl shadow-md hover:shadow-lg transition-all h-11">
                <Crown className="w-4 h-4" />
                Upgrade Plan
                <ArrowUpRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
