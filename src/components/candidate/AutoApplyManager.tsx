import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Zap, Settings, History, Play, Loader2, Undo2, X,
  Target, MapPin, DollarSign, Building2, Briefcase, Sparkles, Shield,
  CheckCircle2, XCircle, Clock, TrendingUp, AlertTriangle, RefreshCw,
  ChevronDown, ChevronUp, Eye, ExternalLink, Info
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

interface AutoApplyManagerProps {
  candidateId: string;
}

interface Preferences {
  id?: string;
  candidate_id: string;
  is_enabled: boolean;
  match_threshold: number;
  preferred_titles: string[];
  focus_skills: string[];
  preferred_locations: string[];
  remote_only: boolean;
  min_salary: string;
  salary_currency: string;
  company_size_preference: string[];
  industry_preference: string[];
  experience_level: string;
  daily_limit: number;
  generate_cover_letter: boolean;
  location_radius: string;
  excluded_companies: string[];
}

interface LogEntry {
  id: string;
  job_id: string;
  match_score: number;
  cover_letter: string | null;
  application_id: string | null;
  status: string;
  skip_reason: string | null;
  created_at: string;
  jobs?: { title: string; employers?: { company_name: string } };
}

const defaultPrefs: Omit<Preferences, 'candidate_id'> = {
  is_enabled: false,
  match_threshold: 70,
  preferred_titles: [],
  focus_skills: [],
  preferred_locations: [],
  remote_only: false,
  min_salary: '',
  salary_currency: 'INR',
  company_size_preference: [],
  industry_preference: [],
  experience_level: '',
  daily_limit: 5,
  generate_cover_letter: true,
  location_radius: 'city',
  excluded_companies: [],
};

// --- Sub-components ---

const TagInput = ({ tags, onAdd, onRemove, placeholder }: { tags: string[]; onAdd: (t: string) => void; onRemove: (i: number) => void; placeholder: string }) => {
  const [input, setInput] = useState('');
  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      onAdd(input.trim());
      setInput('');
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {tags.map((t, i) => (
          <Badge key={i} variant="secondary" className="gap-1 text-xs rounded-full px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20">
            {t}
            <X className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors" onClick={() => onRemove(i)} />
          </Badge>
        ))}
      </div>
      <Input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className="text-sm rounded-xl bg-secondary/50 border-border"
      />
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, subtitle }: { icon: any; label: string; value: string | number; color: string; subtitle?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
  >
    <div className={cn("p-2 rounded-lg shrink-0", color)}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="min-w-0">
      <p className="text-lg font-bold text-foreground leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{label}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground/70">{subtitle}</p>}
    </div>
  </motion.div>
);

