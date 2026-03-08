import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accessibility, AlertTriangle, CheckCircle2, Loader2, Sparkles, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Issue {
  text: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

// Local inclusive language checker — no AI needed
const NON_INCLUSIVE_PATTERNS: { pattern: RegExp; issue: string; suggestion: string; severity: 'high' | 'medium' | 'low' }[] = [
  { pattern: /\bmanpower\b/gi, issue: '"manpower" is gendered', suggestion: 'Use "workforce" or "staffing"', severity: 'medium' },
  { pattern: /\bman hours?\b/gi, issue: '"man hours" is gendered', suggestion: 'Use "person-hours" or "work hours"', severity: 'medium' },
  { pattern: /\bchairman\b/gi, issue: '"chairman" is gendered', suggestion: 'Use "chairperson" or "chair"', severity: 'medium' },
  { pattern: /\bhe\/she\b/gi, issue: '"he/she" is exclusionary', suggestion: 'Use "they" for gender-neutral reference', severity: 'low' },
  { pattern: /\bmaster\b/gi, issue: '"master" can be insensitive', suggestion: 'Use "primary", "main", or "lead"', severity: 'low' },
  { pattern: /\bslave\b/gi, issue: '"slave" is insensitive', suggestion: 'Use "secondary", "replica", or "follower"', severity: 'high' },
  { pattern: /\bninja\b/gi, issue: '"ninja" is culturally appropriative', suggestion: 'Use "expert" or "specialist"', severity: 'low' },
  { pattern: /\brockstar\b/gi, issue: '"rockstar" signals bro culture', suggestion: 'Use "top performer" or "expert"', severity: 'low' },
  { pattern: /\bguru\b/gi, issue: '"guru" is culturally appropriative', suggestion: 'Use "expert" or "specialist"', severity: 'low' },
  { pattern: /\byoung\b/gi, issue: '"young" implies age discrimination', suggestion: 'Remove or use "energetic" if relevant', severity: 'high' },
  { pattern: /\baged?\b.*\d+.*\byears?\b/gi, issue: 'Age requirement can be discriminatory', suggestion: 'Focus on experience level instead', severity: 'high' },
  { pattern: /\bnative english\b/gi, issue: '"native English" excludes fluent non-native speakers', suggestion: 'Use "fluent in English" or "proficient in English"', severity: 'high' },
  { pattern: /\bculture fit\b/gi, issue: '"culture fit" can enable bias', suggestion: 'Use "culture add" or "values alignment"', severity: 'medium' },
  { pattern: /\bable[- ]bodied\b/gi, issue: '"able-bodied" excludes people with disabilities', suggestion: 'Remove unless physical ability is a genuine requirement', severity: 'high' },
  { pattern: /\bfreshers? only\b/gi, issue: '"freshers only" implies age discrimination', suggestion: 'Use "entry-level" or "0-2 years experience"', severity: 'medium' },
  { pattern: /\bgentlemen\b/gi, issue: '"gentlemen" is gendered', suggestion: 'Use "everyone" or "team members"', severity: 'medium' },
  { pattern: /\bhis or her\b/gi, issue: '"his or her" is binary', suggestion: 'Use "their"', severity: 'low' },
  { pattern: /\bdominating\b/gi, issue: '"dominating" can feel aggressive', suggestion: 'Use "leading" or "excelling"', severity: 'low' },
  { pattern: /\baggressive\b/gi, issue: '"aggressive" can deter diverse applicants', suggestion: 'Use "ambitious" or "driven"', severity: 'medium' },
  { pattern: /\bhustle\b/gi, issue: '"hustle" signals overwork culture', suggestion: 'Use "dedicated" or "motivated"', severity: 'low' },
];

const POSITIVE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bequal opportunity\b/gi, label: 'Equal opportunity statement' },
  { pattern: /\bdiverse\b|\bdiversity\b|\binclusi/gi, label: 'Diversity & inclusion mention' },
  { pattern: /\baccommodation/gi, label: 'Accommodation offered' },
  { pattern: /\bflexible\b.*\b(hours?|schedule|work)/gi, label: 'Flexible work mentioned' },
  { pattern: /\bremote\b/gi, label: 'Remote option mentioned' },
  { pattern: /\bthey\b/gi, label: 'Gender-neutral pronouns used' },
];

function analyzeText(text: string): { score: number; issues: Issue[]; positives: string[] } {
  const issues: Issue[] = [];
  const positives: string[] = [];

  NON_INCLUSIVE_PATTERNS.forEach(({ pattern, issue, suggestion, severity }) => {
    if (pattern.test(text)) {
      issues.push({ text: issue, severity, suggestion });
    }
  });

  POSITIVE_PATTERNS.forEach(({ pattern, label }) => {
    if (pattern.test(text)) {
      positives.push(label);
    }
  });

  // Calculate score: start at 100, deduct for issues, add for positives
  let score = 100;
  issues.forEach(i => {
    if (i.severity === 'high') score -= 15;
    else if (i.severity === 'medium') score -= 8;
    else score -= 3;
  });
  score += positives.length * 5;
  score = Math.max(0, Math.min(100, score));

  return { score, issues, positives };
}

export const AccessibilityScoreChecker = () => {
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ score: number; issues: Issue[]; positives: string[] } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = () => {
    if (!text.trim()) return;
    setAnalyzing(true);
    // Simulate brief processing time for UX
    setTimeout(() => {
      setResult(analyzeText(text));
      setAnalyzing(false);
    }, 500);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-destructive';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Needs Improvement';
    return 'Poor';
  };

  const severityColor: Record<string, string> = {
    high: 'bg-destructive/10 text-destructive border-destructive/20',
    medium: 'bg-warning/10 text-warning-foreground border-warning/20',
    low: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="space-y-6">
      <Card className="border border-border/40 shadow-xl bg-card/50 backdrop-blur-2xl rounded-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Accessibility className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span>Inclusive Language Checker</span>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">Ensure your job post uses inclusive, bias-free language</p>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 relative z-10">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your job description here to check for inclusive language..."
            className="min-h-[200px] rounded-xl bg-muted/30 border-border/40 focus:border-primary/40"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{text.split(/\s+/).filter(Boolean).length} words</p>
            <Button onClick={handleAnalyze} disabled={!text.trim() || analyzing} className="rounded-xl gap-2">
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border border-border/40 shadow-xl bg-card/50 backdrop-blur-2xl rounded-2xl">
            <CardContent className="p-6 space-y-6">
              {/* Score */}
              <div className="text-center">
                <p className={cn("text-5xl font-bold", getScoreColor(result.score))}>{result.score}</p>
                <p className="text-sm text-muted-foreground mt-1">Inclusivity Score — {getScoreLabel(result.score)}</p>
                <Progress value={result.score} className="mt-3 h-2" />
              </div>

              {/* Issues */}
              {result.issues.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-warning-foreground" />
                    Issues Found ({result.issues.length})
                  </h3>
                  <div className="space-y-2">
                    {result.issues.map((issue, i) => (
                      <div key={i} className={cn("p-3 rounded-xl border", severityColor[issue.severity])}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{issue.text}</p>
                            <p className="text-xs mt-1 opacity-80">💡 {issue.suggestion}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{issue.severity}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Positives */}
              {result.positives.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Inclusive Practices Detected
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.positives.map((p, i) => (
                      <Badge key={i} variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                        ✓ {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.issues.length === 0 && (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">Great job! No inclusivity issues found.</p>
                </div>
              )}

              <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    This checker scans for common non-inclusive language patterns. It's a starting point — always review with your DEI team for comprehensive inclusivity.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
