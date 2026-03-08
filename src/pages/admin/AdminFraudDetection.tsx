import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle, Shield, CheckCircle, Flag, Building2, Users, Bot,
  Zap, Eye, XCircle, Clock, Search, Copy, ShieldAlert, ShieldCheck,
  ArrowRight, ExternalLink, FileWarning, Fingerprint, TrendingUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Stat Card ───
function StatCard({ icon: Icon, label, value, gradient, sub, alert }: {
  icon: React.ElementType; label: string; value: number; gradient: string; sub?: string; alert?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className={cn("relative overflow-hidden border-0 shadow-lg", alert && value > 0 && "ring-1 ring-destructive/30")}>
        <div className={`absolute inset-0 ${gradient} opacity-[0.07]`} />
        <CardContent className="p-5 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-foreground">{value}</p>
                {alert && value > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                  </span>
                )}
              </div>
              {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            </div>
            <div className={`p-2.5 rounded-xl ${gradient} text-white shadow-md`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Status Badge ───
function FlagStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'open':
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1"><AlertTriangle className="h-3 w-3" />Open</Badge>;
    case 'reviewed':
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1"><CheckCircle className="h-3 w-3" />Reviewed</Badge>;
    case 'dismissed':
      return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Dismissed</Badge>;
    default:
      return <Badge variant="outline" className="capitalize">{status}</Badge>;
  }
}

// ─── Flag Type Badge ───
function FlagTypeBadge({ type }: { type: string }) {
  const label = type.replace(/_/g, ' ');
  const configs: Record<string, { icon: React.ElementType; className: string }> = {
    duplicate_tax_id: { icon: Copy, className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    rapid_job_posts: { icon: Zap, className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    bot_applications: { icon: Bot, className: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  };
  const c = configs[type] || { icon: Flag, className: '' };
  return (
    <Badge variant="outline" className={cn("gap-1 capitalize text-xs", c.className)}>
      <c.icon className="h-3 w-3" />{label}
    </Badge>
  );
}

export default function AdminFraudDetection() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('open');
  const [searchFlags, setSearchFlags] = useState('');
  const [detailFlag, setDetailFlag] = useState<any | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'reviewed' | 'dismissed' } | null>(null);

  // ─── Queries ───
  const { data: flags, isLoading: flagsLoading } = useQuery({
    queryKey: ['admin-fraud-flags', statusFilter],
    queryFn: async () => {
      let query = supabase.from('fraud_flags').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: duplicateTaxIds } = useQuery({
    queryKey: ['admin-duplicate-tax-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers').select('tax_id, company_name, id')
        .not('tax_id', 'is', null).not('tax_id', 'eq', '');
      if (error) throw error;
      const taxMap: Record<string, typeof data> = {};
      data?.forEach(e => {
        if (e.tax_id) {
          if (!taxMap[e.tax_id]) taxMap[e.tax_id] = [];
          taxMap[e.tax_id].push(e);
        }
      });
      return Object.entries(taxMap).filter(([_, v]) => v.length > 1);
    },
  });

  const { data: duplicateNames } = useQuery({
    queryKey: ['admin-duplicate-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers').select('company_name, id, verification_status');
      if (error) throw error;
      const nameMap: Record<string, typeof data> = {};
      data?.forEach(e => {
        const key = e.company_name.toLowerCase().trim();
        if (!nameMap[key]) nameMap[key] = [];
        nameMap[key].push(e);
      });
      return Object.entries(nameMap).filter(([_, v]) => v.length > 1);
    },
  });

  const { data: rapidPosters } = useQuery({
    queryKey: ['admin-rapid-posters'],
    queryFn: async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { data, error } = await supabase
        .from('jobs').select('employer_id, title, created_at')
        .gte('created_at', yesterday.toISOString()).order('created_at', { ascending: false });
      if (error) throw error;
      const empMap: Record<string, number> = {};
      data?.forEach(j => { empMap[j.employer_id] = (empMap[j.employer_id] || 0) + 1; });
      return Object.entries(empMap).filter(([_, count]) => count > 5).map(([id, count]) => ({ employer_id: id, count }));
    },
  });

  const { data: botApplicants } = useQuery({
    queryKey: ['admin-bot-applicants'],
    queryFn: async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { data, error } = await supabase
        .from('auto_apply_logs').select('candidate_id, status, created_at')
        .gte('created_at', yesterday.toISOString());
      if (error) throw error;
      const candMap: Record<string, number> = {};
      data?.forEach(a => { candMap[a.candidate_id] = (candMap[a.candidate_id] || 0) + 1; });
      return Object.entries(candMap).filter(([_, count]) => count > 20).map(([id, count]) => ({ candidate_id: id, count }));
    },
  });

  // ─── Mutations ───
  const updateFlagMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('fraud_flags')
        .update({ status, reviewed_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fraud-flags'] });
      setConfirmAction(null);
      toast.success('Flag updated');
    },
  });

  const createFlagMutation = useMutation({
    mutationFn: async (flag: { target_type: string; target_id: string; flag_type: string; details: any }) => {
      const { error } = await supabase.from('fraud_flags').insert(flag);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fraud-flags'] });
      toast.success('Fraud flag created');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  // ─── Computed ───
  const openFlags = flags?.filter(f => f.status === 'open').length || 0;
  const totalDuplicates = (duplicateTaxIds?.length || 0) + (duplicateNames?.length || 0);
  const totalThreats = (rapidPosters?.length || 0) + (botApplicants?.length || 0);

  const filteredFlags = flags?.filter(f => {
    if (!searchFlags) return true;
    return f.flag_type?.toLowerCase().includes(searchFlags.toLowerCase()) ||
      f.target_type?.toLowerCase().includes(searchFlags.toLowerCase()) ||
      f.target_id?.toLowerCase().includes(searchFlags.toLowerCase());
  });

  return (
    <AdminLayout title="Fraud Detection">
      {/* ─── KPI Stats ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={AlertTriangle} label="Open Flags" value={openFlags}
          sub={openFlags > 0 ? 'Needs attention' : 'All clear'}
          gradient="bg-gradient-to-br from-red-500 to-red-600" alert />
        <StatCard icon={Copy} label="Duplicate Accounts" value={totalDuplicates}
          sub={`${duplicateTaxIds?.length || 0} tax IDs · ${duplicateNames?.length || 0} names`}
          gradient="bg-gradient-to-br from-amber-500 to-amber-600" />
        <StatCard icon={Zap} label="Rapid Posters (24h)" value={rapidPosters?.length || 0}
          sub="5+ job posts in 24 hours"
          gradient="bg-gradient-to-br from-orange-500 to-orange-600" alert />
        <StatCard icon={Bot} label="Bot Applicants (24h)" value={botApplicants?.length || 0}
          sub="20+ auto-applies in 24 hours"
          gradient="bg-gradient-to-br from-violet-500 to-violet-600" alert />
      </div>

      {/* ─── Threat Summary ─── */}
      {(openFlags > 0 || totalThreats > 0) && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="border-destructive/20 bg-destructive/[0.02]">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-destructive/10 shrink-0">
                <ShieldAlert className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {openFlags + totalThreats} threat{openFlags + totalThreats !== 1 ? 's' : ''} detected
                </p>
                <p className="text-xs text-muted-foreground">
                  {openFlags > 0 && `${openFlags} open flag${openFlags !== 1 ? 's' : ''}`}
                  {openFlags > 0 && totalThreats > 0 && ' · '}
                  {totalThreats > 0 && `${totalThreats} suspicious pattern${totalThreats !== 1 ? 's' : ''}`}
                </p>
              </div>
              <Badge variant="destructive" className="shrink-0">Action Required</Badge>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="flags" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="flags" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Flag className="h-4 w-4" />Fraud Flags
            {openFlags > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 h-4">{openFlags}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Fingerprint className="h-4 w-4" />Duplicates
            {totalDuplicates > 0 && <Badge variant="secondary" className="text-xs ml-1">{totalDuplicates}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="patterns" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <TrendingUp className="h-4 w-4" />Suspicious Patterns
            {totalThreats > 0 && <Badge variant="secondary" className="text-xs ml-1">{totalThreats}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ─── Flags Tab ─── */}
        <TabsContent value="flags">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg">Flagged Accounts</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Review and action suspected fraudulent activity</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search flags..." value={searchFlags}
                    onChange={e => setSearchFlags(e.target.value)} className="pl-9 w-full sm:w-48" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {flagsLoading ? (
                <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : !filteredFlags?.length ? (
                <div className="text-center py-16 text-muted-foreground">
                  <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No fraud flags found</p>
                  <p className="text-sm">{statusFilter !== 'all' ? `No ${statusFilter} flags. Try changing the filter.` : 'The system is clean.'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead>Target</TableHead>
                        <TableHead>Flag Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reported</TableHead>
                        <TableHead className="text-right w-[200px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredFlags?.map((flag, i) => (
                          <motion.tr key={flag.id}
                            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                                  flag.target_type === 'employer' ? 'bg-amber-500/10' : 'bg-blue-500/10'
                                )}>
                                  {flag.target_type === 'employer' ? (
                                    <Building2 className="h-4 w-4 text-amber-600" />
                                  ) : (
                                    <Users className="h-4 w-4 text-blue-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium capitalize text-foreground">{flag.target_type}</p>
                                  <p className="text-[11px] text-muted-foreground font-mono">{flag.target_id.slice(0, 12)}…</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><FlagTypeBadge type={flag.flag_type} /></TableCell>
                            <TableCell><FlagStatusBadge status={flag.status} /></TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm text-foreground">{format(new Date(flag.created_at), 'MMM d, yyyy')}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {formatDistanceToNow(new Date(flag.created_at), { addSuffix: true })}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1"
                                  onClick={() => setDetailFlag(flag)}>
                                  <Eye className="h-3.5 w-3.5" />Details
                                </Button>
                                {flag.status === 'open' && (
                                  <>
                                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                      onClick={() => setConfirmAction({ id: flag.id, action: 'reviewed' })}>
                                      <CheckCircle className="h-3.5 w-3.5" />Review
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground"
                                      onClick={() => setConfirmAction({ id: flag.id, action: 'dismissed' })}>
                                      <XCircle className="h-3.5 w-3.5" />Dismiss
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
              {filteredFlags && filteredFlags.length > 0 && (
                <div className="px-6 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
                  Showing {filteredFlags.length} flag{filteredFlags.length !== 1 ? 's' : ''}
                  {statusFilter !== 'all' && <span> · Status: <span className="font-medium capitalize">{statusFilter}</span></span>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Duplicates Tab ─── */}
        <TabsContent value="duplicates">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Duplicate Tax IDs */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5">
                    <Fingerprint className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Duplicate Tax IDs</CardTitle>
                    <CardDescription className="text-xs">Employers sharing the same tax identifier</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!duplicateTaxIds?.length ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No duplicates found</p>
                    <p className="text-xs">All tax IDs are unique</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {duplicateTaxIds.map(([taxId, employers], i) => (
                        <motion.div key={taxId}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="border rounded-xl p-4 bg-muted/20 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className="font-mono text-xs gap-1">
                              <Fingerprint className="h-3 w-3" />{taxId}
                            </Badge>
                            <Badge variant="destructive" className="text-[10px]">{employers.length} matches</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {employers.map(e => (
                              <div key={e.id} className="flex items-center gap-1.5 bg-background border rounded-lg px-2.5 py-1.5">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs font-medium">{e.company_name}</span>
                              </div>
                            ))}
                          </div>
                          <Button size="sm" variant="outline"
                            className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => createFlagMutation.mutate({
                              target_type: 'employer', target_id: employers[0].id,
                              flag_type: 'duplicate_tax_id',
                              details: { tax_id: taxId, employer_ids: employers.map(e => e.id) },
                            })}>
                            <Flag className="h-3 w-3" />Flag for Review
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Duplicate Company Names */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5">
                    <Copy className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Duplicate Company Names</CardTitle>
                    <CardDescription className="text-xs">Companies registered with identical names</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!duplicateNames?.length ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No duplicates found</p>
                    <p className="text-xs">All company names are unique</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {duplicateNames.map(([name, employers], i) => (
                        <motion.div key={name}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="border rounded-xl p-4 bg-muted/20 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <p className="text-sm font-semibold text-foreground">{employers[0].company_name}</p>
                            <Badge variant="secondary" className="text-[10px]">{employers.length} entries</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {employers.map(e => (
                              <Badge key={e.id} variant="outline"
                                className={cn("text-xs gap-1",
                                  e.verification_status === 'approved'
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                    : e.verification_status === 'pending'
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                    : ''
                                )}>
                                {e.verification_status === 'approved' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                {e.verification_status}
                              </Badge>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Patterns Tab ─── */}
        <TabsContent value="patterns">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rapid Posters */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-500/5">
                    <Zap className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Rapid Job Posting</CardTitle>
                    <CardDescription className="text-xs">Employers posting 5+ jobs within 24 hours</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!rapidPosters?.length ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No suspicious activity</p>
                    <p className="text-xs">All posting patterns look normal</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {rapidPosters.map((rp, i) => (
                        <motion.div key={rp.employer_id}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3 p-3 border rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
                        >
                          <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground font-mono truncate">{rp.employer_id.slice(0, 16)}…</p>
                          </div>
                          <Badge variant="destructive" className="shrink-0 gap-1 text-xs">
                            <Zap className="h-3 w-3" />{rp.count} posts
                          </Badge>
                          <Button size="sm" variant="outline"
                            className="h-7 text-xs gap-1 shrink-0"
                            onClick={() => createFlagMutation.mutate({
                              target_type: 'employer', target_id: rp.employer_id,
                              flag_type: 'rapid_job_posts', details: { count: rp.count },
                            })}>
                            <Flag className="h-3 w-3" />Flag
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bot Applicants */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/15 to-violet-500/5">
                    <Bot className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Bot-like Auto-Apply</CardTitle>
                    <CardDescription className="text-xs">Candidates with 20+ auto-applies within 24 hours</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!botApplicants?.length ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No bot activity detected</p>
                    <p className="text-xs">Auto-apply usage looks healthy</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {botApplicants.map((ba, i) => (
                        <motion.div key={ba.candidate_id}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3 p-3 border rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
                        >
                          <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                            <Users className="h-4 w-4 text-violet-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground font-mono truncate">{ba.candidate_id.slice(0, 16)}…</p>
                          </div>
                          <Badge variant="destructive" className="shrink-0 gap-1 text-xs">
                            <Bot className="h-3 w-3" />{ba.count} apps
                          </Badge>
                          <Button size="sm" variant="outline"
                            className="h-7 text-xs gap-1 shrink-0"
                            onClick={() => createFlagMutation.mutate({
                              target_type: 'candidate', target_id: ba.candidate_id,
                              flag_type: 'bot_applications', details: { count: ba.count },
                            })}>
                            <Flag className="h-3 w-3" />Flag
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Flag Detail Dialog ─── */}
      <Dialog open={!!detailFlag} onOpenChange={() => setDetailFlag(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="h-4 w-4" />Flag Details</DialogTitle>
            <DialogDescription>Detailed information about this fraud flag.</DialogDescription>
          </DialogHeader>
          {detailFlag && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Type</p>
                  <p className="text-sm font-medium capitalize text-foreground">{detailFlag.target_type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</p>
                  <FlagStatusBadge status={detailFlag.status} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flag Type</p>
                  <FlagTypeBadge type={detailFlag.flag_type} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reported</p>
                  <p className="text-sm text-foreground">{format(new Date(detailFlag.created_at), 'MMM d, yyyy HH:mm')}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target ID</p>
                <p className="text-xs font-mono bg-muted/50 p-2 rounded-lg break-all">{detailFlag.target_id}</p>
              </div>
              {detailFlag.details && Object.keys(detailFlag.details).length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Additional Details</p>
                  <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-auto max-h-40 font-mono">
                    {JSON.stringify(detailFlag.details, null, 2)}
                  </pre>
                </div>
              )}
              {detailFlag.reviewed_at && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reviewed At</p>
                  <p className="text-sm text-foreground">{format(new Date(detailFlag.reviewed_at), 'MMM d, yyyy HH:mm')}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Action Confirmation ─── */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === 'reviewed' ? 'Mark as Reviewed?' : 'Dismiss this flag?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === 'reviewed'
                ? 'This flag will be marked as reviewed. You can still view it in the reviewed flags list.'
                : 'This flag will be dismissed. This action indicates no further investigation is needed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction?.action === 'reviewed'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : ''}
              onClick={() => confirmAction && updateFlagMutation.mutate({ id: confirmAction.id, status: confirmAction.action })}
            >
              {updateFlagMutation.isPending ? 'Updating...'
                : confirmAction?.action === 'reviewed' ? 'Mark Reviewed' : 'Dismiss'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
