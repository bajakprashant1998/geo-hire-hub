import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Megaphone, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface Banner {
  id: string;
  title: string;
  message: string;
  type: string;
  target_audience: string;
  link_url: string | null;
  link_text: string | null;
  is_active: boolean;
  is_dismissible: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

const emptyForm = {
  title: '',
  message: '',
  type: 'info',
  target_audience: 'all',
  link_url: '',
  link_text: '',
  is_active: true,
  is_dismissible: true,
  starts_at: '',
  ends_at: '',
};

export default function AdminBanners() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: banners, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_banners')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Banner[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        title: values.title,
        message: values.message,
        type: values.type,
        target_audience: values.target_audience,
        link_url: values.link_url || null,
        link_text: values.link_text || null,
        is_active: values.is_active,
        is_dismissible: values.is_dismissible,
        starts_at: values.starts_at || new Date().toISOString(),
        ends_at: values.ends_at || null,
      };

      if (values.id) {
        const { error } = await supabase.from('platform_banners').update(payload).eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('platform_banners').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      toast.success(editingId ? 'Banner updated' : 'Banner created');
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error('Error: ' + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('platform_banners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      toast.success('Banner deleted');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('platform_banners').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-banners'] }),
  });

  const openEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      message: banner.message,
      type: banner.type,
      target_audience: banner.target_audience,
      link_url: banner.link_url || '',
      link_text: banner.link_text || '',
      is_active: banner.is_active,
      is_dismissible: banner.is_dismissible,
      starts_at: banner.starts_at ? banner.starts_at.slice(0, 16) : '',
      ends_at: banner.ends_at ? banner.ends_at.slice(0, 16) : '',
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case 'success': return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
      case 'error': return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      default: return <Info className="h-3.5 w-3.5 text-primary" />;
    }
  };

  return (
    <AdminLayout title="Announcement Banners">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Platform Banners</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Push announcements to candidates, employers, or everyone</p>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Banner
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : !banners?.length ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No banners yet. Create your first announcement!</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {banners.map((b, i) => (
              <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className={!b.is_active ? 'opacity-50' : ''}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="mt-1">{typeIcon(b.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm">{b.title}</h3>
                        <Badge variant="outline" className="text-[10px]">{b.target_audience}</Badge>
                        <Badge variant={b.is_active ? 'default' : 'secondary'} className="text-[10px]">
                          {b.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Created {format(new Date(b.created_at), 'MMM d, yyyy')}
                        {b.ends_at && ` · Expires ${format(new Date(b.ends_at), 'MMM d, yyyy')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={b.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: b.id, is_active: checked })}
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(b.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Banner' : 'Create Banner'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Maintenance scheduled..." />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="We'll be down for maintenance on..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
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
                <Select value={form.target_audience} onValueChange={v => setForm({ ...form, target_audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="candidates">Candidates</SelectItem>
                    <SelectItem value="employers">Employers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Link URL (optional)</Label>
                <Input value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>Link Text</Label>
                <Input value={form.link_text} onChange={e => setForm({ ...form, link_text: e.target.value })} placeholder="Learn more" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Starts at</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div>
                <Label>Ends at (optional)</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_dismissible} onCheckedChange={v => setForm({ ...form, is_dismissible: v })} />
                <Label>Dismissible</Label>
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!form.title || !form.message || saveMutation.isPending}
              onClick={() => saveMutation.mutate(editingId ? { ...form, id: editingId } : form)}
            >
              {saveMutation.isPending ? 'Saving...' : editingId ? 'Update Banner' : 'Create Banner'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
