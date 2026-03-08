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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, XCircle, Eye, Building2, Briefcase, Flag, Clock, Search, Download, AlertTriangle, FileWarning } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { exportToCSV } from '@/lib/adminExport';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EmployerReport {
  id: string;
  employer_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface JobReport {
  id: string;
  job_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
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

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'resolved': return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-[11px]"><CheckCircle className="h-3 w-3" />Resolved</Badge>;
    case 'dismissed': return <Badge variant="secondary" className="gap-1 text-[11px]"><XCircle className="h-3 w-3" />Dismissed</Badge>;
    default: return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-[11px]"><Clock className="h-3 w-3" />Pending</Badge>;
  }
}

function ReportDetailDialog({ report, type, open, onClose }: { report: any; type: string; open: boolean; onClose: () => void }) {
  if (!report) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', type === 'employer' ? 'bg-primary/10 text-primary' : 'bg-sky-500/10 text-sky-600')}>
              {type === 'employer' ? <Building2 className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg">{type === 'employer' ? 'Employer' : 'Job'} Report</DialogTitle>
              <DialogDescription className="mt-0.5"><StatusBadge status={report.status} /></DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Reason</p>
            <p className="text-sm font-medium">{report.reason}</p>
          </div>

          {report.details && (
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Details</p>
              <p className="text-sm leading-relaxed">{report.details}</p>
            </div>
          )}

          {report.admin_notes && (
            <div className="rounded-xl border border-border/60 p-4">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Admin Notes</p>
              <p className="text-sm leading-relaxed">{report.admin_notes}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">{type === 'employer' ? 'Employer' : 'Job'} ID</p>
              <p className="text-sm font-mono truncate">{(type === 'employer' ? report.employer_id : report.job_id)?.slice(0, 12)}…</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Reporter ID</p>
              <p className="text-sm font-mono truncate">{report.reporter_id?.slice(0, 12)}…</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
            <span>Reported {format(new Date(report.created_at), 'PPP p')}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReportTable({ reports, isLoading, type, onView, onResolve, onDismiss, search }: {
  reports: any[];
  isLoading: boolean;
  type: 'employer' | 'job';
  onView: (r: any) => void;
  onResolve: (r: any) => void;
  onDismiss: (r: any) => void;
  search: string;
}) {
  const filtered = reports?.filter(r =>
    !search || r.reason?.toLowerCase().includes(search.toLowerCase()) || r.details?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (isLoading) return <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>;

  if (!filtered.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <FileWarning className="h-12 w-12 mb-3 opacity-30" />
        <p className="font-medium">No {type} reports found</p>
        <p className="text-sm mt-1">{search ? 'Try adjusting your search' : 'All clear for now'}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Report</TableHead>
          <TableHead className="hidden md:table-cell">Details</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">Reported</TableHead>
          <TableHead className="text-right w-[140px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map((report: any) => (
          <TableRow key={report.id} className="group cursor-pointer" onClick={() => onView(report)}>
            <TableCell>
              <div className="flex items-center gap-3">
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', type === 'employer' ? 'bg-primary/10 text-primary' : 'bg-sky-500/10 text-sky-600')}>
                  {type === 'employer' ? <Building2 className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate max-w-[200px]">{report.reason}</p>
                  <p className="text-xs text-muted-foreground font-mono">{(type === 'employer' ? report.employer_id : report.job_id)?.slice(0, 10)}…</p>
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <p className="text-sm text-muted-foreground max-w-[200px] truncate">{report.details || '—'}</p>
            </TableCell>
            <TableCell><StatusBadge status={report.status} /></TableCell>
            <TableCell className="hidden sm:table-cell">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
                  </TooltipTrigger>
                  <TooltipContent><p className="text-xs">{format(new Date(report.created_at), 'PPP p')}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableCell>
            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                <TooltipProvider>
                  <Tooltip><TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(report)}><Eye className="h-4 w-4" /></Button>
                  </TooltipTrigger><TooltipContent><p className="text-xs">View details</p></TooltipContent></Tooltip>
                </TooltipProvider>
                {report.status === 'pending' && (
                  <>
                    <TooltipProvider>
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-600" onClick={() => onResolve(report)}><CheckCircle className="h-4 w-4" /></Button>
                      </TooltipTrigger><TooltipContent><p className="text-xs">Resolve</p></TooltipContent></Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-muted-foreground" onClick={() => onDismiss(report)}><XCircle className="h-4 w-4" /></Button>
                      </TooltipTrigger><TooltipContent><p className="text-xs">Dismiss</p></TooltipContent></Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// --- Main ---

export default function AdminReports() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('employers');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<'employer' | 'job'>('employer');
  const [actionDialog, setActionDialog] = useState<{ type: 'resolve' | 'dismiss' | null; report: any; reportType: 'employer' | 'job' }>({ type: null, report: null, reportType: 'employer' });
  const [adminNotes, setAdminNotes] = useState('');

  const { data: employerReports, isLoading: empLoading } = useQuery({
    queryKey: ['admin-employer-reports'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employer_reports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmployerReport[];
    },
  });

  const { data: jobReports, isLoading: jobLoading } = useQuery({
    queryKey: ['admin-job-reports'],
    queryFn: async () => {
      const { data, error } = await supabase.from('job_reports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as JobReport[];
    },
  });

  const updateEmployerReportMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from('employer_reports').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-employer-reports'] }); closeAction(); toast.success('Report updated'); },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  const updateJobReportMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from('job_reports').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-job-reports'] }); closeAction(); toast.success('Report updated'); },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  const closeAction = () => { setActionDialog({ type: null, report: null, reportType: 'employer' }); setAdminNotes(''); };

  const handleAction = () => {
    if (!actionDialog.report || !actionDialog.type) return;
    const updates = { status: actionDialog.type === 'resolve' ? 'resolved' : 'dismissed', admin_notes: adminNotes || null, resolved_at: new Date().toISOString() };
    if (actionDialog.reportType === 'employer') {
      updateEmployerReportMutation.mutate({ id: actionDialog.report.id, updates });
    } else {
      updateJobReportMutation.mutate({ id: actionDialog.report.id, updates });
    }
  };

  const pendingEmp = employerReports?.filter(r => r.status === 'pending').length || 0;
  const pendingJob = jobReports?.filter(r => r.status === 'pending').length || 0;
  const totalReports = (employerReports?.length || 0) + (jobReports?.length || 0);
  const resolvedCount = (employerReports?.filter(r => r.status === 'resolved').length || 0) + (jobReports?.filter(r => r.status === 'resolved').length || 0);

  const isPending = updateEmployerReportMutation.isPending || updateJobReportMutation.isPending;
  const actionLabel = actionDialog.type === 'resolve' ? 'Resolve' : 'Dismiss';

  const handleExport = () => {
    const reports = activeTab === 'employers' ? employerReports : jobReports;
    if (!reports?.length) return;
    exportToCSV(
      reports.map(r => ({ reason: r.reason, details: r.details || '', status: r.status, reported: r.created_at, notes: r.admin_notes || '' })),
      `admin-${activeTab}-reports`,
      [{ key: 'reason', label: 'Reason' }, { key: 'details', label: 'Details' }, { key: 'status', label: 'Status' }, { key: 'reported', label: 'Reported' }, { key: 'notes', label: 'Admin Notes' }]
    );
    toast.success('Reports exported');
  };

  return (
    <AdminLayout title="Reports & Moderation">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KPICard title="Total Reports" value={totalReports} icon={Flag} gradient="bg-gradient-to-br from-primary to-primary/70" delay={0} />
        <KPICard title="Pending Review" value={pendingEmp + pendingJob} icon={Clock} gradient="bg-gradient-to-br from-amber-600 to-amber-500" delay={0.05} />
        <KPICard title="Resolved" value={resolvedCount} icon={CheckCircle} gradient="bg-gradient-to-br from-emerald-600 to-emerald-500" delay={0.1} />
        <KPICard title="Employer Reports" value={employerReports?.length || 0} icon={Building2} gradient="bg-gradient-to-br from-sky-600 to-sky-500" delay={0.15} />
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search reports by reason or details…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 bg-card/60 backdrop-blur-sm" />
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-10 shrink-0" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </motion.div>

      {/* Tabs + Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="rounded-2xl border-border/40 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="px-4 pt-4">
                <TabsList className="h-9 bg-muted/60">
                  <TabsTrigger value="employers" className="text-xs gap-1.5 data-[state=active]:shadow-sm">
                    <Building2 className="h-3.5 w-3.5" />
                    Employer Reports
                    <span className="bg-background/80 text-[10px] px-1.5 py-0.5 rounded-full font-mono">{employerReports?.length || 0}</span>
                    {pendingEmp > 0 && <span className="bg-amber-500/20 text-amber-600 text-[10px] px-1.5 py-0.5 rounded-full font-mono">{pendingEmp} new</span>}
                  </TabsTrigger>
                  <TabsTrigger value="jobs" className="text-xs gap-1.5 data-[state=active]:shadow-sm">
                    <Briefcase className="h-3.5 w-3.5" />
                    Job Reports
                    <span className="bg-background/80 text-[10px] px-1.5 py-0.5 rounded-full font-mono">{jobReports?.length || 0}</span>
                    {pendingJob > 0 && <span className="bg-amber-500/20 text-amber-600 text-[10px] px-1.5 py-0.5 rounded-full font-mono">{pendingJob} new</span>}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="employers" className="mt-0">
                <ReportTable
                  reports={employerReports || []}
                  isLoading={empLoading}
                  type="employer"
                  search={search}
                  onView={(r) => { setSelectedReport(r); setSelectedType('employer'); }}
                  onResolve={(r) => setActionDialog({ type: 'resolve', report: r, reportType: 'employer' })}
                  onDismiss={(r) => setActionDialog({ type: 'dismiss', report: r, reportType: 'employer' })}
                />
              </TabsContent>

              <TabsContent value="jobs" className="mt-0">
                <ReportTable
                  reports={jobReports || []}
                  isLoading={jobLoading}
                  type="job"
                  search={search}
                  onView={(r) => { setSelectedReport(r); setSelectedType('job'); }}
                  onResolve={(r) => setActionDialog({ type: 'resolve', report: r, reportType: 'job' })}
                  onDismiss={(r) => setActionDialog({ type: 'dismiss', report: r, reportType: 'job' })}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail Dialog */}
      <ReportDetailDialog report={selectedReport} type={selectedType} open={!!selectedReport} onClose={() => setSelectedReport(null)} />

      {/* Action Dialog */}
      <Dialog open={!!actionDialog.type} onOpenChange={() => closeAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.type === 'resolve' ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
              {actionLabel} Report
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'resolve'
                ? 'Mark this report as resolved. Action may have been taken against the reported entity.'
                : "Dismiss this report if it's invalid, spam, or doesn't violate guidelines."}
            </DialogDescription>
          </DialogHeader>
          {actionDialog.report?.reason && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Reported reason</p>
              <p className="text-sm font-medium">{actionDialog.report.reason}</p>
            </div>
          )}
          <Textarea placeholder="Add admin notes (optional)…" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="min-h-24" />
          <DialogFooter>
            <Button variant="outline" onClick={closeAction}>Cancel</Button>
            <Button
              variant={actionDialog.type === 'resolve' ? 'default' : 'secondary'}
              onClick={handleAction}
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