const HistoryCard = ({ log, canUndo, onUndo }: { log: LogEntry; canUndo: boolean; onUndo: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const jobTitle = (log as any).jobs?.title || 'Unknown Job';
  const company = (log as any).jobs?.employers?.company_name || '';

  const statusConfig: Record<string, { icon: any; color: string; label: string; bg: string }> = {
    applied: { icon: CheckCircle2, color: 'text-[hsl(var(--success))]', label: 'Applied', bg: 'bg-[hsl(var(--success))]/10' },
    skipped: { icon: XCircle, color: 'text-muted-foreground', label: 'Skipped', bg: 'bg-secondary' },
    undone: { icon: Undo2, color: 'text-[hsl(var(--warning))]', label: 'Undone', bg: 'bg-[hsl(var(--warning))]/10' },
    failed: { icon: AlertTriangle, color: 'text-destructive', label: 'Failed', bg: 'bg-destructive/10' },
  };

  const config = statusConfig[log.status] || statusConfig.skipped;
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl border transition-all",
        log.status === 'applied' ? 'border-[hsl(var(--success))]/20 bg-[hsl(var(--success))]/5' : 'border-border bg-card'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-1.5 rounded-lg mt-0.5 shrink-0", config.bg)}>
          <StatusIcon className={cn("w-4 h-4", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/jobs/${log.job_id}`} className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1">
                {jobTitle}
              </Link>
              {company && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3" /> {company}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className={cn("text-[10px] rounded-full px-2", log.match_score >= 80 ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : log.match_score >= 60 ? 'bg-primary/10 text-primary' : '')}>
                {log.match_score}% match
              </Badge>
              <Badge variant="outline" className={cn("text-[10px] rounded-full px-2 capitalize", config.bg, config.color)}>
                {config.label}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
            </span>
            {log.skip_reason && (
              <span className="text-[11px] text-muted-foreground/70 italic truncate max-w-[200px]">
                Reason: {log.skip_reason}
              </span>
            )}
            {canUndo && (
              <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs text-[hsl(var(--warning))] hover:text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/10 ml-auto" onClick={onUndo}>
                <Undo2 className="w-3 h-3" /> Undo
              </Button>
            )}
          </div>

          {/* Expandable cover letter */}
          {log.cover_letter && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? 'Hide cover letter' : 'View cover letter'}
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="text-xs text-muted-foreground mt-2 p-3 bg-secondary/50 rounded-lg border border-border overflow-hidden whitespace-pre-wrap"
                  >
                    {log.cover_letter}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const AutoApplySkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-9 w-28 rounded-xl" />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[72px] rounded-xl" />)}
    </div>
    <Skeleton className="h-10 w-full rounded-lg" />
    <div className="space-y-4">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
    </div>
  </div>
);

// --- Main Component ---

export const AutoApplyManager = ({ candidateId }: AutoApplyManagerProps) => {
  const [prefs, setPrefs] = useState<Preferences>({ ...defaultPrefs, candidate_id: candidateId });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'applied' | 'skipped'>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [prefsRes, logsRes] = await Promise.all([
      supabase.from('auto_apply_preferences').select('*').eq('candidate_id', candidateId).maybeSingle(),
      supabase.from('auto_apply_logs').select('*, jobs(title, employers:employer_id(company_name))').eq('candidate_id', candidateId).order('created_at', { ascending: false }).limit(50),
    ]);
    if (prefsRes.data) setPrefs(prefsRes.data as unknown as Preferences);
    setLogs((logsRes.data || []) as unknown as LogEntry[]);
    setLoading(false);
  }, [candidateId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const savePrefs = async () => {
    setSaving(true);
    const payload = { ...prefs, candidate_id: candidateId };
    delete (payload as any).id;
    const { error } = prefs.id
      ? await supabase.from('auto_apply_preferences').update(payload).eq('id', prefs.id)
      : await supabase.from('auto_apply_preferences').insert(payload).select().single().then(r => {
          if (r.data) setPrefs(prev => ({ ...prev, id: (r.data as any).id }));
          return r;
        });
    if (error) toast.error('Failed to save: ' + error.message);
    else toast.success('Preferences saved!');
    setSaving(false);
  };

  const toggleEnabled = async (enabled: boolean) => {
    setPrefs(p => ({ ...p, is_enabled: enabled }));
    const payload = { ...prefs, is_enabled: enabled, candidate_id: candidateId };
    delete (payload as any).id;
    if (prefs.id) {
      await supabase.from('auto_apply_preferences').update({ is_enabled: enabled }).eq('id', prefs.id);
    } else {
      const { data } = await supabase.from('auto_apply_preferences').insert(payload).select().single();
      if (data) setPrefs(prev => ({ ...prev, id: (data as any).id }));
    }
    toast.success(enabled ? 'Auto Apply enabled!' : 'Auto Apply paused');
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Please sign in'); setRunning(false); return; }
      const res = await supabase.functions.invoke('auto-apply-jobs', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      const result = res.data;
      if (result.applied > 0) toast.success(result.message || `Applied to ${result.applied} jobs`);
      else toast.info(result.message || 'No matching jobs found', { duration: 6000 });
      fetchData();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
    setRunning(false);
  };

  const undoApply = async (log: LogEntry) => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (new Date(log.created_at) < fiveMinAgo) { toast.error('Undo window expired (5 minutes)'); return; }
    if (log.application_id) {
      await supabase.from('auto_apply_logs').update({ status: 'undone' }).eq('id', log.id);
    }
    toast.success('Application undone');
    fetchData();
  };

  const updatePref = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPrefs(p => ({ ...p, [key]: value }));
  };

  const addTag = (key: 'preferred_titles' | 'focus_skills' | 'preferred_locations' | 'excluded_companies' | 'industry_preference' | 'company_size_preference', val: string) => {
    setPrefs(p => ({ ...p, [key]: [...(p[key] || []), val] }));
  };

  const removeTag = (key: 'preferred_titles' | 'focus_skills' | 'preferred_locations' | 'excluded_companies' | 'industry_preference' | 'company_size_preference', idx: number) => {
    setPrefs(p => ({ ...p, [key]: (p[key] || []).filter((_, i) => i !== idx) }));
  };

  // Stats
  const stats = useMemo(() => {
    const applied = logs.filter(l => l.status === 'applied');
    const appliedToday = applied.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length;
    const skipped = logs.filter(l => l.status === 'skipped').length;
    const avgScore = applied.length > 0 ? Math.round(applied.reduce((a, l) => a + l.match_score, 0) / applied.length) : 0;
    return { appliedToday, totalApplied: applied.length, skipped, avgScore };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (historyFilter === 'all') return logs;
    return logs.filter(l => l.status === historyFilter);
  }, [logs, historyFilter]);

  if (loading) return <AutoApplySkeleton />;

  const dailyProgress = (stats.appliedToday / prefs.daily_limit) * 100;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
              prefs.is_enabled ? "bg-[hsl(var(--success))]/10" : "bg-primary/10"
            )}>
              <Zap className={cn("w-6 h-6", prefs.is_enabled ? "text-[hsl(var(--success))]" : "text-primary")} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground font-heading">Auto Apply</h2>
                <Badge className={cn(
                  "text-[10px] rounded-full px-2",
                  prefs.is_enabled
                    ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20"
                    : "bg-secondary text-muted-foreground"
                )}>
                  {prefs.is_enabled ? '● Active' : '○ Paused'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">AI-powered job applications on autopilot</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-secondary/50 rounded-xl px-3 py-2 border border-border">
              <Label htmlFor="auto-toggle" className="text-sm font-medium cursor-pointer">
                {prefs.is_enabled ? 'Enabled' : 'Disabled'}
              </Label>
              <Switch id="auto-toggle" checked={prefs.is_enabled} onCheckedChange={toggleEnabled} />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={runNow} disabled={running || !prefs.is_enabled} className="gap-2 rounded-xl">
                  {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Run Now
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {prefs.is_enabled ? 'Scan and apply to matching jobs now' : 'Enable Auto Apply first'}
              </TooltipContent>
            </Tooltip>
          </div>
        </motion.div>

        {/* Daily Progress */}
        {prefs.is_enabled && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Today's Progress</span>
                  <span className="text-sm text-muted-foreground">{stats.appliedToday} / {prefs.daily_limit} applications</span>
                </div>
                <Progress value={dailyProgress} className="h-2" />
                {stats.appliedToday >= prefs.daily_limit && (
                  <p className="text-[11px] text-[hsl(var(--success))] mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Daily limit reached. Will resume tomorrow.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Zap} label="Applied Today" value={stats.appliedToday} color="bg-primary/10 text-primary" subtitle={`of ${prefs.daily_limit} limit`} />
          <StatCard icon={CheckCircle2} label="Total Applied" value={stats.totalApplied} color="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" />
          <StatCard icon={XCircle} label="Skipped" value={stats.skipped} color="bg-secondary text-muted-foreground" />
          <StatCard icon={TrendingUp} label="Avg Match" value={stats.avgScore ? `${stats.avgScore}%` : '—'} color="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 rounded-xl">
            <TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm rounded-lg">
              <Settings className="w-4 h-4" /> Preferences
            </TabsTrigger>
            <TabsTrigger value="controls" className="gap-1.5 text-xs sm:text-sm rounded-lg">
              <Target className="w-4 h-4" /> Controls
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm rounded-lg">
              <History className="w-4 h-4" /> History
              {logs.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 ml-1 rounded-full">{logs.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Preferences Tab */}
          <TabsContent value="settings" className="space-y-6 mt-4">
            {/* Info banner */}
            <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Set your preferences and the AI will automatically find and apply to jobs that match your criteria. Press <kbd className="px-1 py-0.5 bg-secondary rounded text-[10px] font-mono">Enter</kbd> to add tags.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <Briefcase className="w-4 h-4 text-primary" /> Preferred Job Titles
                  </Label>
                  <TagInput tags={prefs.preferred_titles} onAdd={v => addTag('preferred_titles', v)} onRemove={i => removeTag('preferred_titles', i)} placeholder="e.g. Frontend Developer" />
                </div>
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4 text-[hsl(var(--warning))]" /> Focus Skills
                  </Label>
                  <TagInput tags={prefs.focus_skills} onAdd={v => addTag('focus_skills', v)} onRemove={i => removeTag('focus_skills', i)} placeholder="e.g. React, TypeScript" />
                </div>
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <MapPin className="w-4 h-4 text-destructive" /> Preferred Locations
                  </Label>
                  <TagInput tags={prefs.preferred_locations} onAdd={v => addTag('preferred_locations', v)} onRemove={i => removeTag('preferred_locations', i)} placeholder="e.g. Mumbai, Remote" />
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <Building2 className="w-4 h-4 text-[hsl(var(--success))]" /> Industry Preference
                  </Label>
                  <TagInput tags={prefs.industry_preference} onAdd={v => addTag('industry_preference', v)} onRemove={i => removeTag('industry_preference', i)} placeholder="e.g. Technology, Finance" />
                </div>
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <Building2 className="w-4 h-4" /> Company Size
                  </Label>
                  <TagInput tags={prefs.company_size_preference} onAdd={v => addTag('company_size_preference', v)} onRemove={i => removeTag('company_size_preference', i)} placeholder="e.g. Startup, 50-200" />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Experience Level</Label>
                  <Select value={prefs.experience_level || ''} onValueChange={v => updatePref('experience_level', v)}>
                    <SelectTrigger className="rounded-xl bg-secondary/50"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fresher">Fresher</SelectItem>
                      <SelectItem value="junior">Junior (1-3 yrs)</SelectItem>
                      <SelectItem value="mid">Mid (3-5 yrs)</SelectItem>
                      <SelectItem value="senior">Senior (5-10 yrs)</SelectItem>
                      <SelectItem value="lead">Lead (10+ yrs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <Shield className="w-4 h-4 text-muted-foreground" /> Excluded Companies
                  </Label>
                  <TagInput tags={prefs.excluded_companies} onAdd={v => addTag('excluded_companies', v)} onRemove={i => removeTag('excluded_companies', i)} placeholder="Companies to skip" />
                </div>
              </div>
            </div>
            <Button onClick={savePrefs} disabled={saving} className="gap-2 rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save Preferences
            </Button>
          </TabsContent>

          {/* Controls Tab */}
          <TabsContent value="controls" className="space-y-6 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 font-heading">
                    <Target className="w-4 h-4 text-primary" /> Match Threshold
                  </CardTitle>
                  <CardDescription className="text-xs">Only apply when match score exceeds this</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">50%</span>
                    <span className={cn(
                      "text-2xl font-bold",
                      prefs.match_threshold >= 80 ? "text-[hsl(var(--success))]" : prefs.match_threshold >= 65 ? "text-primary" : "text-[hsl(var(--warning))]"
                    )}>{prefs.match_threshold}%</span>
                    <span className="text-xs text-muted-foreground">95%</span>
                  </div>
                  <Slider value={[prefs.match_threshold]} onValueChange={([v]) => updatePref('match_threshold', v)} min={50} max={95} step={5} />
                  <p className="text-[10px] text-muted-foreground">
                    {prefs.match_threshold >= 85 ? '🎯 Very selective — only top matches' : prefs.match_threshold >= 70 ? '⚡ Balanced — good quality matches' : '🌐 Broad — more applications, lower match'}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 font-heading">
                    <Briefcase className="w-4 h-4 text-primary" /> Daily Limit
                  </CardTitle>
                  <CardDescription className="text-xs">Maximum applications per day</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">1</span>
                    <span className="text-2xl font-bold text-foreground">{prefs.daily_limit}</span>
                    <span className="text-xs text-muted-foreground">10</span>
                  </div>
                  <Slider value={[prefs.daily_limit]} onValueChange={([v]) => updatePref('daily_limit', v)} min={1} max={10} step={1} />
                </CardContent>
              </Card>

              <Card className="border-border rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 font-heading">
                    <DollarSign className="w-4 h-4 text-[hsl(var(--success))]" /> Minimum Salary
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Select value={prefs.salary_currency} onValueChange={v => updatePref('salary_currency', v)}>
                    <SelectTrigger className="w-24 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={prefs.min_salary || ''} onChange={e => updatePref('min_salary', e.target.value)} placeholder="e.g. 500000" className="rounded-xl bg-secondary/50" />
                </CardContent>
              </Card>

              <Card className="border-border rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 font-heading">
                    <MapPin className="w-4 h-4 text-destructive" /> Location Radius
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={prefs.location_radius} onValueChange={v => updatePref('location_radius', v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10km">Within 10 km</SelectItem>
                      <SelectItem value="city">Within city</SelectItem>
                      <SelectItem value="remote_only">Remote only</SelectItem>
                      <SelectItem value="relocate">Open to relocation</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                    <Label htmlFor="remote-toggle" className="text-sm cursor-pointer">Remote Only</Label>
                    <Switch id="remote-toggle" checked={prefs.remote_only} onCheckedChange={v => updatePref('remote_only', v)} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Cover Letter toggle */}
            <Card className="border-border rounded-xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[hsl(var(--warning))]/10 rounded-lg">
                    <Sparkles className="w-5 h-5 text-[hsl(var(--warning))]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">AI Cover Letter</p>
                    <p className="text-xs text-muted-foreground">Auto-generate personalized cover letters with each application</p>
                  </div>
                </div>
                <Switch checked={prefs.generate_cover_letter} onCheckedChange={v => updatePref('generate_cover_letter', v)} />
              </CardContent>
            </Card>

            <Button onClick={savePrefs} disabled={saving} className="gap-2 rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save Controls
            </Button>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4 space-y-4">
            {/* History filter chips */}
            {logs.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {([
                  { key: 'all' as const, label: 'All', count: logs.length },
                  { key: 'applied' as const, label: 'Applied', count: logs.filter(l => l.status === 'applied').length },
                  { key: 'skipped' as const, label: 'Skipped', count: logs.filter(l => l.status === 'skipped').length },
                ]).map(f => (
                  <button
                    key={f.key}
                    onClick={() => setHistoryFilter(f.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                      historyFilter === f.key
                        ? "bg-primary/10 text-primary border-primary/20 ring-1 ring-primary/20"
                        : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/30"
                    )}
                  >
                    {f.label}
                    <span className="bg-background/60 text-[10px] px-1.5 rounded-full">{f.count}</span>
                  </button>
                ))}
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs ml-auto rounded-lg" onClick={fetchData}>
                  <RefreshCw className="w-3 h-3" /> Refresh
                </Button>
              </div>
            )}

            {filteredLogs.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <History className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <h3 className="font-semibold font-heading mb-1 text-foreground">No history yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  {logs.length === 0
                    ? 'Enable auto-apply and run it to see results here'
                    : 'No entries match the current filter'}
                </p>
                {logs.length > 0 && (
                  <Button variant="ghost" size="sm" className="mt-3" onClick={() => setHistoryFilter('all')}>
                    Show all
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredLogs.map(log => {
                    const canUndo = log.status === 'applied' && new Date(log.created_at) > new Date(Date.now() - 5 * 60 * 1000);
                    return (
                      <HistoryCard
                        key={log.id}
                        log={log}
                        canUndo={canUndo}
                        onUndo={() => undoApply(log)}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};
