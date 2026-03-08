import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Users, ClipboardList, GitBranch, Shield, Trash2, Edit2,
  CheckCircle2, Clock, AlertTriangle, User, Loader2, Calendar,
  ArrowRight, ChevronRight, X, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Props {
  employerId: string;
}

// ─── Types ───
interface TeamMember {
  id: string;
  employer_id: string;
  profile_id: string;
  team_role: string;
  invited_email: string | null;
  is_active: boolean;
  permissions: Record<string, boolean>;
  created_at: string;
  profiles?: { full_name: string; avatar_url: string | null; };
}

interface TeamTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  completed_at: string | null;
  tags: string[];
  created_at: string;
}

interface ApprovalWorkflow {
  id: string;
  name: string;
  workflow_type: string;
  steps: { role: string; action: string }[];
  is_active: boolean;
  created_at: string;
}

interface ApprovalRequest {
  id: string;
  workflow_id: string;
  entity_type: string;
  entity_id: string;
  current_step: number;
  status: string;
  requested_by: string;
  notes: string | null;
  history: { step: number; action: string; by: string; at: string }[];
  created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-primary/10 text-primary border-primary/20',
  hiring_manager: 'bg-accent/10 text-accent-foreground border-accent/20',
  recruiter: 'bg-success/10 text-success border-success/20',
  interviewer: 'bg-warning/10 text-warning-foreground border-warning/20',
  viewer: 'bg-muted text-muted-foreground border-border',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-destructive/10 text-destructive border-destructive/20',
  high: 'bg-warning/10 text-warning-foreground border-warning/20',
  medium: 'bg-primary/10 text-primary border-primary/20',
  low: 'bg-muted text-muted-foreground border-border',
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  todo: Clock,
  in_progress: ArrowRight,
  review: AlertTriangle,
  done: CheckCircle2,
};

