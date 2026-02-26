import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, AlertCircle, ChevronRight, Building2, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isPast } from 'date-fns';

interface PendingTasksWidgetProps {
  type: 'candidate' | 'employer';
  candidateId?: string;
  employerId?: string;
  onViewAll: () => void;
}

interface TaskPreview {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  other_name?: string;
}

export const PendingTasksWidget = ({ type, candidateId, employerId, onViewAll }: PendingTasksWidgetProps) => {
  const [tasks, setTasks] = useState<TaskPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingTasks();
  }, [candidateId, employerId]);

  const fetchPendingTasks = async () => {
    try {
      if (type === 'candidate' && candidateId) {
        const { data, error } = await supabase
          .from('tasks')
          .select('id, title, status, priority, due_date, created_at, employer_id')
          .eq('candidate_id', candidateId)
          .in('status', ['pending', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        const employerIds = [...new Set((data || []).map(t => t.employer_id))];
        let nameMap: Record<string, string> = {};
        if (employerIds.length > 0) {
          const { data: employers } = await supabase
            .from('employers')
            .select('id, company_name')
            .in('id', employerIds);
          (employers || []).forEach(e => { nameMap[e.id] = e.company_name; });
        }

        setTasks((data || []).map(t => ({
          ...t,
          other_name: nameMap[t.employer_id] || 'Unknown',
        })));
      } else if (type === 'employer' && employerId) {
        const { data, error } = await supabase
          .from('tasks')
          .select('id, title, status, priority, due_date, created_at, candidate_id')
          .eq('employer_id', employerId)
          .in('status', ['pending', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        const candidateIds = [...new Set((data || []).map(t => t.candidate_id))];
        let nameMap: Record<string, string> = {};
        if (candidateIds.length > 0) {
          const { data: candidates } = await supabase
            .from('candidates')
            .select('id, profiles!inner(full_name)')
            .in('id', candidateIds);
          (candidates as any[] || []).forEach((c: any) => { nameMap[c.id] = c.profiles.full_name; });
        }

        setTasks((data || []).map(t => ({
          ...t,
          other_name: nameMap[t.candidate_id] || 'Unknown',
        })));
      }
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="h-14 bg-muted/40 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success/40" />
        <p className="text-sm text-muted-foreground">No pending tasks</p>
      </div>
    );
  }

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-warning';
      default: return 'bg-muted-foreground/40';
    }
  };

  return (
    <div className="space-y-2">
      {tasks.map((task, i) => {
        const isOverdue = task.due_date && isPast(new Date(task.due_date));
        return (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl border transition-colors',
              isOverdue
                ? 'border-destructive/20 bg-destructive/5'
                : 'border-border/30 bg-muted/20 hover:bg-muted/40'
            )}
          >
            <div className={cn('w-2 h-2 rounded-full shrink-0', getPriorityDot(task.priority))} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {type === 'candidate' ? (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Building2 className="w-2.5 h-2.5" /> {task.other_name}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <User className="w-2.5 h-2.5" /> {task.other_name}
                  </span>
                )}
                {task.due_date && (
                  <span className={cn('text-[10px]', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                    {isOverdue ? 'Overdue' : formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
            <Badge variant="secondary" className={cn(
              'text-[9px] px-1.5 py-0 shrink-0',
              task.status === 'in_progress' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'
            )}>
              {task.status === 'in_progress' ? 'Active' : 'Pending'}
            </Badge>
          </motion.div>
        );
      })}
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs text-muted-foreground hover:text-foreground mt-1 gap-1"
        onClick={onViewAll}
      >
        View All Tasks <ChevronRight className="w-3 h-3" />
      </Button>
    </div>
  );
};
