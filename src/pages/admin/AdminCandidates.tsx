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
import { Ban, Eye, Search, User, Users, UserX, CheckCircle, Trash2, ExternalLink, Download, Briefcase, Clock, MapPin, Shield, Star, FileText, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { PaginationControls } from '@/components/admin/PaginationControls';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { exportToCSV } from '@/lib/adminExport';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

interface Candidate {
  id: string;
  job_title: string;
  experience_years: number;
  skills: string[];
  is_blocked: boolean;
  blocked_reason: string | null;
  created_at: string;
  city: string | null;
  country: string | null;
  availability_status: string | null;
  resume_url: string | null;
  bio: string | null;
  expected_salary: string | null;
  certifications: string[];
  remote_preference: string | null;
  profile: { id: string; full_name: string; user_id: string; avatar_url: string | null; is_visible_on_map: boolean; phone: string | null; custom_email_verified: boolean | null };
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

function AvailabilityDot({ status }: { status: string | null }) {
  const color = status === 'available' ? 'bg-emerald-500' : status === 'open_to_offers' ? 'bg-amber-500' : 'bg-muted-foreground/40';
  const label = status === 'available' ? 'Available' : status === 'open_to_offers' ? 'Open to offers' : 'Not available';
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-block h-2.5 w-2.5 rounded-full ring-2 ring-background', color)} />
        </TooltipTrigger>
        <TooltipContent side="top"><p className="text-xs">{label}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SkillPills({ skills }: { skills: string[] | null }) {
  if (!skills?.length) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex gap-1 flex-wrap max-w-[200px]">
      {skills.slice(0, 2).map((s) => (
        <Badge key={s} variant="secondary" className="text-[11px] px-1.5 py-0 font-normal">{s}</Badge>
      ))}
      {skills.length > 2 && <Badge variant="outline" className="text-[11px] px-1.5 py-0">+{skills.length - 2}</Badge>}
    </div>
  );
}

function CandidateDetailDialog({ candidate, open, onClose }: { candidate: Candidate | null; open: boolean; onClose: () => void }) {
  if (!candidate) return null;
  const sections = [
    { icon: Briefcase, label: 'Job Title', value: candidate.job_title },
    { icon: Clock, label: 'Experience', value: candidate.experience_years != null ? `${candidate.experience_years} years` : '—' },
    { icon: MapPin, label: 'Location', value: [candidate.city, candidate.country].filter(Boolean).join(', ') || '—' },
    { icon: Globe, label: 'Remote Pref', value: candidate.remote_preference || '—' },
    { icon: Star, label: 'Expected Salary', value: candidate.expected_salary || '—' },
    { icon: Shield, label: 'Map Visibility', value: candidate.profile?.is_visible_on_map ? 'Visible' : 'Hidden' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            {candidate.profile?.avatar_url ? (
              <img src={candidate.profile.avatar_url} alt="" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-primary/20" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"><User className="h-7 w-7 text-primary" /></div>
            )}
            <div>
              <DialogTitle className="text-xl">{candidate.profile?.full_name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <AvailabilityDot status={candidate.availability_status} />
                {candidate.job_title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
          {sections.map(({ icon: SIcon, label, value }) => (
            <div key={label} className="rounded-xl bg-muted/50 p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1"><SIcon className="h-3.5 w-3.5" /><span className="text-xs">{label}</span></div>
              <p className="text-sm font-medium truncate">{value}</p>
            </div>
          ))}
        </div>

        {candidate.bio && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-1">Bio</p>
            <p className="text-sm bg-muted/40 rounded-lg p-3 leading-relaxed">{candidate.bio}</p>
          </div>
        )}

        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">Skills</p>
          <div className="flex gap-1.5 flex-wrap">
            {candidate.skills?.length ? candidate.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>) : <span className="text-sm text-muted-foreground">No skills listed</span>}
          </div>
        </div>

        {candidate.certifications?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">Certifications</p>
            <div className="flex gap-1.5 flex-wrap">
              {candidate.certifications.map((c) => <Badge key={c} variant="outline" className="gap-1"><FileText className="h-3 w-3" />{c}</Badge>)}
            </div>
          </div>
        )}

        {candidate.blocked_reason && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-1">Block Reason</p>
            <p className="text-sm bg-destructive/10 text-destructive p-3 rounded-lg">{candidate.blocked_reason}</p>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4 pt-3 border-t text-xs text-muted-foreground">
          <span>ID: {candidate.id.slice(0, 8)}…</span>
          <span>·</span>
          <span>Registered {format(new Date(candidate.created_at), 'PPP')}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Main ---

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
      let query = supabase
        .from('candidates')
        .select(`*, profile:profiles!candidates_profile_id_fkey(id, full_name, user_id, avatar_url, is_visible_on_map, phone, custom_email_verified)`, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
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

  // --- Counts ---
  const { data: countsData } = useQuery({
    queryKey: ['admin-candidates-counts'],
    queryFn: async () => {
      const [totalRes, blockedRes, availableRes] = await Promise.all([
        supabase.from('candidates').select('id', { count: 'exact', head: true }),
        supabase.from('candidates').select('id', { count: 'exact', head: true }).eq('is_blocked', true),
        supabase.from('candidates').select('id', { count: 'exact', head: true }).eq('availability_status', 'available'),
      ]);
      return { total: totalRes.count || 0, blocked: blockedRes.count || 0, available: availableRes.count || 0 };
    },
  });

  // --- Mutations ---
  const updateCandidateMutation = useMutation({
    mutationFn: async ({ id, updates, actionType }: { id: string; updates: Record<string, unknown>; actionType: string }) => {
      const { error } = await supabase.from('candidates').update(updates).eq('id', id);
      if (error) throw error;
      await supabase.rpc('log_admin_action', { p_action_type: actionType, p_target_type: 'candidate', p_target_id: id, p_details: { reason: actionReason, ...updates } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-candidates'] }); queryClient.invalidateQueries({ queryKey: ['admin-candidates-counts'] }); closeAction(); toast.success('Candidate updated'); },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('admin_delete_candidate', { p_candidate_id: id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-candidates'] }); queryClient.invalidateQueries({ queryKey: ['admin-candidates-counts'] }); closeAction(); setSelectedIds(new Set()); toast.success('Candidate deleted'); },
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-candidates'] }); queryClient.invalidateQueries({ queryKey: ['admin-candidates-counts'] }); closeAction(); setSelectedIds(new Set()); toast.success('Bulk action completed'); },
    onError: (error) => toast.error('Bulk action failed: ' + error.message),
  });

  const closeAction = () => { setActionDialog({ type: null, candidate: null }); setActionReason(''); };

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

  const filteredCandidates = candidates?.filter((c) =>
    c.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.job_title?.toLowerCase().includes(search.toLowerCase()) ||
    c.skills?.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleSelect = (id: string) => { const next = new Set(selectedIds); next.has(id) ? next.delete(id) : next.add(id); setSelectedIds(next); };
  const toggleSelectAll = () => { selectedIds.size === (filteredCandidates?.length || 0) ? setSelectedIds(new Set()) : setSelectedIds(new Set(filteredCandidates?.map(c => c.id) || [])); };

  const isPending = updateCandidateMutation.isPending || deleteCandidateMutation.isPending || bulkMutation.isPending;
  const totalCount = countsData?.total || 0;
  const blockedCount = countsData?.blocked || 0;
  const activeCount = totalCount - blockedCount;
  const availableCount = countsData?.available || 0;

  const handleExport = () => {
    if (!filteredCandidates?.length) return;
    exportToCSV(
      filteredCandidates.map(c => ({ name: c.profile?.full_name, job_title: c.job_title, experience: c.experience_years, skills: c.skills?.join(', ') || '', location: [c.city, c.country].filter(Boolean).join(', '), status: c.is_blocked ? 'Blocked' : 'Active', registered: c.created_at })),
      'admin-candidates',
      [{ key: 'name', label: 'Name' }, { key: 'job_title', label: 'Job Title' }, { key: 'experience', label: 'Experience' }, { key: 'skills', label: 'Skills' }, { key: 'location', label: 'Location' }, { key: 'status', label: 'Status' }, { key: 'registered', label: 'Registered' }]
    );
    toast.success('Candidates exported');
  };

  const statusTabs = [
    { value: 'all', label: 'All', count: totalCount },
    { value: 'active', label: 'Active', count: activeCount },
    { value: 'blocked', label: 'Blocked', count: blockedCount },
  ];

  return (
    <AdminLayout title="Candidate Management">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KPICard title="Total Candidates" value={totalCount} icon={Users} gradient="bg-gradient-to-br from-primary to-primary/70" delay={0} />
        <KPICard title="Active" value={activeCount} icon={User} gradient="bg-gradient-to-br from-emerald-600 to-emerald-500" delay={0.05} />
        <KPICard title="Available Now" value={availableCount} icon={CheckCircle} gradient="bg-gradient-to-br from-sky-600 to-sky-500" delay={0.1} />
        <KPICard title="Blocked" value={blockedCount} icon={UserX} gradient="bg-gradient-to-br from-destructive to-destructive/70" delay={0.15} />
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }} className="w-full sm:w-auto">
            <TabsList className="h-9 bg-muted/60">
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
          <Input placeholder="Search by name, job title, or skill…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 bg-card/60 backdrop-blur-sm" />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
            ) : !filteredCandidates?.length ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Users className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">No candidates found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10"><Checkbox checked={selectedIds.size === (filteredCandidates?.length || 0) && selectedIds.size > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead className="hidden md:table-cell">Experience</TableHead>
                    <TableHead className="hidden lg:table-cell">Skills</TableHead>
                    <TableHead className="hidden sm:table-cell">Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Registered</TableHead>
                    <TableHead className="text-right w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((candidate) => (
                    <TableRow
                      key={candidate.id}
                      data-state={selectedIds.has(candidate.id) ? 'selected' : undefined}
                      className="group cursor-pointer"
                      onClick={() => setSelectedCandidate(candidate)}
                    >
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(candidate.id)} onCheckedChange={() => toggleSelect(candidate.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {candidate.profile?.avatar_url ? (
                              <img src={candidate.profile.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><User className="h-4 w-4 text-primary" /></div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5"><AvailabilityDot status={candidate.availability_status} /></span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{candidate.profile?.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{candidate.job_title}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm">{candidate.experience_years != null ? `${candidate.experience_years} yrs` : '—'}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell"><SkillPills skills={candidate.skills} /></TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground truncate block max-w-[120px]">
                          {[candidate.city, candidate.country].filter(Boolean).join(', ') || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {candidate.is_blocked ? (
                          <Badge variant="destructive" className="gap-1 text-[11px]"><Ban className="h-3 w-3" />Blocked</Badge>
                        ) : (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })}</span>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">{format(new Date(candidate.created_at), 'PPP')}</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <TooltipProvider>
                            <Tooltip><TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedCandidate(candidate)}><Eye className="h-4 w-4" /></Button>
                            </TooltipTrigger><TooltipContent><p className="text-xs">View details</p></TooltipContent></Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip><TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild><Link to={`/candidates/${candidate.id}`}><ExternalLink className="h-4 w-4" /></Link></Button>
                            </TooltipTrigger><TooltipContent><p className="text-xs">Open profile</p></TooltipContent></Tooltip>
                          </TooltipProvider>
                          {candidate.is_blocked ? (
                            <TooltipProvider>
                              <Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-600" onClick={() => setActionDialog({ type: 'unblock', candidate })}><CheckCircle className="h-4 w-4" /></Button>
                              </TooltipTrigger><TooltipContent><p className="text-xs">Unblock</p></TooltipContent></Tooltip>
                            </TooltipProvider>
                          ) : (
                            <TooltipProvider>
                              <Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setActionDialog({ type: 'block', candidate })}><Ban className="h-4 w-4" /></Button>
                              </TooltipTrigger><TooltipContent><p className="text-xs">Block</p></TooltipContent></Tooltip>
                            </TooltipProvider>
                          )}
                          <TooltipProvider>
                            <Tooltip><TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setActionDialog({ type: 'delete', candidate })}><Trash2 className="h-4 w-4" /></Button>
                            </TooltipTrigger><TooltipContent><p className="text-xs">Delete</p></TooltipContent></Tooltip>
                          </TooltipProvider>
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
        onSuspend={() => setActionDialog({ type: 'bulk-block', candidate: null })}
        onDelete={() => setActionDialog({ type: 'bulk-delete', candidate: null })}
        isProcessing={isPending}
        entityType="candidate"
      />

      {/* Detail Dialog */}
      <CandidateDetailDialog candidate={selectedCandidate} open={!!selectedCandidate} onClose={() => setSelectedCandidate(null)} />

      {/* Action Dialog */}
      <Dialog open={!!actionDialog.type} onOpenChange={() => closeAction()}>
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
            <Textarea placeholder="Enter reason…" value={actionReason} onChange={(e) => setActionReason(e.target.value)} className="min-h-24" />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeAction}>Cancel</Button>
            <Button
              variant={actionDialog.type === 'unblock' || actionDialog.type === 'bulk-unblock' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={isPending || ((actionDialog.type === 'block' || actionDialog.type === 'bulk-block') && !actionReason.trim())}
            >
              {isPending ? 'Processing…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