export const TeamWorkflows = ({ employerId }: Props) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('tasks');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TeamTask | null>(null);

  // Forms
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '', tags: '' });
  const [memberForm, setMemberForm] = useState({ email: '', team_role: 'recruiter' as string });
  const [workflowForm, setWorkflowForm] = useState({ name: '', workflow_type: 'job_posting', steps: [{ role: 'recruiter', action: 'Review' }, { role: 'hiring_manager', action: 'Approve' }] });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: m }, { data: t }, { data: w }, { data: r }] = await Promise.all([
      supabase.from('employer_team_members').select('*, profiles!employer_team_members_profile_id_fkey(full_name, avatar_url)').eq('employer_id', employerId),
      supabase.from('team_tasks').select('*').eq('employer_id', employerId).order('created_at', { ascending: false }),
      supabase.from('approval_workflows').select('*').eq('employer_id', employerId).order('created_at', { ascending: false }),
      supabase.from('approval_requests').select('*').eq('employer_id', employerId).order('created_at', { ascending: false }),
    ]);
    if (m) setMembers(m as unknown as TeamMember[]);
    if (t) setTasks(t as unknown as TeamTask[]);
    if (w) setWorkflows(w as unknown as ApprovalWorkflow[]);
    if (r) setRequests(r as unknown as ApprovalRequest[]);
    setLoading(false);
  }, [employerId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Task CRUD ───
  const openCreateTask = () => { setEditingTask(null); setTaskForm({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '', tags: '' }); setTaskDialogOpen(true); };
  const openEditTask = (t: TeamTask) => {
    setEditingTask(t);
    setTaskForm({ title: t.title, description: t.description || '', priority: t.priority, assigned_to: t.assigned_to || '', due_date: t.due_date || '', tags: t.tags?.join(', ') || '' });
    setTaskDialogOpen(true);
  };

  const saveTask = async () => {
    if (!taskForm.title.trim() || !profile) return;
    const payload = {
      employer_id: employerId,
      title: taskForm.title.trim(),
      description: taskForm.description || null,
      priority: taskForm.priority,
      assigned_to: taskForm.assigned_to || null,
      due_date: taskForm.due_date || null,
      tags: taskForm.tags ? taskForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      created_by: profile.id,
    };
    if (editingTask) {
      const { error } = await supabase.from('team_tasks').update(payload).eq('id', editingTask.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Task updated');
    } else {
      const { error } = await supabase.from('team_tasks').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Task created');
    }
    setTaskDialogOpen(false);
    fetchAll();
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    const update: any = { status };
    if (status === 'done') update.completed_at = new Date().toISOString();
    else update.completed_at = null;
    await supabase.from('team_tasks').update(update).eq('id', taskId);
    fetchAll();
  };

  const deleteTask = async (id: string) => {
    await supabase.from('team_tasks').delete().eq('id', id);
    toast.success('Deleted');
    fetchAll();
  };

  // ─── Team Members ───
  const addMember = async () => {
    if (!memberForm.email.trim() || !profile) return;
    // Find profile by email - search in profiles
    const { data: foundProfile } = await (supabase.from('profiles').select('id') as any).eq('email', memberForm.email.trim()).maybeSingle();
    if (!foundProfile) {
      toast.error('User not found. They must have an account first.');
      return;
    }
    const { error } = await supabase.from('employer_team_members').insert({
      employer_id: employerId,
      profile_id: foundProfile.id,
      team_role: memberForm.team_role as any,
      invited_email: memberForm.email.trim(),
    });
    if (error) {
      if (error.code === '23505') toast.error('Already a team member');
      else toast.error(error.message);
      return;
    }
    toast.success('Team member added');
    setMemberDialogOpen(false);
    setMemberForm({ email: '', team_role: 'recruiter' });
    fetchAll();
  };

  const removeMember = async (id: string) => {
    await supabase.from('employer_team_members').delete().eq('id', id);
    toast.success('Removed');
    fetchAll();
  };

  const updateMemberRole = async (id: string, role: string) => {
    await supabase.from('employer_team_members').update({ team_role: role }).eq('id', id);
    fetchAll();
  };

  const updatePermission = async (id: string, key: string, value: boolean, currentPerms: Record<string, boolean>) => {
    await supabase.from('employer_team_members').update({ permissions: { ...currentPerms, [key]: value } }).eq('id', id);
    fetchAll();
  };

  // ─── Workflows ───
  const saveWorkflow = async () => {
    if (!workflowForm.name.trim() || !profile) return;
    const { error } = await supabase.from('approval_workflows').insert({
      employer_id: employerId,
      name: workflowForm.name.trim(),
      workflow_type: workflowForm.workflow_type,
      steps: workflowForm.steps,
      created_by: profile.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Workflow created');
    setWorkflowDialogOpen(false);
    setWorkflowForm({ name: '', workflow_type: 'job_posting', steps: [{ role: 'recruiter', action: 'Review' }, { role: 'hiring_manager', action: 'Approve' }] });
    fetchAll();
  };

  const deleteWorkflow = async (id: string) => {
    await supabase.from('approval_workflows').delete().eq('id', id);
    toast.success('Deleted');
    fetchAll();
  };

  const getMemberName = (profileId: string | null) => {
    if (!profileId) return 'Unassigned';
    const m = members.find(m => m.profile_id === profileId);
    return m?.profiles?.full_name || 'Unknown';
  };

  const getMemberAvatar = (profileId: string | null) => {
    if (!profileId) return null;
    return members.find(m => m.profile_id === profileId)?.profiles?.avatar_url || null;
  };

  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    review: tasks.filter(t => t.status === 'review'),
    done: tasks.filter(t => t.status === 'done'),
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Team Workflows
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your hiring team, tasks, and approval processes</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-xl bg-muted/50">
          <TabsTrigger value="tasks" className="rounded-lg gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" /> Task Board ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="team" className="rounded-lg gap-1.5">
            <Users className="w-3.5 h-3.5" /> Team ({members.length})
          </TabsTrigger>
          <TabsTrigger value="approvals" className="rounded-lg gap-1.5">
            <GitBranch className="w-3.5 h-3.5" /> Approvals ({workflows.length})
          </TabsTrigger>
          <TabsTrigger value="permissions" className="rounded-lg gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Permissions
          </TabsTrigger>
        </TabsList>

        {/* ─── TASK BOARD ─── */}
        <TabsContent value="tasks" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{tasks.length} tasks across {members.length} team members</p>
            <Button onClick={openCreateTask} size="sm" className="rounded-xl gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Task
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {(['todo', 'in_progress', 'review', 'done'] as const).map(status => {
              const StatusIcon = STATUS_ICONS[status];
              const label = status === 'in_progress' ? 'In Progress' : status === 'todo' ? 'To Do' : status.charAt(0).toUpperCase() + status.slice(1);
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <StatusIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">{tasksByStatus[status].length}</Badge>
                  </div>
                  <div className="space-y-2 min-h-[100px] p-2 rounded-xl bg-muted/20 border border-border/30">
                    <AnimatePresence mode="popLayout">
                      {tasksByStatus[status].map(task => (
                        <motion.div key={task.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                          <Card className="border-border/40 hover:border-primary/20 transition-colors cursor-pointer group" onClick={() => openEditTask(task)}>
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-semibold text-foreground line-clamp-2">{task.title}</h4>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  {status !== 'done' && (
                                    <button
                                      onClick={e => { e.stopPropagation(); updateTaskStatus(task.id, status === 'todo' ? 'in_progress' : status === 'in_progress' ? 'review' : 'done'); }}
                                      className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center hover:bg-primary/20"
                                    >
                                      <ChevronRight className="w-3.5 h-3.5 text-primary" />
                                    </button>
                                  )}
                                  <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }} className="w-6 h-6 rounded-md hover:bg-destructive/10 flex items-center justify-center">
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className={cn('text-[10px]', PRIORITY_COLORS[task.priority])}>
                                  {task.priority}
                                </Badge>
                                {task.due_date && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <Calendar className="w-3 h-3" /> {format(new Date(task.due_date), 'MMM d')}
                                  </span>
                                )}
                              </div>
                              {task.assigned_to && (
                                <div className="flex items-center gap-1.5 mt-2">
                                  <Avatar className="w-5 h-5">
                                    <AvatarImage src={getMemberAvatar(task.assigned_to) || ''} />
                                    <AvatarFallback className="text-[8px]">{getMemberName(task.assigned_to).charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-[10px] text-muted-foreground">{getMemberName(task.assigned_to)}</span>
                                </div>
                              )}
                              {task.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {task.tags.slice(0, 2).map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">{tag}</Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {tasksByStatus[status].length === 0 && (
                      <p className="text-[11px] text-muted-foreground text-center py-4">No tasks</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── TEAM MEMBERS ─── */}
        <TabsContent value="team" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{members.length} team member{members.length !== 1 ? 's' : ''}</p>
            <Button onClick={() => setMemberDialogOpen(true)} size="sm" className="rounded-xl gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Member
            </Button>
          </div>
          <div className="space-y-2">
            {members.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-border/40">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={m.profiles?.avatar_url || ''} />
                      <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{m.profiles?.full_name || m.invited_email}</p>
                      <p className="text-[11px] text-muted-foreground">{m.invited_email}</p>
                    </div>
                    <Select value={m.team_role} onValueChange={v => updateMemberRole(m.id, v)}>
                      <SelectTrigger className="w-40 h-8 text-xs rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['owner', 'hiring_manager', 'recruiter', 'interviewer', 'viewer'].map(r => (
                          <SelectItem key={r} value={r} className="text-xs">{r.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge variant="outline" className={cn('text-[10px]', ROLE_COLORS[m.team_role])}>{m.team_role.replace('_', ' ')}</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeMember(m.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {members.length === 0 && (
              <div className="text-center py-12 border border-dashed border-border/50 rounded-2xl bg-muted/20">
                <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="font-semibold text-foreground">No team members yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add your hiring team to collaborate</p>
                <Button onClick={() => setMemberDialogOpen(true)} variant="outline" size="sm" className="mt-3 rounded-xl gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add First Member
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── APPROVALS ─── */}
        <TabsContent value="approvals" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{workflows.length} workflow{workflows.length !== 1 ? 's' : ''} configured</p>
            <Button onClick={() => setWorkflowDialogOpen(true)} size="sm" className="rounded-xl gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Workflow
            </Button>
          </div>
          <div className="space-y-3">
            {workflows.map((w, i) => (
              <motion.div key={w.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-border/40">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{w.name}</h4>
                          <Badge variant={w.is_active ? 'default' : 'secondary'} className="text-[10px]">
                            {w.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{w.workflow_type.replace('_', ' ')}</Badge>
                        </div>
                        {/* Steps visualization */}
                        <div className="flex items-center gap-2 mt-3">
                          {(w.steps as any[]).map((step: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 border border-border/30">
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{idx + 1}</div>
                                <div>
                                  <p className="text-[10px] font-semibold text-foreground">{step.action}</p>
                                  <p className="text-[9px] text-muted-foreground">{step.role.replace('_', ' ')}</p>
                                </div>
                              </div>
                              {idx < (w.steps as any[]).length - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteWorkflow(w.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                    {/* Pending requests count */}
                    {requests.filter(r => r.workflow_id === w.id && r.status === 'pending').length > 0 && (
                      <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/5 border border-warning/10">
                        <Clock className="w-3.5 h-3.5 text-warning-foreground" />
                        <span className="text-xs text-foreground">
                          {requests.filter(r => r.workflow_id === w.id && r.status === 'pending').length} pending approval{requests.filter(r => r.workflow_id === w.id && r.status === 'pending').length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {workflows.length === 0 && (
              <div className="text-center py-12 border border-dashed border-border/50 rounded-2xl bg-muted/20">
                <GitBranch className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="font-semibold text-foreground">No approval workflows</p>
                <p className="text-sm text-muted-foreground mt-1">Set up approval chains for job postings, offers, and more</p>
                <Button onClick={() => setWorkflowDialogOpen(true)} variant="outline" size="sm" className="mt-3 rounded-xl gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Create Workflow
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── PERMISSIONS ─── */}
        <TabsContent value="permissions" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">Manage what each team member can do</p>
          {members.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border/50 rounded-2xl bg-muted/20">
              <Shield className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Add team members first to manage permissions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map(m => (
                <Card key={m.id} className="border-border/40">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={m.profiles?.avatar_url || ''} />
                        <AvatarFallback className="text-[10px]">{(m.profiles?.full_name || '?').charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{m.profiles?.full_name}</p>
                        <Badge variant="outline" className={cn('text-[10px]', ROLE_COLORS[m.team_role])}>{m.team_role.replace('_', ' ')}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: 'can_post_jobs', label: 'Post Jobs' },
                        { key: 'can_manage_candidates', label: 'Manage Candidates' },
                        { key: 'can_schedule_interviews', label: 'Schedule Interviews' },
                        { key: 'can_approve_offers', label: 'Approve Offers' },
                        { key: 'can_manage_team', label: 'Manage Team' },
                      ].map(perm => (
                        <div key={perm.key} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                          <span className="text-xs text-foreground">{perm.label}</span>
                          <Switch
                            checked={(m.permissions as Record<string, boolean>)?.[perm.key] || false}
                            onCheckedChange={v => updatePermission(m.id, perm.key, v, m.permissions)}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Task Dialog ─── */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'New Hiring Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Title *</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Review candidate portfolio..." className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Details..." className="mt-1" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['urgent', 'high', 'medium', 'low'].map(p => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} className="mt-1" />
              </div>
            </div>
            {members.length > 0 && (
              <div>
                <Label>Assign To</Label>
                <Select value={taskForm.assigned_to} onValueChange={v => setTaskForm(f => ({ ...f, assigned_to: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    {members.map(m => (
                      <SelectItem key={m.profile_id} value={m.profile_id}>{m.profiles?.full_name || m.invited_email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input value={taskForm.tags} onChange={e => setTaskForm(f => ({ ...f, tags: e.target.value }))} placeholder="screening, urgent, design..." className="mt-1" />
            </div>
            <Button onClick={saveTask} className="w-full rounded-xl">{editingTask ? 'Update' : 'Create'} Task</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Add Member Dialog ─── */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Email Address</Label>
              <Input value={memberForm.email} onChange={e => setMemberForm(f => ({ ...f, email: e.target.value }))} placeholder="colleague@company.com" className="mt-1" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={memberForm.team_role} onValueChange={v => setMemberForm(f => ({ ...f, team_role: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['hiring_manager', 'recruiter', 'interviewer', 'viewer'].map(r => (
                    <SelectItem key={r} value={r}>{r.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addMember} className="w-full rounded-xl">Add Member</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Workflow Dialog ─── */}
      <Dialog open={workflowDialogOpen} onOpenChange={setWorkflowDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Approval Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Workflow Name</Label>
              <Input value={workflowForm.name} onChange={e => setWorkflowForm(f => ({ ...f, name: e.target.value }))} placeholder="Job Posting Approval" className="mt-1" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={workflowForm.workflow_type} onValueChange={v => setWorkflowForm(f => ({ ...f, workflow_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['job_posting', 'offer_letter', 'candidate_stage', 'budget_approval'].map(t => (
                    <SelectItem key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Approval Steps</Label>
              <div className="space-y-2 mt-1">
                {workflowForm.steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{idx + 1}</div>
                    <Select value={step.role} onValueChange={v => {
                      const s = [...workflowForm.steps]; s[idx] = { ...s[idx], role: v }; setWorkflowForm(f => ({ ...f, steps: s }));
                    }}>
                      <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['recruiter', 'hiring_manager', 'owner', 'interviewer'].map(r => (
                          <SelectItem key={r} value={r} className="text-xs">{r.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={step.action}
                      onChange={e => {
                        const s = [...workflowForm.steps]; s[idx] = { ...s[idx], action: e.target.value }; setWorkflowForm(f => ({ ...f, steps: s }));
                      }}
                      placeholder="Action"
                      className="flex-1 h-8 text-xs"
                    />
                    {workflowForm.steps.length > 1 && (
                      <button onClick={() => setWorkflowForm(f => ({ ...f, steps: f.steps.filter((_, i) => i !== idx) }))} className="w-6 h-6 rounded-md hover:bg-destructive/10 flex items-center justify-center">
                        <X className="w-3 h-3 text-destructive" />
                      </button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full rounded-lg text-xs"
                  onClick={() => setWorkflowForm(f => ({ ...f, steps: [...f.steps, { role: 'hiring_manager', action: '' }] }))}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Step
                </Button>
              </div>
            </div>
            <Button onClick={saveWorkflow} className="w-full rounded-xl">Create Workflow</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamWorkflows;
