import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Kanban, GripVertical, Calendar, StickyNote, ArrowRight, Briefcase, Loader2, Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface TrackedApplication {
  id: string;
  job_id: string;
  status: string;
  kanban_stage: string;
  candidate_notes: string | null;
  follow_up_date: string | null;
  priority: string;
  created_at: string;
  job?: { title: string; employer?: { company_name: string } };
}

const STAGES = [
  { key: 'wishlist', label: 'Wishlist', color: 'bg-muted text-muted-foreground', icon: '📋' },
  { key: 'applied', label: 'Applied', color: 'bg-primary/10 text-primary', icon: '📤' },
  { key: 'screening', label: 'Screening', color: 'bg-amber-100 text-amber-800', icon: '🔍' },
  { key: 'interview', label: 'Interview', color: 'bg-blue-100 text-blue-800', icon: '🎤' },
  { key: 'offer', label: 'Offer', color: 'bg-green-100 text-green-800', icon: '🎉' },
  { key: 'rejected', label: 'Rejected', color: 'bg-destructive/10 text-destructive', icon: '❌' },
  { key: 'withdrawn', label: 'Withdrawn', color: 'bg-secondary text-muted-foreground', icon: '🔙' },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-destructive',
  medium: 'text-amber-500',
  low: 'text-muted-foreground',
};

export const ApplicationTracker = ({ candidateId }: { candidateId: string }) => {
  const [applications, setApplications] = useState<TrackedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<TrackedApplication | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editFollowUp, setEditFollowUp] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [candidateId]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('id, job_id, status, kanban_stage, candidate_notes, follow_up_date, priority, created_at, jobs(title, employers(company_name))')
        .eq('candidate_id', candidateId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((app: any) => ({
        ...app,
        job: app.jobs ? { title: app.jobs.title, employer: app.jobs.employers ? { company_name: app.jobs.employers.company_name } : undefined } : undefined,
      }));
      setApplications(mapped);
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const moveToStage = async (appId: string, newStage: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ kanban_stage: newStage })
        .eq('id', appId);

      if (error) throw error;
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, kanban_stage: newStage } : a));
      toast.success(`Moved to ${STAGES.find(s => s.key === newStage)?.label}`);
    } catch (err) {
      toast.error('Failed to update stage');
    }
  };

  const saveDetails = async () => {
    if (!selectedApp) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          candidate_notes: editNotes || null,
          follow_up_date: editFollowUp || null,
          priority: editPriority,
        })
        .eq('id', selectedApp.id);

      if (error) throw error;
      setApplications(prev => prev.map(a => a.id === selectedApp.id ? {
        ...a, candidate_notes: editNotes || null, follow_up_date: editFollowUp || null, priority: editPriority,
      } : a));
      setSelectedApp(null);
      toast.success('Details saved');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (app: TrackedApplication) => {
    setSelectedApp(app);
    setEditNotes(app.candidate_notes || '');
    setEditFollowUp(app.follow_up_date || '');
    setEditPriority(app.priority || 'medium');
  };

  if (loading) {
    return (
      <Card className="shadow-google">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const getStageApps = (stage: string) => applications.filter(a => a.kanban_stage === stage);

  return (
    <>
      <Card className="shadow-google">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Kanban className="w-5 h-5 text-primary" />
            Application Tracker
          </CardTitle>
          <CardDescription>
            Track all your job applications across stages • {applications.length} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
            {STAGES.map(stage => (
              <div key={stage.key} className="min-w-[220px] max-w-[260px] flex-shrink-0">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-2 ${stage.color}`}>
                  <span>{stage.icon}</span>
                  <span className="text-sm font-semibold">{stage.label}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {getStageApps(stage.key).length}
                  </Badge>
                </div>

                <div className="space-y-2 min-h-[80px]">
                  <AnimatePresence>
                    {getStageApps(stage.key).map(app => (
                      <motion.div
                        key={app.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-card border rounded-xl p-3 cursor-pointer hover:shadow-md transition-shadow group"
                        onClick={() => openDetail(app)}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="text-sm font-medium text-foreground line-clamp-1">
                            {app.job?.title || 'Unknown Job'}
                          </h4>
                          <Flag className={`w-3.5 h-3.5 shrink-0 ${PRIORITY_COLORS[app.priority] || ''}`} />
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {app.job?.employer?.company_name || 'Unknown Company'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {app.follow_up_date && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Calendar className="w-3 h-3" />
                              {new Date(app.follow_up_date).toLocaleDateString()}
                            </span>
                          )}
                          {app.candidate_notes && (
                            <StickyNote className="w-3 h-3 text-amber-400" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              {selectedApp?.job?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{selectedApp.job?.employer?.company_name}</p>

              <div className="space-y-2">
                <label className="text-sm font-medium">Move to Stage</label>
                <div className="flex flex-wrap gap-1.5">
                  {STAGES.map(s => (
                    <Button
                      key={s.key}
                      size="sm"
                      variant={selectedApp.kanban_stage === s.key ? 'default' : 'outline'}
                      className="text-xs rounded-lg h-7"
                      onClick={() => {
                        moveToStage(selectedApp.id, s.key);
                        setSelectedApp({ ...selectedApp, kanban_stage: s.key });
                      }}
                    >
                      {s.icon} {s.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Low</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="high">🔴 High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Follow-up Date</label>
                <Input
                  type="date"
                  value={editFollowUp}
                  onChange={e => setEditFollowUp(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Personal Notes</label>
                <Textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Add interview prep, contact info, follow-up reminders..."
                  className="rounded-xl"
                  maxLength={500}
                />
              </div>

              <Button onClick={saveDetails} disabled={saving} className="w-full rounded-xl">
                {saving ? 'Saving...' : 'Save Details'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
