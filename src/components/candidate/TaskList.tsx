import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Loader2, Calendar, CheckCircle2, Clock, AlertCircle,
  Building2, FileText, Play, MessageSquare, Paperclip, Download,
  ListTodo, TrendingUp, AlertTriangle, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';
import { formatDistanceToNow, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';

interface TaskListProps {
  candidateId: string;
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
  employer_id: string;
  file_url?: string | null;
  file_name?: string | null;
  employer_name?: string;
}

// --- Sub-components ---

const TaskSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
    </div>
    <Skeleton className="h-10 rounded-xl w-64" />
    <div className="space-y-3">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
    </div>
  </div>
);

const EmptyState = ({ filter }: { filter: string }) => {
  const configs: Record<string, { icon: any; title: string; desc: string }> = {
    all: { icon: ListTodo, title: 'No tasks yet', desc: 'When employers assign tasks to you, they\'ll appear here.' },
    pending: { icon: Clock, title: 'No pending tasks', desc: 'You\'re all caught up! No tasks waiting to be started.' },
    in_progress: { icon: Play, title: 'Nothing in progress', desc: 'Start a pending task to see it here.' },
    completed: { icon: CheckCircle2, title: 'No completed tasks', desc: 'Complete your tasks to build your track record.' },
    overdue: { icon: AlertTriangle, title: 'No overdue tasks', desc: 'Great job! You have no overdue tasks.' },
  };
  const c = configs[filter] || configs.all;
  const Icon = c.icon;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 sm:py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/80 flex items-center justify-center">
        <Icon className="w-8 h-8 text-muted-foreground/40" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">{c.title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">{c.desc}</p>
    </motion.div>
  );
};

const DueDateBadge = ({ dueDate, status }: { dueDate: string; status: string }) => {
  const date = new Date(dueDate);
  const overdue = isPast(date) && status !== 'completed';
  const today = isToday(date);
  const tomorrow = isTomorrow(date);
  const daysLeft = differenceInDays(date, new Date());

  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
        <Calendar className="w-3 h-3" />
        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </span>
    );
  }

  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive px-2 py-0.5 rounded-full bg-destructive/10 animate-pulse">
        <AlertTriangle className="w-3 h-3" />
        Overdue {formatDistanceToNow(date, { addSuffix: false })}
      </span>
    );
  }
  if (today) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning-foreground px-2 py-0.5 rounded-full bg-warning/10">
        <AlertCircle className="w-3 h-3" />
        Due today
      </span>
    );
  }
  if (tomorrow) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary px-2 py-0.5 rounded-full bg-primary/10">
        <Calendar className="w-3 h-3" />
        Due tomorrow
      </span>
    );
  }
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted",
      daysLeft <= 3 ? "text-warning-foreground font-medium" : "text-muted-foreground"
    )}>
      <Calendar className="w-3 h-3" />
      {daysLeft} days left
    </span>
  );
};

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  high: { label: 'High', color: 'text-destructive bg-destructive/10 border-destructive/20', dot: 'bg-destructive' },
  medium: { label: 'Medium', color: 'text-warning-foreground bg-warning/10 border-warning/20', dot: 'bg-warning' },
  low: { label: 'Low', color: 'text-muted-foreground bg-muted border-border', dot: 'bg-muted-foreground' },
};

const statusIcons: Record<string, { icon: any; color: string; bg: string }> = {
  pending: { icon: Clock, color: 'text-warning-foreground', bg: 'bg-warning/10' },
  in_progress: { icon: Play, color: 'text-primary', bg: 'bg-primary/10' },
  completed: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
};

