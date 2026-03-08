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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminDateRangeFilter } from '@/components/admin/AdminDateRangeFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { ShieldAlert, Clock, CheckCircle, XCircle, AlertTriangle, Search, Download, Eye, MessageSquare, Briefcase, User, FileText, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { PaginationControls } from '@/components/admin/PaginationControls';
import { exportToCSV } from '@/lib/adminExport';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

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

function ContentTypeIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ElementType; color: string }> = {
    job: { icon: Briefcase, color: 'text-primary bg-primary/10' },
    profile: { icon: User, color: 'text-sky-600 bg-sky-500/10' },
    message: { icon: MessageSquare, color: 'text-violet-600 bg-violet-500/10' },
    review: { icon: FileText, color: 'text-amber-600 bg-amber-500/10' },
  };
  const entry = map[type?.toLowerCase()] || { icon: Flag, color: 'text-muted-foreground bg-muted' };
  const Ic = entry.icon;
  return (
    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', entry.color)}>
      <Ic className="h-4 w-4" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'approved': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-[11px]"><CheckCircle className="h-3 w-3" />Approved</Badge>;
    case 'rejected': return <Badge variant="destructive" className="gap-1 text-[11px]"><XCircle className="h-3 w-3" />Rejected</Badge>;
    case 'escalated': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-[11px]"><AlertTriangle className="h-3 w-3" />Escalated</Badge>;
    default: return <Badge variant="outline" className="gap-1 text-[11px]"><Clock className="h-3 w-3" />Pending</Badge>;
  }
}

