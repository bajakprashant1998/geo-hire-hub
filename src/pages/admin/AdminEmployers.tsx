import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatsCard } from '@/components/admin/StatsCard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { 
  CheckCircle, XCircle, Ban, Clock, ShieldCheck, Eye, Search, Building2, ExternalLink, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { VerificationBadge } from '@/components/employer/VerificationBadge';
import { PaginationControls } from '@/components/admin/PaginationControls';

const PAGE_SIZE = 20;

interface Employer {
  id: string;
  company_name: string;
  industry: string | null;
  country_code: string | null;
  tax_id: string | null;
  verification_status: string;
  verification_method: string | null;
  trust_score: number | null;
  google_business_verified: boolean | null;
  is_suspended: boolean;
  profile_completeness: number;
  office_photo_url: string | null;
  business_card_url: string | null;
  created_at: string;
  profile: { full_name: string; user_id: string };
}

export default function AdminEmployers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionDialog, setActionDialog] = useState<{
    type: 'approve' | 'reject' | 'suspend' | 'delete' | 'bulk-approve' | 'bulk-suspend' | 'bulk-delete' | null;
    employer: Employer | null;
  }>({ type: null, employer: null });
  const [actionReason, setActionReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-employers', statusFilter, page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from('employers')
        .select(`*, profile:profiles!employers_profile_id_fkey(full_name, user_id)`, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (statusFilter !== 'all') {
        if (statusFilter === 'suspended') query = query.eq('is_suspended', true);
        else query = query.eq('verification_status', statusFilter);
      }
      const { data, error, count } = await query;
      if (error) throw error;
      return { employers: data as unknown as Employer[], total: count || 0 };
    },
  });

  const employers = data?.employers;
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const updateEmployerMutation = useMutation({
    mutationFn: async ({ id, updates, actionType }: { id: string; updates: Record<string, unknown>; actionType: string }) => {
      const { error } = await supabase.from('employers').update(updates).eq('id', id);
      if (error) throw error;
      await supabase.rpc('log_admin_action', { p_action_type: actionType, p_target_type: 'employer', p_target_id: id, p_details: { reason: actionReason, ...updates } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-employers'] });
      setActionDialog({ type: null, employer: null });
      setActionReason('');
      toast.success('Employer updated');
    },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  const deleteEmployerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('admin_delete_employer', { p_employer_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-employers'] });
      setActionDialog({ type: null, employer: null });
      setActionReason('');
      setSelectedIds(new Set());
      toast.success('Employer deleted');
    },
    onError: (error) => toast.error('Failed to delete: ' + error.message),
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: string }) => {
      for (const id of ids) {
        if (action === 'delete') {
          const { error } = await supabase.rpc('admin_delete_employer', { p_employer_id: id });
          if (error) throw error;
        } else if (action === 'approve') {
          const { error } = await supabase.from('employers').update({ verification_status: 'approved', verified_at: new Date().toISOString() }).eq('id', id);
          if (error) throw error;
          await supabase.rpc('log_admin_action', { p_action_type: 'approve', p_target_type: 'employer', p_target_id: id, p_details: { bulk: true } });
        } else if (action === 'suspend') {
          const { error } = await supabase.from('employers').update({ is_suspended: true, suspended_reason: actionReason, suspended_at: new Date().toISOString() }).eq('id', id);
          if (error) throw error;
          await supabase.rpc('log_admin_action', { p_action_type: 'suspend', p_target_type: 'employer', p_target_id: id, p_details: { reason: actionReason, bulk: true } });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-employers'] });
      setActionDialog({ type: null, employer: null });
      setActionReason('');
      setSelectedIds(new Set());
      toast.success('Bulk action completed');
    },
    onError: (error) => toast.error('Bulk action failed: ' + error.message),
  });

  const handleAction = () => {
    if (!actionDialog.type) return;

    if (actionDialog.type === 'bulk-approve') { bulkMutation.mutate({ ids: Array.from(selectedIds), action: 'approve' }); return; }
    if (actionDialog.type === 'bulk-suspend') { bulkMutation.mutate({ ids: Array.from(selectedIds), action: 'suspend' }); return; }
    if (actionDialog.type === 'bulk-delete') { bulkMutation.mutate({ ids: Array.from(selectedIds), action: 'delete' }); return; }

    if (!actionDialog.employer) return;

    if (actionDialog.type === 'delete') { deleteEmployerMutation.mutate(actionDialog.employer.id); return; }

    const updates: Record<string, unknown> = {};
    switch (actionDialog.type) {
      case 'approve': updates.verification_status = 'approved'; updates.verified_at = new Date().toISOString(); break;
      case 'reject': updates.verification_status = 'rejected'; updates.verification_notes = actionReason; break;
      case 'suspend': updates.is_suspended = true; updates.suspended_reason = actionReason; updates.suspended_at = new Date().toISOString(); break;
    }
    updateEmployerMutation.mutate({ id: actionDialog.employer.id, updates, actionType: actionDialog.type });
  };

  const filteredEmployers = employers?.filter((emp) =>
    emp.company_name.toLowerCase().includes(search.toLowerCase()) || emp.profile?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === (filteredEmployers?.length || 0)) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredEmployers?.map(e => e.id) || []));
  };

  const totalCount = data?.total || 0;
  const pendingCount = employers?.filter(e => e.verification_status === 'pending').length || 0;
  const approvedCount = employers?.filter(e => e.verification_status === 'approved').length || 0;
  const suspendedCount = employers?.filter(e => e.is_suspended).length || 0;
  const isPending = updateEmployerMutation.isPending || deleteEmployerMutation.isPending || bulkMutation.isPending;

  return (
    <AdminLayout title="Employer Management">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatsCard title="Total Employers" value={totalCount} icon={Building2} />
        <StatsCard title="Pending" value={pendingCount} icon={Clock} variant="warning" />
        <StatsCard title="Approved" value={approvedCount} icon={ShieldCheck} variant="success" />
        <StatsCard title="Suspended" value={suspendedCount} icon={Ban} variant="destructive" />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employers</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setActionDialog({ type: 'bulk-approve', employer: null })}>
              <CheckCircle className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setActionDialog({ type: 'bulk-suspend', employer: null })}>
              <Ban className="h-3.5 w-3.5" /> Suspend
            </Button>
            <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setActionDialog({ type: 'bulk-delete', employer: null })}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      <Card className="rounded-xl border-border/40 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedIds.size === (filteredEmployers?.length || 0) && selectedIds.size > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trust Score</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployers?.map((employer) => (
                  <TableRow key={employer.id} data-state={selectedIds.has(employer.id) ? 'selected' : undefined}>
                    <TableCell><Checkbox checked={selectedIds.has(employer.id)} onCheckedChange={() => toggleSelect(employer.id)} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{employer.company_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{employer.profile?.full_name}</TableCell>
                    <TableCell>{employer.country_code || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <VerificationBadge status={employer.verification_status as 'pending' | 'approved' | 'rejected'} size="sm" showLabel={false} verificationMethod={employer.verification_method} googleBusinessVerified={employer.google_business_verified || false} />
                        {employer.is_suspended && <Badge variant="destructive">Suspended</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {employer.trust_score != null && employer.trust_score > 0 ? (
                        <Badge variant="outline" className={
                          employer.trust_score >= 80 ? 'bg-success/10 text-success border-success/20' :
                          employer.trust_score >= 50 ? 'bg-warning/10 text-warning border-warning/20' :
                          'bg-destructive/10 text-destructive border-destructive/20'
                        }>
                          {employer.trust_score}/100
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{employer.profile_completeness}%</span>
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${employer.profile_completeness}%` }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(employer.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedEmployer(employer)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" asChild><Link to={`/employers/${employer.id}`}><ExternalLink className="h-4 w-4" /></Link></Button>
                        {employer.verification_status === 'pending' && (
                          <>
                            <Button variant="ghost" size="icon" className="text-success hover:text-success" onClick={() => setActionDialog({ type: 'approve', employer })}><CheckCircle className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setActionDialog({ type: 'reject', employer })}><XCircle className="h-4 w-4" /></Button>
                          </>
                        )}
                        {!employer.is_suspended && employer.verification_status === 'approved' && (
                          <Button variant="ghost" size="icon" className="text-warning hover:text-warning" onClick={() => setActionDialog({ type: 'suspend', employer })}><Ban className="h-4 w-4" /></Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setActionDialog({ type: 'delete', employer })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedEmployer} onOpenChange={() => setSelectedEmployer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedEmployer?.company_name}</DialogTitle>
            <DialogDescription>Employer Details</DialogDescription>
          </DialogHeader>
          {selectedEmployer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Owner</p><p className="font-medium">{selectedEmployer.profile?.full_name}</p></div>
                <div><p className="text-sm text-muted-foreground">Industry</p><p className="font-medium">{selectedEmployer.industry || '-'}</p></div>
                <div><p className="text-sm text-muted-foreground">Country</p><p className="font-medium">{selectedEmployer.country_code || '-'}</p></div>
                <div><p className="text-sm text-muted-foreground">Tax ID</p><p className="font-medium">{selectedEmployer.tax_id || '-'}</p></div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium">Trust Documents</h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedEmployer.office_photo_url ? (
                    <a href={selectedEmployer.office_photo_url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={selectedEmployer.office_photo_url} alt="Office" className="w-full h-32 object-cover rounded-lg border" />
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">Office Photo <ExternalLink className="h-3 w-3" /></p>
                    </a>
                  ) : (
                    <div className="h-32 bg-muted rounded-lg flex items-center justify-center"><p className="text-sm text-muted-foreground">No office photo</p></div>
                  )}
                  {selectedEmployer.business_card_url ? (
                    <a href={selectedEmployer.business_card_url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={selectedEmployer.business_card_url} alt="Business Card" className="w-full h-32 object-cover rounded-lg border" />
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">Business Card <ExternalLink className="h-3 w-3" /></p>
                    </a>
                  ) : (
                    <div className="h-32 bg-muted rounded-lg flex items-center justify-center"><p className="text-sm text-muted-foreground">No business card</p></div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog.type} onOpenChange={() => { setActionDialog({ type: null, employer: null }); setActionReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'approve' && 'Approve Employer'}
              {actionDialog.type === 'reject' && 'Reject Employer'}
              {actionDialog.type === 'suspend' && 'Suspend Employer'}
              {actionDialog.type === 'delete' && 'Delete Employer'}
              {actionDialog.type === 'bulk-approve' && `Approve ${selectedIds.size} Employers`}
              {actionDialog.type === 'bulk-suspend' && `Suspend ${selectedIds.size} Employers`}
              {actionDialog.type === 'bulk-delete' && `Delete ${selectedIds.size} Employers`}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' && `Approve ${actionDialog.employer?.company_name}? They will be able to post jobs.`}
              {actionDialog.type === 'reject' && `Provide a reason for rejecting ${actionDialog.employer?.company_name}.`}
              {actionDialog.type === 'suspend' && `Provide a reason for suspending ${actionDialog.employer?.company_name}.`}
              {actionDialog.type === 'delete' && `Permanently delete ${actionDialog.employer?.company_name}? All their jobs, applications, and data will be removed. This cannot be undone.`}
              {actionDialog.type === 'bulk-approve' && `Approve ${selectedIds.size} selected employers.`}
              {actionDialog.type === 'bulk-suspend' && `Suspend ${selectedIds.size} selected employers.`}
              {actionDialog.type === 'bulk-delete' && `Permanently delete ${selectedIds.size} employers? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          {(actionDialog.type && !['approve', 'bulk-approve'].includes(actionDialog.type)) && (
            <Textarea placeholder="Enter reason..." value={actionReason} onChange={(e) => setActionReason(e.target.value)} className="min-h-24" />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog({ type: null, employer: null }); setActionReason(''); }}>Cancel</Button>
            <Button
              variant={actionDialog.type?.includes('approve') ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={isPending || ((actionDialog.type && ['reject', 'suspend', 'bulk-suspend'].includes(actionDialog.type)) && !actionReason.trim())}
            >
              {isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
