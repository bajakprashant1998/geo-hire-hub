import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { StatsCard } from '@/components/admin/StatsCard';
import { ShieldAlert, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PaginationControls } from '@/components/admin/PaginationControls';

const PAGE_SIZE = 20;

export default function AdminModeration() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [actionDialog, setActionDialog] = useState<{ item: any; action: string } | null>(null);
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-moderation-queue', statusFilter, page],
    queryFn: async () => {
      let query = supabase
        .from('moderation_queue')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { items: data, total: count || 0 };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: string; admin_notes: string }) => {
      const { error } = await supabase
        .from('moderation_queue')
        .update({ status, admin_notes, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-moderation-queue'] });
      setActionDialog(null);
      setNotes('');
      toast.success('Item updated');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const items = data?.items || [];
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-success/10 text-success border-success/20">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      case 'escalated': return <Badge className="bg-warning/10 text-warning border-warning/20">Escalated</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  const pending = items.filter(i => i.status === 'pending').length;

  return (
    <AdminLayout title="Content Moderation">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatsCard title="Queue Items" value={data?.total || 0} icon={ShieldAlert} />
        <StatsCard title="Pending Review" value={pending} icon={Clock} variant="warning" />
        <StatsCard title="Resolved" value={(data?.total || 0) - pending} icon={CheckCircle} variant="success" />
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">No items in moderation queue</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="secondary">{item.content_type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{item.reason}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(item.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status === 'pending' && (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="text-success" onClick={() => setActionDialog({ item, action: 'approved' })}>
                            <CheckCircle className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setActionDialog({ item, action: 'rejected' })}>
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                          <Button variant="ghost" size="sm" className="text-warning" onClick={() => setActionDialog({ item, action: 'escalated' })}>
                            <AlertTriangle className="h-4 w-4 mr-1" /> Escalate
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />

      <Dialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setNotes(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === 'approved' ? 'Approve' : actionDialog?.action === 'rejected' ? 'Reject' : 'Escalate'} Item
            </DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Add notes (optional)..." value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-24" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog(null); setNotes(''); }}>Cancel</Button>
            <Button onClick={() => {
              if (actionDialog) {
                updateMutation.mutate({ id: actionDialog.item.id, status: actionDialog.action, admin_notes: notes });
              }
            }} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
