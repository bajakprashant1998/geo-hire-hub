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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { AdminDateRangeFilter } from '@/components/admin/AdminDateRangeFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle, XCircle, Trash2, Eye, Search, Briefcase, Power, Building2, ExternalLink, Download,
  Clock, TrendingUp, AlertTriangle, BarChart3, RefreshCw, ArrowUpRight, Filter, MapPin, Calendar,
  ShieldCheck, ShieldAlert, ShieldX
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { PaginationControls } from '@/components/admin/PaginationControls';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { exportToCSV } from '@/lib/adminExport';
import { motion, AnimatePresence } from 'framer-motion';

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
  location_city?: string | null;
  location_country?: string | null;
  job_category?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  employer: { id: string; company_name: string };
}

const KPICard = ({ title, value, icon: Icon, gradient, subtitle, index }: {
  title: string; value: number | string; icon: any; gradient: string; subtitle?: string; index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.35 }}
  >
    <Card className="rounded-2xl border-border/30 bg-card/80 backdrop-blur-sm hover:shadow-md transition-all duration-300 overflow-hidden relative group">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.04] group-hover:opacity-[0.07] transition-opacity`} />
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-0.5 tabular-nums">{value}</p>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

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
  const [quickTab, setQuickTab] = useState('all');

  const { data, isLoading, refetch } = useQuery({
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

  const filteredJobs = jobs?.filter((job) => {
    const matchSearch = job.title.toLowerCase().includes(search.toLowerCase()) || job.employer?.company_name?.toLowerCase().includes(search.toLowerCase());
    if (quickTab === 'all') return matchSearch;
    if (quickTab === 'pending') return matchSearch && job.moderation_status === 'pending';
    if (quickTab === 'active') return matchSearch && job.is_active;
    if (quickTab === 'expired') return matchSearch && job.expires_at && new Date(job.expires_at) < new Date();
    return matchSearch;
  });

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
  const expiredCount = jobs?.filter(j => j.expires_at && new Date(j.expires_at) < new Date()).length || 0;
  const totalViews = jobs?.reduce((sum, j) => sum + (j.view_count || 0), 0) || 0;

  const getModerationBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1"><ShieldCheck className="h-3 w-3" />Approved</Badge>;
      case 'rejected': return <Badge variant="destructive" className="gap-1"><ShieldX className="h-3 w-3" />Rejected</Badge>;
      default: return <Badge variant="secondary" className="gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"><ShieldAlert className="h-3 w-3" />Pending</Badge>;
    }
  };

  const getStatusBadge = (job: Job) => {
    if (job.expires_at && new Date(job.expires_at) < new Date()) {
      return <Badge variant="outline" className="gap-1 border-destructive/30 text-destructive"><Clock className="h-3 w-3" />Expired</Badge>;
    }
    return job.is_active
      ? <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Active</Badge>
      : <Badge variant="secondary">Inactive</Badge>;
  };

  const isPending = updateJobMutation.isPending || deleteJobMutation.isPending || bulkMutation.isPending;

  return (
    <AdminLayout title="Job Moderation">
      <TooltipProvider>
        <div className="space-y-5">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
                <Briefcase className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Job Moderation</h2>
                <p className="text-xs text-muted-foreground">Review, approve and manage all job listings</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            </div>
          </motion.div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard index={0} title="Total Jobs" value={(data?.total || 0).toLocaleString()} icon={Briefcase} gradient="from-blue-500 to-blue-600" subtitle={`${filteredJobs?.length || 0} shown`} />
            <KPICard index={1} title="Active" value={activeCount} icon={TrendingUp} gradient="from-emerald-500 to-emerald-600" />
            <KPICard index={2} title="Pending Review" value={pendingCount} icon={AlertTriangle} gradient="from-amber-500 to-orange-500" subtitle={pendingCount > 0 ? 'Needs attention' : 'All clear'} />
            <KPICard index={3} title="Total Views" value={totalViews.toLocaleString()} icon={BarChart3} gradient="from-violet-500 to-purple-600" />
          </div>

          {/* Quick Tabs */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Tabs value={quickTab} onValueChange={setQuickTab}>
              <TabsList className="bg-muted/40 backdrop-blur-sm border border-border/30 p-1 h-auto rounded-xl">
                <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-1.5">
                  All <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{data?.total || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-1.5">
                  Pending {pendingCount > 0 && <Badge className="ml-1.5 h-5 px-1.5 text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20">{pendingCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-1.5">
                  Active <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{activeCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="expired" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-1.5">
                  Expired {expiredCount > 0 && <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">{expiredCount}</Badge>}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          {/* Filters */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by job title or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-card/60 border-border/40 rounded-xl text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36 h-9 rounded-xl bg-card/60 border-border/40 text-xs">
                <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={moderationFilter} onValueChange={(v) => { setModerationFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36 h-9 rounded-xl bg-card/60 border-border/40 text-xs">
                <ShieldCheck className="h-3 w-3 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Moderation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <AdminDateRangeFilter value={dateRange} onChange={(v) => { setDateRange(v); setPage(1); }} />
          </motion.div>

          {/* Jobs Table */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="rounded-2xl border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-10 flex-1 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : filteredJobs?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 rounded-2xl bg-muted/50 mb-4">
                      <Briefcase className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-semibold">No jobs found</p>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search query</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-border/30">
                          <TableHead className="w-10">
                            <Checkbox checked={selectedIds.size === (filteredJobs?.length || 0) && selectedIds.size > 0} onCheckedChange={toggleSelectAll} />
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Moderation</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Views</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Posted</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filteredJobs?.map((job, idx) => (
                            <motion.tr
                              key={job.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: idx * 0.02 }}
                              className={`border-b border-border/20 hover:bg-muted/30 transition-colors ${selectedIds.has(job.id) ? 'bg-primary/5' : ''} ${job.moderation_status === 'pending' ? 'border-l-2 border-l-amber-500/50' : ''}`}
                            >
                              <TableCell><Checkbox checked={selectedIds.has(job.id)} onCheckedChange={() => toggleSelect(job.id)} /></TableCell>
                              <TableCell>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm truncate max-w-[220px] block">{job.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {job.location_city && (
                                      <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                        <MapPin className="h-2.5 w-2.5" />{job.location_city}
                                      </span>
                                    )}
                                    {job.job_category && (
                                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-border/30">{job.job_category}</Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-sm truncate max-w-[140px]">{job.employer?.company_name}</span>
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(job)}</TableCell>
                              <TableCell>{getModerationBadge(job.moderation_status)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 tabular-nums text-sm">
                                  <Eye className="h-3 w-3 text-muted-foreground" />
                                  {(job.view_count || 0).toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>{format(new Date(job.created_at), 'PPP p')}</TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-0.5">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedJob(job)}><Eye className="h-3.5 w-3.5" /></Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View details</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild><Link to={`/jobs/${job.id}`}><ExternalLink className="h-3.5 w-3.5" /></Link></Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Open listing</TooltipContent>
                                  </Tooltip>
                                  {job.moderation_status === 'pending' && (
                                    <>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-600 hover:bg-emerald-500/10" onClick={() => setActionDialog({ type: 'approve', job })}>
                                            <CheckCircle className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Approve</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setActionDialog({ type: 'reject', job })}>
                                            <XCircle className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Reject</TooltipContent>
                                      </Tooltip>
                                    </>
                                  )}
                                  {job.is_active && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-600 hover:bg-amber-500/10" onClick={() => setActionDialog({ type: 'deactivate', job })}>
                                          <Power className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Deactivate</TooltipContent>
                                    </Tooltip>
                                  )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setActionDialog({ type: 'delete', job })}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pagination */}
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
            <DialogContent className="max-w-2xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  {selectedJob?.title}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Posted by {selectedJob?.employer?.company_name}
                </DialogDescription>
              </DialogHeader>
              {selectedJob && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Status', value: selectedJob.is_active ? 'Active' : 'Inactive', badge: getStatusBadge(selectedJob) },
                      { label: 'Moderation', badge: getModerationBadge(selectedJob.moderation_status) },
                      { label: 'Views', value: selectedJob.view_count.toLocaleString(), icon: Eye },
                      { label: 'Created', value: format(new Date(selectedJob.created_at), 'MMM d, yyyy') },
                      { label: 'Expires', value: selectedJob.expires_at ? format(new Date(selectedJob.expires_at), 'MMM d, yyyy') : 'No expiry' },
                      { label: 'Location', value: [selectedJob.location_city, selectedJob.location_country].filter(Boolean).join(', ') || 'Not specified' },
                    ].map((item, i) => (
                      <div key={i} className="p-3 rounded-xl bg-muted/40 border border-border/20">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                        {item.badge || <p className="text-sm font-medium">{item.value}</p>}
                      </div>
                    ))}
                  </div>
                  {selectedJob.admin_notes && (
                    <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-destructive mb-1">Admin Notes</p>
                      <p className="text-sm">{selectedJob.admin_notes}</p>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    {selectedJob.moderation_status === 'pending' && (
                      <>
                        <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => { setSelectedJob(null); setActionDialog({ type: 'approve', job: selectedJob }); }}>
                          <CheckCircle className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => { setSelectedJob(null); setActionDialog({ type: 'reject', job: selectedJob }); }}>
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" className="gap-1.5" asChild>
                      <Link to={`/jobs/${selectedJob.id}`}><ExternalLink className="h-3.5 w-3.5" /> View Listing</Link>
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Action Confirmation Dialog */}
          <Dialog open={!!actionDialog.type} onOpenChange={() => { setActionDialog({ type: null, job: null }); setActionReason(''); }}>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(actionDialog.type === 'approve' || actionDialog.type === 'bulk-approve') && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                  {(actionDialog.type === 'reject' || actionDialog.type === 'bulk-reject') && <XCircle className="h-5 w-5 text-destructive" />}
                  {actionDialog.type === 'deactivate' && <Power className="h-5 w-5 text-amber-600" />}
                  {(actionDialog.type === 'delete' || actionDialog.type === 'bulk-delete') && <Trash2 className="h-5 w-5 text-destructive" />}
                  {actionDialog.type === 'approve' && 'Approve Job'}
                  {actionDialog.type === 'reject' && 'Reject Job'}
                  {actionDialog.type === 'deactivate' && 'Deactivate Job'}
                  {actionDialog.type === 'delete' && 'Delete Job'}
                  {actionDialog.type === 'bulk-approve' && `Approve ${selectedIds.size} Jobs`}
                  {actionDialog.type === 'bulk-reject' && `Reject ${selectedIds.size} Jobs`}
                  {actionDialog.type === 'bulk-delete' && `Delete ${selectedIds.size} Jobs`}
                </DialogTitle>
                <DialogDescription>
                  {(actionDialog.type === 'approve' || actionDialog.type === 'bulk-approve')
                    ? 'This will make the job(s) visible to all candidates.'
                    : 'This action cannot be easily undone. Please provide a reason.'}
                </DialogDescription>
              </DialogHeader>
              {(actionDialog.type !== 'approve' && actionDialog.type !== 'bulk-approve') && (
                <Textarea
                  placeholder="Enter reason for this action..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="min-h-24 rounded-xl"
                />
              )}
              <DialogFooter>
                <Button variant="outline" className="rounded-xl" onClick={() => { setActionDialog({ type: null, job: null }); setActionReason(''); }}>Cancel</Button>
                <Button
                  className="rounded-xl"
                  variant={actionDialog.type === 'approve' || actionDialog.type === 'bulk-approve' ? 'default' : 'destructive'}
                  onClick={handleAction}
                  disabled={isPending || (actionDialog.type !== 'approve' && actionDialog.type !== 'bulk-approve' && !actionReason.trim())}
                >
                  {isPending ? 'Processing...' : 'Confirm'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </AdminLayout>
  );
}
