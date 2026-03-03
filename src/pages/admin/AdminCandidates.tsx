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
import { Ban, Eye, Search, User, Users, UserX, CheckCircle, Trash2, ExternalLink, Download } from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { PaginationControls } from '@/components/admin/PaginationControls';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { exportToCSV } from '@/lib/adminExport';

const PAGE_SIZE = 20;

interface Candidate {
  id: string;
  job_title: string;
  experience_years: number;
  skills: string[];
  is_blocked: boolean;
  blocked_reason: string | null;
  created_at: string;
  profile: { id: string; full_name: string; user_id: string; avatar_url: string | null; is_visible_on_map: boolean };
}

export default function AdminCandidates() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [page, setPage] = useState(1);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionDialog, setActionDialog] = useState<{ type: 'block' | 'unblock' | 'delete' | 'bulk-block' | 'bulk-unblock' | 'bulk-delete' | null; candidate: Candidate | null }>({ type: null, candidate: null });
  const [actionReason, setActionReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-candidates', statusFilter, page, dateRange],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase.from('candidates').select(`*, profile:profiles!candidates_profile_id_fkey(id, full_name, user_id, avatar_url, is_visible_on_map)`, { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
      if (statusFilter === 'blocked') query = query.eq('is_blocked', true);
      else if (statusFilter === 'active') query = query.eq('is_blocked', false);
      if (dateRange) {
        query = query.gte('created_at', dateRange.from.toISOString()).lte('created_at', dateRange.to.toISOString());
      }
      const { data, error, count } = await query;
      if (error) throw error;
      return { candidates: data as unknown as Candidate[], total: count || 0 };
    },
  });

  const candidates = data?.candidates;
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const updateCandidateMutation = useMutation({
    mutationFn: async ({ id, updates, actionType }: { id: string; updates: Record<string, unknown>; actionType: string }) => {
      const { error } = await supabase.from('candidates').update(updates).eq('id', id);
      if (error) throw error;
      await supabase.rpc('log_admin_action', { p_action_type: actionType, p_target_type: 'candidate', p_target_id: id, p_details: { reason: actionReason, ...updates } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-candidates'] }); setActionDialog({ type: null, candidate: null }); setActionReason(''); toast.success('Candidate updated'); },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('admin_delete_candidate', { p_candidate_id: id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-candidates'] }); setActionDialog({ type: null, candidate: null }); setActionReason(''); setSelectedIds(new Set()); toast.success('Candidate deleted'); },
    onError: (error) => toast.error('Failed to delete: ' + error.message),
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: string }) => {
      for (const id of ids) {
        if (action === 'delete') {
          const { error } = await supabase.rpc('admin_delete_candidate', { p_candidate_id: id });
          if (error) throw error;
        } else {
          const updates: Record<string, unknown> = action === 'block'
            ? { is_blocked: true, blocked_reason: actionReason, blocked_at: new Date().toISOString() }
            : { is_blocked: false, blocked_reason: null, blocked_at: null };
          const { error } = await supabase.from('candidates').update(updates).eq('id', id);
          if (error) throw error;
          await supabase.rpc('log_admin_action', { p_action_type: action, p_target_type: 'candidate', p_target_id: id, p_details: { reason: actionReason, bulk: true } });
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-candidates'] }); setActionDialog({ type: null, candidate: null }); setActionReason(''); setSelectedIds(new Set()); toast.success('Bulk action completed'); },
    onError: (error) => toast.error('Bulk action failed: ' + error.message),
  });

  const handleAction = () => {
    if (!actionDialog.type) return;
    if (actionDialog.type === 'bulk-block') { bulkMutation.mutate({ ids: Array.from(selectedIds), action: 'block' }); return; }
    if (actionDialog.type === 'bulk-unblock') { bulkMutation.mutate({ ids: Array.from(selectedIds), action: 'unblock' }); return; }
    if (actionDialog.type === 'bulk-delete') { bulkMutation.mutate({ ids: Array.from(selectedIds), action: 'delete' }); return; }
    if (!actionDialog.candidate) return;
    if (actionDialog.type === 'delete') { deleteCandidateMutation.mutate(actionDialog.candidate.id); return; }
    const updates: Record<string, unknown> = actionDialog.type === 'block'
      ? { is_blocked: true, blocked_reason: actionReason, blocked_at: new Date().toISOString() }
      : { is_blocked: false, blocked_reason: null, blocked_at: null };
    updateCandidateMutation.mutate({ id: actionDialog.candidate.id, updates, actionType: actionDialog.type });
  };

  const filteredCandidates = candidates?.filter((c) => c.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) || c.job_title?.toLowerCase().includes(search.toLowerCase()));
  const toggleSelect = (id: string) => { const next = new Set(selectedIds); next.has(id) ? next.delete(id) : next.add(id); setSelectedIds(next); };
  const toggleSelectAll = () => { selectedIds.size === (filteredCandidates?.length || 0) ? setSelectedIds(new Set()) : setSelectedIds(new Set(filteredCandidates?.map(c => c.id) || [])); };

  const totalCount = data?.total || 0;
  const activeCount = candidates?.filter(c => !c.is_blocked).length || 0;
  const blockedCount = candidates?.filter(c => c.is_blocked).length || 0;
  const isPending = updateCandidateMutation.isPending || deleteCandidateMutation.isPending || bulkMutation.isPending;

  const handleExport = () => {
    if (!filteredCandidates?.length) return;
    exportToCSV(
      filteredCandidates.map(c => ({ name: c.profile?.full_name, job_title: c.job_title, experience: c.experience_years, skills: c.skills?.join(', ') || '', status: c.is_blocked ? 'Blocked' : 'Active', registered: c.created_at })),
      'admin-candidates',
      [{ key: 'name', label: 'Name' }, { key: 'job_title', label: 'Job Title' }, { key: 'experience', label: 'Experience' }, { key: 'skills', label: 'Skills' }, { key: 'status', label: 'Status' }, { key: 'registered', label: 'Registered' }]
    );
    toast.success('Candidates exported');
  };

  return (
    <AdminLayout title="Candidate Management">
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatsCard title="Total Candidates" value={totalCount} icon={Users} />
        <StatsCard title="Active" value={activeCount} icon={User} variant="success" />
        <StatsCard title="Blocked" value={blockedCount} icon={UserX} variant="destructive" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search candidates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
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
            <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedIds.size === (filteredCandidates?.length || 0) && selectedIds.size > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates?.map((candidate) => (
                  <TableRow key={candidate.id} data-state={selectedIds.has(candidate.id) ? 'selected' : undefined}>
                    <TableCell><Checkbox checked={selectedIds.has(candidate.id)} onCheckedChange={() => toggleSelect(candidate.id)} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {candidate.profile?.avatar_url ? (
                          <img src={candidate.profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><User className="h-4 w-4 text-muted-foreground" /></div>
                        )}
                        <span className="font-medium">{candidate.profile?.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{candidate.job_title}</TableCell>
                    <TableCell>{candidate.experience_years} yrs</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap max-w-[180px]">
                        {candidate.skills?.slice(0, 2).map((skill) => <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>)}
                        {(candidate.skills?.length || 0) > 2 && <Badge variant="outline" className="text-xs">+{candidate.skills.length - 2}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{candidate.is_blocked ? <Badge variant="destructive">Blocked</Badge> : <Badge className="bg-success/10 text-success border-success/20">Active</Badge>}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{format(new Date(candidate.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedCandidate(candidate)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" asChild><Link to={`/candidates/${candidate.id}`}><ExternalLink className="h-4 w-4" /></Link></Button>
                        {candidate.is_blocked ? (
                          <Button variant="ghost" size="icon" className="text-success hover:text-success" onClick={() => setActionDialog({ type: 'unblock', candidate })}><CheckCircle className="h-4 w-4" /></Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setActionDialog({ type: 'block', candidate })}><Ban className="h-4 w-4" /></Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setActionDialog({ type: 'delete', candidate })}><Trash2 className="h-4 w-4" /></Button>
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

      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onSuspend={() => setActionDialog({ type: 'bulk-block', candidate: null })}
        onDelete={() => setActionDialog({ type: 'bulk-delete', candidate: null })}
        isProcessing={isPending}
        entityType="candidate"
      />

      {/* Detail Dialog */}
      <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedCandidate?.profile?.full_name}</DialogTitle>
            <DialogDescription>{selectedCandidate?.job_title}</DialogDescription>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Experience</p><p className="font-medium">{selectedCandidate.experience_years} years</p></div>
                <div><p className="text-sm text-muted-foreground">Map Visibility</p><p className="font-medium">{selectedCandidate.profile?.is_visible_on_map ? 'Visible' : 'Hidden'}</p></div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Skills</p>
                <div className="flex gap-2 flex-wrap">{selectedCandidate.skills?.map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}</div>
              </div>
              {selectedCandidate.blocked_reason && (
                <div><p className="text-sm text-muted-foreground">Block Reason</p><p className="text-sm bg-destructive/10 text-destructive p-3 rounded-lg">{selectedCandidate.blocked_reason}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog.type} onOpenChange={() => { setActionDialog({ type: null, candidate: null }); setActionReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'block' && 'Block Candidate'}
              {actionDialog.type === 'unblock' && 'Unblock Candidate'}
              {actionDialog.type === 'delete' && 'Delete Candidate'}
              {actionDialog.type === 'bulk-block' && `Block ${selectedIds.size} Candidates`}
              {actionDialog.type === 'bulk-unblock' && `Unblock ${selectedIds.size} Candidates`}
              {actionDialog.type === 'bulk-delete' && `Delete ${selectedIds.size} Candidates`}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'delete' && `Permanently delete ${actionDialog.candidate?.profile?.full_name}? This cannot be undone.`}
              {actionDialog.type === 'block' && `Provide a reason for blocking ${actionDialog.candidate?.profile?.full_name}.`}
              {actionDialog.type === 'unblock' && `Unblock ${actionDialog.candidate?.profile?.full_name}?`}
              {actionDialog.type === 'bulk-delete' && `Permanently delete ${selectedIds.size} candidates? This cannot be undone.`}
              {actionDialog.type === 'bulk-block' && `Block ${selectedIds.size} selected candidates.`}
              {actionDialog.type === 'bulk-unblock' && `Unblock ${selectedIds.size} selected candidates.`}
            </DialogDescription>
          </DialogHeader>
          {(actionDialog.type === 'block' || actionDialog.type === 'delete' || actionDialog.type === 'bulk-block' || actionDialog.type === 'bulk-delete') && (
            <Textarea placeholder="Enter reason..." value={actionReason} onChange={(e) => setActionReason(e.target.value)} className="min-h-24" />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog({ type: null, candidate: null }); setActionReason(''); }}>Cancel</Button>
            <Button
              variant={actionDialog.type === 'unblock' || actionDialog.type === 'bulk-unblock' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={isPending || ((actionDialog.type === 'block' || actionDialog.type === 'bulk-block') && !actionReason.trim())}
            >
              {isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
