import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import {
  Bell, Plus, Trash2, Mail, Smartphone, MapPin, Briefcase, X, Loader2,
  Zap, BellRing, BellOff, Sparkles, Check, Edit2, Power, ChevronRight, Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface JobAlert {
  id: string;
  name: string;
  skills: string[];
  location: string | null;
  category: string | null;
  is_email_enabled: boolean;
  is_push_enabled: boolean;
  is_active: boolean;
}

interface JobAlertsManagerProps {
  candidateId: string;
}

/* ── Stats row ── */
const AlertStats = ({ total, active, paused }: { total: number; active: number; paused: number }) => (
  <div className="grid grid-cols-3 gap-3">
    {[
      { label: 'Total Alerts', value: total, icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted/50' },
      { label: 'Active', value: active, icon: BellRing, color: 'text-success', bg: 'bg-success/10' },
      { label: 'Paused', value: paused, icon: BellOff, color: 'text-warning-foreground', bg: 'bg-warning/10' },
    ].map((stat, i) => (
      <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
        <Card className="border border-border/40">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', stat.bg)}>
              <stat.icon className={cn('w-4 h-4', stat.color)} />
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground leading-none">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    ))}
  </div>
);

/* ── Alert card ── */
const AlertCard = ({
  alert,
  onToggle,
  onDelete,
}: {
  alert: JobAlert;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        'group relative rounded-xl border transition-all overflow-hidden',
        alert.is_active
          ? 'border-primary/15 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/30'
          : 'border-border/30 bg-muted/10 opacity-70 hover:opacity-90'
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
              alert.is_active ? 'bg-primary/10' : 'bg-muted/50'
            )}>
              <BellRing className={cn('w-5 h-5', alert.is_active ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm text-foreground">{alert.name}</h4>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] h-5 border-0',
                    alert.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {alert.is_active ? '● Active' : '○ Paused'}
                </Badge>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {alert.skills.map((skill, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] h-5 bg-primary/5 text-primary border-primary/15">
                    {skill}
                  </Badge>
                ))}
                {alert.location && (
                  <Badge variant="outline" className="text-[10px] h-5 gap-0.5 bg-muted/50">
                    <MapPin className="w-3 h-3" /> {alert.location}
                  </Badge>
                )}
                {alert.category && (
                  <Badge variant="outline" className="text-[10px] h-5 gap-0.5 bg-muted/50">
                    <Briefcase className="w-3 h-3" /> {alert.category}
                  </Badge>
                )}
              </div>

              {/* Channels */}
              <div className="flex items-center gap-3 mt-2.5">
                {alert.is_email_enabled && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Mail className="w-3 h-3" /> Email
                  </span>
                )}
                {alert.is_push_enabled && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Smartphone className="w-3 h-3" /> Push
                  </span>
                )}
                {!alert.is_email_enabled && !alert.is_push_enabled && (
                  <span className="text-[11px] text-muted-foreground/50">No channels enabled</span>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Switch
                    checked={alert.is_active}
                    onCheckedChange={(checked) => onToggle(alert.id, checked)}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>{alert.is_active ? 'Pause alert' : 'Activate alert'}</TooltipContent>
            </Tooltip>

            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => onDelete(alert.id)}>
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setConfirmDelete(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete alert</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Create alert form ── */
const CreateAlertForm = ({
  open,
  onOpenChange,
  candidateId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  onCreated: () => void;
}) => {
  const [name, setName] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName(''); setSkills([]); setSkillInput(''); setLocation(''); setCategory('');
    setEmailEnabled(true); setPushEnabled(false);
  };

  const addSkill = () => {
    const val = skillInput.trim();
    if (val && !skills.includes(val)) {
      setSkills([...skills, val]);
      setSkillInput('');
    }
  };

  const createAlert = async () => {
    if (!name.trim()) { toast.error('Please enter an alert name'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('job_alerts').insert({
        candidate_id: candidateId,
        name: name.trim(),
        skills,
        location: location.trim() || null,
        category: category.trim() || null,
        is_email_enabled: emailEnabled,
        is_push_enabled: pushEnabled,
      });
      if (error) throw error;
      toast.success('Job alert created!');
      onOpenChange(false);
      resetForm();
      onCreated();
    } catch (error) {
      console.error('Error creating alert:', error);
      toast.error('Failed to create alert');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            Create Job Alert
          </DialogTitle>
          <DialogDescription>Get notified when jobs matching your criteria are posted</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Alert Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., React Developer Jobs"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Skills to match</Label>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="Add a skill and press Enter..."
                className="rounded-xl"
              />
              <Button type="button" onClick={addSkill} variant="outline" size="icon" className="shrink-0 rounded-xl">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {skills.map((skill, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 rounded-lg">
                    {skill}
                    <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => setSkills(skills.filter(s => s !== skill))} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Location
              </Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., New York" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" /> Category
              </Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., Technology" className="rounded-xl" />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <Label className="text-xs font-semibold">Notification Channels</Label>
            <div className="space-y-2">
              {[
                { icon: Mail, label: 'Email notifications', desc: 'Daily digest of matching jobs', checked: emailEnabled, onChange: setEmailEnabled },
                { icon: Smartphone, label: 'Push notifications', desc: 'Real-time browser alerts', checked: pushEnabled, onChange: setPushEnabled },
              ].map((ch) => (
                <div key={ch.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                      <ch.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{ch.label}</p>
                      <p className="text-[10px] text-muted-foreground">{ch.desc}</p>
                    </div>
                  </div>
                  <Switch checked={ch.checked} onCheckedChange={ch.onChange} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
          <Button onClick={createAlert} disabled={saving} className="rounded-xl gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Create Alert
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ── Main Component ── */
export const JobAlertsManager = ({ candidateId }: JobAlertsManagerProps) => {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => { fetchAlerts(); }, [candidateId]);

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from('job_alerts').select('*').eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });
    setAlerts(data || []);
    setLoading(false);
  };

  const toggleAlert = async (id: string, isActive: boolean) => {
    const { error } = await supabase.from('job_alerts').update({ is_active: isActive }).eq('id', id);
    if (!error) {
      setAlerts(alerts.map(a => a.id === id ? { ...a, is_active: isActive } : a));
      toast.success(isActive ? 'Alert activated' : 'Alert paused');
    }
  };

  const deleteAlert = async (id: string) => {
    const { error } = await supabase.from('job_alerts').delete().eq('id', id);
    if (!error) {
      setAlerts(alerts.filter(a => a.id !== id));
      toast.success('Alert deleted');
    }
  };

  const activeCount = alerts.filter(a => a.is_active).length;
  const pausedCount = alerts.filter(a => !a.is_active).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
        <div className="h-64 rounded-2xl bg-muted/20 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <AlertStats total={alerts.length} active={activeCount} paused={pausedCount} />

      {/* Header card */}
      <Card className="border border-border/40 overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Job Alerts</h3>
              <p className="text-xs text-muted-foreground">Get notified when matching jobs are posted</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)} className="rounded-xl gap-1.5">
            <Plus className="w-4 h-4" /> New Alert
          </Button>
        </div>

        <CardContent className="p-4">
          {alerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-14 px-6"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4"
              >
                <Sparkles className="w-8 h-8 text-primary/50" />
              </motion.div>
              <h3 className="font-bold text-foreground mb-1">No alerts yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                Create your first job alert and we'll notify you when jobs matching your criteria are posted
              </p>
              <Button onClick={() => setDialogOpen(true)} className="rounded-xl gap-1.5">
                <Plus className="w-4 h-4" /> Create Your First Alert
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {alerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onToggle={toggleAlert}
                    onDelete={deleteAlert}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      {alerts.length > 0 && alerts.length < 5 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card className="border border-border/30 bg-muted/10">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Pro tip: Create multiple alerts</p>
                <p className="text-xs text-muted-foreground">
                  Set up alerts for different roles, locations, or skill sets to cast a wider net.
                  You can have up to 10 active alerts.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Create dialog */}
      <CreateAlertForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        candidateId={candidateId}
        onCreated={fetchAlerts}
      />
    </div>
  );
};
