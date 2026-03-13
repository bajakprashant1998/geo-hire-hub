import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Brain, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  Loader2, Zap, User, ArrowUpDown, Filter, ChevronDown, ChevronUp,
  Target, BarChart3, Award, Search, Eye, MessageSquare, Clock,
  Gauge, Star, ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScreenedCandidate {
  candidate_id: string;
  candidate_name: string;
  match_score: number;
  ai_screening_score: number;
  recommendation: string;
  screening_summary: string;
  skill_gaps: string[];
  skill_overlap: string[];
}

type SortField = 'ai_screening_score' | 'match_score' | 'name';
type FilterRec = 'all' | 'strong_match' | 'good_match' | 'potential' | 'not_recommended';

const RECOMMENDATION_CONFIG: Record<string, { color: string; bg: string; border: string; icon: any; label: string; ring: string }> = {
  strong_match: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', icon: CheckCircle2, label: 'Strong Match', ring: 'ring-success/20' },
  good_match: { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', icon: TrendingUp, label: 'Good Match', ring: 'ring-primary/20' },
  potential: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', icon: Sparkles, label: 'Potential', ring: 'ring-warning/20' },
  not_recommended: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', icon: XCircle, label: 'Not Recommended', ring: 'ring-destructive/20' },
};

const SCREENING_STEPS = [
  { label: 'Fetching applicants', icon: User },
  { label: 'Analyzing resumes', icon: Brain },
  { label: 'Scoring skills', icon: Target },
  { label: 'Generating insights', icon: Sparkles },
];

export const AIScreeningPanel = ({ jobId, jobTitle }: { jobId: string; jobTitle: string }) => {
  const [candidates, setCandidates] = useState<ScreenedCandidate[]>([]);
  const [screening, setScreening] = useState(false);
  const [screened, setScreened] = useState(false);
  const [screeningStep, setScreeningStep] = useState(0);
  const [sortField, setSortField] = useState<SortField>('ai_screening_score');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterRec, setFilterRec] = useState<FilterRec>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const runScreening = async () => {
    setScreening(true);
    setScreeningStep(0);
    setCandidates([]);
    setScreened(false);

    // Simulate step progress
    const stepInterval = setInterval(() => {
      setScreeningStep(prev => {
        if (prev >= SCREENING_STEPS.length - 1) { clearInterval(stepInterval); return prev; }
        return prev + 1;
      });
    }, 2000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Please log in'); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-candidate-screening`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ job_id: jobId }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Screening failed');
      }
      const data = await res.json();
      setCandidates(data.results || []);
      setScreened(true);
      toast.success(`Screened ${data.results?.length || 0} candidates`);
    } catch (err: any) {
      toast.error(err.message || 'AI Screening failed');
    } finally {
      clearInterval(stepInterval);
      setScreening(false);
    }
  };

  const filtered = useMemo(() => {
    let list = [...candidates];
    if (filterRec !== 'all') list = list.filter(c => c.recommendation === filterRec);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.candidate_name.toLowerCase().includes(q) || c.screening_summary.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let valA: any, valB: any;
      if (sortField === 'name') { valA = a.candidate_name; valB = b.candidate_name; }
      else { valA = a[sortField]; valB = b[sortField]; }
      if (typeof valA === 'string') return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      return sortAsc ? valA - valB : valB - valA;
    });
    return list;
  }, [candidates, filterRec, searchQuery, sortField, sortAsc]);

  // Summary stats
  const stats = useMemo(() => {
    if (candidates.length === 0) return null;
    const avgScore = Math.round(candidates.reduce((s, c) => s + c.ai_screening_score, 0) / candidates.length);
    const strong = candidates.filter(c => c.recommendation === 'strong_match').length;
    const good = candidates.filter(c => c.recommendation === 'good_match').length;
    return { avgScore, strong, good, total: candidates.length };
  }, [candidates]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-primary';
    if (score >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return '[&>div]:bg-success';
    if (score >= 60) return '[&>div]:bg-primary';
    if (score >= 40) return '[&>div]:bg-warning';
    return '[&>div]:bg-destructive';
  };

  return (
    <div className="space-y-5">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-primary/[0.02] border border-primary/10 p-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">AI Candidate Screening</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Auto-rank applicants for <span className="font-medium text-foreground">"{jobTitle}"</span> with AI-powered scoring
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Powered by Gemini AI
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> ~30s per candidate
                </span>
              </div>
            </div>
          </div>
          <Button
            onClick={runScreening}
            disabled={screening}
            size="lg"
            className="gap-2 rounded-xl shadow-md min-w-[180px]"
          >
            {screening ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : screened ? (
              <>
                <Zap className="w-4 h-4" />
                Re-screen All
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Screen Applicants
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Screening Progress */}
      <AnimatePresence>
        {screening && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="rounded-xl border-primary/20 overflow-hidden">
              <div className="h-1 bg-primary/10">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: '5%' }}
                  animate={{ width: `${((screeningStep + 1) / SCREENING_STEPS.length) * 90}%` }}
                  transition={{ duration: 1.5, ease: 'easeInOut' }}
                />
              </div>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">AI is analyzing your applicants...</p>
                    <div className="flex items-center gap-3 mt-2">
                      {SCREENING_STEPS.map((step, i) => (
                        <div key={i} className={cn('flex items-center gap-1 text-[11px] transition-colors', i <= screeningStep ? 'text-primary font-medium' : 'text-muted-foreground/50')}>
                          {i < screeningStep ? (
                            <CheckCircle2 className="w-3 h-3 text-success" />
                          ) : i === screeningStep ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-border" />
                          )}
                          <span className="hidden sm:inline">{step.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Summary */}
      <AnimatePresence>
        {stats && !screening && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: 'Total Screened', value: stats.total, icon: User, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'Avg. AI Score', value: `${stats.avgScore}%`, icon: Gauge, color: getScoreColor(stats.avgScore), bg: 'bg-primary/10' },
                { label: 'Strong Matches', value: stats.strong, icon: Star, color: 'text-success', bg: 'bg-success/10' },
                { label: 'Good Matches', value: stats.good, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-card/60 backdrop-blur border border-border/40"
                >
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', s.bg)}>
                    <s.icon className={cn('w-4 h-4', s.color)} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground leading-none">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      {screened && candidates.length > 0 && !screening && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-border/60 bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground font-medium shrink-0">Sort:</span>
              {([
                { field: 'ai_screening_score' as SortField, label: 'AI Score' },
                { field: 'match_score' as SortField, label: 'Match' },
                { field: 'name' as SortField, label: 'Name' },
              ]).map(s => (
                <button
                  key={s.field}
                  onClick={() => { if (sortField === s.field) setSortAsc(!sortAsc); else { setSortField(s.field); setSortAsc(false); } }}
                  className={cn(
                    'text-[11px] px-2 py-1 rounded-lg border transition-all flex items-center gap-0.5',
                    sortField === s.field ? 'bg-primary/5 border-primary/20 text-primary font-medium' : 'border-border/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s.label}
                  {sortField === s.field && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </button>
              ))}
            </div>
          </div>
          {/* Filter chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-medium">Filter:</span>
            {([
              { key: 'all' as FilterRec, label: 'All', count: candidates.length },
              { key: 'strong_match' as FilterRec, label: '🟢 Strong', count: candidates.filter(c => c.recommendation === 'strong_match').length },
              { key: 'good_match' as FilterRec, label: '🔵 Good', count: candidates.filter(c => c.recommendation === 'good_match').length },
              { key: 'potential' as FilterRec, label: '🟡 Potential', count: candidates.filter(c => c.recommendation === 'potential').length },
              { key: 'not_recommended' as FilterRec, label: '🔴 Not Rec.', count: candidates.filter(c => c.recommendation === 'not_recommended').length },
            ]).filter(f => f.key === 'all' || f.count > 0).map(f => (
              <button
                key={f.key}
                onClick={() => setFilterRec(f.key)}
                className={cn(
                  'text-[11px] px-2.5 py-1 rounded-full border transition-all',
                  filterRec === f.key ? 'bg-primary/10 border-primary/20 text-primary font-medium' : 'border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Candidate Cards */}
      <AnimatePresence mode="popLayout">
        {filtered.length > 0 && !screening && (
          <div className="space-y-3">
            {filtered.map((candidate, i) => {
              const config = RECOMMENDATION_CONFIG[candidate.recommendation] || RECOMMENDATION_CONFIG.potential;
              const Icon = config.icon;
              const expanded = expandedId === candidate.candidate_id;
              const rank = i + 1;

              return (
                <motion.div
                  key={candidate.candidate_id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className={cn(
                    'rounded-xl border transition-all overflow-hidden hover:shadow-md',
                    expanded && 'ring-1',
                    expanded && config.ring,
                  )}>
                    {/* Top color accent */}
                    <div className={cn('h-0.5', config.bg.replace('/10', ''))} />

                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Rank badge */}
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                          rank <= 3 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        )}>
                          #{rank}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm text-foreground truncate">{candidate.candidate_name}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{candidate.screening_summary}</p>
                            </div>
                            <Badge className={cn('text-[10px] px-2 py-0.5 gap-1 shrink-0 border', config.bg, config.color, config.border)}>
                              <Icon className="w-3 h-3" />
                              {config.label}
                            </Badge>
                          </div>

                          {/* Score bars */}
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Brain className="w-3 h-3" /> AI Score
                                </span>
                                <span className={cn('text-xs font-bold', getScoreColor(candidate.ai_screening_score))}>
                                  {candidate.ai_screening_score}%
                                </span>
                              </div>
                              <Progress value={candidate.ai_screening_score} className={cn('h-1.5 rounded-full', getScoreBarColor(candidate.ai_screening_score))} />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Target className="w-3 h-3" /> Match Score
                                </span>
                                <span className={cn('text-xs font-bold', getScoreColor(candidate.match_score))}>
                                  {candidate.match_score}%
                                </span>
                              </div>
                              <Progress value={candidate.match_score} className={cn('h-1.5 rounded-full', getScoreBarColor(candidate.match_score))} />
                            </div>
                          </div>

                          {/* Quick skill pills */}
                          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                            {candidate.skill_overlap?.slice(0, 3).map(s => (
                              <Badge key={s} variant="outline" className="text-[9px] px-1.5 py-0 bg-success/5 text-success border-success/20 gap-0.5">
                                <CheckCircle2 className="w-2 h-2" /> {s}
                              </Badge>
                            ))}
                            {candidate.skill_gaps?.slice(0, 2).map(s => (
                              <Badge key={s} variant="outline" className="text-[9px] px-1.5 py-0 bg-warning/5 text-warning border-warning/20 gap-0.5">
                                <AlertTriangle className="w-2 h-2" /> {s}
                              </Badge>
                            ))}
                            {((candidate.skill_overlap?.length || 0) + (candidate.skill_gaps?.length || 0)) > 5 && (
                              <span className="text-[9px] text-muted-foreground">
                                +{(candidate.skill_overlap?.length || 0) + (candidate.skill_gaps?.length || 0) - 5} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expand toggle */}
                        <button
                          onClick={() => setExpandedId(expanded ? null : candidate.candidate_id)}
                          className="shrink-0 p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 ml-11 space-y-3 border-t border-border/40 pt-3">
                              {/* Full Summary */}
                              <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                  <Brain className="w-3 h-3" /> AI Analysis
                                </p>
                                <p className="text-sm text-foreground leading-relaxed">{candidate.screening_summary}</p>
                              </div>

                              {/* Skills breakdown */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {candidate.skill_overlap?.length > 0 && (
                                  <div className="p-3 rounded-xl bg-success/[0.03] border border-success/10">
                                    <p className="text-[10px] font-semibold text-success uppercase tracking-wider mb-2 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Matching Skills ({candidate.skill_overlap.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {candidate.skill_overlap.map(s => (
                                        <Badge key={s} variant="outline" className="text-[10px] bg-success/5 text-success border-success/20">{s}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {candidate.skill_gaps?.length > 0 && (
                                  <div className="p-3 rounded-xl bg-warning/[0.03] border border-warning/10">
                                    <p className="text-[10px] font-semibold text-warning uppercase tracking-wider mb-2 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" /> Skill Gaps ({candidate.skill_gaps.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {candidate.skill_gaps.map(s => (
                                        <Badge key={s} variant="outline" className="text-[10px] bg-warning/5 text-warning border-warning/20">{s}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Score visualization */}
                              <div className="flex items-center gap-6 p-3 rounded-xl bg-card/60 border border-border/30">
                                <div className="text-center">
                                  <div className={cn('text-2xl font-bold', getScoreColor(candidate.ai_screening_score))}>
                                    {candidate.ai_screening_score}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">AI Score</p>
                                </div>
                                <div className="w-px h-8 bg-border/50" />
                                <div className="text-center">
                                  <div className={cn('text-2xl font-bold', getScoreColor(candidate.match_score))}>
                                    {candidate.match_score}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">Match</p>
                                </div>
                                <div className="w-px h-8 bg-border/50" />
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-foreground">
                                    {candidate.skill_overlap?.length || 0}/{(candidate.skill_overlap?.length || 0) + (candidate.skill_gaps?.length || 0)}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">Skills Match</p>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Empty states */}
      {screened && candidates.length === 0 && !screening && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="border-dashed border-2 border-border/60 rounded-xl">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="text-foreground font-semibold mb-1">No applicants found</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                This job doesn't have any applicants yet. Candidates need to apply before AI screening can analyze them.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {screened && candidates.length > 0 && filtered.length === 0 && !screening && (
        <div className="text-center py-8">
          <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No candidates match your current filters</p>
          <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => { setFilterRec('all'); setSearchQuery(''); }}>
            Clear filters
          </Button>
        </div>
      )}

      {/* Initial state */}
      {!screened && !screening && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-dashed border-2 border-border/60 rounded-xl">
            <CardContent className="p-10 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-10 h-10 text-primary/30" />
              </div>
              <p className="text-foreground font-semibold mb-1">Ready to screen applicants</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
                AI will analyze each applicant's resume against the job requirements, score their fit, identify skill matches and gaps, and rank them for you.
              </p>
              <div className="flex items-center justify-center gap-6 mb-5">
                {[
                  { icon: Target, label: 'Skill Matching' },
                  { icon: BarChart3, label: 'Score Ranking' },
                  { icon: AlertTriangle, label: 'Gap Analysis' },
                  { icon: Award, label: 'Recommendations' },
                ].map(f => (
                  <div key={f.label} className="text-center">
                    <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center mx-auto mb-1">
                      <f.icon className="w-5 h-5 text-muted-foreground/60" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{f.label}</p>
                  </div>
                ))}
              </div>
              <Button onClick={runScreening} disabled={screening} className="gap-2 rounded-xl">
                <Zap className="w-4 h-4" /> Start Screening
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
