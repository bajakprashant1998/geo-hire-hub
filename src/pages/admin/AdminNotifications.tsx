import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Bell, Plus, Trash2, Edit, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

export default function AdminNotifications() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformNotification | null>(null);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', target_audience: 'all', expires_at: '' });

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
        title: values.title,
        message: values.message,
        type: values.type,
        target_audience: values.target_audience,
        expires_at: values.expires_at || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-platform-notifications'] });
      setDialogOpen(false);
      resetForm();
      toast.success('Notification created');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<PlatformNotification> }) => {
      const { error } = await supabase.from('platform_notifications').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-platform-notifications'] });
      setDialogOpen(false);
      setEditing(null);
      resetForm();
      toast.success('Notification updated');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('platform_notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-platform-notifications'] });
      toast.success('Notification deleted');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const resetForm = () => setForm({ title: '', message: '', type: 'info', target_audience: 'all', expires_at: '' });

  const openEdit = (n: PlatformNotification) => {
    setEditing(n);
    setForm({ title: n.title, message: n.message, type: n.type, target_audience: n.target_audience, expires_at: n.expires_at || '' });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title || !form.message) { toast.error('Title and message required'); return; }
    if (editing) {
      updateMutation.mutate({ id: editing.id, values: { title: form.title, message: form.message, type: form.type, target_audience: form.target_audience, expires_at: form.expires_at || null } });
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleActive = (n: PlatformNotification) => {
    updateMutation.mutate({ id: n.id, values: { is_active: !n.is_active } });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Info className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <AdminLayout title="Platform Notifications">
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground">Manage platform-wide announcements shown to users</p>
        <Button onClick={() => { resetForm(); setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Notification
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <Card key={n.id} className={!n.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="mt-1">{getTypeIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{n.title}</h4>
                    <Badge variant="outline" className="text-xs">{n.target_audience}</Badge>
                    {!n.is_active && <Badge variant="secondary">Inactive</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {format(new Date(n.created_at), 'MMM d, yyyy')}
                    {n.expires_at && ` · Expires ${format(new Date(n.expires_at), 'MMM d, yyyy')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={n.is_active} onCheckedChange={() => toggleActive(n)} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(n)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(n.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Notification' : 'New Notification'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Notification title" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Notification message" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Audience</Label>
                <Select value={form.target_audience} onValueChange={(v) => setForm(f => ({ ...f, target_audience: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="candidates">Candidates</SelectItem>
                    <SelectItem value="employers">Employers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Expires At (optional)</Label>
              <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm(f => ({ ...f, expires_at: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
