import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckCircle, XCircle, Ban, Clock, ShieldCheck, Eye, Search, Building2, ExternalLink, Trash2,
  ChevronDown, Plus, FileText, ShieldAlert, Download, Globe, MoreVertical, CalendarDays,
  TrendingUp, AlertTriangle, Shield, Sparkles, BarChart3,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { VerificationBadge } from '@/components/employer/VerificationBadge';
import { PaginationControls } from '@/components/admin/PaginationControls';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

/* ─── Reusable KPI Card ─── */
function KPICard({ index, title, value, icon: Icon, gradient, subtitle }: {
  index: number; title: string; value: string | number; icon: React.ElementType; gradient: string; subtitle?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07, duration: 0.35 }}>
      <Card className="relative overflow-hidden border-0 shadow-lg">
        <div className={cn('absolute inset-0 opacity-[0.08] bg-gradient-to-br', gradient)} />
        <CardContent className="p-5 flex items-center gap-4 relative">
          <div className={cn('rounded-xl p-2.5 bg-gradient-to-br text-white shadow-md', gradient)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold leading-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Filter Chip ─── */
function FilterChip({ label, count, active, onClick, color }: { label: string; count?: number; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
      active ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
    )}>
      {color && <span className={cn('w-2 h-2 rounded-full', color)} />}
      {label}
      {count !== undefined && (
        <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold min-w-[18px] text-center',
          active ? 'bg-primary-foreground/20' : 'bg-background'
        )}>{count}</span>
      )}
    </button>
  );
}

/* ─── Trust Score Bar ─── */
function TrustScoreBar({ score }: { score: number | null }) {
  if (score == null || score === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const color = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-destructive';
  const textColor = score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-destructive';
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn('text-xs font-bold tabular-nums', textColor)}>{score}</span>
    </div>
  );
}

/* ─── Verification Status Badge ─── */
function StatusBadge({ status, isSuspended }: { status: string; isSuspended: boolean }) {
  if (isSuspended) return <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1 text-[10px]"><Ban className="h-3 w-3" />Suspended</Badge>;
  switch (status) {
    case 'approved': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-[10px]"><CheckCircle className="h-3 w-3" />Approved</Badge>;
    case 'rejected': return <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1 text-[10px]"><XCircle className="h-3 w-3" />Rejected</Badge>;
    default: return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-[10px]"><Clock className="h-3 w-3" />Pending</Badge>;
  }
}

