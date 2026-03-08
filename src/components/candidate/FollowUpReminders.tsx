import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell, Clock, AlertTriangle, CheckCircle2, Loader2,
  Timer, TrendingUp, MailCheck, Zap, ChevronRight, Sparkles, RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, differenceInDays, addDays, format, isToday, isTomorrow } from 'date-fns';

interface Application {
  id: string;
  job_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  follow_up_date: string | null;
  job?: { title: string; employer?: { company_name: string } };
}

type UrgencyLevel = 'overdue' | 'due-today' | 'due-soon' | 'on-track';

interface UrgencyInfo {
  level: UrgencyLevel;
  label: string;
  daysSince: number;
}

const getUrgencyInfo = (app: Application, threshold: number): UrgencyInfo => {
  const daysSince = differenceInDays(new Date(), new Date(app.updated_at || app.created_at));

  if (app.follow_up_date) {
    const followUpDate = new Date(app.follow_up_date);
    if (isToday(followUpDate)) return { level: 'due-today', label: 'Due today', daysSince };
    if (followUpDate < new Date()) return { level: 'overdue', label: 'Overdue', daysSince };
    if (isTomorrow(followUpDate)) return { level: 'due-soon', label: 'Due tomorrow', daysSince };
    return { level: 'on-track', label: 'Scheduled', daysSince };
  }

  if (daysSince >= threshold + 7) return { level: 'overdue', label: 'Overdue', daysSince };
  if (daysSince >= threshold) return { level: 'due-today', label: 'Follow up now', daysSince };
  if (daysSince >= threshold - 2) return { level: 'due-soon', label: 'Due soon', daysSince };
  return { level: 'on-track', label: 'On track', daysSince };
};

