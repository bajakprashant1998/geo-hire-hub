import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  FlaskConical, BarChart3, Loader2, Eye, Users, Trophy, TrendingUp,
  ArrowRight, Sparkles, Target, UserCheck, RotateCcw, Info, Crown,
  ArrowUpRight, ArrowDownRight, Minus, CheckCircle2, XCircle, Percent
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

interface JobABTestingProps {
  employerId: string;
}

interface JobMetrics {
  id: string;
  title: string;
  description: string;
  created_at: string;
  is_active: boolean;
  status: string;
  applications: number;
  views: number;
  conversionRate: string;
  shortlisted: number;
  rejected: number;
  pending: number;
}

const METRIC_CONFIG = [
  { key: 'views', label: 'Total Views', icon: Eye, description: 'How many times the listing was viewed' },
  { key: 'applications', label: 'Applications', icon: Users, description: 'Total applications received' },
  { key: 'conversionRate', label: 'Conversion Rate', icon: Percent, description: 'Views that converted to applications', unit: '%' },
  { key: 'shortlisted', label: 'Shortlisted', icon: UserCheck, description: 'Candidates moved to shortlist' },
] as const;

export const JobABTesting = ({ employerId }: JobABTestingProps) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobA, setJobA] = useState('');
  const [jobB, setJobB] = useState('');
  const [comparison, setComparison] = useState<{ a: JobMetrics; b: JobMetrics } | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title, description, created_at, is_active, status')
        .eq('employer_id', employerId)
        .order('created_at', { ascending: false });
      setJobs(data || []);
      setLoading(false);
    };
    fetchJobs();
  }, [employerId]);

  // Calculate winner summary
  const winnerSummary = useMemo(() => {
    if (!comparison) return null;
    let aWins = 0, bWins = 0;
    METRIC_CONFIG.forEach(m => {
      const valA = m.key === 'conversionRate' ? parseFloat(comparison.a[m.key]) : Number(comparison.a[m.key as keyof JobMetrics]);
      const valB = m.key === 'conversionRate' ? parseFloat(comparison.b[m.key]) : Number(comparison.b[m.key as keyof JobMetrics]);
      if (valA > valB) aWins++;
      else if (valB > valA) bWins++;
    });
    return {
      aWins, bWins,
      winner: aWins > bWins ? 'a' as const : bWins > aWins ? 'b' as const : 'tie' as const,
    };
  }, [comparison]);

  const handleCompare = async () => {
    if (!jobA || !jobB) { toast.error('Select two jobs to compare'); return; }
    if (jobA === jobB) { toast.error('Select two different jobs'); return; }

    setComparing(true);
    try {
      const [aApps, bApps, aViews, bViews] = await Promise.all([
        supabase.from('applications').select('id, status, created_at', { count: 'exact' }).eq('job_id', jobA),
        supabase.from('applications').select('id, status, created_at', { count: 'exact' }).eq('job_id', jobB),
        supabase.from('job_views').select('id', { count: 'exact' }).eq('job_id', jobA),
        supabase.from('job_views').select('id', { count: 'exact' }).eq('job_id', jobB),
      ]);

      const jobAData = jobs.find(j => j.id === jobA);
      const jobBData = jobs.find(j => j.id === jobB);
      const aAppCount = aApps.count || 0;
      const bAppCount = bApps.count || 0;
      const aViewCount = aViews.count || 0;
      const bViewCount = bViews.count || 0;

      setComparison({
        a: {
          ...jobAData,
          applications: aAppCount,
          views: aViewCount,
          conversionRate: aViewCount > 0 ? ((aAppCount / aViewCount) * 100).toFixed(1) : '0.0',
          shortlisted: (aApps.data || []).filter((a: any) => a.status === 'shortlisted').length,
          rejected: (aApps.data || []).filter((a: any) => a.status === 'rejected').length,
          pending: (aApps.data || []).filter((a: any) => a.status === 'pending').length,
        },
        b: {
          ...jobBData,
          applications: bAppCount,
          views: bViewCount,
          conversionRate: bViewCount > 0 ? ((bAppCount / bViewCount) * 100).toFixed(1) : '0.0',
          shortlisted: (bApps.data || []).filter((a: any) => a.status === 'shortlisted').length,
          rejected: (bApps.data || []).filter((a: any) => a.status === 'rejected').length,
          pending: (bApps.data || []).filter((a: any) => a.status === 'pending').length,
        },
      });
      toast.success('Comparison ready!');
    } catch {
      toast.error('Failed to compare jobs');
    } finally {
      setComparing(false);
    }
  };

  const handleReset = () => {
    setJobA('');
    setJobB('');
    setComparison(null);
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your jobs...</p>
      </div>
    );
  }

  if (jobs.length < 2) {
    return (
      <div className="space-y-6">
        <Header />
        <Card className="border-border/40 border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
              <FlaskConical className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">Need at least 2 jobs</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Post at least two job listings to start comparing their performance side by side.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Header />

      {/* How it works */}
      {!comparison && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="border-border/40 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="py-5">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium mb-1">How A/B Testing works</p>
                  <p className="text-xs text-muted-foreground">
                    Select two job listings to compare their performance metrics side by side.
                    See which title, description, or posting strategy attracts more views, applications, and quality candidates.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Job Selectors */}
      <Card className="border-border/40 shadow-lg bg-card/80 backdrop-blur-sm overflow-hidden relative">
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <CardContent className="pt-6 pb-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-end">
            <JobSelector
              label="Job A"
              badge="A"
              badgeColor="bg-primary/10 text-primary border-primary/20"
              value={jobA}
              onChange={setJobA}
              jobs={jobs}
              excludeId={jobB}
            />
            <div className="flex items-center justify-center pb-2">
              <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                <span className="text-xs font-bold text-muted-foreground">VS</span>
              </div>
            </div>
            <JobSelector
              label="Job B"
              badge="B"
              badgeColor="bg-accent/80 text-accent-foreground border-accent/20"
              value={jobB}
              onChange={setJobB}
              jobs={jobs}
              excludeId={jobA}
            />
          </div>

          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border/30">
            <Button
              onClick={handleCompare}
              disabled={comparing || !jobA || !jobB || jobA === jobB}
              className="gap-2 rounded-xl flex-1 sm:flex-none"
              size="lg"
            >
              {comparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              {comparison ? 'Re-compare' : 'Compare Performance'}
            </Button>
            {comparison && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence>
        {comparison && winnerSummary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Winner Banner */}
            <Card className={cn(
              "border-2 overflow-hidden relative",
              winnerSummary.winner === 'tie'
                ? "border-muted bg-muted/20"
                : "border-warning/30 bg-gradient-to-r from-warning/10 to-transparent"
            )}>
              <CardContent className="py-5">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    winnerSummary.winner === 'tie' ? "bg-muted" : "bg-warning/20"
                  )}>
                    {winnerSummary.winner === 'tie'
                      ? <Minus className="w-6 h-6 text-muted-foreground" />
                      : <Crown className="w-6 h-6 text-warning" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg">
                      {winnerSummary.winner === 'tie'
                        ? "It's a tie!"
                        : `Job ${winnerSummary.winner.toUpperCase()} is winning`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {winnerSummary.winner === 'tie'
                        ? 'Both jobs are performing equally across all metrics.'
                        : `"${winnerSummary.winner === 'a' ? comparison.a.title : comparison.b.title}" leads in ${winnerSummary.winner === 'a' ? winnerSummary.aWins : winnerSummary.bWins} of ${METRIC_CONFIG.length} metrics.`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="gap-1 text-xs">
                      A: {winnerSummary.aWins} win{winnerSummary.aWins !== 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-xs">
                      B: {winnerSummary.bWins} win{winnerSummary.bWins !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Headers */}
            <div className="grid grid-cols-2 gap-4">
              <JobHeaderCard job={comparison.a} label="A" isWinner={winnerSummary.winner === 'a'} />
              <JobHeaderCard job={comparison.b} label="B" isWinner={winnerSummary.winner === 'b'} />
            </div>

            {/* Metric Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {METRIC_CONFIG.map((metric, i) => {
                const valA = metric.key === 'conversionRate' ? parseFloat(comparison.a.conversionRate) : Number(comparison.a[metric.key as keyof JobMetrics]);
                const valB = metric.key === 'conversionRate' ? parseFloat(comparison.b.conversionRate) : Number(comparison.b[metric.key as keyof JobMetrics]);
                const max = Math.max(valA, valB, 1);
                const winner = valA > valB ? 'a' : valB > valA ? 'b' : 'tie';
                const diff = valA !== 0 || valB !== 0
                  ? winner === 'a'
                    ? valB > 0 ? (((valA - valB) / valB) * 100).toFixed(0) : '∞'
                    : winner === 'b'
                    ? valA > 0 ? (((valB - valA) / valA) * 100).toFixed(0) : '∞'
                    : '0'
                  : '0';
                const Icon = metric.icon;

                return (
                  <motion.div
                    key={metric.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                  >
                    <Card className="border-border/40 hover:shadow-md transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-muted/50">
                              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-medium">{metric.label}</span>
                          </div>
                          {winner !== 'tie' && (
                            <Badge variant="outline" className="text-[10px] gap-1 bg-success/10 text-success border-success/20">
                              <ArrowUpRight className="w-2.5 h-2.5" />{diff}% better
                            </Badge>
                          )}
                        </div>

                        {/* Bar A */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-muted-foreground">A</span>
                            <span className={cn(
                              "text-sm font-bold tabular-nums",
                              winner === 'a' ? 'text-success' : 'text-foreground'
                            )}>
                              {metric.key === 'conversionRate' ? comparison.a.conversionRate : valA}
                              {metric.unit || ''}
                              {winner === 'a' && <Trophy className="w-3 h-3 text-warning inline ml-1" />}
                            </span>
                          </div>
                          <Progress value={(valA / max) * 100} className="h-2" />
                        </div>

                        {/* Bar B */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-muted-foreground">B</span>
                            <span className={cn(
                              "text-sm font-bold tabular-nums",
                              winner === 'b' ? 'text-success' : 'text-foreground'
                            )}>
                              {metric.key === 'conversionRate' ? comparison.b.conversionRate : valB}
                              {metric.unit || ''}
                              {winner === 'b' && <Trophy className="w-3 h-3 text-warning inline ml-1" />}
                            </span>
                          </div>
                          <Progress value={(valB / max) * 100} className="h-2" />
                        </div>

                        <p className="text-[10px] text-muted-foreground">{metric.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Application Pipeline Breakdown */}
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Application Pipeline Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <PipelineBreakdown job={comparison.a} label="A" />
                  <PipelineBreakdown job={comparison.b} label="B" />
                </div>
              </CardContent>
            </Card>

            {/* AI Recommendation */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="py-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-1">Quick Insight</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {generateInsight(comparison, winnerSummary)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Sub-components ---

const Header = () => (
  <div className="flex items-center gap-3">
    <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
      <FlaskConical className="w-6 h-6 text-primary" />
    </div>
    <div>
      <h2 className="text-xl font-bold">A/B Testing</h2>
      <p className="text-sm text-muted-foreground">Compare job listing performance side by side</p>
    </div>
  </div>
);

const JobSelector = ({ label, badge, badgeColor, value, onChange, jobs, excludeId }: {
  label: string; badge: string; badgeColor: string; value: string;
  onChange: (v: string) => void; jobs: any[]; excludeId: string;
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Badge className={cn("text-[10px] w-5 h-5 p-0 flex items-center justify-center rounded-md", badgeColor)}>
        {badge}
      </Badge>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
    </div>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="rounded-xl bg-muted/30 border-border/40">
        <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        {jobs.filter(j => j.id !== excludeId).map((j) => (
          <SelectItem key={j.id} value={j.id}>
            <div className="flex items-center gap-2">
              <span className="truncate">{j.title}</span>
              {j.is_active ? (
                <Badge variant="outline" className="text-[9px] h-4 bg-success/10 text-success border-success/20">Active</Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] h-4">Closed</Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const JobHeaderCard = ({ job, label, isWinner }: { job: JobMetrics; label: string; isWinner: boolean }) => (
  <Card className={cn(
    "border-border/40 transition-all",
    isWinner && "ring-2 ring-warning/30 border-warning/20"
  )}>
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge variant="outline" className="text-[10px]">{label}</Badge>
        {isWinner && (
          <Badge className="text-[10px] gap-1 bg-warning/10 text-warning border-warning/20">
            <Crown className="w-2.5 h-2.5" /> Winner
          </Badge>
        )}
      </div>
      <p className="font-semibold text-sm truncate mb-1">{job.title}</p>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        {job.is_active ? (
          <span className="flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5 text-success" /> Active</span>
        ) : (
          <span className="flex items-center gap-1"><XCircle className="w-2.5 h-2.5 text-muted-foreground" /> Closed</span>
        )}
        <span>·</span>
        <span>Posted {format(new Date(job.created_at), 'MMM d, yyyy')}</span>
      </div>
    </CardContent>
  </Card>
);

const PipelineBreakdown = ({ job, label }: { job: JobMetrics; label: string }) => {
  const total = job.applications || 1;
  const stages = [
    { label: 'Pending', count: job.pending, color: 'bg-warning/60' },
    { label: 'Shortlisted', count: job.shortlisted, color: 'bg-success/60' },
    { label: 'Rejected', count: job.rejected, color: 'bg-destructive/60' },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Job {label}</p>
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-muted/30">
        {stages.map(s => s.count > 0 && (
          <div
            key={s.label}
            className={cn("h-full transition-all", s.color)}
            style={{ width: `${(s.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex gap-3 flex-wrap">
        {stages.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className={cn("w-2 h-2 rounded-full", s.color)} />
            {s.label}: {s.count}
          </div>
        ))}
      </div>
    </div>
  );
};

function generateInsight(
  comparison: { a: JobMetrics; b: JobMetrics },
  winnerSummary: { aWins: number; bWins: number; winner: 'a' | 'b' | 'tie' }
): string {
  const { a, b } = comparison;
  const convA = parseFloat(a.conversionRate);
  const convB = parseFloat(b.conversionRate);

  if (winnerSummary.winner === 'tie') {
    return 'Both listings are performing similarly. Consider tweaking the title or description of one to create a clearer test variable.';
  }

  const winner = winnerSummary.winner === 'a' ? a : b;
  const loser = winnerSummary.winner === 'a' ? b : a;
  const wLabel = winnerSummary.winner.toUpperCase();

  if (winner.views > loser.views && parseFloat(winner.conversionRate) < parseFloat(loser.conversionRate)) {
    return `Job ${wLabel} gets more visibility, but the other listing converts better. Try combining ${wLabel}'s title (for reach) with the other's description style (for engagement).`;
  }

  if (winner.applications > 0 && winner.shortlisted === 0) {
    return `Job ${wLabel} attracts more applicants but none are shortlisted yet. The volume is there—review applications to keep momentum going.`;
  }

  return `Job ${wLabel} is outperforming across ${winnerSummary.winner === 'a' ? winnerSummary.aWins : winnerSummary.bWins} metrics. Consider using a similar title style and description format for future postings.`;
}
