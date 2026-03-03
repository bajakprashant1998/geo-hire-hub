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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Trash2, Eye, Search, Briefcase, Power, Building2, ExternalLink, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { PaginationControls } from '@/components/admin/PaginationControls';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { StatsCard } from '@/components/admin/StatsCard';
import { exportToCSV } from '@/lib/adminExport';

const PAGE_SIZE = 20;

interface Job {
  id: string;
  title: string;
  status: string;
  is_active: boolean;
  moderation_status: string;
  admin_notes: string | null;
  created_at: string;
  expires_at: string | null;
  view_count: number;
  employer: { id: string; company_name: string };
}

export default function AdminJobs() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [moderationFilter, setModerationFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [page, setPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionDialog, setActionDialog] = useState<{ type: 'approve' | 'reject' | 'delete' | 'deactivate' | 'bulk-approve' | 'bulk-reject' | 'bulk-delete' | null; job: Job | null }>({ type: null, job: null });
  const [actionReason, setActionReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-jobs', statusFilter, moderationFilter, page, dateRange],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase.from('jobs').select(`*, employer:employers!jobs_employer_id_fkey(id, company_name)`, { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
      if (statusFilter !== 'all') {
        if (statusFilter === 'active') query = query.eq('is_active', true).eq('status', 'open');
        else if (statusFilter === 'inactive') query = query.eq('is_active', false);
        else if (statusFilter === 'expired') query = query.lt('expires_at', new Date().toISOString());
      }
      if (moderationFilter !== 'all') query = query.eq('moderation_status', moderationFilter);
      if (dateRange) {
        query = query.gte('created_at', dateRange.from.toISOString()).lte('created_at', dateRange.to.toISOString());
      }
      const { data, error, count } = await query;
      if (error) throw error;
      return { jobs: data as unknown as Job[], total: count || 0 };
    },
  });

  const jobs = data?.jobs;
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const updateJobMutation = useMutation({
    mutationFn: async ({ id, updates, actionType }: { id: string; updates: Record<string, unknown>; actionType: string }) => {
      const { error } = await supabase.from('jobs').update(updates).eq('id', id);
      if (error) throw error;
      await supabase.rpc('log_admin_action', { p_action_type: actionType, p_target_type: 'job', p_target_id: id, p_details: { reason: actionReason, ...updates } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-jobs'] }); setActionDialog({ type: null, job: null }); setActionReason(''); toast.success('Job updated'); },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
      await supabase.rpc('log_admin_action', { p_action_type: 'delete', p_target_type: 'job', p_target_id: id, p_details: { reason: actionReason } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-jobs'] }); setActionDialog({ type: null, job: null }); setActionReason(''); toast.success('Job deleted'); },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: string }) => {
      for (const id of ids) {
        if (action === 'delete') {
          await supabase.from('jobs').delete().eq('id', id);
        } else if (action === 'approve') {
          await supabase.from('jobs').update({ moderation_status: 'approved', moderated_at: new Date().toISOString() }).eq('id', id);
          await supabase.rpc('log_admin_action', { p_action_type: 'approve', p_target_type: 'job', p_target_id: id, p_details: { bulk: true } });
        } else if (action === 'reject') {
          await supabase.from('jobs').update({ moderation_status: 'rejected', is_active: false, admin_notes: actionReason, moderated_at: new Date().toISOString() }).eq('id', id);
          await supabase.rpc('log_admin_action', { p_action_type: 'reject', p_target_type: 'job', p_target_id: id, p_details: { reason: actionReason, bulk: true } });
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-jobs'] }); setActionDialog({ type: null, job: null }); setActionReason(''); setSelectedIds(new Set()); toast.success('Bulk action completed'); },
    onError: (error) => toast.error('Bulk action failed: ' + error.message),
  });

  const handleAction = () => {
    if (!actionDialog.type) return;
    if (actionDialog.type === 'bulk-approve') { bulkMutation.mutate({ ids: Array.from(selectedIds), action: 'approve' }); return; }
    if (actionDialog.type === 'bulk-reject') { bulkMutation.mutate({ ids: Array.from(selectedIds), action: 'reject' }); return; }
    if (actionDialog.type === 'bulk-delete') { bulkMutation.mutate({ ids: Array.from(selectedIds), action: 'delete' }); return; }
    if (!actionDialog.job) return;
    if (actionDialog.type === 'delete') { deleteJobMutation.mutate(actionDialog.job.id); return; }
    const updates: Record<string, unknown> = {};
    switch (actionDialog.type) {
      case 'approve': updates.moderation_status = 'approved'; updates.moderated_at = new Date().toISOString(); break;
      case 'reject': updates.moderation_status = 'rejected'; updates.admin_notes = actionReason; updates.is_active = false; updates.moderated_at = new Date().toISOString(); break;
      case 'deactivate': updates.is_active = false; updates.admin_notes = actionReason; break;
    }
    updateJobMutation.mutate({ id: actionDialog.job.id, updates, actionType: actionDialog.type });
  };

  const filteredJobs = jobs?.filter((job) => job.title.toLowerCase().includes(search.toLowerCase()) || job.employer?.company_name?.toLowerCase().includes(search.toLowerCase()));

  const toggleSelect = (id: string) => { const next = new Set(selectedIds); next.has(id) ? next.delete(id) : next.add(id); setSelectedIds(next); };
  const toggleSelectAll = () => { selectedIds.size === (filteredJobs?.length || 0) ? setSelectedIds(new Set()) : setSelectedIds(new Set(filteredJobs?.map(j => j.id) || [])); };

  const handleExport = () => {
    if (!filteredJobs?.length) return;
    exportToCSV(
      filteredJobs.map(j => ({ title: j.title, company: j.employer?.company_name, status: j.is_active ? 'Active' : 'Inactive', moderation: j.moderation_status, views: j.view_count, created: j.created_at, expires: j.expires_at || '' })),
      'admin-jobs',
      [{ key: 'title', label: 'Title' }, { key: 'company', label: 'Company' }, { key: 'status', label: 'Status' }, { key: 'moderation', label: 'Moderation' }, { key: 'views', label: 'Views' }, { key: 'created', label: 'Created' }, { key: 'expires', label: 'Expires' }]
    );
    toast.success('Jobs exported');
  };

  const activeCount = jobs?.filter(j => j.is_active).length || 0;
  const pendingCount = jobs?.filter(j => j.moderation_status === 'pending').length || 0;

  const getModerationBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-success/10 text-success border-success/20">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const isPending = updateJobMutation.isPending || deleteJobMutation.isPending || bulkMutation.isPending;

  return (
    <AdminLayout title="Job Moderation">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatsCard title="Total Jobs" value={data?.total || 0} icon={Briefcase} />
        <StatsCard title="Active" value={activeCount} icon={Briefcase} variant="success" />
        <StatsCard title="Pending Moderation" value={pendingCount} icon={Eye} variant="warning" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={moderationFilter} onValueChange={setModerationFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Moderation" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <AdminDateRangeFilter value={dateRange} onChange={setDateRange} />
        <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </div>

      {/* Jobs Table */}
      <Card className="rounded-xl border-border/40 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedIds.size === (filteredJobs?.length || 0) && selectedIds.size > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Moderation</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs?.map((job) => (
                  <TableRow key={job.id} data-state={selectedIds.has(job.id) ? 'selected' : undefined}>
                    <TableCell><Checkbox checked={selectedIds.has(job.id)} onCheckedChange={() => toggleSelect(job.id)} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate max-w-[200px]">{job.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1"><Building2 className="h-3 w-3 text-muted-foreground" />{job.employer?.company_name}</div>
                    </TableCell>
                    <TableCell>{job.is_active ? <Badge className="bg-success/10 text-success border-success/20">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                    <TableCell>{getModerationBadge(job.moderation_status)}</TableCell>
                    <TableCell className="tabular-nums">{job.view_count}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{format(new Date(job.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedJob(job)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" asChild><Link to={`/jobs/${job.id}`}><ExternalLink className="h-4 w-4" /></Link></Button>
                        {job.moderation_status === 'pending' && (
                          <>
                            <Button variant="ghost" size="icon" className="text-success hover:text-success" onClick={() => setActionDialog({ type: 'approve', job })}><CheckCircle className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setActionDialog({ type: 'reject', job })}><XCircle className="h-4 w-4" /></Button>
                          </>
                        )}
                        {job.is_active && (
                          <Button variant="ghost" size="icon" className="text-warning hover:text-warning" onClick={() => setActionDialog({ type: 'deactivate', job })}><Power className="h-4 w-4" /></Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setActionDialog({ type: 'delete', job })}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onApprove={() => setActionDialog({ type: 'bulk-approve', job: null })}
        onReject={() => setActionDialog({ type: 'bulk-reject', job: null })}
        onDelete={() => setActionDialog({ type: 'bulk-delete', job: null })}
        isProcessing={isPending}
        entityType="job"
      />

      {/* Detail Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedJob?.title}</DialogTitle>
            <DialogDescription>Posted by {selectedJob?.employer?.company_name}</DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Status</p><p className="font-medium">{selectedJob.is_active ? 'Active' : 'Inactive'}</p></div>
                <div><p className="text-sm text-muted-foreground">Moderation</p><p className="font-medium capitalize">{selectedJob.moderation_status}</p></div>
                <div><p className="text-sm text-muted-foreground">Views</p><p className="font-medium">{selectedJob.view_count}</p></div>
                <div><p className="text-sm text-muted-foreground">Created</p><p className="font-medium">{format(new Date(selectedJob.created_at), 'MMM d, yyyy')}</p></div>
              </div>
              {selectedJob.admin_notes && (
                <div><p className="text-sm text-muted-foreground">Admin Notes</p><p className="text-sm bg-muted p-3 rounded-lg">{selectedJob.admin_notes}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog.type} onOpenChange={() => { setActionDialog({ type: null, job: null }); setActionReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'approve' && 'Approve Job'}
              {actionDialog.type === 'reject' && 'Reject Job'}
              {actionDialog.type === 'deactivate' && 'Deactivate Job'}
              {actionDialog.type === 'delete' && 'Delete Job'}
              {actionDialog.type === 'bulk-approve' && `Approve ${selectedIds.size} Jobs`}
              {actionDialog.type === 'bulk-reject' && `Reject ${selectedIds.size} Jobs`}
              {actionDialog.type === 'bulk-delete' && `Delete ${selectedIds.size} Jobs`}
            </DialogTitle>
          </DialogHeader>
          {(actionDialog.type !== 'approve' && actionDialog.type !== 'bulk-approve') && (
            <Textarea placeholder="Enter reason..." value={actionReason} onChange={(e) => setActionReason(e.target.value)} className="min-h-24" />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog({ type: null, job: null }); setActionReason(''); }}>Cancel</Button>
            <Button
              variant={actionDialog.type === 'approve' || actionDialog.type === 'bulk-approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={isPending || (actionDialog.type !== 'approve' && actionDialog.type !== 'bulk-approve' && !actionReason.trim())}
            >
              {isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