// ── Employer Detail Tabs ──
function EmployerDetailTabs({ employer }: { employer: Employer }) {
  const { data: checks, isLoading: checksLoading } = useQuery({
    queryKey: ['employer-verification-checks', employer.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('employer_verification_checks').select('*').eq('employer_id', employer.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="w-full rounded-xl bg-muted/60">
        <TabsTrigger value="info" className="flex-1 rounded-lg">Details</TabsTrigger>
        <TabsTrigger value="checks" className="flex-1 rounded-lg">AI Decision Log</TabsTrigger>
      </TabsList>
      <TabsContent value="info">
        <div className="space-y-5 pt-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Owner', value: employer.profile?.full_name, icon: Eye },
              { label: 'Industry', value: employer.industry || '—', icon: Building2 },
              { label: 'Country', value: employer.country_code || '—', icon: Globe },
              { label: 'Tax ID', value: employer.tax_id || '—', icon: FileText },
              { label: 'Trust Score', value: `${employer.trust_score ?? 0}/100`, icon: Shield },
              { label: 'Verification', value: employer.verification_method || '—', icon: ShieldCheck },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-muted/20 border space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  <item.icon className="h-3 w-3" />{item.label}
                </div>
                <p className="text-sm font-medium truncate">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Trust Score visual */}
          <div className="p-4 rounded-xl border bg-muted/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Trust Score</span>
              <span className={cn('text-lg font-bold',
                (employer.trust_score || 0) >= 80 ? 'text-emerald-600' : (employer.trust_score || 0) >= 50 ? 'text-amber-600' : 'text-destructive'
              )}>{employer.trust_score ?? 0}/100</span>
            </div>
            <Progress value={employer.trust_score || 0} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {(employer.trust_score || 0) >= 80 ? '✅ Auto-approved threshold met' : (employer.trust_score || 0) >= 50 ? '⚠️ Needs manual review' : '🚫 Below threshold'}
            </p>
          </div>

          {/* Documents */}
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Trust Documents</h4>
            <div className="grid grid-cols-2 gap-3">
              {[{ url: employer.office_photo_url, label: 'Office Photo' }, { url: employer.business_card_url, label: 'Business Card' }].map((doc, i) => (
                doc.url ? (
                  <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="block group">
                    <img src={doc.url} alt={doc.label} className="w-full h-28 object-cover rounded-xl border group-hover:ring-2 ring-primary/30 transition-all" />
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">{doc.label} <ExternalLink className="h-3 w-3" /></p>
                  </a>
                ) : (
                  <div key={i} className="h-28 bg-muted/30 rounded-xl border-dashed border-2 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">No {doc.label.toLowerCase()}</p>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="checks">
        <div className="space-y-2.5 pt-3">
          {checksLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
          ) : !checks?.length ? (
            <div className="text-center py-10 text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No AI verification checks recorded</p>
            </div>
          ) : (
            checks.map((check) => (
              <Collapsible key={check.id}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm capitalize">{check.check_type.replace(/_/g, ' ')}</span>
                      <Badge variant="outline" className={cn('text-[10px]',
                        check.status === 'pass' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        check.status === 'fail' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      )}>{check.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold tabular-nums">{check.score}/100</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 py-2 ml-7 text-sm text-muted-foreground border-l-2 border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">{format(new Date(check.created_at), 'MMM d, yyyy HH:mm')}</p>
                    {check.details && typeof check.details === 'object' && (
                      <pre className="text-xs bg-muted/50 p-2.5 rounded-lg mt-1 overflow-auto max-h-40 whitespace-pre-wrap">{JSON.stringify(check.details, null, 2)}</pre>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

// ── Blacklist Management ──
function BlacklistManagement() {
  const queryClient = useQueryClient();
  const [newType, setNewType] = useState('domain');
  const [newValue, setNewValue] = useState('');
  const [newReason, setNewReason] = useState('');

  const { data: blacklist, isLoading } = useQuery({
    queryKey: ['employer-blacklist'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employer_blacklist').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('employer_blacklist').insert({ type: newType, value: newValue.trim(), reason: newReason.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employer-blacklist'] }); setNewValue(''); setNewReason(''); toast.success('Blacklist entry added'); },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employer_blacklist').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employer-blacklist'] }); toast.success('Entry removed'); },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  return (
    <Card className="rounded-2xl border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" />Blacklist Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Select value={newType} onValueChange={setNewType}>
            <SelectTrigger className="w-full sm:w-36 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="domain">Domain</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="ip">IP</SelectItem>
              <SelectItem value="document_hash">Doc Hash</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Value…" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="flex-1 rounded-xl" />
          <Input placeholder="Reason (optional)" value={newReason} onChange={(e) => setNewReason(e.target.value)} className="flex-1 rounded-xl" />
          <Button size="sm" onClick={() => addMutation.mutate()} disabled={!newValue.trim() || addMutation.isPending} className="gap-1 rounded-xl">
            <Plus className="h-3 w-3" />Add
          </Button>
        </div>
        {isLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : !blacklist?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No blacklist entries</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Type</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Value</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Reason</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Added</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blacklist.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-muted/30">
                    <TableCell><Badge variant="outline" className="capitalize text-[10px]">{entry.type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{entry.value}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{entry.reason || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{format(new Date(entry.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="text-destructive h-7 w-7 hover:bg-destructive/10" onClick={() => deleteMutation.mutate(entry.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-employers'] }); setActionDialog({ type: null, employer: null }); setActionReason(''); toast.success('Employer updated'); },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  const deleteEmployerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('admin_delete_employer', { p_employer_id: id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-employers'] }); setActionDialog({ type: null, employer: null }); setActionReason(''); setSelectedIds(new Set()); toast.success('Employer deleted'); },
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-employers'] }); setActionDialog({ type: null, employer: null }); setActionReason(''); setSelectedIds(new Set()); toast.success('Bulk action completed'); },
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

  const toggleSelect = (id: string) => { const next = new Set(selectedIds); next.has(id) ? next.delete(id) : next.add(id); setSelectedIds(next); };
  const toggleSelectAll = () => { selectedIds.size === (filteredEmployers?.length || 0) ? setSelectedIds(new Set()) : setSelectedIds(new Set(filteredEmployers?.map(e => e.id) || [])); };

  const totalCount = data?.total || 0;
  const pendingCount = employers?.filter(e => e.verification_status === 'pending').length || 0;
  const approvedCount = employers?.filter(e => e.verification_status === 'approved').length || 0;
  const suspendedCount = employers?.filter(e => e.is_suspended).length || 0;
  const avgTrust = employers?.length ? Math.round(employers.reduce((s, e) => s + (e.trust_score || 0), 0) / employers.length) : 0;
  const isPending = updateEmployerMutation.isPending || deleteEmployerMutation.isPending || bulkMutation.isPending;

  return (
    <AdminLayout title="Employer Management">
      <TooltipProvider>
        {/* ─── Hero ─── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border bg-card/80 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Employer Management</h1>
                <p className="text-sm text-muted-foreground">Review verifications, manage trust scores & control employer access</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── KPI Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <KPICard index={0} title="Total Employers" value={totalCount} icon={Building2} gradient="from-primary to-primary/70" subtitle={`Page ${page}/${totalPages || 1}`} />
          <KPICard index={1} title="Pending Review" value={pendingCount} icon={Clock} gradient="from-amber-500 to-yellow-400" subtitle="Awaiting approval" />
          <KPICard index={2} title="Approved" value={approvedCount} icon={ShieldCheck} gradient="from-emerald-500 to-green-400" subtitle="Can post jobs" />
          <KPICard index={3} title="Suspended" value={suspendedCount} icon={Ban} gradient="from-destructive to-red-400" subtitle="Access restricted" />
          <KPICard index={4} title="Avg Trust" value={`${avgTrust}/100`} icon={Shield} gradient="from-violet-500 to-purple-400" subtitle="Trust score" />
        </div>

        {/* ─── Filters ─── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <FilterChip label="All" count={totalCount} active={statusFilter === 'all'} onClick={() => { setStatusFilter('all'); setPage(1); }} />
            <FilterChip label="Pending" count={pendingCount} active={statusFilter === 'pending'} onClick={() => { setStatusFilter('pending'); setPage(1); }} color="bg-amber-500" />
            <FilterChip label="Approved" count={approvedCount} active={statusFilter === 'approved'} onClick={() => { setStatusFilter('approved'); setPage(1); }} color="bg-emerald-500" />
            <FilterChip label="Rejected" active={statusFilter === 'rejected'} onClick={() => { setStatusFilter('rejected'); setPage(1); }} color="bg-destructive" />
            <FilterChip label="Suspended" count={suspendedCount} active={statusFilter === 'suspended'} onClick={() => { setStatusFilter('suspended'); setPage(1); }} color="bg-destructive" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search company or owner name…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
            </div>
          </div>
        </motion.div>

        {/* ─── Bulk Actions ─── */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <span className="text-sm font-semibold">{selectedIds.size} selected</span>
              <div className="flex gap-2 ml-auto flex-wrap">
                <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={() => setActionDialog({ type: 'bulk-approve', employer: null })}>
                  <CheckCircle className="h-3.5 w-3.5" />Approve
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" onClick={() => setActionDialog({ type: 'bulk-suspend', employer: null })}>
                  <Ban className="h-3.5 w-3.5" />Suspend
                </Button>
                <Button size="sm" variant="destructive" className="gap-1.5 rounded-xl" onClick={() => setActionDialog({ type: 'bulk-delete', employer: null })}>
                  <Trash2 className="h-3.5 w-3.5" />Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="rounded-xl">Clear</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Table ─── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
              ) : !filteredEmployers?.length ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No employers found</p>
                  <p className="text-xs mt-1">Try adjusting your filters or search</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-10"><Checkbox checked={selectedIds.size === filteredEmployers.length && filteredEmployers.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Company</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Trust</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Profile</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Registered</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployers.map((employer, idx) => (
                      <motion.tr
                        key={employer.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className={cn(
                          'border-b transition-colors hover:bg-muted/30 cursor-pointer group',
                          selectedIds.has(employer.id) && 'bg-primary/5'
                        )}
                        onClick={() => setSelectedEmployer(employer)}
                      >
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(employer.id)} onCheckedChange={() => toggleSelect(employer.id)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-muted/50 border flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-sm truncate">{employer.company_name}</p>
                                {employer.google_business_verified && (
                                  <Tooltip>
                                    <TooltipTrigger><Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" /></TooltipTrigger>
                                    <TooltipContent><p className="text-xs">Google Business Verified</p></TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">{employer.profile?.full_name} · {employer.industry || 'No industry'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={employer.verification_status} isSuspended={employer.is_suspended} />
                        </TableCell>
                        <TableCell><TrustScoreBar score={employer.trust_score} /></TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className={cn('h-full rounded-full',
                                    employer.profile_completeness >= 80 ? 'bg-emerald-500' : employer.profile_completeness >= 50 ? 'bg-amber-500' : 'bg-destructive'
                                  )} style={{ width: `${employer.profile_completeness}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground tabular-nums">{employer.profile_completeness}%</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">Profile completeness: {employer.profile_completeness}%</p></TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <CalendarDays className="h-3 w-3" />
                                {formatDistanceToNow(new Date(employer.created_at), { addSuffix: true })}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">{format(new Date(employer.created_at), 'PPPp')}</p></TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl w-48">
                              <DropdownMenuItem onClick={() => setSelectedEmployer(employer)} className="gap-2"><Eye className="h-4 w-4" />View Details</DropdownMenuItem>
                              <DropdownMenuItem asChild className="gap-2"><Link to={`/employers/${employer.id}`}><ExternalLink className="h-4 w-4" />View Profile</Link></DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {employer.verification_status === 'pending' && (
                                <>
                                  <DropdownMenuItem onClick={() => setActionDialog({ type: 'approve', employer })} className="gap-2 text-emerald-600">
                                    <CheckCircle className="h-4 w-4" />Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setActionDialog({ type: 'reject', employer })} className="gap-2 text-destructive">
                                    <XCircle className="h-4 w-4" />Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {!employer.is_suspended && employer.verification_status === 'approved' && (
                                <DropdownMenuItem onClick={() => setActionDialog({ type: 'suspend', employer })} className="gap-2 text-amber-600">
                                  <Ban className="h-4 w-4" />Suspend
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setActionDialog({ type: 'delete', employer })} className="gap-2 text-destructive">
                                <Trash2 className="h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />

        {/* ─── Blacklist ─── */}
        <div className="mt-6"><BlacklistManagement /></div>

        {/* ─── Detail Dialog ─── */}
        <Dialog open={!!selectedEmployer} onOpenChange={() => setSelectedEmployer(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-primary" /></div>
                <div>
                  <DialogTitle className="text-lg">{selectedEmployer?.company_name}</DialogTitle>
                  <DialogDescription className="flex items-center gap-2">
                    {selectedEmployer && <StatusBadge status={selectedEmployer.verification_status} isSuspended={selectedEmployer.is_suspended} />}
                    <span>·</span>
                    <span>{selectedEmployer?.profile?.full_name}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            {selectedEmployer && (
              <div className="space-y-4">
                <EmployerDetailTabs employer={selectedEmployer} />
                {/* Quick Actions */}
                <div className="flex gap-2 flex-wrap pt-2 border-t">
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" asChild>
                    <Link to={`/employers/${selectedEmployer.id}`}><ExternalLink className="h-3.5 w-3.5" />View Profile</Link>
                  </Button>
                  {selectedEmployer.verification_status === 'pending' && (
                    <>
                      <Button size="sm" className="gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setSelectedEmployer(null); setActionDialog({ type: 'approve', employer: selectedEmployer }); }}>
                        <CheckCircle className="h-3.5 w-3.5" />Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1.5 rounded-xl" onClick={() => { setSelectedEmployer(null); setActionDialog({ type: 'reject', employer: selectedEmployer }); }}>
                        <XCircle className="h-3.5 w-3.5" />Reject
                      </Button>
                    </>
                  )}
                  {!selectedEmployer.is_suspended && selectedEmployer.verification_status === 'approved' && (
                    <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-amber-600 hover:text-amber-700" onClick={() => { setSelectedEmployer(null); setActionDialog({ type: 'suspend', employer: selectedEmployer }); }}>
                      <Ban className="h-3.5 w-3.5" />Suspend
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ─── Action Confirmation Dialog ─── */}
        <Dialog open={!!actionDialog.type} onOpenChange={() => { setActionDialog({ type: null, employer: null }); setActionReason(''); }}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {actionDialog.type?.includes('approve') && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                {actionDialog.type?.includes('reject') && <XCircle className="h-5 w-5 text-destructive" />}
                {actionDialog.type?.includes('suspend') && <Ban className="h-5 w-5 text-amber-600" />}
                {actionDialog.type?.includes('delete') && <Trash2 className="h-5 w-5 text-destructive" />}
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
              <Textarea placeholder="Enter reason…" value={actionReason} onChange={(e) => setActionReason(e.target.value)} className="min-h-24 rounded-xl" />
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setActionDialog({ type: null, employer: null }); setActionReason(''); }} className="rounded-xl">Cancel</Button>
              <Button
                variant={actionDialog.type?.includes('approve') ? 'default' : 'destructive'}
                onClick={handleAction}
                disabled={isPending || ((actionDialog.type && ['reject', 'suspend', 'bulk-suspend'].includes(actionDialog.type)) && !actionReason.trim())}
                className="rounded-xl shadow-md"
              >
                {isPending ? 'Processing…' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </AdminLayout>
  );
}
