import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain, Search, TrendingUp, BookOpen, CheckCircle2, XCircle, Loader2, Sparkles,
  Target, Zap, Clock, Star, ArrowRight, GraduationCap, Share2, Copy, RotateCcw,
  Briefcase, Code, BarChart3, Lightbulb, Trophy, ChevronRight, Award, Flame,
  AlertTriangle, Info, ExternalLink, Play
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SkillGapResult {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: { skill: string; importance: 'critical' | 'important' | 'nice_to_have'; course?: string }[];
  recommendations: string[];
}

const POPULAR_JOBS = [
  { title: 'Senior React Developer', icon: Code, color: 'text-blue-500' },
  { title: 'Data Scientist', icon: BarChart3, color: 'text-purple-500' },
  { title: 'Product Manager', icon: Briefcase, color: 'text-orange-500' },
  { title: 'UX Designer', icon: Lightbulb, color: 'text-pink-500' },
  { title: 'DevOps Engineer', icon: Zap, color: 'text-emerald-500' },
  { title: 'Full Stack Developer', icon: Code, color: 'text-cyan-500' },
];

const LEARNING_TIME = {
  critical: '2-4 weeks',
  important: '1-2 weeks',
  nice_to_have: '3-5 days',
};

export const SkillGapAnalyzer = ({ candidateSkills }: { candidateSkills: string[] }) => {
  const [dreamJob, setDreamJob] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SkillGapResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedShare, setCopiedShare] = useState(false);

  const analyze = async (jobTitle?: string) => {
    const targetJob = jobTitle || dreamJob.trim();
    if (!targetJob) {
      toast.error('Enter your dream job title');
      return;
    }
    if (jobTitle) setDreamJob(jobTitle);
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-skill-gap-analyzer', {
        body: { dreamJob: targetJob, currentSkills: candidateSkills }
      });
      if (error) throw error;
      setResult(data);
      setActiveTab('overview');
    } catch (err) {
      console.error('Skill gap analysis error:', err);
      toast.error('Failed to analyze. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const importanceConfig = {
    critical: { 
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      icon: AlertTriangle,
      label: 'Critical',
      priority: 1
    },
    important: { 
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      icon: Star,
      label: 'Important',
      priority: 2
    },
    nice_to_have: { 
      color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
      icon: Info,
      label: 'Nice to Have',
      priority: 3
    },
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!result) return null;
    const critical = result.missingSkills.filter(s => s.importance === 'critical').length;
    const important = result.missingSkills.filter(s => s.importance === 'important').length;
    const niceToHave = result.missingSkills.filter(s => s.importance === 'nice_to_have').length;
    const totalSkillsNeeded = result.matchedSkills.length + result.missingSkills.length;
    return { critical, important, niceToHave, totalSkillsNeeded };
  }, [result]);

  const shareResults = async () => {
    if (!result) return;
    const text = `🎯 Skill Gap Analysis for ${dreamJob}\n\n` +
      `Match Score: ${result.matchScore}%\n` +
      `✅ Skills I have: ${result.matchedSkills.length}\n` +
      `📚 Skills to learn: ${result.missingSkills.length}\n\n` +
      `Analyzed on HireForJob.com`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Skill Gap Analysis', text, url: window.location.href });
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
        return;
      } catch (e) { if ((e as Error).name === 'AbortError') return; }
    }
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
    toast.success('Results copied to clipboard!');
  };

  const resetAnalysis = () => {
    setResult(null);
    setDreamJob('');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-rose-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return { text: 'Excellent Match', emoji: '🎯' };
    if (score >= 60) return { text: 'Good Match', emoji: '👍' };
    if (score >= 40) return { text: 'Partial Match', emoji: '📈' };
    return { text: 'Needs Development', emoji: '💪' };
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <motion.div
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
            scale: { duration: 1, repeat: Infinity }
          }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-6 shadow-xl shadow-primary/25"
        >
          <Brain className="w-10 h-10 text-primary-foreground" />
        </motion.div>
        <h3 className="text-xl font-bold text-foreground mb-2">Analyzing Your Skills</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
          Comparing your profile against <span className="font-semibold text-foreground">{dreamJob}</span> requirements...
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {['Matching skills', 'Finding gaps', 'Building roadmap'].map((step, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, delay: i * 0.5, repeat: Infinity }}
              className="flex items-center gap-1"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {step}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Results View
  if (result) {
    const scoreLabel = getScoreLabel(result.matchScore);
    
    return (
      <div className="space-y-5 overflow-hidden">
        {/* Header with Score */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border shadow-sm"
        >
          <div className="p-5">
            <div className="flex items-center gap-4">
              {/* Score Circle */}
              <div className="relative w-16 h-16 shrink-0" style={{ overflow: 'hidden' }}>
                <svg width="64" height="64" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={264}
                    strokeDashoffset={264 - (264 * result.matchScore / 100)}
                    style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn("text-base font-black", getScoreColor(result.matchScore))}>
                    {result.matchScore}%
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] mb-1">
                  {scoreLabel.emoji} {scoreLabel.text}
                </Badge>
                <h3 className="text-base font-bold text-foreground truncate">{dreamJob}</h3>
                <p className="text-xs text-muted-foreground">
                  {result.matchedSkills.length} of {stats?.totalSkillsNeeded} skills matched
                </p>
              </div>
            </div>

            {/* Have / Need mini stats */}
            <div className="flex gap-2 mt-4">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{result.matchedSkills.length}</p>
                  <p className="text-[10px] text-muted-foreground leading-none">Have</p>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{result.missingSkills.length}</p>
                  <p className="text-[10px] text-muted-foreground leading-none">Need</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 px-5 py-3 border-t border-border bg-muted/30">
            <Button variant="outline" size="sm" onClick={resetAnalysis} className="gap-1.5 text-xs flex-1 sm:flex-none">
              <RotateCcw className="w-3.5 h-3.5" /> New Analysis
            </Button>
            <Button variant="outline" size="sm" onClick={shareResults} className="gap-1.5 text-xs flex-1 sm:flex-none">
              {copiedShare ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              {copiedShare ? 'Copied!' : 'Share'}
            </Button>
          </div>
        </motion.div>

        {/* Priority Breakdown */}
        {stats && stats.critical + stats.important > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <Card className="border-rose-500/20 bg-rose-500/5">
              <CardContent className="p-3 text-center">
                <AlertTriangle className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{stats.critical}</p>
                <p className="text-[10px] text-muted-foreground">Critical</p>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-3 text-center">
                <Star className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.important}</p>
                <p className="text-[10px] text-muted-foreground">Important</p>
              </CardContent>
            </Card>
            <Card className="border-slate-500/20 bg-slate-500/5">
              <CardContent className="p-3 text-center">
                <Info className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-600 dark:text-slate-400">{stats.niceToHave}</p>
                <p className="text-[10px] text-muted-foreground">Nice to Have</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-10">
            <TabsTrigger value="overview" className="text-xs gap-1">
              <BarChart3 className="w-3.5 h-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="text-xs gap-1">
              <Target className="w-3.5 h-3.5" /> Roadmap
            </TabsTrigger>
            <TabsTrigger value="tips" className="text-xs gap-1">
              <Lightbulb className="w-3.5 h-3.5" /> Tips
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Matched Skills */}
            {result.matchedSkills.length > 0 && (
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Skills You Already Have
                    <Badge variant="secondary" className="ml-auto text-xs">{result.matchedSkills.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5 pt-0">
                  {result.matchedSkills.map((skill, i) => (
                    <motion.div
                      key={skill}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> {skill}
                      </Badge>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Missing Skills */}
            {result.missingSkills.length > 0 && (
              <Card className="border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    Skills to Develop
                    <Badge variant="secondary" className="ml-auto text-xs">{result.missingSkills.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {result.missingSkills
                    .sort((a, b) => importanceConfig[a.importance].priority - importanceConfig[b.importance].priority)
                    .map((item, i) => {
                      const config = importanceConfig[item.importance];
                      const ImportanceIcon = config.icon;
                      return (
                        <motion.div
                          key={item.skill}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors"
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            item.importance === 'critical' ? "bg-rose-500/15" :
                            item.importance === 'important' ? "bg-amber-500/15" : "bg-slate-500/15"
                          )}>
                            <ImportanceIcon className={cn(
                              "w-4 h-4",
                              item.importance === 'critical' ? "text-rose-500" :
                              item.importance === 'important' ? "text-amber-500" : "text-slate-500"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{item.skill}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className={cn("text-[10px] capitalize", config.color)}>
                                {config.label}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {LEARNING_TIME[item.importance]}
                              </span>
                            </div>
                          </div>
                          {item.course && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1 text-primary shrink-0">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Learn</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{item.course}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </motion.div>
                      );
                    })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Roadmap Tab */}
          <TabsContent value="roadmap" className="mt-4">
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Your Learning Roadmap
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {result.missingSkills.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-foreground">You're All Set!</p>
                    <p className="text-xs text-muted-foreground">You already have all the required skills for this role.</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {/* Phase 1: Critical */}
                    {stats?.critical && stats.critical > 0 && (
                      <div className="relative pl-6 pb-6 border-l-2 border-rose-500/30">
                        <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center">
                          <span className="text-[8px] text-white font-bold">1</span>
                        </div>
                        <div className="pt-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-rose-500/15 text-rose-500 border-rose-500/30 text-xs">
                              <Flame className="w-3 h-3 mr-1" /> Phase 1: Critical Skills
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">2-4 weeks</span>
                          </div>
                          <div className="space-y-1.5">
                            {result.missingSkills
                              .filter(s => s.importance === 'critical')
                              .map((s, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
                                  <Play className="w-3 h-3 text-rose-500" />
                                  <span className="text-xs text-foreground">{s.skill}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Phase 2: Important */}
                    {stats?.important && stats.important > 0 && (
                      <div className="relative pl-6 pb-6 border-l-2 border-amber-500/30">
                        <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                          <span className="text-[8px] text-white font-bold">{stats?.critical ? 2 : 1}</span>
                        </div>
                        <div className="pt-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-xs">
                              <Star className="w-3 h-3 mr-1" /> Phase {stats?.critical ? 2 : 1}: Important Skills
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">1-2 weeks</span>
                          </div>
                          <div className="space-y-1.5">
                            {result.missingSkills
                              .filter(s => s.importance === 'important')
                              .map((s, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                  <Play className="w-3 h-3 text-amber-500" />
                                  <span className="text-xs text-foreground">{s.skill}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Phase 3: Nice to Have */}
                    {stats?.niceToHave && stats.niceToHave > 0 && (
                      <div className="relative pl-6">
                        <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-slate-500 flex items-center justify-center">
                          <span className="text-[8px] text-white font-bold">
                            {(stats?.critical ? 1 : 0) + (stats?.important ? 1 : 0) + 1}
                          </span>
                        </div>
                        <div className="pt-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-slate-500/15 text-slate-500 border-slate-500/30 text-xs">
                              <Award className="w-3 h-3 mr-1" /> Phase {(stats?.critical ? 1 : 0) + (stats?.important ? 1 : 0) + 1}: Nice to Have
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">3-5 days</span>
                          </div>
                          <div className="space-y-1.5">
                            {result.missingSkills
                              .filter(s => s.importance === 'nice_to_have')
                              .map((s, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-500/5 border border-slate-500/10">
                                  <Play className="w-3 h-3 text-slate-500" />
                                  <span className="text-xs text-foreground">{s.skill}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Completion */}
                    <div className="relative pl-6 pt-6">
                      <div className="absolute left-0 top-6 -translate-x-1/2 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Trophy className="w-2.5 h-2.5 text-white" />
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          🎉 Ready for {dreamJob}!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips" className="space-y-3 mt-4">
            {result.recommendations.length > 0 ? (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
                    <Zap className="w-4 h-4" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {result.recommendations.map((rec, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-background/60 border border-border/30"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <p className="text-sm text-foreground/90 flex-1">{rec}</p>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/40">
                <CardContent className="p-8 text-center">
                  <Lightbulb className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No specific recommendations at this time.</p>
                </CardContent>
              </Card>
            )}

            {/* Quick Tips */}
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Quick Learning Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {[
                  { tip: 'Focus on critical skills first for maximum impact', icon: Target },
                  { tip: 'Build projects to demonstrate your new skills', icon: Code },
                  { tip: 'Join communities to learn from experienced professionals', icon: Briefcase },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="text-xs text-foreground/80">{item.tip}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Empty State - Input View
  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25 shrink-0">
            <Brain className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground mb-1">Skill Gap Analyzer</h2>
            <p className="text-sm text-muted-foreground">
              Compare your skills against your dream job. Get a personalized learning roadmap with course recommendations.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Current Skills Summary */}
      {candidateSkills.length > 0 && (
        <Card className="border-border/40 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Your Current Skills
              <Badge variant="secondary" className="ml-auto text-xs">{candidateSkills.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5 pt-0">
            {candidateSkills.slice(0, 12).map(skill => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {candidateSkills.length > 12 && (
              <Badge variant="outline" className="text-xs">
                +{candidateSkills.length - 12} more
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Input Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5">
          <label className="text-sm font-medium text-foreground mb-2 block">
            What's your dream job?
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="e.g. Senior React Developer, Data Scientist..."
                value={dreamJob}
                onChange={e => setDreamJob(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && analyze()}
                className="pl-10 rounded-xl h-12 text-base"
              />
            </div>
            <Button 
              onClick={() => analyze()} 
              disabled={!dreamJob.trim()} 
              className="rounded-xl h-12 px-6 gap-2"
              size="lg"
            >
              <Sparkles className="w-4 h-4" />
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Popular Jobs */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" /> Popular Roles
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {POPULAR_JOBS.map((job, i) => (
            <motion.button
              key={job.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => analyze(job.title)}
              className="flex items-center gap-2 p-3 rounded-xl border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted/50 group-hover:bg-primary/10 transition-colors",
              )}>
                <job.icon className={cn("w-4 h-4", job.color)} />
              </div>
              <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {job.title}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <Card className="border-border/40 bg-muted/30">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">How it works</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { icon: Search, label: 'Enter Dream Job' },
              { icon: Brain, label: 'AI Analyzes Gap' },
              { icon: Target, label: 'Get Roadmap' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-[10px] text-muted-foreground font-medium">{step.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
