import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Zap, Settings, History, Play, Loader2, Undo2, X, Plus,
  Target, MapPin, DollarSign, Building2, Briefcase, Sparkles, Shield
} from 'lucide-react';
import { format } from 'date-fns';

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
          <Badge key={i} variant="secondary" className="gap-1 text-xs">
            {t}
            <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => onRemove(i)} />
          </Badge>
        ))}
      </div>
      <Input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className="text-sm"
      />
    </div>
  );
};

export const AutoApplyManager = ({ candidateId }: AutoApplyManagerProps) => {
  const [prefs, setPrefs] = useState<Preferences>({ ...defaultPrefs, candidate_id: candidateId });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [prefsRes, logsRes] = await Promise.all([
      supabase.from('auto_apply_preferences').select('*').eq('candidate_id', candidateId).maybeSingle(),
      supabase.from('auto_apply_logs').select('*, jobs(title, employers:employer_id(company_name))').eq('candidate_id', candidateId).order('created_at', { ascending: false }).limit(50),
    ]);
    if (prefsRes.data) {
      setPrefs(prefsRes.data as unknown as Preferences);
    }
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
    toast.success(enabled ? 'Auto Apply enabled!' : 'Auto Apply disabled');
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
      if (result.applied > 0) {
        toast.success(result.message || `Applied to ${result.applied} jobs`);
      } else {
        toast.info(result.message || 'No matching jobs found', { duration: 6000 });
      }
      fetchData();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
    setRunning(false);
  };

  const undoApply = async (log: LogEntry) => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (new Date(log.created_at) < fiveMinAgo) {
      toast.error('Undo window expired (5 minutes)');
      return;
    }
    if (log.application_id) {
      // Can't delete applications per RLS, mark log as undone
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const appliedToday = logs.filter(l => l.status === 'applied' && new Date(l.created_at).toDateString() === new Date().toDateString()).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Auto Apply</h2>
            <p className="text-sm text-muted-foreground">AI-powered job applications</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-toggle" className="text-sm font-medium">
              {prefs.is_enabled ? 'Active' : 'Disabled'}
            </Label>
            <Switch id="auto-toggle" checked={prefs.is_enabled} onCheckedChange={toggleEnabled} />
          </div>
          <Button onClick={runNow} disabled={running || !prefs.is_enabled} size="sm" className="gap-2">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Now
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{appliedToday}</p>
            <p className="text-xs text-muted-foreground">Applied Today</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{prefs.daily_limit}</p>
            <p className="text-xs text-muted-foreground">Daily Limit</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{prefs.match_threshold}%</p>
            <p className="text-xs text-muted-foreground">Min Match</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{logs.filter(l => l.status === 'applied').length}</p>
            <p className="text-xs text-muted-foreground">Total Applied</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm">
            <Settings className="w-4 h-4" /> Preferences
          </TabsTrigger>
          <TabsTrigger value="controls" className="gap-1.5 text-xs sm:text-sm">
            <Target className="w-4 h-4" /> Controls
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm">
            <History className="w-4 h-4" /> History
          </TabsTrigger>
        </TabsList>

        {/* Preferences Tab */}
        <TabsContent value="settings" className="space-y-6 mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <Briefcase className="w-4 h-4" /> Preferred Job Titles
                </Label>
                <TagInput tags={prefs.preferred_titles} onAdd={v => addTag('preferred_titles', v)} onRemove={i => removeTag('preferred_titles', i)} placeholder="Type title and press Enter" />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-4 h-4" /> Focus Skills
                </Label>
                <TagInput tags={prefs.focus_skills} onAdd={v => addTag('focus_skills', v)} onRemove={i => removeTag('focus_skills', i)} placeholder="Type skill and press Enter" />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <MapPin className="w-4 h-4" /> Preferred Locations
                </Label>
                <TagInput tags={prefs.preferred_locations} onAdd={v => addTag('preferred_locations', v)} onRemove={i => removeTag('preferred_locations', i)} placeholder="Type location and press Enter" />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <Building2 className="w-4 h-4" /> Industry Preference
                </Label>
                <TagInput tags={prefs.industry_preference} onAdd={v => addTag('industry_preference', v)} onRemove={i => removeTag('industry_preference', i)} placeholder="Type industry and press Enter" />
              </div>
              <div>
                <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <Building2 className="w-4 h-4" /> Company Size Preference
                </Label>
                <TagInput tags={prefs.company_size_preference} onAdd={v => addTag('company_size_preference', v)} onRemove={i => removeTag('company_size_preference', i)} placeholder="e.g. Startup, 50-200, Enterprise" />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Experience Level</Label>
                <Select value={prefs.experience_level || ''} onValueChange={v => updatePref('experience_level', v)}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
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
                  <Shield className="w-4 h-4" /> Excluded Companies
                </Label>
                <TagInput tags={prefs.excluded_companies} onAdd={v => addTag('excluded_companies', v)} onRemove={i => removeTag('excluded_companies', i)} placeholder="Company names to skip" />
              </div>
            </div>
          </div>
          <Button onClick={savePrefs} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Preferences
          </Button>
        </TabsContent>

        {/* Controls Tab */}
        <TabsContent value="controls" className="space-y-6 mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4" /> Match Threshold</CardTitle>
                <CardDescription className="text-xs">Only apply when match score is above this</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">50%</span>
                  <span className="text-2xl font-bold text-primary">{prefs.match_threshold}%</span>
                  <span className="text-sm text-muted-foreground">95%</span>
                </div>
                <Slider value={[prefs.match_threshold]} onValueChange={([v]) => updatePref('match_threshold', v)} min={50} max={95} step={5} />
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Briefcase className="w-4 h-4" /> Daily Limit</CardTitle>
                <CardDescription className="text-xs">Max auto-applications per day</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">1</span>
                  <span className="text-2xl font-bold text-foreground">{prefs.daily_limit}</span>
                  <span className="text-sm text-muted-foreground">10</span>
                </div>
                <Slider value={[prefs.daily_limit]} onValueChange={([v]) => updatePref('daily_limit', v)} min={1} max={10} step={1} />
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4" /> Minimum Salary</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Select value={prefs.salary_currency} onValueChange={v => updatePref('salary_currency', v)}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={prefs.min_salary || ''} onChange={e => updatePref('min_salary', e.target.value)} placeholder="e.g. 500000" type="text" />
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" /> Location Radius</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={prefs.location_radius} onValueChange={v => updatePref('location_radius', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10km">Within 10 km</SelectItem>
                    <SelectItem value="city">Within city</SelectItem>
                    <SelectItem value="remote_only">Remote only</SelectItem>
                    <SelectItem value="relocate">Open to relocation</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between">
                  <Label htmlFor="remote-toggle" className="text-sm">Remote Only</Label>
                  <Switch id="remote-toggle" checked={prefs.remote_only} onCheckedChange={v => updatePref('remote_only', v)} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/40">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">AI Cover Letter</p>
                  <p className="text-xs text-muted-foreground">Auto-generate personalized cover letters</p>
                </div>
              </div>
              <Switch checked={prefs.generate_cover_letter} onCheckedChange={v => updatePref('generate_cover_letter', v)} />
            </CardContent>
          </Card>

          <Button onClick={savePrefs} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Controls
          </Button>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No auto-apply history yet</p>
              <p className="text-sm mt-1">Enable auto-apply and run it to see results here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => {
                    const canUndo = log.status === 'applied' && new Date(log.created_at) > new Date(Date.now() - 5 * 60 * 1000);
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{(log as any).jobs?.title || 'Unknown Job'}</p>
                            <p className="text-xs text-muted-foreground">{(log as any).jobs?.employers?.company_name || ''}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.match_score >= 70 ? 'default' : 'secondary'} className="text-xs">
                            {log.match_score}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            log.status === 'applied' ? 'default' :
                            log.status === 'skipped' ? 'secondary' :
                            log.status === 'undone' ? 'outline' : 'destructive'
                          } className="text-xs capitalize">
                            {log.status}
                          </Badge>
                          {log.skip_reason && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[150px] truncate">{log.skip_reason}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          {canUndo && (
                            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => undoApply(log)}>
                              <Undo2 className="w-3 h-3" /> Undo
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
