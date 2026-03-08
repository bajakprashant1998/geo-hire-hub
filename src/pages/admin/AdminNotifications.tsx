import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Plus, Trash2, Edit, Info, AlertTriangle, CheckCircle, XCircle, Search, Users, Briefcase, User, Clock, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PlatformNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  target_audience: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

// --- Sub-components ---

function KPICard({ title, value, icon: Icon, gradient, delay }: { title: string; value: number | string; icon: React.ElementType; gradient: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}>
      <Card className={cn('relative overflow-hidden border-0 shadow-lg', gradient)}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">{title}</p>
              <p className="text-3xl font-bold text-white mt-1">{value}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TypeIcon({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const configs: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
    warning: { icon: AlertTriangle, bg: 'bg-amber-500/10', text: 'text-amber-600' },
    success: { icon: CheckCircle, bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
    error: { icon: XCircle, bg: 'bg-destructive/10', text: 'text-destructive' },
    info: { icon: Info, bg: 'bg-primary/10', text: 'text-primary' },
  };
  const c = configs[type] || configs.info;
  const Ic = c.icon;
  return (
    <div className={cn('rounded-xl flex items-center justify-center shrink-0', c.bg, size === 'sm' ? 'h-8 w-8' : 'h-10 w-10')}>
      <Ic className={cn(s, c.text)} />
    </div>
  );
}

function AudienceBadge({ audience }: { audience: string }) {
  const configs: Record<string, { icon: React.ElementType; label: string }> = {
    all: { icon: Users, label: 'All Users' },
    candidates: { icon: User, label: 'Candidates' },
    employers: { icon: Briefcase, label: 'Employers' },
  };
  const c = configs[audience] || configs.all;
  const Ic = c.icon;
  return (
    <Badge variant="outline" className="text-[11px] gap-1 font-normal">
      <Ic className="h-3 w-3" />{c.label}
    </Badge>
  );
}

function NotificationCard({
  n, onEdit, onDelete, onToggle, isPending
}: {
  n: PlatformNotification;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  isPending: boolean;
}) {
  const isExpired = n.expires_at && new Date(n.expires_at) < new Date();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        'rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm shadow-sm transition-all group',
        !n.is_active && 'opacity-50'
      )}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-4">
            <TypeIcon type={n.type} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h4 className="font-semibold text-sm">{n.title}</h4>
                <AudienceBadge audience={n.target_audience} />
                <Badge variant="secondary" className="text-[10px] capitalize">{n.type}</Badge>
                {!n.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                {isExpired && <Badge variant="destructive" className="text-[10px]">Expired</Badge>}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{n.message}</p>
              <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">{format(new Date(n.created_at), 'PPP p')}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {n.expires_at && (
                  <span className={cn('flex items-center gap-1', isExpired ? 'text-destructive' : '')}>
                    Expires {format(new Date(n.expires_at), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center"><Switch checked={n.is_active} onCheckedChange={onToggle} disabled={isPending} /></div>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">{n.is_active ? 'Deactivate' : 'Activate'}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}><Edit className="h-4 w-4" /></Button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Edit</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">Delete</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// --- Main ---

export default function AdminNotifications() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformNotification | null>(null);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', target_audience: 'all', expires_at: '' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['admin-platform-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PlatformNotification[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const { error } = await supabase.from('platform_notifications').insert({
        title: values.title, message: values.message, type: values.type,
        target_audience: values.target_audience, expires_at: values.expires_at || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-platform-notifications'] }); setDialogOpen(false); resetForm(); toast.success('Notification created'); },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<PlatformNotification> }) => {
      const { error } = await supabase.from('platform_notifications').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-platform-notifications'] }); setDialogOpen(false); setEditing(null); resetForm(); toast.success('Notification updated'); },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('platform_notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-platform-notifications'] }); setDeleteId(null); toast.success('Notification deleted'); },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const resetForm = () => setForm({ title: '', message: '', type: 'info', target_audience: 'all', expires_at: '' });

  const openEdit = (n: PlatformNotification) => {
    setEditing(n);
    setForm({ title: n.title, message: n.message, type: n.type, target_audience: n.target_audience, expires_at: n.expires_at || '' });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.message.trim()) { toast.error('Title and message are required'); return; }
    if (editing) {
      updateMutation.mutate({ id: editing.id, values: { title: form.title, message: form.message, type: form.type, target_audience: form.target_audience, expires_at: form.expires_at || null } });
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleActive = (n: PlatformNotification) => {
    updateMutation.mutate({ id: n.id, values: { is_active: !n.is_active } });
  };

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const totalCount = notifications?.length || 0;
  const activeCount = notifications?.filter(n => n.is_active).length || 0;
  const inactiveCount = totalCount - activeCount;
  const expiredCount = notifications?.filter(n => n.expires_at && new Date(n.expires_at) < new Date()).length || 0;

  const filtered = notifications?.filter(n => {
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.message.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'active') return n.is_active;
    if (filter === 'inactive') return !n.is_active;
    if (filter === 'expired') return n.expires_at && new Date(n.expires_at) < new Date();
    return true;
  }) || [];

  const filterTabs = [
    { value: 'all', label: 'All', count: totalCount },
    { value: 'active', label: 'Active', count: activeCount },
    { value: 'inactive', label: 'Inactive', count: inactiveCount },
    { value: 'expired', label: 'Expired', count: expiredCount },
  ];

  return (
    <AdminLayout title="Platform Notifications">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KPICard title="Total" value={totalCount} icon={Bell} gradient="bg-gradient-to-br from-primary to-primary/70" delay={0} />
        <KPICard title="Active" value={activeCount} icon={CheckCircle} gradient="bg-gradient-to-br from-emerald-600 to-emerald-500" delay={0.05} />
        <KPICard title="Inactive" value={inactiveCount} icon={XCircle} gradient="bg-gradient-to-br from-muted-foreground to-muted-foreground/70" delay={0.1} />
        <KPICard title="Expired" value={expiredCount} icon={Clock} gradient="bg-gradient-to-br from-amber-600 to-amber-500" delay={0.15} />
      </div>

      {/* Toolbar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
            <TabsList className="h-9 bg-muted/60">
              {filterTabs.map(t => (
                <TabsTrigger key={t.value} value={t.value} className="text-xs gap-1.5 data-[state=active]:shadow-sm">
                  {t.label}
                  <span className="bg-background/80 text-[10px] px-1.5 py-0.5 rounded-full font-mono">{t.count}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex-1" />
          <Button size="sm" className="gap-1.5 h-9 shrink-0" onClick={() => { resetForm(); setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" /> New Notification
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search notifications…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 bg-card/60 backdrop-blur-sm" />
        </div>
      </motion.div>

      {/* Notification List */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
        ) : !filtered.length ? (
          <Card className="rounded-2xl border-dashed border-2 border-border/40">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="font-medium text-muted-foreground">No notifications found</p>
              <p className="text-sm text-muted-foreground mt-1">{search ? 'Try adjusting your search' : 'Create your first platform notification'}</p>
              {!search && (
                <Button size="sm" className="mt-4 gap-1.5" onClick={() => { resetForm(); setEditing(null); setDialogOpen(true); }}>
                  <Plus className="h-3.5 w-3.5" /> Create Notification
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map(n => (
                <NotificationCard
                  key={n.id}
                  n={n}
                  onEdit={() => openEdit(n)}
                  onDelete={() => setDeleteId(n.id)}
                  onToggle={() => toggleActive(n)}
                  isPending={isPending}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              {editing ? 'Edit Notification' : 'New Notification'}
            </DialogTitle>
            <DialogDescription>
              {editing ? 'Update the notification details below.' : 'Create a platform-wide announcement for your users.'}
            </DialogDescription>
          </DialogHeader>

          {/* Live Preview */}
          <div className="rounded-xl border border-border/60 p-3 bg-muted/30">
            <div className="flex items-start gap-3">
              <TypeIcon type={form.type} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{form.title || 'Notification title…'}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{form.message || 'Message preview will appear here…'}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">↑ Live preview</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium">Title</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Scheduled Maintenance" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium">Message</Label>
              <Textarea value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Describe the notification…" className="mt-1 min-h-20" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info"><span className="flex items-center gap-2"><Info className="h-3.5 w-3.5 text-primary" />Info</span></SelectItem>
                    <SelectItem value="warning"><span className="flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5 text-amber-600" />Warning</span></SelectItem>
                    <SelectItem value="success"><span className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-600" />Success</span></SelectItem>
                    <SelectItem value="error"><span className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5 text-destructive" />Error</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">Audience</Label>
                <Select value={form.target_audience} onValueChange={(v) => setForm(f => ({ ...f, target_audience: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all"><span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />All Users</span></SelectItem>
                    <SelectItem value="candidates"><span className="flex items-center gap-2"><User className="h-3.5 w-3.5" />Candidates</span></SelectItem>
                    <SelectItem value="employers"><span className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5" />Employers</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Expires At <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm(f => ({ ...f, expires_at: e.target.value }))} className="mt-1" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Saving…' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Notification
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this notification from the platform. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
