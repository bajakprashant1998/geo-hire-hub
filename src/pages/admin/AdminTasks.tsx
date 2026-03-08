import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls } from '@/components/admin/PaginationControls';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  ListTodo, Clock, CheckCircle2, AlertTriangle, CircleDot, Search,
  Building2, User, Paperclip, Eye, Calendar, TrendingUp, FileText,
  ExternalLink, Download,
} from 'lucide-react';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_SIZE = 20;

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Completed</Badge>;
    case 'in_progress': return <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1"><CircleDot className="h-2.5 w-2.5" />In Progress</Badge>;
    default: return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] gap-1"><Clock className="h-2.5 w-2.5" />Pending</Badge>;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'high': return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">High</Badge>;
    case 'medium': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">Medium</Badge>;
    default: return <Badge variant="secondary" className="text-[10px]">Low</Badge>;
  }
};

export default function AdminTasks() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tasks', statusFilter, priorityFilter, searchQuery, page],
    queryFn: async () => {
      let query = supabase.from('tasks').select('*', { count: 'exact' });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (priorityFilter !== 'all') query = query.eq('priority', priorityFilter);
      if (searchQuery) query = query.ilike('title', `%${searchQuery}%`);

      const { data: tasks, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (error) throw error;

      const candidateIds = [...new Set((tasks || []).map(t => t.candidate_id))];
      const employerIds = [...new Set((tasks || []).map(t => t.employer_id))];
      let candidateMap: Record<string, string> = {};
      let employerMap: Record<string, string> = {};

      if (candidateIds.length > 0) {
        const { data: candidates } = await supabase.from('candidates').select('id, profiles!inner(full_name)').in('id', candidateIds);
        (candidates as any[] || []).forEach((c: any) => { candidateMap[c.id] = c.profiles.full_name; });
      }
      if (employerIds.length > 0) {
        const { data: employers } = await supabase.from('employers').select('id, company_name').in('id', employerIds);
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

  const { data: stats } = useQuery({
    queryKey: ['admin-tasks-stats'],
    queryFn: async () => {
      const [{ count: total }, { count: pending }, { count: inProgress }, { count: completed }] = await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: true }),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      ]);
      return { total: total || 0, pending: pending || 0, inProgress: inProgress || 0, completed: completed || 0 };
    },
  });

  const overdueCount = useMemo(() =>
    (data?.tasks || []).filter((t: any) => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed').length
  , [data?.tasks]);

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const completionRate = stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const statCards = [
    { title: 'Total Tasks', value: stats?.total || 0, icon: ListTodo, gradient: 'from-primary/10 to-primary/5', iconColor: 'text-primary' },
    { title: 'Pending', value: stats?.pending || 0, icon: Clock, gradient: 'from-amber-500/10 to-amber-500/5', iconColor: 'text-amber-600' },
    { title: 'In Progress', value: stats?.inProgress || 0, icon: CircleDot, gradient: 'from-blue-500/10 to-blue-500/5', iconColor: 'text-blue-600' },
    { title: 'Completed', value: stats?.completed || 0, sub: `${completionRate}% rate`, icon: CheckCircle2, gradient: 'from-emerald-500/10 to-emerald-500/5', iconColor: 'text-emerald-600' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priority' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  return (
    <AdminLayout title="Task Management">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats ? statCards.map((stat, i) => (
          <motion.div key={stat.title} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <Card className={`bg-gradient-to-br ${stat.gradient} border-0 shadow-sm`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-background/80 ${stat.iconColor}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  {'sub' in stat && stat.sub && <p className="text-[10px] text-muted-foreground">{stat.sub}</p>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )) : [...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>

      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-sm text-foreground">{overdueCount} overdue task{overdueCount > 1 ? 's' : ''}</p>
                <p className="text-xs text-muted-foreground">These tasks have passed their due date and are not yet completed.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="list" className="gap-1.5"><ListTodo className="h-3.5 w-3.5" />All Tasks</TabsTrigger>
          <TabsTrigger value="overview" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Overview</TabsTrigger>
        </TabsList>

        {/* List Tab */}
        <TabsContent value="list">
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search tasks..." className="pl-8 h-9 text-xs" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }} />
                </div>
                <div className="flex gap-1">
                  {statusOptions.map(o => (
                    <Button key={o.value} size="sm" variant={statusFilter === o.value ? 'default' : 'ghost'} className="h-8 text-xs" onClick={() => { setStatusFilter(o.value); setPage(1); }}>
                      {o.label}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {priorityOptions.map(o => (
                    <Button key={o.value} size="sm" variant={priorityFilter === o.value ? 'secondary' : 'ghost'} className="h-8 text-xs" onClick={() => { setPriorityFilter(o.value); setPage(1); }}>
                      {o.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (data?.tasks || []).length === 0 ? (
                <div className="text-center py-16">
                  <ListTodo className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">{searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' ? 'No tasks match your filters' : 'No tasks found'}</p>
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
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {(data?.tasks || []).map((task: any, i: number) => {
                          const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed';
                          return (
                            <motion.tr
                              key={task.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: Math.min(i * 0.02, 0.4) }}
                              className={cn('border-b transition-colors hover:bg-muted/50', isOverdue && 'bg-destructive/5')}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{task.title}</span>
                                  {task.file_url && <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />}
                                </div>
                                {task.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 max-w-[250px]">{task.description}</p>}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm flex items-center gap-1.5">
                                  <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                    <Building2 className="w-3 h-3 text-primary" />
                                  </div>
                                  <span className="truncate max-w-[120px]">{task.employer_name}</span>
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm flex items-center gap-1.5">
                                  <div className="h-6 w-6 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                                    <User className="w-3 h-3 text-blue-600" />
                                  </div>
                                  <span className="truncate max-w-[120px]">{task.candidate_name}</span>
                                </span>
                              </TableCell>
                              <TableCell>{getStatusBadge(task.status)}</TableCell>
                              <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                              <TableCell>
                                {task.due_date ? (
                                  <span className={cn('text-xs flex items-center gap-1', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                                    {isOverdue && <AlertTriangle className="w-3 h-3 shrink-0" />}
                                    {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                                  </span>
                                ) : <span className="text-xs text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedTask(task)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                  {totalPages > 1 && (
                    <div className="p-4 border-t border-border/40">
                      <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Completion Progress */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Completion Rate</CardTitle>
                <CardDescription className="text-xs">Overall task completion across the platform.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="relative h-28 w-28 shrink-0">
                    <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-muted" />
                      <motion.circle
                        cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                        strokeLinecap="round"
                        className={completionRate >= 70 ? 'stroke-emerald-500' : completionRate >= 40 ? 'stroke-amber-500' : 'stroke-destructive'}
                        strokeDasharray={`${completionRate * 2.64} ${264 - completionRate * 2.64}`}
                        initial={{ strokeDasharray: '0 264' }}
                        animate={{ strokeDasharray: `${completionRate * 2.64} ${264 - completionRate * 2.64}` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-foreground">{completionRate}%</span>
                    </div>
                  </div>
                  <div className="space-y-3 flex-1">
                    {[
                      { label: 'Completed', value: stats?.completed || 0, color: 'bg-emerald-500' },
                      { label: 'In Progress', value: stats?.inProgress || 0, color: 'bg-blue-500' },
                      { label: 'Pending', value: stats?.pending || 0, color: 'bg-amber-500' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        <span className="text-sm flex-1">{item.label}</span>
                        <span className="text-sm font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Priority Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Priority Distribution</CardTitle>
                <CardDescription className="text-xs">Tasks by priority level (current page).</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const tasks = data?.tasks || [];
                  const high = tasks.filter((t: any) => t.priority === 'high').length;
                  const medium = tasks.filter((t: any) => t.priority === 'medium').length;
                  const low = tasks.filter((t: any) => t.priority === 'low').length;
                  const total = tasks.length || 1;
                  const items = [
                    { label: 'High Priority', count: high, pct: Math.round((high / total) * 100), color: 'bg-destructive' },
                    { label: 'Medium Priority', count: medium, pct: Math.round((medium / total) * 100), color: 'bg-amber-500' },
                    { label: 'Low Priority', count: low, pct: Math.round((low / total) * 100), color: 'bg-muted-foreground' },
                  ];
                  return (
                    <div className="space-y-4">
                      {items.map((item, i) => (
                        <motion.div key={item.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm">{item.label}</span>
                            <span className="text-xs text-muted-foreground">{item.count} ({item.pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${item.color}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${item.pct}%` }}
                              transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {selectedTask?.title}
            </DialogTitle>
            <DialogDescription>Task details and assignment information.</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {getStatusBadge(selectedTask.status)}
                {getPriorityBadge(selectedTask.priority)}
                {selectedTask.due_date && isPast(new Date(selectedTask.due_date)) && selectedTask.status !== 'completed' && (
                  <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="h-2.5 w-2.5" />Overdue</Badge>
                )}
              </div>

              {selectedTask.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{selectedTask.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[11px] text-muted-foreground mb-1">Assigned By</p>
                  <p className="text-sm font-medium flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-primary" />{selectedTask.employer_name}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[11px] text-muted-foreground mb-1">Assigned To</p>
                  <p className="text-sm font-medium flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-blue-600" />{selectedTask.candidate_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[11px] text-muted-foreground mb-1">Created</p>
                  <p className="text-sm">{format(new Date(selectedTask.created_at), 'MMM d, yyyy')}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[11px] text-muted-foreground mb-1">Due Date</p>
                  <p className="text-sm">{selectedTask.due_date ? format(new Date(selectedTask.due_date), 'MMM d, yyyy') : '—'}</p>
                </div>
              </div>

              {selectedTask.candidate_notes && (
                <div className="p-3 rounded-lg border border-border/50">
                  <p className="text-[11px] text-muted-foreground mb-1">Candidate Notes</p>
                  <p className="text-sm">{selectedTask.candidate_notes}</p>
                </div>
              )}

              {selectedTask.file_url && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm flex-1 truncate">{selectedTask.file_name || 'Attachment'}</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                    <a href={selectedTask.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-3 w-3" />Download</a>
                  </Button>
                </div>
              )}

              {selectedTask.completed_at && (
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed {formatDistanceToNow(new Date(selectedTask.completed_at), { addSuffix: true })}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
