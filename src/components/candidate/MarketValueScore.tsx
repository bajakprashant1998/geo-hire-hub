import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  TrendingUp, TrendingDown, Minus, Sparkles, Target, Zap, Shield,
  ArrowUpRight, Loader2, RefreshCw, Banknote, Star, BookOpen,
  BarChart3, Users, Briefcase, Share2, Download, ChevronRight,
  Award, Rocket, CheckCircle2, Info, Trophy, Flame, Crown, Medal,
  LightbulbIcon, ArrowRight, GraduationCap, LineChart
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

const GRADE_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; icon: any; gradient: string }> = {
  S: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Exceptional', icon: Crown, gradient: 'from-amber-500/20 via-yellow-500/10 to-orange-500/10' },
  A: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Strong', icon: Trophy, gradient: 'from-emerald-500/20 via-teal-500/10 to-green-500/10' },
  B: { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'Good', icon: Medal, gradient: 'from-blue-500/20 via-indigo-500/10 to-cyan-500/10' },
  C: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'Average', icon: Target, gradient: 'from-orange-500/20 via-amber-500/10 to-yellow-500/10' },
  D: { color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30', label: 'Needs Work', icon: Rocket, gradient: 'from-rose-500/20 via-red-500/10 to-pink-500/10' },
};

const DIMENSION_ICONS: Record<string, any> = {
  skills_demand: Zap,
  experience_value: Briefcase,
  market_fit: Target,
  competition: Users,
  growth_potential: TrendingUp,
};

