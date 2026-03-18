import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  GraduationCap, Clock, Target, Trophy, CheckCircle2, XCircle, Play, Star,
  BarChart3, Zap, RefreshCw, BookOpen, Award, TrendingUp, ArrowRight,
  Flame, Loader2, ChevronRight, Shield
} from 'lucide-react';
import { TakeAssessment } from './TakeAssessment';

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  skill_category: string;
  difficulty: string;
  time_limit_minutes: number;
  passing_score: number;
  is_active: boolean;
  total_attempts: number;
  avg_score: number | null;
  employer_id: string;
  employers?: { company_name: string } | null;
}

interface AssessmentResult {
  id: string;
  assessment_id: string;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  completed_at: string | null;
  time_taken_seconds: number | null;
  skill_assessments?: { title: string; skill_category: string; difficulty: string } | null;
}

const DIFFICULTY_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  easy: { color: 'text-success', bg: 'bg-success/10', icon: BookOpen },
  medium: { color: 'text-warning-foreground', bg: 'bg-warning/10', icon: Zap },
  hard: { color: 'text-destructive', bg: 'bg-destructive/10', icon: Flame },
};

/* ── Stats Hero ── */
const StatsHero = ({ totalTaken, passed, avgScore }: { totalTaken: number; passed: number; avgScore: number }) => (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-success/5 border border-border/50 p-4 sm:p-5"
  >
    <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-3 sm:mb-4">
        <div className="p-2 sm:p-2.5 bg-primary/10 rounded-xl shrink-0">
          <GraduationCap className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-extrabold text-foreground">Skill Assessments</h2>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Prove your skills and stand out to employers</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { icon: Target, label: 'Taken', value: totalTaken, color: 'text-primary', bg: 'bg-primary/10' },
          { icon: Trophy, label: 'Passed', value: passed, color: 'text-success', bg: 'bg-success/10' },
          { icon: BarChart3, label: 'Avg Score', value: `${avgScore}%`, color: 'text-warning-foreground', bg: 'bg-warning/10' },
        ].map(s => (
          <div key={s.label} className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-2.5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl bg-card/80 border border-border/30">
            <div className={cn('w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0', s.bg)}>
              <s.icon className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4', s.color)} />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-base sm:text-lg font-extrabold text-foreground leading-tight">{s.value}</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);
/* ── Assessment Card ── */
const AssessmentCard = ({
  assessment,
  result,
  onStart,
}: {
  assessment: Assessment;
  result?: AssessmentResult;
  onStart: (id: string) => void;
}) => {
  const diff = DIFFICULTY_CONFIG[assessment.difficulty] || DIFFICULTY_CONFIG.medium;
  const DiffIcon = diff.icon;
  const hasPassed = result?.passed;
  const hasAttempted = !!result;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} layout>
      <Card className={cn(
        'border overflow-hidden rounded-2xl transition-all hover:shadow-lg group',
        hasPassed ? 'border-success/20' : 'border-border/40',
      )}>
        {/* Top accent */}
        <div className={cn('h-1', hasPassed ? 'bg-success' : hasAttempted ? 'bg-warning' : 'bg-primary/30')} />
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-foreground line-clamp-1">{assessment.title}</h3>
                {hasPassed && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{assessment.description || 'Test your skills in ' + assessment.skill_category}</p>
            </div>
          </div>

          {/* Meta badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5 border-0 gap-0.5', diff.bg, diff.color)}>
              <DiffIcon className="w-3 h-3" /> {assessment.difficulty}
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-0 bg-muted/50 text-muted-foreground gap-0.5">
              <Clock className="w-3 h-3" /> {assessment.time_limit_minutes}m
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-0 bg-muted/50 text-muted-foreground gap-0.5">
              <Target className="w-3 h-3" /> {assessment.passing_score}% to pass
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-0 bg-primary/10 text-primary gap-0.5">
              <BookOpen className="w-3 h-3" /> {assessment.skill_category}
            </Badge>
          </div>

          {/* Result bar if attempted */}
          {result && (
            <div className="mb-3 p-2.5 rounded-xl bg-muted/20 border border-border/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">Your Score</span>
                <span className={cn('text-sm font-extrabold', result.passed ? 'text-success' : 'text-destructive')}>
                  {result.percentage}%
                </span>
              </div>
              <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', result.passed ? 'bg-success' : 'bg-destructive')}
                  initial={{ width: 0 }}
                  animate={{ width: `${result.percentage}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">
                  {result.score}/{result.max_score} pts
                </span>
                {result.time_taken_seconds && (
                  <span className="text-[10px] text-muted-foreground">
                    {Math.floor(result.time_taken_seconds / 60)}m {result.time_taken_seconds % 60}s
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action */}
          <Button
            onClick={() => onStart(assessment.id)}
            variant={hasPassed ? 'outline' : 'default'}
            size="sm"
            className="w-full rounded-xl gap-1.5 text-xs"
          >
            {hasPassed ? (
              <><RefreshCw className="w-3.5 h-3.5" /> Retake</>
            ) : hasAttempted ? (
              <><RefreshCw className="w-3.5 h-3.5" /> Try Again</>
            ) : (
              <><Play className="w-3.5 h-3.5" /> Start Assessment</>
            )}
          </Button>

          {/* Company info */}
          {assessment.employers && (
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              by {(assessment.employers as any).company_name}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

/* ── Result Row (for History tab) ── */
const ResultRow = ({ result }: { result: AssessmentResult }) => {
  const sa = result.skill_assessments;
  const diff = DIFFICULTY_CONFIG[sa?.difficulty || 'medium'] || DIFFICULTY_CONFIG.medium;
  const DiffIcon = diff.icon;

  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} layout>
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-colors',
        result.passed ? 'border-success/20 bg-success/5' : 'border-border/30 hover:bg-muted/20',
      )}>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', result.passed ? 'bg-success/10' : 'bg-destructive/10')}>
          {result.passed ? <Trophy className="w-5 h-5 text-success" /> : <XCircle className="w-5 h-5 text-destructive" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground line-clamp-1">{sa?.title || 'Assessment'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className={cn('text-[9px] h-4 px-1 border-0 gap-0.5', diff.bg, diff.color)}>
              <DiffIcon className="w-2.5 h-2.5" /> {sa?.difficulty}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{sa?.skill_category}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={cn('text-sm font-extrabold', result.passed ? 'text-success' : 'text-destructive')}>{result.percentage}%</p>
          <p className="text-[10px] text-muted-foreground">
            {result.completed_at ? new Date(result.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Main Component ── */
export const AssessmentHub = ({ candidateId }: { candidateId: string }) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('available');
  const [takingId, setTakingId] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [{ data: aData }, { data: rData }] = await Promise.all([
        supabase
          .from('skill_assessments')
          .select('*, employers!skill_assessments_employer_id_fkey(company_name)')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('assessment_results')
          .select('*, skill_assessments!assessment_results_assessment_id_fkey(title, skill_category, difficulty)')
          .eq('candidate_id', candidateId)
          .order('completed_at', { ascending: false })
          .limit(100),
      ]);
      setAssessments((aData || []) as any);
      setResults((rData || []) as any);
    } catch {
      toast.error('Failed to load assessments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [candidateId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Best result per assessment
  const bestResults = useMemo(() => {
    const map = new Map<string, AssessmentResult>();
    results.forEach(r => {
      const existing = map.get(r.assessment_id);
      if (!existing || r.percentage > existing.percentage) map.set(r.assessment_id, r);
    });
    return map;
  }, [results]);

  const totalTaken = results.length;
  const passedCount = results.filter(r => r.passed).length;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
    : 0;

  const availableAssessments = assessments;
  const passedAssessments = assessments.filter(a => bestResults.get(a.id)?.passed);

  // Taking assessment
  if (takingId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="rounded-xl gap-1 text-xs" onClick={() => setTakingId(null)}>
          ← Back to Assessments
        </Button>
        <TakeAssessment
          assessmentId={takingId}
          candidateId={candidateId}
          onComplete={() => { setTakingId(null); fetchData(true); }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 overflow-x-hidden">
      <StatsHero totalTaken={totalTaken} passed={passedCount} avgScore={avgScore} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-2">
          <TabsList className="h-9 sm:h-10 bg-muted/30 rounded-xl p-0.5 flex-1 min-w-0">
            <TabsTrigger value="available" className="rounded-lg text-[11px] sm:text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1 px-2 sm:px-3 flex-1">
              <BookOpen className="w-3.5 h-3.5 hidden sm:block" /> Available
              <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">{availableAssessments.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="passed" className="rounded-lg text-[11px] sm:text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1 px-2 sm:px-3 flex-1">
              <Trophy className="w-3.5 h-3.5 hidden sm:block" /> Passed
              <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">{passedAssessments.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-[11px] sm:text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1 px-2 sm:px-3 flex-1">
              <BarChart3 className="w-3.5 h-3.5 hidden sm:block" /> History
            </TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl shrink-0" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </Button>
        </div>

        {/* Available */}
        <TabsContent value="available" className="mt-3 sm:mt-4">
          {availableAssessments.length === 0 ? (
            <EmptyState icon={BookOpen} title="No assessments available" description="Check back later — employers add new skill tests regularly." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableAssessments.map(a => (
                <AssessmentCard
                  key={a.id}
                  assessment={a}
                  result={bestResults.get(a.id)}
                  onStart={setTakingId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Passed */}
        <TabsContent value="passed" className="mt-3 sm:mt-4">
          {passedAssessments.length === 0 ? (
            <EmptyState icon={Trophy} title="No passed assessments yet" description="Take assessments to earn badges and stand out to employers." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {passedAssessments.map(a => (
                <AssessmentCard
                  key={a.id}
                  assessment={a}
                  result={bestResults.get(a.id)}
                  onStart={setTakingId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-3 sm:mt-4">
          {results.length === 0 ? (
            <EmptyState icon={BarChart3} title="No attempts yet" description="Start an assessment to see your history here." />
          ) : (
            <div className="space-y-2">
              {results.map(r => <ResultRow key={r.id} result={r} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
        {/* Available */}
        <TabsContent value="available" className="mt-4">
          {availableAssessments.length === 0 ? (
            <EmptyState icon={BookOpen} title="No assessments available" description="Check back later — employers add new skill tests regularly." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableAssessments.map(a => (
                <AssessmentCard
                  key={a.id}
                  assessment={a}
                  result={bestResults.get(a.id)}
                  onStart={setTakingId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Passed */}
        <TabsContent value="passed" className="mt-4">
          {passedAssessments.length === 0 ? (
            <EmptyState icon={Trophy} title="No passed assessments yet" description="Take assessments to earn badges and stand out to employers." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {passedAssessments.map(a => (
                <AssessmentCard
                  key={a.id}
                  assessment={a}
                  result={bestResults.get(a.id)}
                  onStart={setTakingId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4">
          {results.length === 0 ? (
            <EmptyState icon={BarChart3} title="No attempts yet" description="Start an assessment to see your history here." />
          ) : (
            <div className="space-y-2">
              {results.map(r => <ResultRow key={r.id} result={r} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ── Empty State ── */
const EmptyState = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) => (
  <div className="text-center py-14 px-6">
    <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
      <Icon className="w-7 h-7 text-muted-foreground/30" />
    </div>
    <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-xs mx-auto">{description}</p>
  </div>
);
