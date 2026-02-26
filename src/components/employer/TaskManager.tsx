import { useState, useEffect } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Plus, Loader2, Calendar, CheckCircle2, Clock, AlertCircle,
  User, FileText, Trash2, Paperclip, Download, ListTodo,
  ArrowUpCircle, CircleDot, AlertTriangle, MessageSquare,
  ChevronDown, ChevronUp, RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isPast, format, differenceInDays } from 'date-fns';

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
  const [form, setForm] = useState({
    title: '',
    description: '',
    candidate_ids: [] as string[],
    priority: 'medium',
    due_date: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('resumes')
          .getPublicUrl(filePath);

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
      toast.success('Task deleted');
    } catch (error: any) {
      toast.error('Failed to delete task');
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

  const filteredTasks = tasks.filter(t => {
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
  });

  // Stats
  const totalTasks = tasks.length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const overdueCount = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed').length;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'in_progress': return <CircleDot className="w-4 h-4 text-primary" />;
      default: return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-success/10 text-success border-success/20 text-[10px] px-2 py-0">Done</Badge>;
      case 'in_progress': return <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-2 py-0">In Progress</Badge>;
      default: return <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px] px-2 py-0">Pending</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-2 py-0 gap-1">
          <ArrowUpCircle className="w-2.5 h-2.5" /> High
        </Badge>
      );
      case 'medium': return (
        <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px] px-2 py-0">
          Medium
        </Badge>
      );
      default: return (
        <Badge variant="secondary" className="text-[10px] px-2 py-0">
          Low
        </Badge>
      );
    }
  };

  const isOverdue = (task: Task) => task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed';

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-xl" />)}
        </div>
        {[1, 2].map(i => <div key={i} className="h-28 bg-muted/50 animate-pulse rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Candidate Tasks</h3>
          <Badge variant="secondary" className="text-xs font-semibold">{totalTasks}</Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 rounded-xl shadow-sm">
              <Plus className="w-4 h-4" /> Assign Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-primary" />
                Assign Task {form.candidate_ids.length > 0 ? `to ${form.candidate_ids.length} candidate(s)` : ''}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Candidates *</Label>
                <div className="border border-border/60 rounded-xl max-h-40 overflow-y-auto p-2 space-y-1">
                  <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted cursor-pointer text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={form.candidate_ids.length === candidates.length && candidates.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setForm({ ...form, candidate_ids: candidates.map(c => c.id) });
                        else setForm({ ...form, candidate_ids: [] });
                      }}
                      className="rounded"
                    />
                    Select All ({candidates.length})
                  </label>
                  <div className="border-t border-border/40 my-1" />
                  {candidates.map(c => (
                    <label key={c.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={form.candidate_ids.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) setForm({ ...form, candidate_ids: [...form.candidate_ids, c.id] });
                          else setForm({ ...form, candidate_ids: form.candidate_ids.filter(id => id !== c.id) });
                        }}
                        className="rounded"
                      />
                      <span className="truncate">{(c as any).profiles.full_name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{c.job_title}</span>
                    </label>
                  ))}
                  {candidates.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">No candidates with applications yet</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Task instructions..." rows={3} className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Attachment (Optional)</Label>
                <Input
                  type="file"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="cursor-pointer rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground">Max size: 10MB</p>
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full rounded-xl">
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Assign Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: totalTasks, icon: ListTodo, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Pending', value: pendingCount, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'In Progress', value: inProgressCount, icon: CircleDot, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Completed', value: completedCount, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Overdue', value: overdueCount, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-card/60 backdrop-blur border border-border/40"
          >
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', stat.bg)}>
              <stat.icon className={cn('w-4 h-4', stat.color)} />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Completion Rate */}
      {totalTasks > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 backdrop-blur border border-border/40">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-foreground">Completion Rate</span>
              <span className={cn('text-xs font-bold', completionRate >= 70 ? 'text-success' : completionRate >= 40 ? 'text-warning' : 'text-destructive')}>
                {completionRate}%
              </span>
            </div>
            <Progress
              value={completionRate}
              className={cn('h-2', completionRate >= 70 ? '[&>div]:bg-success' : completionRate >= 40 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive')}
            />
          </div>
          <div className="text-[10px] text-muted-foreground text-right shrink-0">
            {completedCount}/{totalTasks} done
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks or candidates..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-border/60 bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
        <Select value={candidateFilter} onValueChange={setCandidateFilter}>
          <SelectTrigger className="sm:w-[170px] rounded-xl h-9">
            <SelectValue placeholder="All Candidates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Candidates</SelectItem>
            {candidates.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {(c as any).profiles.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="sm:w-[130px] rounded-xl h-9">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="grid grid-cols-5 w-full sm:w-auto sm:inline-grid h-9 bg-muted/50">
          <TabsTrigger value="all" className="text-xs">All ({totalTasks})</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="in_progress" className="text-xs">Active ({inProgressCount})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">Done ({completedCount})</TabsTrigger>
          <TabsTrigger value="overdue" className={cn('text-xs', overdueCount > 0 && 'text-destructive')}>
            Overdue ({overdueCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Task Cards */}
      <AnimatePresence mode="popLayout">
        {filteredTasks.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-dashed border-2 border-border/60 rounded-xl">
              <CardContent className="p-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <ListTodo className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium mb-1">No tasks found</p>
                <p className="text-xs text-muted-foreground">
                  {tasks.length === 0 ? 'Assign tasks to candidates to track their progress.' : 'Try adjusting your filters.'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task, idx) => {
              const overdue = isOverdue(task);
              const expanded = expandedTaskId === task.id;
              const daysUntilDue = task.due_date ? differenceInDays(new Date(task.due_date), new Date()) : null;

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card className={cn(
                    'rounded-xl border transition-all duration-200 overflow-hidden',
                    overdue
                      ? 'border-destructive/30 bg-destructive/[0.02]'
                      : task.status === 'completed'
                        ? 'border-success/20 bg-success/[0.02]'
                        : 'border-border/50 hover:shadow-md'
                  )}>
                    {/* Color accent strip */}
                    <div className={cn(
                      'h-0.5',
                      task.priority === 'high' ? 'bg-destructive' : task.priority === 'medium' ? 'bg-warning' : 'bg-muted'
                    )} />

                    <CardContent className="p-4">
                      {/* Main row */}
                      <div className="flex items-start gap-3">
                        {/* Status icon - clickable to cycle */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => {
                                const nextStatus = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : 'pending';
                                handleStatusUpdate(task.id, nextStatus);
                              }}
                              disabled={updatingStatus === task.id}
                              className="mt-0.5 shrink-0 hover:scale-110 transition-transform disabled:opacity-50"
                            >
                              {updatingStatus === task.id
                                ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                : <span className="w-5 h-5 block">{getStatusIcon(task.status)}</span>
                              }
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Click to change status</TooltipContent>
                        </Tooltip>

                        <div className="flex-1 min-w-0">
                          {/* Title row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={cn(
                              'font-semibold text-sm leading-tight',
                              task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'
                            )}>
                              {task.title}
                            </h4>
                            {getStatusBadge(task.status)}
                            {getPriorityBadge(task.priority)}
                          </div>

                          {/* Meta row */}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {task.candidate_name}
                            </span>
                            {task.candidate_title && (
                              <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                                {task.candidate_title}
                              </span>
                            )}
                            {task.due_date && (
                              <span className={cn(
                                'text-[11px] flex items-center gap-1',
                                overdue ? 'text-destructive font-medium' : 'text-muted-foreground'
                              )}>
                                <Calendar className="w-3 h-3" />
                                {overdue ? (
                                  <>Overdue by {Math.abs(daysUntilDue!)} day{Math.abs(daysUntilDue!) !== 1 ? 's' : ''}</>
                                ) : daysUntilDue !== null && daysUntilDue <= 2 ? (
                                  <>Due {daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`}</>
                                ) : (
                                  format(new Date(task.due_date), 'MMM d, yyyy')
                                )}
                              </span>
                            )}
                            {task.file_url && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Paperclip className="w-3 h-3" />
                                Attached
                              </span>
                            )}
                            {task.candidate_notes && (
                              <span className="text-[11px] text-primary flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                Response
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground/60">
                              {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                            </span>
                          </div>

                          {/* Description preview */}
                          {task.description && !expanded && (
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{task.description}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setExpandedTaskId(expanded ? null : task.id)}
                          >
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(task.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete task</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Expanded content */}
                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 ml-8 space-y-3 border-t border-border/40 pt-3">
                              {/* Full description */}
                              {task.description && (
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                                  <p className="text-sm text-foreground leading-relaxed">{task.description}</p>
                                </div>
                              )}

                              {/* Candidate response */}
                              {task.candidate_notes && (
                                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" /> Candidate Response
                                  </p>
                                  <p className="text-sm text-foreground">{task.candidate_notes}</p>
                                </div>
                              )}

                              {/* Attachment */}
                              {task.file_url && task.file_name && (
                                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/30">
                                  <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <span className="text-sm font-medium text-foreground truncate flex-1">{task.file_name}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs rounded-lg shrink-0"
                                    onClick={() => window.open(task.file_url!, '_blank')}
                                  >
                                    <Download className="w-3 h-3 mr-1" /> Download
                                  </Button>
                                </div>
                              )}

                              {/* Quick status buttons */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Set Status:</span>
                                {['pending', 'in_progress', 'completed'].map(s => (
                                  <Button
                                    key={s}
                                    variant={task.status === s ? 'default' : 'outline'}
                                    size="sm"
                                    className={cn('h-7 text-[11px] rounded-lg gap-1', task.status === s && 'pointer-events-none')}
                                    disabled={updatingStatus === task.id}
                                    onClick={() => handleStatusUpdate(task.id, s)}
                                  >
                                    {s === 'pending' && <Clock className="w-3 h-3" />}
                                    {s === 'in_progress' && <CircleDot className="w-3 h-3" />}
                                    {s === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                    {s.replace('_', ' ')}
                                  </Button>
                                ))}
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
    </div>
  );
};