function DetailDialog({ item, open, onClose }: { item: any; open: boolean; onClose: () => void }) {
  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <ContentTypeIcon type={item.content_type} />
            <div>
              <DialogTitle className="text-lg">Moderation Item</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="text-xs">{item.content_type}</Badge>
                <StatusBadge status={item.status} />
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Reason / Description</p>
            <p className="text-sm leading-relaxed">{item.reason || 'No reason provided'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Content ID</p>
              <p className="text-sm font-mono truncate">{item.content_id?.slice(0, 12) || item.id?.slice(0, 12)}…</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Reported</p>
              <p className="text-sm">{format(new Date(item.created_at), 'PPP')}</p>
            </div>
            {item.reporter_id && (
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Reporter ID</p>
                <p className="text-sm font-mono truncate">{item.reporter_id?.slice(0, 12)}…</p>
              </div>
            )}
            {item.reviewed_at && (
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Reviewed</p>
                <p className="text-sm">{format(new Date(item.reviewed_at), 'PPP')}</p>
              </div>
            )}
          </div>

          {item.admin_notes && (
            <div className="rounded-xl border border-border/60 p-4">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Admin Notes</p>
              <p className="text-sm leading-relaxed">{item.admin_notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Main ---

export default function AdminModeration() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionDialog, setActionDialog] = useState<{ item: any; action: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [detailItem, setDetailItem] = useState<any>(null);

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

  // Counts query
  const { data: countsData } = useQuery({
    queryKey: ['admin-moderation-counts'],
    queryFn: async () => {
      const [totalRes, pendingRes, approvedRes, rejectedRes, escalatedRes] = await Promise.all([
        supabase.from('moderation_queue').select('id', { count: 'exact', head: true }),
        supabase.from('moderation_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('moderation_queue').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('moderation_queue').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('moderation_queue').select('id', { count: 'exact', head: true }).eq('status', 'escalated'),
      ]);
      return {
        total: totalRes.count || 0,
        pending: pendingRes.count || 0,
        approved: approvedRes.count || 0,
        rejected: rejectedRes.count || 0,
        escalated: escalatedRes.count || 0,
      };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: string; admin_notes: string }) => {
      const { error } = await supabase.from('moderation_queue').update({ status, admin_notes, reviewed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-moderation-queue'] }); queryClient.invalidateQueries({ queryKey: ['admin-moderation-counts'] }); setActionDialog(null); setNotes(''); toast.success('Item updated'); },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      for (const id of ids) {
        const { error } = await supabase.from('moderation_queue').update({ status, admin_notes: notes, reviewed_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-moderation-queue'] }); queryClient.invalidateQueries({ queryKey: ['admin-moderation-counts'] }); setSelectedIds(new Set()); setNotes(''); toast.success('Bulk action completed'); },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const items = data?.items || [];
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const filteredItems = items.filter((item: any) =>
    !search || item.reason?.toLowerCase().includes(search.toLowerCase()) || item.content_type?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => { const next = new Set(selectedIds); next.has(id) ? next.delete(id) : next.add(id); setSelectedIds(next); };
  const toggleSelectAll = () => { selectedIds.size === filteredItems.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(filteredItems.map((i: any) => i.id))); };

  const totalCount = countsData?.total || 0;
  const pendingCount = countsData?.pending || 0;
  const approvedCount = countsData?.approved || 0;
  const rejectedCount = countsData?.rejected || 0;
  const escalatedCount = countsData?.escalated || 0;

  const isPending = updateMutation.isPending || bulkUpdateMutation.isPending;

  const handleExport = () => {
    if (!filteredItems.length) return;
    exportToCSV(
      filteredItems.map((item: any) => ({ type: item.content_type, reason: item.reason, status: item.status, created: item.created_at, notes: item.admin_notes || '' })),
      'admin-moderation',
      [{ key: 'type', label: 'Type' }, { key: 'reason', label: 'Reason' }, { key: 'status', label: 'Status' }, { key: 'created', label: 'Created' }, { key: 'notes', label: 'Admin Notes' }]
    );
    toast.success('Moderation data exported');
  };

  const statusTabs = [
    { value: 'all', label: 'All', count: totalCount },
    { value: 'pending', label: 'Pending', count: pendingCount },
    { value: 'approved', label: 'Approved', count: approvedCount },
    { value: 'rejected', label: 'Rejected', count: rejectedCount },
    { value: 'escalated', label: 'Escalated', count: escalatedCount },
  ];

  const actionLabel = actionDialog?.action === 'approved' ? 'Approve' : actionDialog?.action === 'rejected' ? 'Reject' : 'Escalate';
  const actionVariant = actionDialog?.action === 'approved' ? 'default' : actionDialog?.action === 'rejected' ? 'destructive' : 'default' as const;

  return (
    <AdminLayout title="Content Moderation">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KPICard title="Total Queue" value={totalCount} icon={ShieldAlert} gradient="bg-gradient-to-br from-primary to-primary/70" delay={0} />
        <KPICard title="Pending Review" value={pendingCount} icon={Clock} gradient="bg-gradient-to-br from-amber-600 to-amber-500" delay={0.05} />
        <KPICard title="Approved" value={approvedCount} icon={CheckCircle} gradient="bg-gradient-to-br from-emerald-600 to-emerald-500" delay={0.1} />
        <KPICard title="Escalated" value={escalatedCount} icon={AlertTriangle} gradient="bg-gradient-to-br from-destructive to-destructive/70" delay={0.15} />
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }} className="w-full sm:w-auto">
            <TabsList className="h-9 bg-muted/60 flex-wrap">
              {statusTabs.map(t => (
                <TabsTrigger key={t.value} value={t.value} className="text-xs gap-1.5 data-[state=active]:shadow-sm">
                  {t.label}
                  <span className="bg-background/80 text-[10px] px-1.5 py-0.5 rounded-full font-mono">{t.count}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex-1" />
          <AdminDateRangeFilter value={dateRange} onChange={setDateRange} />
          <Button size="sm" variant="outline" className="gap-1.5 h-9 shrink-0" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by reason or content type…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 bg-card/60 backdrop-blur-sm" />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <ShieldAlert className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">Queue is clear</p>
                <p className="text-sm mt-1">No items match your current filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10"><Checkbox checked={selectedIds.size === filteredItems.length && filteredItems.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead className="hidden md:table-cell">Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Reported</TableHead>
                    <TableHead className="text-right w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item: any) => (
                    <TableRow
                      key={item.id}
                      data-state={selectedIds.has(item.id) ? 'selected' : undefined}
                      className="group cursor-pointer"
                      onClick={() => setDetailItem(item)}
                    >
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <ContentTypeIcon type={item.content_type} />
                          <div className="min-w-0">
                            <p className="font-medium text-sm capitalize">{item.content_type}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate">{item.content_id?.slice(0, 10) || item.id?.slice(0, 10)}…</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm text-muted-foreground max-w-[250px] truncate">{item.reason || '—'}</p>
                      </TableCell>
                      <TableCell><StatusBadge status={item.status} /></TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">{format(new Date(item.created_at), 'PPP p')}</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <TooltipProvider>
                            <Tooltip><TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailItem(item)}><Eye className="h-4 w-4" /></Button>
                            </TooltipTrigger><TooltipContent><p className="text-xs">View details</p></TooltipContent></Tooltip>
                          </TooltipProvider>
                          {item.status === 'pending' && (
                            <>
                              <TooltipProvider>
                                <Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-600" onClick={() => setActionDialog({ item, action: 'approved' })}><CheckCircle className="h-4 w-4" /></Button>
                                </TooltipTrigger><TooltipContent><p className="text-xs">Approve</p></TooltipContent></Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setActionDialog({ item, action: 'rejected' })}><XCircle className="h-4 w-4" /></Button>
                                </TooltipTrigger><TooltipContent><p className="text-xs">Reject</p></TooltipContent></Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip><TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-600" onClick={() => setActionDialog({ item, action: 'escalated' })}><AlertTriangle className="h-4 w-4" /></Button>
                                </TooltipTrigger><TooltipContent><p className="text-xs">Escalate</p></TooltipContent></Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

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

      {/* Detail Dialog */}
      <DetailDialog item={detailItem} open={!!detailItem} onClose={() => setDetailItem(null)} />

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setNotes(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog?.action === 'approved' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
              {actionDialog?.action === 'rejected' && <XCircle className="h-5 w-5 text-destructive" />}
              {actionDialog?.action === 'escalated' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
              {actionLabel} Item
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.action === 'approved' && 'This content will be marked as approved and visible to users.'}
              {actionDialog?.action === 'rejected' && 'This content will be rejected and hidden from users.'}
              {actionDialog?.action === 'escalated' && 'This item will be escalated for further review by senior moderators.'}
            </DialogDescription>
          </DialogHeader>
          {actionDialog?.item?.reason && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Reported reason</p>
              <p className="text-sm">{actionDialog.item.reason}</p>
            </div>
          )}
          <Textarea placeholder="Add admin notes (optional)…" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-24" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog(null); setNotes(''); }}>Cancel</Button>
            <Button
              variant={actionVariant}
              onClick={() => {
                if (actionDialog) updateMutation.mutate({ id: actionDialog.item.id, status: actionDialog.action, admin_notes: notes });
              }}
              disabled={isPending}
            >
              {isPending ? 'Processing…' : `Confirm ${actionLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