const urgencyStyles: Record<UrgencyLevel, { badge: string; accent: string; icon: typeof AlertTriangle }> = {
  overdue: { badge: 'bg-destructive/10 text-destructive border-destructive/20', accent: 'border-l-destructive', icon: AlertTriangle },
  'due-today': { badge: 'bg-orange-500/10 text-orange-600 border-orange-500/20', accent: 'border-l-orange-500', icon: Timer },
  'due-soon': { badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20', accent: 'border-l-amber-500', icon: Clock },
  'on-track': { badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', accent: 'border-l-emerald-500', icon: CheckCircle2 },
};

// --- Sub-components ---

const StatCard = ({ icon: Icon, label, value, accent, pulse }: {
  icon: typeof Bell; label: string; value: number; accent: string; pulse?: boolean;
}) => (
  <Card className="flex-1 min-w-[120px]">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", accent)}>
        <Icon className="w-5 h-5" />
        {pulse && value > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      </div>
    </CardContent>
  </Card>
);

const FollowUpCard = ({ app, urgency, threshold, onSnooze, onDone }: {
  app: Application;
  urgency: UrgencyInfo;
  threshold: number;
  onSnooze: (id: string, days: number) => void;
  onDone: (id: string) => void;
}) => {
  const style = urgencyStyles[urgency.level];
  const IconComp = style.icon;
  const jobTitle = (app.job as any)?.title || 'Job Application';
  const company = (app.job as any)?.employer?.company_name || 'Company';
  const daysLeft = app.follow_up_date
    ? differenceInDays(new Date(app.follow_up_date), new Date())
    : threshold - urgency.daysSince;
  const progressPct = Math.min(100, Math.max(0, ((urgency.daysSince) / (threshold + 7)) * 100));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "group relative rounded-xl border border-border/50 bg-card hover:shadow-md transition-all duration-200",
        "border-l-4",
        style.accent
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-foreground truncate max-w-[240px]">{jobTitle}</h4>
              <Badge variant="outline" className={cn("text-[10px] h-5 gap-1 shrink-0", style.badge)}>
                <IconComp className="w-3 h-3" />
                {urgency.label}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              {company} • Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
            </p>

            {/* Timeline progress */}
            <div className="flex items-center gap-2 pt-1">
              <Progress value={progressPct} className="h-1.5 flex-1" />
              <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                {urgency.level === 'overdue'
                  ? `${Math.abs(daysLeft)}d overdue`
                  : urgency.level === 'on-track'
                    ? `${daysLeft}d left`
                    : urgency.label}
              </span>
            </div>

            {app.follow_up_date && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Bell className="w-3 h-3" />
                Reminder: {format(new Date(app.follow_up_date), 'MMM d, yyyy')}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            {(urgency.level === 'overdue' || urgency.level === 'due-today') && (
              <Button
                size="sm"
                className="h-7 text-xs rounded-lg gap-1"
                onClick={() => onDone(app.id)}
              >
                <CheckCircle2 className="w-3 h-3" />
                Done
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs rounded-lg gap-1"
              onClick={() => onSnooze(app.id, threshold)}
            >
              <RotateCcw className="w-3 h-3" />
              Snooze
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const EmptyState = ({ type }: { type: 'overdue' | 'all' }) => (
  <div className="text-center py-10 space-y-3">
    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
      {type === 'overdue' ? <Sparkles className="w-7 h-7 text-primary" /> : <MailCheck className="w-7 h-7 text-primary" />}
    </div>
    <div>
      <p className="text-sm font-medium text-foreground">
        {type === 'overdue' ? 'All caught up!' : 'No applications to track'}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {type === 'overdue'
          ? "You've followed up on all your pending applications."
          : "Apply to jobs and we'll help you track follow-ups automatically."}
      </p>
    </div>
  </div>
);

// --- Main component ---

export const FollowUpReminders = ({ candidateId }: { candidateId: string }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderDays, setReminderDays] = useState('7');
  const [autoRemind, setAutoRemind] = useState(true);

  const threshold = parseInt(reminderDays);

  useEffect(() => {
    fetchApplications();
  }, [candidateId]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('id, job_id, status, created_at, updated_at, follow_up_date, job:jobs(title, employer:employers(company_name))')
        .eq('candidate_id', candidateId)
        .in('status', ['pending', 'reviewed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications((data as any) || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const setFollowUp = async (appId: string, days: number) => {
    const followUpDate = addDays(new Date(), days).toISOString().split('T')[0];
    const { error } = await supabase
      .from('applications')
      .update({ follow_up_date: followUpDate })
      .eq('id', appId);

    if (error) { toast.error('Failed to set reminder'); return; }
    toast.success(`Snoozed for ${days} days`);
    fetchApplications();
  };

  const clearFollowUp = async (appId: string) => {
    const { error } = await supabase
      .from('applications')
      .update({ follow_up_date: null })
      .eq('id', appId);

    if (error) { toast.error('Failed to clear reminder'); return; }
    toast.success('Marked as followed up!');
    fetchApplications();
  };

  const categorized = useMemo(() => {
    const overdue: Application[] = [];
    const dueSoon: Application[] = [];
    const onTrack: Application[] = [];

    applications.forEach(app => {
      const info = getUrgencyInfo(app, threshold);
      if (info.level === 'overdue' || info.level === 'due-today') overdue.push(app);
      else if (info.level === 'due-soon') dueSoon.push(app);
      else onTrack.push(app);
    });

    return { overdue, dueSoon, onTrack };
  }, [applications, threshold]);

  const followedUpPct = applications.length > 0
    ? Math.round(((applications.length - categorized.overdue.length) / applications.length) * 100)
    : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Follow-Up Reminders
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Stay on top of your applications — never miss a follow-up window.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Remind after</span>
            <Select value={reminderDays} onValueChange={setReminderDays}>
              <SelectTrigger className="w-20 h-8 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 5, 7, 10, 14].map(d => (
                  <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Auto</span>
            <Switch checked={autoRemind} onCheckedChange={setAutoRemind} />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Total Tracked" value={applications.length} accent="bg-primary/10 text-primary" />
        <StatCard icon={AlertTriangle} label="Needs Action" value={categorized.overdue.length} accent="bg-destructive/10 text-destructive" pulse />
        <StatCard icon={Clock} label="Due Soon" value={categorized.dueSoon.length} accent="bg-amber-500/10 text-amber-600" />
        <StatCard icon={CheckCircle2} label="On Track" value={categorized.onTrack.length} accent="bg-emerald-500/10 text-emerald-600" />
      </div>

      {/* Follow-up Health */}
      {applications.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Follow-up Health</span>
              <span className="text-xs font-bold text-foreground">{followedUpPct}%</span>
            </div>
            <Progress value={followedUpPct} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {categorized.overdue.length === 0
                ? '✨ Great job! All applications are being tracked on time.'
                : `${categorized.overdue.length} application${categorized.overdue.length > 1 ? 's' : ''} need${categorized.overdue.length === 1 ? 's' : ''} your attention.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabbed List */}
      <Tabs defaultValue={categorized.overdue.length > 0 ? 'action' : 'all'} className="space-y-4">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="action" className="gap-1.5 text-xs">
            <Zap className="w-3.5 h-3.5" />
            Needs Action
            {categorized.overdue.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 px-1.5 text-[10px]">{categorized.overdue.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-1.5 text-xs">
            <Clock className="w-3.5 h-3.5" />
            Upcoming
            {categorized.dueSoon.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">{categorized.dueSoon.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5" />
            All ({applications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="action" className="space-y-2">
          {categorized.overdue.length === 0 ? (
            <EmptyState type="overdue" />
          ) : (
            <AnimatePresence mode="popLayout">
              {categorized.overdue.map(app => (
                <FollowUpCard
                  key={app.id}
                  app={app}
                  urgency={getUrgencyInfo(app, threshold)}
                  threshold={threshold}
                  onSnooze={setFollowUp}
                  onDone={clearFollowUp}
                />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-2">
          {categorized.dueSoon.length === 0 ? (
            <EmptyState type="all" />
          ) : (
            <AnimatePresence mode="popLayout">
              {categorized.dueSoon.map(app => (
                <FollowUpCard
                  key={app.id}
                  app={app}
                  urgency={getUrgencyInfo(app, threshold)}
                  threshold={threshold}
                  onSnooze={setFollowUp}
                  onDone={clearFollowUp}
                />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-2">
          {applications.length === 0 ? (
            <EmptyState type="all" />
          ) : (
            <AnimatePresence mode="popLayout">
              {applications.map(app => (
                <FollowUpCard
                  key={app.id}
                  app={app}
                  urgency={getUrgencyInfo(app, threshold)}
                  threshold={threshold}
                  onSnooze={setFollowUp}
                  onDone={clearFollowUp}
                />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
