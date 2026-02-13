import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Loader2, Calendar, CheckCircle2, Clock, AlertCircle,
  Building2, FileText, Play, MessageSquare
} from 'lucide-react';

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
  employer_name?: string;
}

export const TaskList = ({ candidateId }: TaskListProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [candidateId]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch employer names
      const employerIds = [...new Set((data || []).map(t => t.employer_id))];
      if (employerIds.length > 0) {
        const { data: employers } = await supabase
          .from('employers')
          .select('id, company_name')
          .in('id', employerIds);

        const nameMap: Record<string, string> = {};
        (employers || []).forEach(e => { nameMap[e.id] = e.company_name; });

        setTasks((data || []).map(t => ({
          ...t,
          employer_name: nameMap[t.employer_id] || 'Unknown',
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

  const updateStatus = async (taskId: string, newStatus: string) => {
    setUpdating(taskId);
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completed') updateData.completed_at = new Date().toISOString();

      const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);
      if (error) throw error;

      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus, ...updateData } : t));
      toast.success(`Task marked as ${newStatus.replace('_', ' ')}`);
    } catch (error: any) {
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
    } catch (error: any) {
      toast.error('Failed to save notes');
    } finally {
      setUpdating(null);
    }
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

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
      <h3 className="text-lg font-semibold text-foreground">My Tasks</h3>

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
            <p className="text-muted-foreground">
              {filter === 'all' ? 'No tasks assigned yet' : `No ${filter.replace('_', ' ')} tasks`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(task.status)}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <h4 className="font-semibold text-foreground">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {task.employer_name}
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
                    </div>

                    {task.description && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{task.description}</p>
                    )}

                    {/* Notes section */}
                    {editingNotes === task.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          placeholder="Add your notes or response..."
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveNotes(task.id)} disabled={updating === task.id}>
                            {updating === task.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingNotes(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : task.candidate_notes ? (
                      <div className="p-2 bg-primary/5 rounded-lg text-sm cursor-pointer" onClick={() => { setEditingNotes(task.id); setNoteText(task.candidate_notes || ''); }}>
                        <p className="text-xs font-medium text-primary mb-1">Your Notes:</p>
                        <p className="text-foreground">{task.candidate_notes}</p>
                      </div>
                    ) : null}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {task.status === 'pending' && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => updateStatus(task.id, 'in_progress')} disabled={updating === task.id}>
                          <Play className="w-3 h-3" /> Start Task
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button size="sm" className="gap-1 text-xs" onClick={() => updateStatus(task.id, 'completed')} disabled={updating === task.id}>
                          <CheckCircle2 className="w-3 h-3" /> Mark Complete
                        </Button>
                      )}
                      {task.status !== 'completed' && (
                        <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => { setEditingNotes(task.id); setNoteText(task.candidate_notes || ''); }}>
                          <MessageSquare className="w-3 h-3" /> Add Notes
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
