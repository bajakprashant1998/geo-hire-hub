import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, TrendingDown, Minus, Sparkles, Target, Zap, Shield,
  ArrowUpRight, Loader2, RefreshCw, DollarSign, Star, BookOpen,
  BarChart3, Users, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MarketValueData {
  overall_score: number;
  grade: string;
  summary: string;
  dimensions: Record<string, { score: number; label: string; insight: string }>;
  salary_estimate: { min: number; max: number; median: number; currency: string };
  top_strengths: string[];
  improvement_areas: string[];
  trending_skills: string[];
  demand_trend: string;
}

const GRADE_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  S: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Exceptional' },
  A: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Strong' },
  B: { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', label: 'Good' },
  C: { color: 'text-warning-foreground', bg: 'bg-warning/10', border: 'border-warning/30', label: 'Average' },
  D: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30', label: 'Needs Work' },
};

const DIMENSION_ICONS: Record<string, any> = {
  skills_demand: Zap,
  experience_value: Briefcase,
  market_fit: Target,
  competition: Users,
  growth_potential: TrendingUp,
};

function formatSalary(amount: number, currency: string): string {
  if (currency === 'INR') {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    return `₹${(amount / 1000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export const MarketValueScore = () => {
  const [calculating, setCalculating] = useState(false);

  const { data, isLoading, refetch, isError } = useQuery<MarketValueData>({
    queryKey: ['market-value-score'],
    queryFn: async () => {
      setCalculating(true);
      try {
        const { data: result, error } = await supabase.functions.invoke('calculate-market-value');
        if (error) throw error;
        if (result?.error) throw new Error(result.error);
        return result;
      } finally {
        setCalculating(false);
      }
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
    retry: 1,
  });

  const handleRecalculate = async () => {
    setCalculating(true);
    try {
      await refetch();
      toast.success('Market value recalculated!');
    } catch {
      toast.error('Failed to recalculate');
    } finally {
      setCalculating(false);
    }
  };

  if (isLoading || calculating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Market Value Score</h2>
            <p className="text-xs text-muted-foreground">AI is analyzing your profile...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-10 h-10 text-primary" />
          </motion.div>
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-8 text-center">
          <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold text-foreground mb-2">Couldn't calculate your market value</h3>
          <p className="text-sm text-muted-foreground mb-4">Make sure your profile has skills, job title, and experience filled out.</p>
          <Button onClick={handleRecalculate} className="rounded-xl">
            <RefreshCw className="w-4 h-4 mr-2" /> Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const gradeConfig = GRADE_CONFIG[data.grade] || GRADE_CONFIG.C;
  const TrendIcon = data.demand_trend === 'rising' ? TrendingUp : data.demand_trend === 'declining' ? TrendingDown : Minus;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Market Value Score</h2>
            <p className="text-xs text-muted-foreground">AI-powered career market analysis</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRecalculate}
          disabled={calculating}
          className="rounded-xl text-xs gap-1.5"
        >
          {calculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Recalculate
        </Button>
      </div>

      {/* Main Score Card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className={cn("border-2 overflow-hidden", gradeConfig.border)}>
          <CardContent className="p-0">
            <div className="relative p-5 sm:p-6">
              {/* Background glow */}
              <div className={cn("absolute -top-20 -right-20 w-56 h-56 rounded-full blur-3xl opacity-20", gradeConfig.bg)} />
              
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                {/* Score circle */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
                  className="relative shrink-0"
                >
                  <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <motion.circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 52}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - data.overall_score / 100) }}
                      transition={{ delay: 0.4, duration: 1.2, ease: 'easeOut' }}
                      className={gradeConfig.color}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn("text-3xl font-black tabular-nums", gradeConfig.color)}>
                      {data.overall_score}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">/ 100</span>
                  </div>
                </motion.div>

                {/* Grade + Summary */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={cn("text-sm font-black px-3 py-0.5", gradeConfig.bg, gradeConfig.color, "border-0")}>
                      Grade {data.grade}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">{gradeConfig.label}</span>
                    <Badge variant="outline" className="text-[10px] gap-1 ml-auto">
                      <TrendIcon className="w-3 h-3" />
                      {data.demand_trend}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{data.summary}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dimension Breakdown */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Score Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(data.dimensions).map(([key, dim], i) => {
              const Icon = DIMENSION_ICONS[key] || Target;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.08 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">{dim.label}</span>
                    </div>
                    <span className={cn(
                      "text-xs font-bold tabular-nums",
                      dim.score >= 75 ? 'text-emerald-500' : dim.score >= 50 ? 'text-primary' : 'text-destructive'
                    )}>
                      {dim.score}/100
                    </span>
                  </div>
                  <Progress
                    value={dim.score}
                    className="h-2"
                  />
                  <p className="text-[11px] text-muted-foreground leading-snug">{dim.insight}</p>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Salary Estimate */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-border/40 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Estimated Salary Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-2xl font-black text-foreground tabular-nums">
                  {formatSalary(data.salary_estimate.median, data.salary_estimate.currency)}
                </span>
                <span className="text-xs text-muted-foreground mb-1">/yr median</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatSalary(data.salary_estimate.min, data.salary_estimate.currency)}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden relative">
                  <div
                    className="absolute h-full bg-gradient-to-r from-emerald-500/40 to-emerald-500/80 rounded-full"
                    style={{
                      left: '0%',
                      width: '100%',
                    }}
                  />
                  <div
                    className="absolute h-full w-1 bg-foreground rounded-full"
                    style={{
                      left: `${((data.salary_estimate.median - data.salary_estimate.min) / (data.salary_estimate.max - data.salary_estimate.min || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span>{formatSalary(data.salary_estimate.max, data.salary_estimate.currency)}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Strengths */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="border-border/40 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                Top Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.top_strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                    </div>
                    <span className="text-xs text-foreground leading-relaxed">{s}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Improvement Areas */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-border/40 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Areas to Improve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.improvement_areas.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Target className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-xs text-foreground leading-relaxed">{a}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Trending Skills to Learn */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="border-border/40 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[hsl(262,83%,58%)]" />
                Skills to Learn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {data.trending_skills.map((skill, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="text-[11px] rounded-lg bg-[hsl(262,83%,58%)]/10 text-[hsl(262,83%,58%)] border-0"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
