import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Kanban, Calendar, StickyNote, Briefcase, Loader2, Flag, Download, XCircle,
  TrendingUp, Clock, CheckCircle2, AlertTriangle, Search, Filter, ArrowRight,
  Building2, CalendarDays, ChevronRight, Sparkles, Eye, MoreHorizontal, ExternalLink,
  Star, Archive, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, differenceInDays, isToday, isPast, format } from 'date-fns';

interface TrackedApplication {
  id: string;
  job_id: string;
  status: string;
  kanban_stage: string;
  candidate_notes: string | null;
  follow_up_date: string | null;
  priority: string;
  created_at: string;
  updated_at?: string;
  job?: { title: string; employer?: { company_name: string } };
}

const STAGES = [
  { key: 'wishlist', label: 'Wishlist', color: 'bg-slate-100 text-slate-700 border-slate-200', accent: 'border-l-slate-400', icon: Star, iconColor: 'text-slate-500' },
  { key: 'applied', label: 'Applied', color: 'bg-primary/10 text-primary border-primary/20', accent: 'border-l-primary', icon: Briefcase, iconColor: 'text-primary' },
  { key: 'screening', label: 'Screening', color: 'bg-amber-50 text-amber-700 border-amber-200', accent: 'border-l-amber-500', icon: Search, iconColor: 'text-amber-600' },
  { key: 'interview', label: 'Interview', color: 'bg-blue-50 text-blue-700 border-blue-200', accent: 'border-l-blue-500', icon: CalendarDays, iconColor: 'text-blue-600' },
  { key: 'offer', label: 'Offer', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', accent: 'border-l-emerald-500', icon: CheckCircle2, iconColor: 'text-emerald-600' },
  { key: 'rejected', label: 'Rejected', color: 'bg-destructive/10 text-destructive border-destructive/20', accent: 'border-l-destructive', icon: XCircle, iconColor: 'text-destructive' },
  { key: 'withdrawn', label: 'Withdrawn', color: 'bg-muted text-muted-foreground border-border', accent: 'border-l-muted-foreground', icon: Archive, iconColor: 'text-muted-foreground' },
];

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'text-destructive', bg: 'bg-destructive/10', dot: 'bg-destructive' },
  medium: { label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  low: { label: 'Low', color: 'text-muted-foreground', bg: 'bg-muted', dot: 'bg-muted-foreground' },
};

// --- Sub-components ---

const StatCard = ({ icon: Icon, label, value, accent, trend }: {
  icon: typeof TrendingUp; label: string; value: number | string; accent: string; trend?: string;
}) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", accent)}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground truncate">{label}</p>
    </div>
    {trend && (
      <Badge variant="secondary" className="ml-auto text-[9px] px-1.5">{trend}</Badge>
    )}
  </div>
);

const FollowUpBadge = ({ date, status }: { date: string; status: string }) => {
  const d = new Date(date);
  const overdue = isPast(d) && !isToday(d) && status !== 'offer' && status !== 'rejected';
  const today = isToday(d);
  const daysUntil = differenceInDays(d, new Date());

  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md">
        <AlertTriangle className="w-3 h-3" />
        Overdue
      </span>
    );
  }
  if (today) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md animate-pulse">
        <Clock className="w-3 h-3" />
        Today
      </span>
    );
  }
  if (daysUntil <= 3 && daysUntil > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
        <Calendar className="w-3 h-3" />
        {daysUntil}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <Calendar className="w-3 h-3" />
      {format(d, 'MMM d')}
    </span>
  );
};

const ApplicationCard = ({ app, isSelected, onSelect, onClick, stage }: {
  app: TrackedApplication;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  stage: typeof STAGES[0];
}) => {
  const priority = PRIORITY_CONFIG[app.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
  const daysSinceApplied = differenceInDays(new Date(), new Date(app.created_at));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group bg-card border rounded-xl p-3 cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:border-primary/30",
        "border-l-4",
        stage.accent,
        isSelected && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      <div className="flex items-start gap-2.5">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="mt-1 shrink-0"
          onClick={e => e.stopPropagation()}
        />
        <div className="flex-1 min-w-0" onClick={onClick}>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
              {app.job?.title || 'Unknown Job'}
            </h4>
            <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", priority.dot)} title={priority.label} />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Building2 className="w-3 h-3" />
            <span className="truncate">{app.job?.employer?.company_name || 'Unknown'}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {app.follow_up_date && (
              <FollowUpBadge date={app.follow_up_date} status={app.kanban_stage} />
            )}
            {app.candidate_notes && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600">
                <StickyNote className="w-3 h-3" />
              </span>
            )}
            <span className="text-[10px] text-muted-foreground/60 ml-auto">
              {daysSinceApplied === 0 ? 'Today' : `${daysSinceApplied}d ago`}
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
      </div>
    </motion.div>
  );
};