const LOADING_STAGES = [
  { text: 'Analyzing your skills...', icon: Zap },
  { text: 'Evaluating experience...', icon: Briefcase },
  { text: 'Checking market demand...', icon: LineChart },
  { text: 'Calculating your score...', icon: BarChart3 },
];

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
  const [loadingStage, setLoadingStage] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);

  const { data, isLoading, refetch, isError } = useQuery<MarketValueData>({
    queryKey: ['market-value-score'],
    queryFn: async () => {
      setCalculating(true);
      setLoadingStage(0);
      
      const stageInterval = setInterval(() => {
        setLoadingStage(prev => (prev < LOADING_STAGES.length - 1 ? prev + 1 : prev));
      }, 1000);

      try {
        const { data: result, error } = await supabase.functions.invoke('calculate-market-value');
        if (error) throw error;
        if (result?.error) throw new Error(result.error);
        return result;
      } finally {
        clearInterval(stageInterval);
        setCalculating(false);
      }
    },
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const handleRecalculate = async () => {
    setCalculating(true);
    setLoadingStage(0);
    
    const stageInterval = setInterval(() => {
      setLoadingStage(prev => (prev < LOADING_STAGES.length - 1 ? prev + 1 : prev));
    }, 1000);

    try {
      await refetch();
      toast.success('Market value recalculated!');
    } catch {
      toast.error('Failed to recalculate');
    } finally {
      clearInterval(stageInterval);
      setCalculating(false);
    }
  };

  const shareResults = async () => {
    if (!data) return;
    const text = `🏆 My Market Value Score: ${data.overall_score}/100 (Grade ${data.grade})\n\n` +
      `💰 Estimated Salary: ${formatSalary(data.salary_estimate.median, data.salary_estimate.currency)}/yr\n\n` +
      `📈 Market Trend: ${data.demand_trend}\n\n` +
      `Analyze your market value at HireForJob!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Market Value Score', text, url: window.location.href });
        return;
      } catch (e) { if ((e as Error).name === 'AbortError') return; }
    }
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const downloadReport = async () => {
    if (!data) return;
    toast.info('Preparing PDF...');
    try {
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      
      pdf.setFontSize(20);
      pdf.text('Market Value Report', 20, 20);
      
      pdf.setFontSize(14);
      pdf.text(`Score: ${data.overall_score}/100 (Grade ${data.grade})`, 20, 35);
      pdf.setFontSize(11);
      pdf.text(`Estimated Salary: ${formatSalary(data.salary_estimate.median, data.salary_estimate.currency)}/yr`, 20, 45);
      pdf.text(`Market Trend: ${data.demand_trend}`, 20, 55);
      
      pdf.setFontSize(12);
      pdf.text('Summary:', 20, 70);
      pdf.setFontSize(10);
      const summaryLines = pdf.splitTextToSize(data.summary, 170);
      pdf.text(summaryLines, 20, 80);
      
      let y = 95 + summaryLines.length * 5;
      
      pdf.setFontSize(12);
      pdf.text('Top Strengths:', 20, y);
      y += 8;
      pdf.setFontSize(10);
      data.top_strengths.forEach(s => {
        pdf.text(`• ${s}`, 25, y);
        y += 6;
      });
      
      y += 5;
      pdf.setFontSize(12);
      pdf.text('Areas to Improve:', 20, y);
      y += 8;
      pdf.setFontSize(10);
      data.improvement_areas.forEach(a => {
        pdf.text(`• ${a}`, 25, y);
        y += 6;
      });

      pdf.save('market-value-report.pdf');
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  // Loading State
  if (isLoading || calculating) {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/20 p-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Market Value Score</h2>
                <p className="text-sm text-muted-foreground">AI is analyzing your profile...</p>
              </div>
            </div>
          </div>

          {/* Loading Animation */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="p-4 rounded-full bg-primary/10 mb-6"
                >
                  <Sparkles className="w-10 h-10 text-primary" />
                </motion.div>
                
                <h3 className="font-semibold text-foreground mb-6">Calculating Your Market Value</h3>
                
                <div className="space-y-3 w-full max-w-sm">
                  {LOADING_STAGES.map((stage, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: i <= loadingStage ? 1 : 0.4 }}
                      className="flex items-center gap-3"
                    >
                      <div className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        i <= loadingStage ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {i < loadingStage ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <stage.icon className="w-4 h-4" />
                        )}
                      </div>
                      <span className={cn(
                        "text-sm transition-colors",
                        i <= loadingStage ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {stage.text}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <Progress value={(loadingStage + 1) * 25} className="w-full max-w-sm mt-6 h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  }

  // Error State
  if (isError || !data) {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border border-primary/20 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Market Value Score</h2>
                <p className="text-sm text-muted-foreground">AI-powered career market analysis</p>
              </div>
            </div>
          </div>

          <Card className="border-border/40">
            <CardContent className="p-12 text-center">
              <div className="inline-flex p-4 rounded-2xl bg-muted/30 mb-4">
                <Target className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Couldn't Calculate Your Value</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Make sure your profile has skills, job title, and experience filled out for accurate analysis.
              </p>
              <Button onClick={handleRecalculate} className="rounded-xl gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  }

  const gradeConfig = GRADE_CONFIG[data.grade] || GRADE_CONFIG.C;
  const TrendIcon = data.demand_trend === 'rising' ? TrendingUp : data.demand_trend === 'declining' ? TrendingDown : Minus;
  const GradeIcon = gradeConfig.icon;

  const getDimensionScore = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-500/10' };
    if (score >= 60) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-500/10' };
    if (score >= 40) return { label: 'Average', color: 'text-amber-600', bg: 'bg-amber-500/10' };
    return { label: 'Low', color: 'text-rose-600', bg: 'bg-rose-500/10' };
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Hero Header */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-6",
          `bg-gradient-to-br ${gradeConfig.gradient}`,
          gradeConfig.border
        )}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2.5 rounded-xl border", gradeConfig.bg, gradeConfig.border)}>
                  <BarChart3 className={cn("w-6 h-6", gradeConfig.color)} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Market Value Score</h2>
                  <p className="text-sm text-muted-foreground">AI-powered career market analysis</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={shareResults} className="gap-1.5">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button variant="outline" size="sm" onClick={downloadReport} className="gap-1.5">
                  <Download className="w-4 h-4" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={calculating} className="gap-1.5">
                  {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Score Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden border-0 shadow-xl">
            <div className={cn("bg-gradient-to-r p-6", gradeConfig.gradient)}>
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Score Circle */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
                  className="relative shrink-0"
                >
                  <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
                    <circle cx="70" cy="70" r="60" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" opacity="0.3" />
                    <motion.circle
                      cx="70" cy="70" r="60" fill="none"
                      stroke="currentColor"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 60}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - data.overall_score / 100) }}
                      transition={{ delay: 0.4, duration: 1.2, ease: 'easeOut' }}
                      className={gradeConfig.color}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn("text-4xl font-black tabular-nums", gradeConfig.color)}>
                      {data.overall_score}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">/ 100</span>
                  </div>
                </motion.div>

                {/* Grade & Info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                    <Badge className={cn("text-lg font-black px-4 py-1 gap-2", gradeConfig.bg, gradeConfig.color, "border-0")}>
                      <GradeIcon className="w-5 h-5" />
                      Grade {data.grade}
                    </Badge>
                    <Badge variant="outline" className="gap-1.5 py-1">
                      <TrendIcon className="w-3.5 h-3.5" />
                      {data.demand_trend}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">{gradeConfig.label} Market Position</p>
                  <p className="text-sm text-foreground leading-relaxed max-w-lg">{data.summary}</p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <div className="p-3 rounded-xl bg-background/50 border border-border/30 text-center">
                    <Banknote className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                    <p className="text-lg font-bold text-foreground">
                      {formatSalary(data.salary_estimate.median, data.salary_estimate.currency)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Est. Salary</p>
                  </div>
                  <div className="p-3 rounded-xl bg-background/50 border border-border/30 text-center">
                    <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                    <p className="text-lg font-bold text-foreground">{data.trending_skills.length}</p>
                    <p className="text-[10px] text-muted-foreground">Hot Skills</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 h-11">
            <TabsTrigger value="overview" className="gap-1.5">
              <Target className="w-4 h-4" />
              Breakdown
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-1.5">
              <LightbulbIcon className="w-4 h-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="growth" className="gap-1.5">
              <Rocket className="w-4 h-4" />
              Growth
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Salary Range Card */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-500" />
                  Estimated Salary Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-3xl font-black text-foreground tabular-nums">
                      {formatSalary(data.salary_estimate.median, data.salary_estimate.currency)}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">/year</span>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    Median
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatSalary(data.salary_estimate.min, data.salary_estimate.currency)}</span>
                    <span>{formatSalary(data.salary_estimate.max, data.salary_estimate.currency)}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 via-emerald-500/60 to-emerald-500/30 rounded-full" />
                    <motion.div
                      initial={{ left: '0%' }}
                      animate={{ left: `${((data.salary_estimate.median - data.salary_estimate.min) / (data.salary_estimate.max - data.salary_estimate.min || 1)) * 100}%` }}
                      className="absolute h-full w-1.5 bg-foreground rounded-full transform -translate-x-1/2"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Entry Level</span>
                    <span>Your Range</span>
                    <span>Senior Level</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dimension Breakdown */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Score Dimensions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(data.dimensions).map(([key, dim], i) => {
                  const Icon = DIMENSION_ICONS[key] || Target;
                  const scoreInfo = getDimensionScore(dim.score);
                  const isExpanded = expandedDimension === key;
                  
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div 
                        className={cn(
                          "p-3 rounded-xl border transition-all cursor-pointer",
                          isExpanded ? "bg-muted/50 border-primary/30" : "bg-muted/20 border-border/30 hover:border-border/50"
                        )}
                        onClick={() => setExpandedDimension(isExpanded ? null : key)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1.5 rounded-lg", scoreInfo.bg)}>
                              <Icon className={cn("w-4 h-4", scoreInfo.color)} />
                            </div>
                            <span className="text-sm font-semibold text-foreground">{dim.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={cn("text-xs", scoreInfo.color)}>
                              {dim.score}/100
                            </Badge>
                            <ChevronRight className={cn(
                              "w-4 h-4 text-muted-foreground transition-transform",
                              isExpanded && "rotate-90"
                            )} />
                          </div>
                        </div>
                        <Progress value={dim.score} className="h-2" />
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                                {dim.insight}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="mt-4 space-y-4">
            {/* Top Strengths */}
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-emerald-600">
                  <Star className="w-4 h-4" />
                  Top Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.top_strengths.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-emerald-500/10"
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                      <span className="text-sm text-foreground leading-relaxed">{s}</span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Areas to Improve */}
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                  <Shield className="w-4 h-4" />
                  Areas to Improve
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.improvement_areas.map((a, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-amber-500/10"
                    >
                      <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                        <Target className="w-4 h-4 text-amber-500" />
                      </div>
                      <span className="text-sm text-foreground leading-relaxed">{a}</span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Growth Tab */}
          <TabsContent value="growth" className="mt-4 space-y-4">
            {/* Trending Skills */}
            <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-violet-600">
                  <Flame className="w-4 h-4" />
                  Hot Skills to Learn
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    High Demand
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {data.trending_skills.map((skill, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-background/50 border border-violet-500/20 hover:border-violet-500/40 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">{skill}</span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-primary">
                  <GraduationCap className="w-4 h-4" />
                  Recommended Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/30">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Learn a trending skill</p>
                      <p className="text-xs text-muted-foreground">Focus on {data.trending_skills[0]} to boost your score</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/30">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Get certified</p>
                      <p className="text-xs text-muted-foreground">Add industry certifications to stand out</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/30">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Complete your profile</p>
                      <p className="text-xs text-muted-foreground">Add projects and achievements for better matching</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/30 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Rocket className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Ready to level up?</p>
                <p className="text-xs text-muted-foreground">Update your profile and recalculate to see improvement</p>
              </div>
              <Button onClick={handleRecalculate} disabled={calculating} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Recalculate
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};