const TaskCard = ({
  task, index, updating,
  onStart, onComplete, onEditNotes,
  editingNotes, noteText, onNoteChange, onSaveNotes, onCancelEdit,
}: {
  task: Task; index: number; updating: string | null;
  onStart: (id: string) => void; onComplete: (id: string) => void;
  onEditNotes: (id: string) => void;
  editingNotes: string | null; noteText: string;
  onNoteChange: (v: string) => void; onSaveNotes: (id: string) => void; onCancelEdit: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const si = statusIcons[task.status] || statusIcons.pending;
  const StatusIcon = si.icon;
  const pc = priorityConfig[task.priority] || priorityConfig.low;
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed';
  const hasDescription = !!task.description;
  const hasAttachment = !!task.file_url;
  const hasNotes = !!task.candidate_notes;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className={cn(
        "group hover:shadow-md transition-all duration-200 overflow-hidden",
        isOverdue && "border-destructive/30 bg-destructive/5",
        task.status === 'completed' && "opacity-80"
      )}>
        {/* Priority top bar */}
        <div className={cn("h-1", pc.dot)} />

        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Status icon */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", si.bg)}>
                  <StatusIcon className={cn("w-4.5 h-4.5", si.color)} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs capitalize">{task.status.replace('_', ' ')}</TooltipContent>
            </Tooltip>

            <div className="min-w-0 flex-1 space-y-2">
              {/* Title row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className={cn(
                    "font-semibold text-sm leading-snug",
                    task.status === 'completed' && "line-through text-muted-foreground"
                  )}>{task.title}</h4>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {task.employer_name}
                    </span>
                    <Badge variant="outline" className={cn("text-[10px] gap-1 capitalize", pc.color)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", pc.dot)} />
                      {pc.label}
                    </Badge>
                    {task.due_date && <DueDateBadge dueDate={task.due_date} status={task.status} />}
                  </div>
                </div>

                {/* Expand toggle when has description */}
                {(hasDescription || hasAttachment || hasNotes) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground"
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                )}
              </div>

              {/* Expandable content */}
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden space-y-2"
                  >
                    {task.description && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-xl leading-relaxed">{task.description}</p>
                    )}

                    {task.file_url && task.file_name && (
                      <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl border border-border/50 w-fit">
                        <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate max-w-48">{task.file_name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs rounded-lg ml-1 gap-1"
                          onClick={() => window.open(task.file_url!, '_blank')}
                        >
                          <Download className="w-3 h-3" /> Download
                        </Button>
                      </div>
                    )}

                    {/* Notes */}
                    {editingNotes === task.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={noteText}
                          onChange={e => onNoteChange(e.target.value)}
                          placeholder="Add your notes or response..."
                          rows={3}
                          className="rounded-xl resize-none text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" className="rounded-lg text-xs gap-1" onClick={() => onSaveNotes(task.id)} disabled={updating === task.id}>
                            {updating === task.id && <Loader2 className="w-3 h-3 animate-spin" />}
                            Save Notes
                          </Button>
                          <Button size="sm" variant="ghost" className="rounded-lg text-xs" onClick={onCancelEdit}>Cancel</Button>
                        </div>
                      </div>
                    ) : task.candidate_notes ? (
                      <div
                        className="p-3 bg-primary/5 rounded-xl cursor-pointer hover:bg-primary/10 transition-colors group/notes"
                        onClick={() => onEditNotes(task.id)}
                      >
                        <p className="text-[10px] font-semibold text-primary mb-1 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Your Notes
                          <span className="text-muted-foreground font-normal group-hover/notes:underline">(click to edit)</span>
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">{task.candidate_notes}</p>
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions row */}
              <div className="flex items-center gap-2 flex-wrap">
                {task.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs rounded-lg h-8 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                    onClick={() => onStart(task.id)}
                    disabled={updating === task.id}
                  >
                    {updating === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Start Task
                  </Button>
                )}
                {task.status === 'in_progress' && (
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs rounded-lg h-8"
                    onClick={() => onComplete(task.id)}
                    disabled={updating === task.id}
                  >
                    {updating === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Mark Complete
                  </Button>
                )}
                {task.status !== 'completed' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-xs rounded-lg h-8 text-muted-foreground"
                    onClick={() => onEditNotes(task.id)}
                  >
                    <MessageSquare className="w-3 h-3" />
                    {task.candidate_notes ? 'Edit Notes' : 'Add Notes'}
                  </Button>
                )}
                {task.status === 'completed' && task.completed_at && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    Completed {formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// --- Main Component ---

export const TaskList = ({ candidateId }: TaskListProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => { fetchTasks(); }, [candidateId]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const employerIds = [...new Set((data || []).map(t => t.employer_id))];
      if (employerIds.length > 0) {
        const { data: employers } = await supabase
          .from('employers')
          .select('id, company_name')
          .in('id', employerIds);
        const nameMap: Record<string, string> = {};
        (employers || []).forEach(e => { nameMap[e.id] = e.company_name; });
        setTasks((data || []).map(t => ({ ...t, employer_name: nameMap[t.employer_id] || 'Unknown' })));
      } else {
        setTasks(data || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (taskId: string, newStatus: string) => {
    setUpdating(taskId);
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completed') updateData.completed_at = new Date().toISOString();
      const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);
      if (error) throw error;
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus, ...updateData } : t));
      toast.success(`Task marked as ${newStatus.replace('_', ' ')}`);
    } catch {
      toast.error('Failed to update task');
    } finally {
      setUpdating(null);
    }
  };

  const saveNotes = async (taskId: string) => {
    setUpdating(taskId);
    try {
      const { error } = await supabase.from('tasks').update({ candidate_notes: noteText }).eq('id', taskId);
      if (error) throw error;
      setTasks(tasks.map(t => t.id === taskId ? { ...t, candidate_notes: noteText } : t));
      setEditingNotes(null);
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setUpdating(null);
    }
  };

  const stats = useMemo(() => {
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const overdue = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed').length;
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { pending, inProgress, completed, overdue, total, completionRate };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    if (filter === 'overdue') return tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed');
    return tasks.filter(t => t.status === filter);
  }, [tasks, filter]);

  if (loading) return <TaskSkeleton />;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-warning-foreground', bg: 'bg-warning/10', dot: stats.pending > 0 },
          { label: 'In Progress', value: stats.inProgress, icon: Play, color: 'text-primary', bg: 'bg-primary/10', dot: stats.inProgress > 0 },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', dot: false },
          { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', dot: stats.overdue > 0 },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
              const filterMap: Record<string, string> = { 'Pending': 'pending', 'In Progress': 'in_progress', 'Completed': 'completed', 'Overdue': 'overdue' };
              setFilter(prev => prev === filterMap[stat.label] ? 'all' : filterMap[stat.label]);
            }}>
              <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative", stat.bg)}>
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                  {stat.dot && (
                    <span className={cn(
                      "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full",
                      stat.label === 'Overdue' ? 'bg-destructive' : stat.label === 'Pending' ? 'bg-warning' : 'bg-primary'
                    )} />
                  )}
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      {stats.total > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Task Completion</span>
                </div>
                <span className="text-sm font-bold text-primary">{stats.completionRate}%</span>
              </div>
              <Progress value={stats.completionRate} className="h-2" />
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {stats.completed} of {stats.total} tasks completed
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="w-full sm:w-auto bg-muted/50 rounded-xl p-1">
          <TabsTrigger value="all" className="text-xs sm:text-sm rounded-lg data-[state=active]:shadow-sm gap-1.5">
            <ListTodo className="w-3.5 h-3.5" />
            All
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-muted rounded-full">{stats.total}</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs sm:text-sm rounded-lg data-[state=active]:shadow-sm gap-1.5">
            Pending
            {stats.pending > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-warning/10 text-warning-foreground rounded-full">{stats.pending}</span>}
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="text-xs sm:text-sm rounded-lg data-[state=active]:shadow-sm gap-1.5">
            Active
            {stats.inProgress > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded-full">{stats.inProgress}</span>}
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm rounded-lg data-[state=active]:shadow-sm gap-1.5">
            Done
            {stats.completed > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-success/10 text-success rounded-full">{stats.completed}</span>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task, idx) => (
            <TaskCard
              key={task.id}
              task={task}
              index={idx}
              updating={updating}
              onStart={(id) => updateStatus(id, 'in_progress')}
              onComplete={(id) => updateStatus(id, 'completed')}
              onEditNotes={(id) => { setEditingNotes(id); setNoteText(tasks.find(t => t.id === id)?.candidate_notes || ''); }}
              editingNotes={editingNotes}
              noteText={noteText}
              onNoteChange={setNoteText}
              onSaveNotes={saveNotes}
              onCancelEdit={() => setEditingNotes(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