const StageColumn = ({ stage, apps, selectedIds, onToggleSelect, onOpenDetail }: {
  stage: typeof STAGES[0];
  apps: TrackedApplication[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpenDetail: (app: TrackedApplication) => void;
}) => {
  const Icon = stage.icon;
  return (
    <div className="min-w-[260px] max-w-[280px] flex-shrink-0">
      <div className={cn("flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 border", stage.color)}>
        <Icon className={cn("w-4 h-4", stage.iconColor)} />
        <span className="text-sm font-semibold">{stage.label}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5 rounded-md">
          {apps.length}
        </Badge>
      </div>

      <div className="space-y-2 min-h-[100px]">
        <AnimatePresence mode="popLayout">
          {apps.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <Icon className="w-8 h-8 text-muted-foreground/20 mb-2" />
              <p className="text-xs text-muted-foreground/50">No applications</p>
            </motion.div>
          ) : (
            apps.map(app => (
              <ApplicationCard
                key={app.id}
                app={app}
                isSelected={selectedIds.has(app.id)}
                onSelect={() => onToggleSelect(app.id)}
                onClick={() => onOpenDetail(app)}
                stage={stage}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Main Component ---

export const ApplicationTracker = ({ candidateId }: { candidateId: string }) => {
  const [applications, setApplications] = useState<TrackedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<TrackedApplication | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editFollowUp, setEditFollowUp] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  useEffect(() => {
    fetchApplications();
  }, [candidateId]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('id, job_id, status, kanban_stage, candidate_notes, follow_up_date, priority, created_at, updated_at, jobs(title, employers(company_name))')
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
      toast.error('Failed to load applications.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = !searchQuery ||
        app.job?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.job?.employer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = filterPriority === 'all' || app.priority === filterPriority;
      return matchesSearch && matchesPriority;
    });
  }, [applications, searchQuery, filterPriority]);

  // Stats
  const stats = useMemo(() => {
    const active = applications.filter(a => !['rejected', 'withdrawn'].includes(a.kanban_stage)).length;
    const interviews = applications.filter(a => a.kanban_stage === 'interview').length;
    const offers = applications.filter(a => a.kanban_stage === 'offer').length;
    const needsFollowUp = applications.filter(a => {
      if (!a.follow_up_date) return false;
      return isPast(new Date(a.follow_up_date)) && !['offer', 'rejected', 'withdrawn'].includes(a.kanban_stage);
    }).length;
    const successRate = applications.length > 0
      ? Math.round((offers / applications.length) * 100)
      : 0;

    return { total: applications.length, active, interviews, offers, needsFollowUp, successRate };
  }, [applications]);

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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredApps.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredApps.map(a => a.id)));
    }
  };

  const bulkWithdraw = async () => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('applications')
        .update({ kanban_stage: 'withdrawn', status: 'withdrawn' })
        .in('id', ids);

      if (error) throw error;
      setApplications(prev => prev.map(a =>
        selectedIds.has(a.id) ? { ...a, kanban_stage: 'withdrawn', status: 'withdrawn' } : a
      ));
      setSelectedIds(new Set());
      toast.success(`${ids.length} application(s) withdrawn`);
    } catch (err) {
      toast.error('Failed to withdraw applications');
    } finally {
      setBulkProcessing(false);
    }
  };

  const exportToCSV = () => {
    const rows = applications.map(a => ({
      'Job Title': a.job?.title || 'Unknown',
      'Company': a.job?.employer?.company_name || 'Unknown',
      'Stage': a.kanban_stage,
      'Status': a.status,
      'Priority': a.priority || 'medium',
      'Follow-up Date': a.follow_up_date || '',
      'Notes': (a.candidate_notes || '').replace(/"/g, '""'),
      'Applied Date': new Date(a.created_at).toLocaleDateString(),
    }));

    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `applications_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV exported!');
  };

  const getStageApps = (stage: string) => filteredApps.filter(a => a.kanban_stage === stage);

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
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Kanban className="w-5 h-5 text-primary" />
            Application Tracker
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track your job applications across all stages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchApplications}
            className="h-8 rounded-xl gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="h-8 rounded-xl gap-1.5 text-xs"
            disabled={applications.length === 0}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Briefcase} label="Total Applications" value={stats.total} accent="bg-primary/10 text-primary" />
        <StatCard icon={TrendingUp} label="Active" value={stats.active} accent="bg-emerald-500/10 text-emerald-600" />
        <StatCard icon={CalendarDays} label="Interviews" value={stats.interviews} accent="bg-blue-500/10 text-blue-600" />
        <StatCard icon={CheckCircle2} label="Offers" value={stats.offers} accent="bg-violet-500/10 text-violet-600" />
        <div className="flex flex-col justify-center p-3 rounded-xl bg-card border border-border/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Success Rate</span>
            <span className="text-xs font-bold text-foreground">{stats.successRate}%</span>
          </div>
          <Progress value={stats.successRate} className="h-2" />
          {stats.needsFollowUp > 0 && (
            <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {stats.needsFollowUp} need follow-up
            </p>
          )}
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs or companies..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-xl text-sm"
            />
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-28 h-9 rounded-xl text-xs">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="high">🔴 High</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="low">🟢 Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <Badge variant="secondary" className="text-xs">
                {selectedIds.size} selected
              </Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={bulkWithdraw}
                disabled={bulkProcessing}
                className="h-8 rounded-xl gap-1.5 text-xs"
              >
                {bulkProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Withdraw
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            className="h-8 rounded-xl text-xs"
          >
            {selectedIds.size === filteredApps.length && filteredApps.length > 0 ? 'Deselect' : 'Select All'}
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {filteredApps.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-base font-medium text-foreground mb-1">No applications found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || filterPriority !== 'all'
                ? 'Try adjusting your filters'
                : 'Start applying to jobs to track them here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto pb-4 -mx-1 px-1">
          <div className="flex gap-4 min-w-max">
            {STAGES.map(stage => (
              <StageColumn
                key={stage.key}
                stage={stage}
                apps={getStageApps(stage.key)}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onOpenDetail={openDetail}
              />
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4 text-primary" />
              </div>
              <span className="truncate">{selectedApp?.job?.title}</span>
            </DialogTitle>
            <DialogDescription className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {selectedApp?.job?.employer?.company_name}
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-5 pt-2">
              {/* Stage Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage</label>
                <div className="flex flex-wrap gap-1.5">
                  {STAGES.map(s => {
                    const Icon = s.icon;
                    const isActive = selectedApp.kanban_stage === s.key;
                    return (
                      <Button
                        key={s.key}
                        size="sm"
                        variant={isActive ? 'default' : 'outline'}
                        className={cn(
                          "text-xs rounded-lg h-8 gap-1.5 transition-all",
                          !isActive && "hover:border-primary/40"
                        )}
                        onClick={() => {
                          moveToStage(selectedApp.id, s.key);
                          setSelectedApp({ ...selectedApp, kanban_stage: s.key });
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {s.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map(p => {
                    const config = PRIORITY_CONFIG[p];
                    return (
                      <Button
                        key={p}
                        size="sm"
                        variant={editPriority === p ? 'default' : 'outline'}
                        className={cn(
                          "flex-1 text-xs rounded-lg h-9 gap-1.5",
                          editPriority !== p && config.color
                        )}
                        onClick={() => setEditPriority(p)}
                      >
                        <span className={cn("w-2 h-2 rounded-full", config.dot)} />
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Follow-up Date */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Follow-up Date</label>
                <Input
                  type="date"
                  value={editFollowUp}
                  onChange={e => setEditFollowUp(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal Notes</label>
                  <span className="text-[10px] text-muted-foreground">{editNotes.length}/500</span>
                </div>
                <Textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Interview prep, contact info, key points to remember..."
                  className="rounded-xl min-h-[100px] resize-none"
                  maxLength={500}
                />
              </div>

              {/* Save */}
              <Button onClick={saveDetails} disabled={saving} className="w-full rounded-xl h-10 gap-2">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
