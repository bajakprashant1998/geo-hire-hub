import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Crown, Zap, TrendingUp, Check, ArrowUpRight, Calendar, Shield, Sparkles, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PlanUsagePanelProps {
  employerId: string;
}

interface PlanData {
  planName: string;
  maxActiveJobs: number;
  activeJobCount: number;
  features: string[];
  priceMonthly: number;
  periodEnd?: string | null;
  totalJobsPosted: number;
  totalApplications: number;
}

export const PlanUsagePanel = ({ employerId }: PlanUsagePanelProps) => {
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlanData = async () => {
      try {
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

        const [activeResult, totalResult, appsResult] = await Promise.all([
          supabase.from('jobs').select('*', { count: 'exact', head: true })
            .eq('employer_id', employerId).eq('is_active', true).eq('status', 'open').or('expires_at.is.null,expires_at.gt.' + new Date().toISOString()),
          supabase.from('jobs').select('*', { count: 'exact', head: true })
            .eq('employer_id', employerId),
          supabase.from('applications').select('*, jobs!inner(employer_id)', { count: 'exact', head: true })
            .eq('jobs.employer_id', employerId),
        ]);

        if (subscription?.employer_plans) {
          setPlanData({
            planName: subscription.employer_plans.name,
            maxActiveJobs: subscription.employer_plans.max_active_jobs,
            activeJobCount: activeResult.count || 0,
            features: subscription.employer_plans.features as string[],
            priceMonthly: Number(subscription.employer_plans.price_monthly),
            periodEnd: subscription.current_period_end,
            totalJobsPosted: totalResult.count || 0,
            totalApplications: appsResult.count || 0,
          });
        } else {
          setPlanData({
            planName: 'Free',
            maxActiveJobs: 1,
            activeJobCount: activeResult.count || 0,
            features: ['1 active job', 'Basic applicant tracking', 'Email support'],
            priceMonthly: 0,
            periodEnd: null,
            totalJobsPosted: totalResult.count || 0,
            totalApplications: appsResult.count || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching plan data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (employerId) fetchPlanData();
  }, [employerId]);

  const daysRemaining = useMemo(() => {
    if (!planData?.periodEnd) return null;
    const end = new Date(planData.periodEnd);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [planData?.periodEnd]);

  if (loading) {
    return (
      <Card className="border border-border overflow-hidden">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-muted rounded-lg w-2/3" />
            <div className="h-8 bg-muted rounded-lg" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded-lg w-full" />
              <div className="h-4 bg-muted rounded-lg w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!planData) return null;

  const usagePercent = Math.min((planData.activeJobCount / planData.maxActiveJobs) * 100, 100);
  const isAtLimit = planData.activeJobCount >= planData.maxActiveJobs;
  const isFree = planData.planName === 'Free';
  const slotsRemaining = Math.max(planData.maxActiveJobs - planData.activeJobCount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className={cn(
        "border overflow-hidden",
        isFree ? 'border-amber-500/30' : 'border-primary/20'
      )}>
        {/* Gradient top border */}
        <div className={cn(
          "h-1.5",
          isFree
            ? 'bg-gradient-to-r from-amber-500 to-amber-400'
            : 'bg-gradient-to-r from-primary to-primary/60'
        )} />

        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2.5">
              <div className={cn(
                "p-2 rounded-xl",
                isFree ? 'bg-amber-500/10' : 'bg-primary/10'
              )}>
                {isFree ? (
                  <Zap className="w-5 h-5 text-amber-500" />
                ) : (
                  <Crown className="w-5 h-5 text-primary" />
                )}
              </div>
              <span className="font-semibold text-sm sm:text-base">Plan & Usage</span>
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
          {/* Usage Stats Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="text-center p-2.5 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums">{planData.activeJobCount}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Active Jobs</p>
            </div>
            <div className="text-center p-2.5 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums">{planData.totalJobsPosted}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Total Posted</p>
            </div>
            <div className="text-center p-2.5 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums">{planData.totalApplications}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Applications</p>
            </div>
          </div>

          {/* Job Slots Usage */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground font-medium">Job Slots</span>
              <span className={cn(
                "text-sm font-bold tabular-nums",
                isAtLimit ? 'text-destructive' : 'text-foreground'
              )}>
                {planData.activeJobCount}
                <span className="text-muted-foreground font-normal"> / {planData.maxActiveJobs}</span>
              </span>
            </div>
            <div className="relative">
              <Progress
                value={usagePercent}
                className={cn("h-2.5 rounded-full", isAtLimit ? '[&>div]:bg-destructive' : '')}
              />
            </div>
            {isAtLimit ? (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive flex items-center gap-1.5 bg-destructive/10 px-3 py-2 rounded-lg"
              >
                <span className="font-medium">You've reached your job limit.</span>
                <Link to="/plans" className="underline hover:no-underline">
                  Upgrade to post more.
                </Link>
              </motion.div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {slotsRemaining} slot{slotsRemaining !== 1 ? 's' : ''} remaining
              </p>
            )}
          </div>

          {/* Period Info */}
          {daysRemaining !== null && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Billing Period</span>
                </div>
                <Badge variant={daysRemaining <= 7 ? 'destructive' : 'secondary'} className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {daysRemaining} days left
                </Badge>
              </div>
            </>
          )}

          <Separator />

          {/* Features */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Plan Features</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {planData.features.slice(0, 6).map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-muted-foreground group"
                >
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-xs group-hover:text-foreground transition-colors">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade CTA */}
          {isFree && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Unlock more with Pro</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Post unlimited jobs, advanced analytics, priority support, and more.
                    </p>
                  </div>
                </div>
                <Link to="/plans" className="block">
                  <Button className="w-full gap-2 rounded-xl shadow-md hover:shadow-lg transition-all h-11">
                    <Crown className="w-4 h-4" />
                    Upgrade Plan
                    <ArrowUpRight className="w-4 h-4 ml-auto" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
