import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Plus, Loader2, Calendar, CheckCircle2, Clock, AlertCircle,
  User, FileText, Trash2
} from 'lucide-react';

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
  const [form, setForm] = useState({
    title: '',
    description: '',
    candidate_id: '',
    priority: 'medium',
    due_date: '',
  });

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

      // Fetch candidate names
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
      // Get candidates who applied to employer's jobs
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
    if (!form.title || !form.candidate_id) {
      toast.error('Please fill in title and select a candidate');
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        employer_id: employerId,
        candidate_id: form.candidate_id,
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        due_date: form.due_date || null,
      });
      if (error) throw error;
      toast.success('Task assigned successfully');
      setForm({ title: '', description: '', candidate_id: '', priority: 'medium', due_date: '' });
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

  const filteredTasks = tasks.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (candidateFilter !== 'all' && t.candidate_id !== candidateFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-amber-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive';
      case 'medium': return 'bg-amber-500/10 text-amber-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground">Candidate Tasks</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="w-4 h-4" /> Assign Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Candidate *</Label>
                <Select value={form.candidate_id} onValueChange={v => setForm({ ...form, candidate_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {(c as any).profiles.full_name} — {c.job_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Task instructions..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Assign Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={candidateFilter} onValueChange={setCandidateFilter}>
          <SelectTrigger className="sm:w-[180px]">
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
          <SelectTrigger className="sm:w-[140px]">
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
        <TabsList className="grid grid-cols-4 w-full sm:w-auto sm:inline-grid">
          <TabsTrigger value="all">All ({tasks.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Done</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredTasks.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">No tasks found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {getStatusIcon(task.status)}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-foreground truncate">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.candidate_name}
                        </span>
                        <Badge variant="secondary" className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{task.description}</p>
                      )}
                      {task.candidate_notes && (
                        <div className="mt-2 p-2 bg-muted/50 rounded-lg text-sm">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Candidate Notes:</p>
                          <p className="text-foreground">{task.candidate_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDelete(task.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
