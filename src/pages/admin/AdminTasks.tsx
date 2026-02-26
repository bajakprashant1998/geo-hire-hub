import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatsCard } from '@/components/admin/StatsCard';
import { PaginationControls } from '@/components/admin/PaginationControls';
import {
  ListTodo, Clock, CheckCircle2, AlertTriangle, CircleDot, Search,
  Building2, User, Calendar, Paperclip
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

export default function AdminTasks() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tasks', statusFilter, priorityFilter, searchQuery, page],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('*', { count: 'exact' });

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (priorityFilter !== 'all') query = query.eq('priority', priorityFilter);
      if (searchQuery) query = query.ilike('title', `%${searchQuery}%`);

      const { data: tasks, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (error) throw error;

      // Fetch candidate & employer names
      const candidateIds = [...new Set((tasks || []).map(t => t.candidate_id))];
      const employerIds = [...new Set((tasks || []).map(t => t.employer_id))];

      let candidateMap: Record<string, string> = {};
      let employerMap: Record<string, string> = {};

      if (candidateIds.length > 0) {
        const { data: candidates } = await supabase
          .from('candidates')
          .select('id, profiles!inner(full_name)')
          .in('id', candidateIds);
        (candidates as any[] || []).forEach((c: any) => { candidateMap[c.id] = c.profiles.full_name; });
      }

      if (employerIds.length > 0) {
        const { data: employers } = await supabase
          .from('employers')
          .select('id, company_name')
          .in('id', employerIds);
        (employers || []).forEach(e => { employerMap[e.id] = e.company_name; });
      }

      return {
        tasks: (tasks || []).map(t => ({
          ...t,
          candidate_name: candidateMap[t.candidate_id] || 'Unknown',
          employer_name: employerMap[t.employer_id] || 'Unknown',
        })),
        total: count || 0,
      };
    },
  });

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ['admin-tasks-stats'],
    queryFn: async () => {
      const [
        { count: total },
        { count: pending },
        { count: inProgress },
        { count: completed },
      ] = await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: true }),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      ]);
      return {
        total: total || 0,
        pending: pending || 0,
        inProgress: inProgress || 0,
        completed: completed || 0,
      };
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-success/10 text-success border-success/20 text-[10px]">Completed</Badge>;
      case 'in_progress': return <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">In Progress</Badge>;
      default: return <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">Pending</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">High</Badge>;
      case 'medium': return <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">Medium</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">Low</Badge>;
    }
  };

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  return (
    <AdminLayout title="Task Management">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats ? (
          <>
            <StatsCard title="Total Tasks" value={stats.total} icon={ListTodo} />
            <StatsCard title="Pending" value={stats.pending} icon={Clock} variant="warning" />
            <StatsCard title="In Progress" value={stats.inProgress} icon={CircleDot} />
            <StatsCard title="Completed" value={stats.completed} icon={CheckCircle2} variant="success" />
          </>
        ) : (
          [...Array(4)].map((_, i) => (
            <Card key={i} className="rounded-xl"><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        )}
      </div>

      {/* Filters */}
      <Card className="rounded-xl border-border/40 bg-card/80 backdrop-blur-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9 rounded-xl"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-xl border-border/40 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Employer</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.tasks || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No tasks found
                      </TableCell>
                    </TableRow>
                  ) : (
                    (data?.tasks || []).map((task: any) => {
                      const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed';
                      return (
                        <TableRow key={task.id} className={cn(isOverdue && 'bg-destructive/5')}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{task.title}</span>
                              {task.file_url && <Paperclip className="w-3 h-3 text-muted-foreground" />}
                            </div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-muted-foreground" />
                              {task.employer_name}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm flex items-center gap-1">
                              <User className="w-3 h-3 text-muted-foreground" />
                              {task.candidate_name}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(task.status)}</TableCell>
                          <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                          <TableCell>
                            {task.due_date ? (
                              <span className={cn('text-xs', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                                {isOverdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                                {format(new Date(task.due_date), 'MMM d, yyyy')}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(task.created_at), 'MMM d, yyyy')}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="p-4 border-t border-border/40">
                  <PaginationControls
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
