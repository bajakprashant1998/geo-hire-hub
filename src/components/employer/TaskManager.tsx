import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus, Loader2, Calendar, CheckCircle2, Clock, AlertCircle,
  User, FileText, Trash2, Paperclip, Download, ListTodo,
  ArrowUpCircle, CircleDot, AlertTriangle, MessageSquare,
  ChevronDown, ChevronUp, LayoutGrid, LayoutList,
  Search, Filter, Sparkles, TrendingUp, Target, Zap,
  Eye, MoreHorizontal, Copy, RefreshCw, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isPast, format, differenceInDays, isToday, isTomorrow, isYesterday } from 'date-fns';

interface TaskManagerProps {
  employerId: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  candidate_notes: string | null;
  created_at: string;
  candidate_id: string;
  file_url?: string | null;
  file_name?: string | null;
  candidate_name?: string;
  candidate_title?: string;
}

interface Candidate {
  id: string;
  job_title: string;
  profiles: { full_name: string };
}

type ViewMode = 'list' | 'board';

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', dot: 'bg-warning' },
  in_progress: { label: 'In Progress', icon: CircleDot, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', dot: 'bg-primary' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', dot: 'bg-success' },
} as const;

const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', icon: ArrowUpCircle },
  medium: { label: 'Medium', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', icon: Target },
  low: { label: 'Low', color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', icon: null },
} as const;

export const TaskManager = ({ employerId }: TaskManagerProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [candidateFilter, setCandidateFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    candidate_ids: [] as string[],
    priority: 'medium',
    due_date: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [candidateSearch, setCandidateSearch] = useState('');

  useEffect(() => {
    fetchTasks();
    fetchCandidates();
  }, [employerId]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('employer_id', employerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const candidateIds = [...new Set((data || []).map(t => t.candidate_id))];
      if (candidateIds.length > 0) {
        const { data: candidatesData } = await supabase
          .from('candidates')
          .select('id, job_title, profiles!inner(full_name)')
          .in('id', candidateIds);

        const nameMap: Record<string, { name: string; title: string }> = {};
        (candidatesData || []).forEach((c: any) => {
          nameMap[c.id] = { name: c.profiles.full_name, title: c.job_title };
        });

        setTasks((data || []).map(t => ({
          ...t,
          candidate_name: nameMap[t.candidate_id]?.name || 'Unknown',
          candidate_title: nameMap[t.candidate_id]?.title || '',
        })));
      } else {
        setTasks(data || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('employer_id', employerId);

      if (!jobs?.length) return;

      const { data: applications } = await supabase
        .from('applications')
        .select('candidate_id')
        .in('job_id', jobs.map(j => j.id));

      if (!applications?.length) return;

      const candidateIds = [...new Set(applications.map(a => a.candidate_id))];
      const { data: candidatesData } = await supabase
        .from('candidates')
        .select('id, job_title, profiles!inner(full_name)')
        .in('id', candidateIds);

      setCandidates((candidatesData as any) || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  };

  const handleCreate = async () => {
    if (!form.title || form.candidate_ids.length === 0) {
      toast.error('Please fill in title and select at least one candidate');
      return;
    }
    setCreating(true);
    try {
      let file_url = null;
      let file_name = null;

      if (selectedFile) {
        if (selectedFile.size > 10 * 1024 * 1024) {
          throw new Error("File size must be less than 10MB");
        }
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `tasks/${employerId}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('resumes').upload(filePath, selectedFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('resumes').getPublicUrl(filePath);
        file_url = publicUrlData.publicUrl;
        file_name = selectedFile.name;
      }

      const inserts = form.candidate_ids.map(cid => ({
        employer_id: employerId,
        candidate_id: cid,
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        due_date: form.due_date || null,
        file_url,
        file_name,
      }));
      const { error } = await supabase.from('tasks').insert(inserts);
      if (error) throw error;
      toast.success(`Task assigned to ${form.candidate_ids.length} candidate(s)`);
      setForm({ title: '', description: '', candidate_ids: [], priority: 'medium', due_date: '' });
      setSelectedFile(null);
      setDialogOpen(false);
      fetchTasks();
    } catch (error: any) {
      toast.error('Failed to create task: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks(tasks.filter(t => t.id !== taskId));
      setSelectedTasks(prev => { const n = new Set(prev); n.delete(taskId); return n; });
      toast.success('Task deleted');
    } catch (error: any) {
      toast.error('Failed to delete task');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;
    try {
      const ids = Array.from(selectedTasks);
      const { error } = await supabase.from('tasks').delete().in('id', ids);
      if (error) throw error;
      setTasks(prev => prev.filter(t => !selectedTasks.has(t.id)));
      toast.success(`${ids.length} task(s) deleted`);
      setSelectedTasks(new Set());
    } catch {
      toast.error('Failed to delete tasks');
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedTasks.size === 0) return;
    try {
      const ids = Array.from(selectedTasks);
      const updates: Record<string, any> = { status: newStatus };
      if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
      else updates.completed_at = null;
      const { error } = await supabase.from('tasks').update(updates).in('id', ids);
      if (error) throw error;
      setTasks(prev => prev.map(t => selectedTasks.has(t.id) ? { ...t, ...updates } : t));
      toast.success(`${ids.length} task(s) updated`);
      setSelectedTasks(new Set());
    } catch {
      toast.error('Failed to update tasks');
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    setUpdatingStatus(taskId);
    try {
      const updates: Record<string, any> = { status: newStatus };
      if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
      else updates.completed_at = null;
      const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
      toast.success(`Task marked as ${newStatus.replace('_', ' ')}`);
    } catch (error: any) {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const filteredTasks = useMemo(() => tasks.filter(t => {
    if (filter === 'overdue') {
      if (!t.due_date || !isPast(new Date(t.due_date)) || t.status === 'completed') return false;
    } else if (filter !== 'all' && t.status !== filter) return false;
    if (candidateFilter !== 'all' && t.candidate_id !== candidateFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q) && !(t.candidate_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [tasks, filter, candidateFilter, priorityFilter, searchQuery]);

  const totalTasks = tasks.length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const overdueCount = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed').length;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const isOverdue = (task: Task) => task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed';

  const activeFiltersCount = [candidateFilter !== 'all', priorityFilter !== 'all'].filter(Boolean).length;

  const filteredCandidates = useMemo(() => {
    if (!candidateSearch) return candidates;
    const q = candidateSearch.toLowerCase();
    return candidates.filter(c => (c as any).profiles.full_name.toLowerCase().includes(q) || c.job_title.toLowerCase().includes(q));
  }, [candidates, candidateSearch]);

  const smartDueLabel = (dueDate: string) => {
    const d = new Date(dueDate);
    if (isToday(d)) return 'Due today';
    if (isTomorrow(d)) return 'Due tomorrow';
    if (isYesterday(d)) return 'Due yesterday';
    const diff = differenceInDays(d, new Date());
    if (diff < 0) return `Overdue ${Math.abs(diff)}d`;
    if (diff <= 7) return `Due in ${diff}d`;
    return format(d, 'MMM d');
  };

  const toggleTaskSelection = (id: string) => {
    setSelectedTasks(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAllVisible = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-xl" />)}
        </div>
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-xl" />)}
      </div>
    );
  }

  // Board view column component
  const BoardColumn = ({ status, tasks: columnTasks }: { status: string; tasks: Task[] }) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    return (
      <div className="flex-1 min-w-[260px]">
        <div className={cn('flex items-center gap-2 mb-3 pb-2 border-b-2', config.border)}>
          <div className={cn('w-2 h-2 rounded-full', config.dot)} />
          <span className={cn('text-sm font-semibold', config.color)}>{config.label}</span>
          <Badge variant="secondary" className="text-[10px] ml-auto">{columnTasks.length}</Badge>
        </div>
        <div className="space-y-2">
          {columnTasks.map(task => (
            <TaskMiniCard key={task.id} task={task} />
          ))}
          {columnTasks.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border/50 rounded-xl">
              No tasks
            </div>
          )}
        </div>
      </div>
    );
  };

  // Compact card for board view
  const TaskMiniCard = ({ task }: { task: Task }) => {
    const overdue = isOverdue(task);
    const priorityCfg = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
    return (
      <motion.div layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className={cn(
          'rounded-xl border transition-all cursor-pointer hover:shadow-md group',
          overdue ? 'border-destructive/30 bg-destructive/[0.02]' : 'border-border/50',
        )}
          onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
        >
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">{task.title}</h4>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextStatus = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : 'pending';
                      handleStatusUpdate(task.id, nextStatus);
                    }}
                    disabled={updatingStatus === task.id}
                    className="shrink-0 hover:scale-110 transition-transform"
                  >
                    {updatingStatus === task.id
                      ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      : (() => { const cfg = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG]; return cfg ? <cfg.icon className={cn('w-4 h-4', cfg.color)} /> : <Clock className="w-4 h-4 text-muted-foreground" />; })()
                    }
                  </button>
                </TooltipTrigger>
                <TooltipContent>Advance status</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <User className="w-2.5 h-2.5" /> {task.candidate_name}
              </span>
              <Badge className={cn('text-[9px] px-1.5 py-0 border', priorityCfg.bg, priorityCfg.color, priorityCfg.border)}>
                {priorityCfg.label}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              {task.due_date ? (
                <span className={cn('text-[10px] flex items-center gap-0.5', overdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                  <Calendar className="w-2.5 h-2.5" /> {smartDueLabel(task.due_date)}
                </span>
              ) : <span />}
              <div className="flex items-center gap-1">
                {task.file_url && <Paperclip className="w-3 h-3 text-muted-foreground" />}
                {task.candidate_notes && <MessageSquare className="w-3 h-3 text-primary" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Hero Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ListTodo className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Task Manager</h3>
              <p className="text-xs text-muted-foreground">Assign and track candidate tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/40">
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-1.5 rounded-md transition-all', viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={cn('p-1.5 rounded-md transition-all', viewMode === 'board' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl h-9" onClick={fetchTasks}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 rounded-xl h-9 shadow-sm">
                  <Plus className="w-4 h-4" /> Assign Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ListTodo className="w-4 h-4 text-primary" />
                    </div>
                    Assign New Task
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {form.candidate_ids.length > 0
                      ? `Assigning to ${form.candidate_ids.length} candidate(s)`
                      : 'Select candidates and fill in the task details'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {/* Candidate Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Candidates *</Label>
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search candidates..."
                        value={candidateSearch}
                        onChange={e => setCandidateSearch(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 rounded-lg border border-border/60 bg-muted/30 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="border border-border/60 rounded-xl max-h-40 overflow-y-auto p-1.5 space-y-0.5">
                      <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/60 cursor-pointer text-xs font-medium transition-colors">
                        <input
                          type="checkbox"
                          checked={form.candidate_ids.length === candidates.length && candidates.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setForm({ ...form, candidate_ids: candidates.map(c => c.id) });
                            else setForm({ ...form, candidate_ids: [] });
                          }}
                          className="rounded accent-primary"
                        />
                        Select All ({candidates.length})
                      </label>
                      <div className="border-t border-border/30 mx-1" />
                      {filteredCandidates.map(c => (
                        <label key={c.id} className={cn(
                          'flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-colors',
                          form.candidate_ids.includes(c.id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/60'
                        )}>
                          <input
                            type="checkbox"
                            checked={form.candidate_ids.includes(c.id)}
                            onChange={(e) => {
                              if (e.target.checked) setForm({ ...form, candidate_ids: [...form.candidate_ids, c.id] });
                              else setForm({ ...form, candidate_ids: form.candidate_ids.filter(id => id !== c.id) });
                            }}
                            className="rounded accent-primary"
                          />
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-3 h-3 text-primary" />
                            </div>
                            <span className="truncate font-medium">{(c as any).profiles.full_name}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">{c.job_title}</span>
                        </label>
                      ))}
                      {candidates.length === 0 && (
                        <div className="text-center py-6">
                          <User className="w-6 h-6 mx-auto mb-1 text-muted-foreground/30" />
                          <p className="text-xs text-muted-foreground">No candidates with applications yet</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Task Details */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Title *</Label>
                    <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., Complete skills assessment" className="rounded-xl h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Description</Label>
                    <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detailed task instructions..." rows={3} className="rounded-xl text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Priority</Label>
                      <div className="flex gap-1.5">
                        {(['low', 'medium', 'high'] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => setForm({ ...form, priority: p })}
                            className={cn(
                              'flex-1 h-9 rounded-lg text-xs font-medium border transition-all capitalize',
                              form.priority === p
                                ? cn(PRIORITY_CONFIG[p].bg, PRIORITY_CONFIG[p].color, PRIORITY_CONFIG[p].border, 'ring-1 ring-offset-1 ring-offset-background',
                                    p === 'high' ? 'ring-destructive/30' : p === 'medium' ? 'ring-warning/30' : 'ring-border')
                                : 'border-border/50 text-muted-foreground hover:bg-muted/50'
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Due Date</Label>
                      <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="rounded-xl h-9 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Attachment</Label>
                    <div className={cn(
                      'border-2 border-dashed rounded-xl p-3 text-center transition-colors cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02]',
                      selectedFile ? 'border-primary/30 bg-primary/[0.02]' : 'border-border/50'
                    )}>
                      {selectedFile ? (
                        <div className="flex items-center gap-2 justify-center">
                          <Paperclip className="w-4 h-4 text-primary" />
                          <span className="text-xs font-medium text-foreground truncate">{selectedFile.name}</span>
                          <button onClick={() => setSelectedFile(null)} className="text-muted-foreground hover:text-destructive">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Paperclip className="w-5 h-5 text-muted-foreground/40 mx-auto mb-1" />
                          <p className="text-xs text-muted-foreground">Drop a file or <span className="text-primary font-medium">browse</span></p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Max 10MB</p>
                          <input type="file" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                        </label>
                      )}
                    </div>
                  </div>
                  <Button onClick={handleCreate} disabled={creating || !form.title || form.candidate_ids.length === 0} className="w-full rounded-xl h-10 font-semibold">
                    {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                    Assign Task
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            { key: 'all', label: 'Total', value: totalTasks, icon: ListTodo, color: 'text-primary', bg: 'bg-primary/10' },
            { key: 'pending', label: 'Pending', value: pendingCount, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
            { key: 'in_progress', label: 'In Progress', value: inProgressCount, icon: CircleDot, color: 'text-primary', bg: 'bg-primary/10' },
            { key: 'completed', label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
            { key: 'overdue', label: 'Overdue', value: overdueCount, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
          ].map((stat, i) => (
            <motion.button
              key={stat.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setFilter(stat.key)}
              className={cn(
                'flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left',
                filter === stat.key
                  ? 'bg-card shadow-md border-primary/20 ring-1 ring-primary/10'
                  : 'bg-card/60 backdrop-blur border-border/40 hover:shadow-sm hover:border-border/60'
              )}
            >
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', stat.bg)}>
                <stat.icon className={cn('w-4 h-4', stat.color)} />
              </div>
              <div>
                <p className="text-base font-bold text-foreground leading-none">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Completion Rate */}
        {totalTasks > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 p-3 rounded-xl bg-card/60 backdrop-blur border border-border/40">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Completion Rate</span>
                </div>
                <span className={cn('text-sm font-bold', completionRate >= 70 ? 'text-success' : completionRate >= 40 ? 'text-warning' : 'text-destructive')}>
                  {completionRate}%
                </span>
              </div>
              <Progress
                value={completionRate}
                className={cn('h-2 rounded-full', completionRate >= 70 ? '[&>div]:bg-success' : completionRate >= 40 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive')}
              />
            </div>
            <div className="text-[10px] text-muted-foreground text-right shrink-0 leading-relaxed">
              <span className="font-semibold text-foreground">{completedCount}</span>/{totalTasks} done
            </div>
          </motion.div>
        )}
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks, candidates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-border/60 bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className={cn('gap-1.5 rounded-xl h-9 shrink-0', showFilters && 'bg-primary/5 border-primary/20')}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0 ml-0.5">{activeFiltersCount}</Badge>
            )}
          </Button>
        </div>

        {/* Expandable Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-muted/30 border border-border/30">
                <Select value={candidateFilter} onValueChange={setCandidateFilter}>
                  <SelectTrigger className="w-[170px] rounded-xl h-8 text-xs">
                    <SelectValue placeholder="All Candidates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Candidates</SelectItem>
                    {candidates.map(c => (
                      <SelectItem key={c.id} value={c.id}>{(c as any).profiles.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[130px] rounded-xl h-8 text-xs">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">🔴 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">⚪ Low</SelectItem>
                  </SelectContent>
                </Select>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => { setCandidateFilter('all'); setPriorityFilter('all'); }}>
                    <X className="w-3 h-3 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedTasks.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20"
          >
            <Badge className="bg-primary text-primary-foreground text-xs">{selectedTasks.size} selected</Badge>
            <div className="flex items-center gap-1.5 ml-auto">
              <Button variant="outline" size="sm" className="h-7 text-[11px] rounded-lg gap-1" onClick={() => handleBulkStatusUpdate('completed')}>
                <CheckCircle2 className="w-3 h-3" /> Complete
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[11px] rounded-lg gap-1" onClick={() => handleBulkStatusUpdate('in_progress')}>
                <CircleDot className="w-3 h-3" /> Start
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[11px] rounded-lg gap-1 text-destructive hover:text-destructive" onClick={handleBulkDelete}>
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-[11px] rounded-lg" onClick={() => setSelectedTasks(new Set())}>
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      {viewMode === 'board' ? (
        /* Board View */
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {(['pending', 'in_progress', 'completed'] as const).map(status => (
            <BoardColumn
              key={status}
              status={status}
              tasks={filteredTasks.filter(t => t.status === status)}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <AnimatePresence mode="popLayout">
          {filteredTasks.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="border-dashed border-2 border-border/60 rounded-xl">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <ListTodo className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-foreground font-semibold mb-1">
                    {tasks.length === 0 ? 'No tasks yet' : 'No tasks match your filters'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    {tasks.length === 0
                      ? 'Start by assigning tasks to your candidates to track their progress and keep hiring on schedule.'
                      : 'Try adjusting your search or filters to find what you\'re looking for.'}
                  </p>
                  {tasks.length === 0 && (
                    <Button size="sm" className="rounded-xl gap-1.5" onClick={() => setDialogOpen(true)}>
                      <Plus className="w-4 h-4" /> Create First Task
                    </Button>
                  )}
                  {tasks.length > 0 && (
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => { setFilter('all'); setSearchQuery(''); setCandidateFilter('all'); setPriorityFilter('all'); }}>
                      <X className="w-3.5 h-3.5" /> Clear All Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {/* Select all row */}
              {filteredTasks.length > 1 && (
                <div className="flex items-center gap-2 px-1">
                  <button onClick={selectAllVisible} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                    <input type="checkbox" checked={selectedTasks.size === filteredTasks.length} readOnly className="rounded accent-primary w-3.5 h-3.5" />
                    Select all ({filteredTasks.length})
                  </button>
                  <span className="text-[10px] text-muted-foreground/50 ml-auto">{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}</span>
                </div>
              )}

              {filteredTasks.map((task, idx) => {
                const overdue = isOverdue(task);
                const expanded = expandedTaskId === task.id;
                const selected = selectedTasks.has(task.id);
                const priorityCfg = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
                const statusCfg = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG];

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ delay: idx * 0.02 }}
                  >
                    <Card className={cn(
                      'rounded-xl border transition-all duration-200 overflow-hidden',
                      selected && 'ring-1 ring-primary/30 border-primary/20',
                      overdue
                        ? 'border-destructive/30 bg-destructive/[0.02]'
                        : task.status === 'completed'
                          ? 'border-success/20 bg-success/[0.02]'
                          : 'border-border/50 hover:shadow-md'
                    )}>
                      {/* Color accent strip */}
                      <div className={cn('h-0.5', task.priority === 'high' ? 'bg-destructive' : task.priority === 'medium' ? 'bg-warning' : 'bg-muted')} />

                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Selection + Status */}
                          <div className="flex flex-col items-center gap-1.5 shrink-0">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleTaskSelection(task.id)}
                              className="rounded accent-primary w-3.5 h-3.5 cursor-pointer"
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => {
                                    const nextStatus = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : 'pending';
                                    handleStatusUpdate(task.id, nextStatus);
                                  }}
                                  disabled={updatingStatus === task.id}
                                  className="hover:scale-110 transition-transform disabled:opacity-50"
                                >
                                  {updatingStatus === task.id
                                    ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                    : <statusCfg.icon className={cn('w-5 h-5', statusCfg.color)} />
                                  }
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="text-xs">Click to advance status</TooltipContent>
                            </Tooltip>
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Title + badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={cn(
                                'font-semibold text-sm leading-tight',
                                task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'
                              )}>
                                {task.title}
                              </h4>
                              <Badge className={cn('text-[9px] px-1.5 py-0 border', statusCfg.bg, statusCfg.color, statusCfg.border)}>
                                {statusCfg.label}
                              </Badge>
                              <Badge className={cn('text-[9px] px-1.5 py-0 border gap-0.5', priorityCfg.bg, priorityCfg.color, priorityCfg.border)}>
                                {priorityCfg.icon && <priorityCfg.icon className="w-2.5 h-2.5" />}
                                {priorityCfg.label}
                              </Badge>
                            </div>

                            {/* Meta */}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="w-2.5 h-2.5 text-primary" />
                                </div>
                                {task.candidate_name}
                              </span>
                              {task.candidate_title && (
                                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{task.candidate_title}</span>
                              )}
                              {task.due_date && (
                                <span className={cn(
                                  'text-[11px] flex items-center gap-1 px-1.5 py-0.5 rounded-full',
                                  overdue
                                    ? 'text-destructive font-medium bg-destructive/10'
                                    : differenceInDays(new Date(task.due_date), new Date()) <= 2
                                      ? 'text-warning bg-warning/10'
                                      : 'text-muted-foreground'
                                )}>
                                  <Calendar className="w-3 h-3" />
                                  {smartDueLabel(task.due_date)}
                                </span>
                              )}
                              {task.file_url && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Paperclip className="w-3 h-3" /> Attached
                                </span>
                              )}
                              {task.candidate_notes && (
                                <span className="text-[11px] text-primary flex items-center gap-1 font-medium">
                                  <MessageSquare className="w-3 h-3" /> Response
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground/50">
                                {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                              </span>
                            </div>

                            {task.description && !expanded && (
                              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{task.description}</p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setExpandedTaskId(expanded ? null : task.id)}>
                                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{expanded ? 'Collapse' : 'Expand'}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(task.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {/* Expanded */}
                        <AnimatePresence>
                          {expanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 ml-9 space-y-3 border-t border-border/40 pt-3">
                                {task.description && (
                                  <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</p>
                                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{task.description}</p>
                                  </div>
                                )}

                                {task.candidate_notes && (
                                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                                    <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                      <MessageSquare className="w-3 h-3" /> Candidate Response
                                    </p>
                                    <p className="text-sm text-foreground whitespace-pre-wrap">{task.candidate_notes}</p>
                                  </div>
                                )}

                                {task.file_url && task.file_name && (
                                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/30">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                      <Paperclip className="w-4 h-4 text-primary" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground truncate flex-1">{task.file_name}</span>
                                    <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg shrink-0 gap-1" onClick={() => window.open(task.file_url!, '_blank')}>
                                      <Download className="w-3 h-3" /> Download
                                    </Button>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status:</span>
                                  {(['pending', 'in_progress', 'completed'] as const).map(s => {
                                    const cfg = STATUS_CONFIG[s];
                                    return (
                                      <Button
                                        key={s}
                                        variant={task.status === s ? 'default' : 'outline'}
                                        size="sm"
                                        className={cn(
                                          'h-7 text-[11px] rounded-lg gap-1',
                                          task.status === s && 'pointer-events-none'
                                        )}
                                        disabled={updatingStatus === task.id}
                                        onClick={() => handleStatusUpdate(task.id, s)}
                                      >
                                        <cfg.icon className="w-3 h-3" />
                                        {cfg.label}
                                      </Button>
                                    );
                                  })}
                                </div>

                                {task.completed_at && (
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-success" />
                                    Completed {formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}
                                  </p>
                                )}
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
      )}
    </div>
  );
};
