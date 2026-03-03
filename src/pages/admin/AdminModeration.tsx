import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AdminDateRangeFilter } from '@/components/admin/AdminDateRangeFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatsCard } from '@/components/admin/StatsCard';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { ShieldAlert, Clock, CheckCircle, XCircle, AlertTriangle, Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PaginationControls } from '@/components/admin/PaginationControls';
import { exportToCSV } from '@/lib/adminExport';

const PAGE_SIZE = 20;

export default function AdminModeration() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionDialog, setActionDialog] = useState<{ item: any; action: string } | null>(null);
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-moderation-queue', statusFilter, page, dateRange],
    queryFn: async () => {
      let query = supabase.from('moderation_queue').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (dateRange) {
        query = query.gte('created_at', dateRange.from.toISOString()).lte('created_at', dateRange.to.toISOString());
      }
      const { data, error, count } = await query;
      if (error) throw error;
      return { items: data, total: count || 0 };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: string; admin_notes: string }) => {
      const { error } = await supabase.from('moderation_queue').update({ status, admin_notes, reviewed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-moderation-queue'] }); setActionDialog(null); setNotes(''); toast.success('Item updated'); },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      for (const id of ids) {
        const { error } = await supabase.from('moderation_queue').update({ status, admin_notes: notes, reviewed_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-moderation-queue'] }); setSelectedIds(new Set()); setNotes(''); toast.success('Bulk action completed'); },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const items = data?.items || [];
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const filteredItems = items.filter((item: any) =>
    !search || item.reason?.toLowerCase().includes(search.toLowerCase()) || item.content_type?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => { const next = new Set(selectedIds); next.has(id) ? next.delete(id) : next.add(id); setSelectedIds(next); };
  const toggleSelectAll = () => { selectedIds.size === filteredItems.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(filteredItems.map((i: any) => i.id))); };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-success/10 text-success border-success/20">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      case 'escalated': return <Badge className="bg-warning/10 text-warning border-warning/20">Escalated</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  const pending = items.filter((i: any) => i.status === 'pending').length;

  const handleExport = () => {
    if (!filteredItems.length) return;
    exportToCSV(
      filteredItems.map((item: any) => ({ type: item.content_type, reason: item.reason, status: item.status, created: item.created_at, notes: item.admin_notes || '' })),
      'admin-moderation',
      [{ key: 'type', label: 'Type' }, { key: 'reason', label: 'Reason' }, { key: 'status', label: 'Status' }, { key: 'created', label: 'Created' }, { key: 'notes', label: 'Admin Notes' }]
    );
    toast.success('Moderation data exported');
  };

  return (
    <AdminLayout title="Content Moderation">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatsCard title="Queue Items" value={data?.total || 0} icon={ShieldAlert} />
        <StatsCard title="Pending Review" value={pending} icon={Clock} variant="warning" />
        <StatsCard title="Resolved" value={(data?.total || 0) - pending} icon={CheckCircle} variant="success" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search moderation queue..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>
        <AdminDateRangeFilter value={dateRange} onChange={setDateRange} />
        <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </div>

      <Card className="rounded-xl border-border/40 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">No items in moderation queue</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedIds.size === filteredItems.length && filteredItems.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item: any) => (
                  <TableRow key={item.id} data-state={selectedIds.has(item.id) ? 'selected' : undefined}>
                    <TableCell><Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} /></TableCell>
                    <TableCell><Badge variant="secondary">{item.content_type}</Badge></TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{item.reason}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(item.created_at), 'MMM d, yyyy')}</TableCell>
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

      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onApprove={() => bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), status: 'approved' })}
        onReject={() => bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), status: 'rejected' })}
        onExport={handleExport}
        isProcessing={bulkUpdateMutation.isPending}
        entityType="job"
      />

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
              if (actionDialog) updateMutation.mutate({ id: actionDialog.item.id, status: actionDialog.action, admin_notes: notes });
            }} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
