import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Sparkles, Loader2, CheckCircle, AlertTriangle, AlertCircle,
  Copy, ArrowRight, Eye, Shield, Search, Zap, RefreshCw,
  FileText, BarChart3, Lightbulb, ChevronDown, ChevronUp,
  ArrowLeftRight, Download, Target, TrendingUp, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScoreDetail {
  score: number;
  feedback: string;
}

interface Issue {
  type: string;
  severity: string;
  text: string;
  suggestion: string;
}

interface Analysis {
  scores: {
    clarity: ScoreDetail;
    inclusivity: ScoreDetail;
    seo: ScoreDetail;
    engagement: ScoreDetail;
    overall: number;
  };
  issues: Issue[];
  optimized_description: string;
  keywords_missing: string[];
  keywords_found: string[];
}

const SCORE_CATEGORIES = [
  { key: 'clarity', label: 'Clarity', icon: Eye, description: 'Clear responsibilities & concise language' },
  { key: 'inclusivity', label: 'Inclusivity', icon: Shield, description: 'Gender-neutral & bias-free wording' },
  { key: 'seo', label: 'SEO', icon: Search, description: 'Searchability & keyword coverage' },
  { key: 'engagement', label: 'Engagement', icon: Zap, description: 'Compelling & action-oriented tone' },
] as const;

const ANALYSIS_STEPS = [
  { label: 'Reading description', icon: FileText },
  { label: 'Scoring dimensions', icon: BarChart3 },
  { label: 'Finding issues', icon: AlertTriangle },
  { label: 'Generating optimized version', icon: Sparkles },
];

const SEVERITY_CONFIG = {
  high: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', label: 'High' },
  medium: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', label: 'Medium' },
  low: { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', label: 'Low' },
};

// Radial score gauge component
const ScoreGauge = ({ score, size = 120 }: { score: number; size?: number }) => {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const color = score >= 8 ? 'hsl(var(--success))' : score >= 5 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';
  const label = score >= 8 ? 'Excellent' : score >= 6 ? 'Good' : score >= 4 ? 'Fair' : 'Needs Work';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      </div>
    </div>
  );
};

