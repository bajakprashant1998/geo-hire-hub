import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Sparkles, Loader2, CheckCircle, AlertTriangle, AlertCircle,
  Copy, ArrowRight, Eye, Shield, Search, Zap, RefreshCw
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
  { key: 'clarity', label: 'Clarity', icon: Eye, color: 'text-blue-500' },
  { key: 'inclusivity', label: 'Inclusivity', icon: Shield, color: 'text-green-500' },
  { key: 'seo', label: 'SEO', icon: Search, color: 'text-orange-500' },
  { key: 'engagement', label: 'Engagement', icon: Zap, color: 'text-purple-500' },
] as const;

export const JDOptimizer = () => {
  const [description, setDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [showOptimized, setShowOptimized] = useState(false);

  const handleAnalyze = async () => {
    if (description.trim().length < 20) {
      toast.error('Please enter at least 20 characters');
      return;
    }

    setLoading(true);
    setAnalysis(null);
    setShowOptimized(false);

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
      setShowOptimized(false);
      toast.success('Optimized version applied! Re-analyze to check the new score.');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-success';
    if (score >= 5) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-success/10';
    if (score >= 5) return 'bg-warning/10';
    return 'bg-destructive/10';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'medium': return <AlertTriangle className="w-4 h-4 text-warning" />;
      default: return <CheckCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">JD Optimizer</h2>
          <p className="text-sm text-muted-foreground">
            AI-powered scoring for clarity, inclusivity, SEO &amp; engagement
          </p>
        </div>
      </div>

      {/* Input Section */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Input
            placeholder="Job title (optional, helps with SEO analysis)"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            maxLength={100}
          />
          <Textarea
            placeholder="Paste your job description here..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[200px]"
            maxLength={10000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {description.length}/10,000 characters
            </span>
            <Button
              onClick={handleAnalyze}
              disabled={loading || description.trim().length < 20}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {analysis ? 'Re-analyze' : 'Analyze & Optimize'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Overall Score */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold",
                    getScoreBg(analysis.scores.overall),
                    getScoreColor(analysis.scores.overall)
                  )}>
                    {analysis.scores.overall}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Overall Score</h3>
                    <Progress value={analysis.scores.overall * 10} className="h-3 mt-2" />
                    <p className="text-sm text-muted-foreground mt-1">
                      {analysis.scores.overall >= 8 ? 'Excellent JD! Minor tweaks possible.' :
                       analysis.scores.overall >= 5 ? 'Good foundation. See suggestions below.' :
                       'Needs improvement. Check the issues below.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Scores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SCORE_CATEGORIES.map(({ key, label, icon: Icon, color }) => {
                const detail = analysis.scores[key];
                return (
                  <Card key={key}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={cn("w-4 h-4", color)} />
                        <span className="font-medium text-sm">{label}</span>
                        <span className={cn("ml-auto font-bold", getScoreColor(detail.score))}>
                          {detail.score}/10
                        </span>
                      </div>
                      <Progress value={detail.score * 10} className="h-1.5 mb-2" />
                      <p className="text-xs text-muted-foreground">{detail.feedback}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Issues */}
            {analysis.issues.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Issues Found ({analysis.issues.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysis.issues.map((issue, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px]">{issue.type}</Badge>
                          <Badge variant={issue.severity === 'high' ? 'destructive' : 'secondary'} className="text-[10px]">
                            {issue.severity}
                          </Badge>
                        </div>
                        {issue.text && (
                          <p className="text-sm text-muted-foreground italic mb-1">"{issue.text}"</p>
                        )}
                        <p className="text-sm">
                          <ArrowRight className="w-3 h-3 inline mr-1 text-primary" />
                          {issue.suggestion}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Keywords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {analysis.keywords_found.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      Keywords Found
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-1.5">
                    {analysis.keywords_found.map((kw, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                    ))}
                  </CardContent>
                </Card>
              )}
              {analysis.keywords_missing.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Search className="w-4 h-4 text-warning" />
                      Suggested Keywords
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-1.5">
                    {analysis.keywords_missing.map((kw, i) => (
                      <Badge key={i} variant="outline" className="text-xs border-dashed">{kw}</Badge>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Optimized Version */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI-Optimized Version
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOptimized(!showOptimized)}
                  >
                    {showOptimized ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </CardHeader>
              <AnimatePresence>
                {showOptimized && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <CardContent className="space-y-3">
                      <div className="p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">
                        {analysis.optimized_description}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => copyToClipboard(analysis.optimized_description)}
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={useOptimized}
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Use This Version
                        </Button>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
