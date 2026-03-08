import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Bell, Clock, Send, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, differenceInDays, addDays } from 'date-fns';

interface Application {
  id: string;
  job_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  follow_up_date: string | null;
  job?: { title: string; employer?: { company_name: string } };
}

export const FollowUpReminders = ({ candidateId }: { candidateId: string }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderDays, setReminderDays] = useState('7');
  const [autoRemind, setAutoRemind] = useState(true);

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

    if (error) {
      toast.error('Failed to set reminder');
      return;
    }
    toast.success(`Reminder set for ${days} days from now`);
    fetchApplications();
  };

  const clearFollowUp = async (appId: string) => {
    const { error } = await supabase
      .from('applications')
      .update({ follow_up_date: null })
      .eq('id', appId);

    if (error) {
      toast.error('Failed to clear reminder');
      return;
    }
    toast.success('Reminder cleared');
    fetchApplications();
  };

  const getUrgency = (app: Application) => {
    const daysSinceUpdate = differenceInDays(new Date(), new Date(app.updated_at || app.created_at));
    if (daysSinceUpdate >= 14) return { level: 'overdue', label: 'Overdue', color: 'text-destructive' };
    if (daysSinceUpdate >= 7) return { level: 'due', label: 'Follow up soon', color: 'text-warning-foreground' };
    return { level: 'ok', label: 'On track', color: 'text-success' };
  };

  const overdueApps = applications.filter(a => {
    if (a.follow_up_date) return new Date(a.follow_up_date) <= new Date();
    return differenceInDays(new Date(), new Date(a.updated_at || a.created_at)) >= parseInt(reminderDays);
  });

  const upcomingApps = applications.filter(a => {
    if (a.follow_up_date) return new Date(a.follow_up_date) > new Date();
    return differenceInDays(new Date(), new Date(a.updated_at || a.created_at)) < parseInt(reminderDays);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Follow-Up Reminders
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Never miss a follow-up. Auto-remind after {reminderDays} days of no response.
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
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="5">5 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="10">10 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Auto</span>
            <Switch checked={autoRemind} onCheckedChange={setAutoRemind} />
          </div>
        </div>
      </div>

      {/* Overdue Section */}
      {overdueApps.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Needs Follow-Up ({overdueApps.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <AnimatePresence>
              {overdueApps.map((app, i) => {
                const urgency = getUrgency(app);
                const daysSince = differenceInDays(new Date(), new Date(app.updated_at || app.created_at));
                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {(app.job as any)?.title || 'Job Application'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(app.job as any)?.employer?.company_name || 'Company'} • Applied {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className={cn("w-3 h-3", urgency.color)} />
                        <span className={cn("text-[10px] font-semibold", urgency.color)}>
                          {daysSince} days with no response
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs rounded-lg"
                        onClick={() => setFollowUp(app.id, parseInt(reminderDays))}
                      >
                        Snooze
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs rounded-lg gap-1"
                        onClick={() => {
                          toast.success('Follow-up marked as done!');
                          clearFollowUp(app.id);
                        }}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Done
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}

      {/* Upcoming / On Track */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Active Applications ({upcomingApps.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcomingApps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No pending applications to track</p>
          ) : (
            <AnimatePresence>
              {upcomingApps.map((app, i) => {
                const urgency = getUrgency(app);
                const daysSince = differenceInDays(new Date(), new Date(app.updated_at || app.created_at));
                const threshold = parseInt(reminderDays);
                const daysLeft = threshold - daysSince;
                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {(app.job as any)?.title || 'Job Application'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(app.job as any)?.employer?.company_name || 'Company'} • {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={cn("text-[10px]", urgency.color)}>
                        {daysLeft > 0 ? `${daysLeft}d left` : urgency.label}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setFollowUp(app.id, parseInt(reminderDays))}
                      >
                        <Bell className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