// Mini score bar for category
const CategoryScoreCard = ({ cat, detail, index }: { cat: typeof SCORE_CATEGORIES[number]; detail: ScoreDetail; index: number }) => {
  const Icon = cat.icon;
  const color = detail.score >= 8 ? 'text-success' : detail.score >= 5 ? 'text-warning' : 'text-destructive';
  const bg = detail.score >= 8 ? 'bg-success/10' : detail.score >= 5 ? 'bg-warning/10' : 'bg-destructive/10';
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 * index + 0.3 }}
    >
      <Card
        className="cursor-pointer hover:shadow-md transition-all border-border/40"
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", bg)}>
              <Icon className={cn("w-4 h-4", color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{cat.label}</span>
                <span className={cn("font-bold text-lg tabular-nums", color)}>{detail.score}<span className="text-xs text-muted-foreground font-normal">/10</span></span>
              </div>
              <Progress value={detail.score * 10} className="h-1.5" />
            </div>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/40">{detail.feedback}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const JDOptimizer = () => {
  const [description, setDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [issueFilter, setIssueFilter] = useState<string | null>(null);
  const [comparisonView, setComparisonView] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Animated analysis steps
  useEffect(() => {
    if (!loading) { setAnalysisStep(0); return; }
    const intervals = [0, 1500, 3000, 4500];
    const timers = intervals.map((ms, i) => setTimeout(() => setAnalysisStep(i), ms));
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  // Scroll to results on completion
  useEffect(() => {
    if (analysis && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [analysis]);

  const wordCount = useMemo(() => description.split(/\s+/).filter(Boolean).length, [description]);

  const issueCounts = useMemo(() => {
    if (!analysis) return { high: 0, medium: 0, low: 0 };
    return analysis.issues.reduce((acc, i) => {
      acc[i.severity as keyof typeof acc] = (acc[i.severity as keyof typeof acc] || 0) + 1;
      return acc;
    }, { high: 0, medium: 0, low: 0 });
  }, [analysis]);

  const filteredIssues = useMemo(() => {
    if (!analysis) return [];
    if (!issueFilter) return analysis.issues;
    return analysis.issues.filter(i => i.severity === issueFilter);
  }, [analysis, issueFilter]);

  const handleAnalyze = async () => {
    if (description.trim().length < 20) {
      toast.error('Please enter at least 20 characters');
      return;
    }
    setLoading(true);
    setAnalysis(null);
    setComparisonView(false);
    setIssueFilter(null);

    try {
      const { data, error } = await supabase.functions.invoke('optimize-job-description', {
        body: { description, jobTitle },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.analysis);
      toast.success('Analysis complete!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to analyze. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const useOptimized = () => {
    if (analysis?.optimized_description) {
      setDescription(analysis.optimized_description);
      setAnalysis(null);
      setComparisonView(false);
      toast.success('Optimized version applied! Re-analyze to check your new score.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">JD Optimizer</h2>
            <p className="text-sm text-muted-foreground">
              AI-powered scoring for clarity, inclusivity, SEO & engagement
            </p>
          </div>
        </div>
        {analysis && (
          <Badge variant="outline" className="gap-1.5 text-xs py-1">
            <Target className="w-3 h-3" />
            {analysis.issues.length} issue{analysis.issues.length !== 1 ? 's' : ''} · {analysis.keywords_missing.length} keyword suggestion{analysis.keywords_missing.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Input Section */}
      <Card className="border-border/40 shadow-lg bg-card/80 backdrop-blur-sm overflow-hidden relative">
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <CardContent className="pt-6 space-y-4 relative z-10">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Job Title (optional)</label>
            <Input
              placeholder="e.g. Senior Frontend Developer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              maxLength={100}
              className="bg-muted/30 border-border/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Job Description</label>
            <Textarea
              placeholder="Paste your job description here to get AI-powered insights on clarity, inclusivity, SEO, and engagement..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[220px] bg-muted/30 border-border/40 focus:border-primary/40 rounded-xl"
              maxLength={10000}
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{wordCount} words</span>
              <span className="text-border">·</span>
              <span>{description.length.toLocaleString()}/10,000 chars</span>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={loading || description.trim().length < 20}
              className="gap-2 rounded-xl px-6"
              size="lg"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</>
              ) : (
                <><Sparkles className="w-4 h-4" />{analysis ? 'Re-analyze' : 'Analyze & Optimize'}</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading Progress */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-6">
                <div className="flex items-center gap-4 justify-center flex-wrap">
                  {ANALYSIS_STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const isActive = i === analysisStep;
                    const isDone = i < analysisStep;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300",
                          isActive && "bg-primary text-primary-foreground shadow-md scale-105",
                          isDone && "bg-primary/20 text-primary",
                          !isActive && !isDone && "bg-muted/50 text-muted-foreground"
                        )}>
                          {isDone ? <CheckCircle className="w-3.5 h-3.5" /> :
                           isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                           <Icon className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline">{step.label}</span>
                        </div>
                        {i < ANALYSIS_STEPS.length - 1 && (
                          <ArrowRight className={cn("w-3 h-3", isDone ? "text-primary" : "text-muted-foreground/30")} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Score Overview */}
            <Card className="border-border/40 shadow-xl overflow-hidden relative">
              <div className="absolute -top-16 -left-16 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <CardContent className="pt-6 pb-6 relative z-10">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <ScoreGauge score={analysis.scores.overall} size={130} />
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-lg mb-1">Overall Quality Score</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {analysis.scores.overall >= 8
                        ? 'Your JD is in great shape! Only minor refinements suggested.'
                        : analysis.scores.overall >= 6
                        ? 'Solid foundation with room for improvement. Check the suggestions below.'
                        : analysis.scores.overall >= 4
                        ? 'Several areas need attention. Apply the optimized version for a quick boost.'
                        : 'Significant improvements recommended. Use the AI-optimized version as a starting point.'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                      {issueCounts.high > 0 && (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <AlertCircle className="w-3 h-3" />{issueCounts.high} critical
                        </Badge>
                      )}
                      {issueCounts.medium > 0 && (
                        <Badge className="gap-1 text-xs bg-warning/10 text-warning border-warning/20 hover:bg-warning/20">
                          <AlertTriangle className="w-3 h-3" />{issueCounts.medium} warnings
                        </Badge>
                      )}
                      {issueCounts.low > 0 && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Info className="w-3 h-3" />{issueCounts.low} minor
                        </Badge>
                      )}
                      {analysis.issues.length === 0 && (
                        <Badge className="gap-1 text-xs bg-success/10 text-success border-success/20">
                          <CheckCircle className="w-3 h-3" />No issues found
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Score Breakdown
                <span className="text-xs font-normal">(click to expand)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SCORE_CATEGORIES.map((cat, i) => (
                  <CategoryScoreCard key={cat.key} cat={cat} detail={analysis.scores[cat.key]} index={i} />
                ))}
              </div>
            </div>

            {/* Issues Section */}
            {analysis.issues.length > 0 && (
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Issues Found ({analysis.issues.length})
                    </CardTitle>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm" variant={issueFilter === null ? 'default' : 'ghost'}
                        className="h-7 text-xs rounded-full px-3"
                        onClick={() => setIssueFilter(null)}
                      >All</Button>
                      {(['high', 'medium', 'low'] as const).map(sev => {
                        const count = issueCounts[sev];
                        if (count === 0) return null;
                        const config = SEVERITY_CONFIG[sev];
                        return (
                          <Button
                            key={sev} size="sm"
                            variant={issueFilter === sev ? 'default' : 'ghost'}
                            className="h-7 text-xs rounded-full px-3 gap-1"
                            onClick={() => setIssueFilter(issueFilter === sev ? null : sev)}
                          >
                            {config.label} ({count})
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {filteredIssues.map((issue, i) => {
                      const config = SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low;
                      const SevIcon = config.icon;
                      return (
                        <motion.div
                          key={`${issue.type}-${issue.text}-${i}`}
                          layout
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          transition={{ delay: i * 0.05 }}
                          className={cn("flex gap-3 p-3.5 rounded-xl border", config.bg, config.border)}
                        >
                          <SevIcon className={cn("w-4 h-4 mt-0.5 shrink-0", config.color)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-[10px] capitalize">{issue.type}</Badge>
                              <Badge variant={issue.severity === 'high' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">{issue.severity}</Badge>
                            </div>
                            {issue.text && (
                              <p className="text-sm text-muted-foreground italic mb-1.5">"{issue.text}"</p>
                            )}
                            <p className="text-sm flex items-start gap-1.5">
                              <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                              {issue.suggestion}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </CardContent>
              </Card>
            )}

            {/* Keywords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {analysis.keywords_found.length > 0 && (
                <Card className="border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      Keywords Present ({analysis.keywords_found.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-1.5">
                    {analysis.keywords_found.map((kw, i) => (
                      <Badge key={i} className="text-xs bg-success/10 text-success border-success/20 hover:bg-success/20">{kw}</Badge>
                    ))}
                  </CardContent>
                </Card>
              )}
              {analysis.keywords_missing.length > 0 && (
                <Card className="border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Suggested Keywords ({analysis.keywords_missing.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-1.5">
                    {analysis.keywords_missing.map((kw, i) => (
                      <Badge key={i} variant="outline" className="text-xs border-dashed border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
                        onClick={() => {
                          setDescription(prev => prev + (prev.endsWith(' ') ? '' : ' ') + kw);
                          toast.success(`Added "${kw}" to description`);
                        }}
                      >+ {kw}</Badge>
                    ))}
                    <p className="w-full text-[10px] text-muted-foreground mt-1">Click a keyword to append it to your description</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Optimized Version */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI-Optimized Version
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost" size="sm" className="gap-1.5 text-xs h-8"
                      onClick={() => setComparisonView(!comparisonView)}
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      {comparisonView ? 'Single View' : 'Compare'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {comparisonView ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                        <FileText className="w-3 h-3" /> Original
                      </p>
                      <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                        {description}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> Optimized
                      </p>
                      <div className="p-4 rounded-xl bg-success/5 border border-success/10 text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                        {analysis.optimized_description}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/40 text-sm whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                    {analysis.optimized_description}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="gap-1.5 rounded-xl"
                    onClick={() => copyToClipboard(analysis.optimized_description)}
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </Button>
                  <Button size="sm" className="gap-1.5 rounded-xl"
                    onClick={useOptimized}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Use This Version
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
