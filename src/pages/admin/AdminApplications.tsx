import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminDateRangeFilter } from '@/components/admin/AdminDateRangeFilter';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search, FileText, CheckCircle, Clock, Users, XCircle, Download, RefreshCw,
  Briefcase, Building2, ExternalLink, UserCircle, ArrowUpRight, ArrowDownRight,
  Filter, Eye, Calendar, TrendingUp, Target
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { PaginationControls } from '@/components/admin/PaginationControls';
import { exportToCSV } from '@/lib/adminExport';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

const KPICard = ({ title, value, icon: Icon, gradient, subtitle, index }: {
  title: string; value: number | string; icon: any; gradient: string; subtitle?: string; index: number;
}) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.35 }}>
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

export default function AdminApplications() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [page, setPage] = useState(1);
  const [quickTab, setQuickTab] = useState('all');
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-applications', statusFilter, page, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('applications')
        .select(`
          id, status, created_at, cover_letter, kanban_stage, priority,
          candidate:candidates(id, job_title, profile:profiles(full_name, avatar_url)),
          job:jobs(id, title, location_city, employer:employers(company_name))
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (dateRange) {
        query = query.gte('created_at', dateRange.from.toISOString()).lte('created_at', dateRange.to.toISOString());
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { applications: data, total: count || 0 };
    },
  });

  const applications = data?.applications || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const filtered = applications.filter((app: any) => {
    const s = search.toLowerCase();
    const candidate = app.candidate as any;
    const job = app.job as any;
    const matchSearch = !search || (
      candidate?.profile?.full_name?.toLowerCase().includes(s) ||
      job?.title?.toLowerCase().includes(s) ||
      job?.employer?.company_name?.toLowerCase().includes(s)
    );
    if (quickTab === 'all') return matchSearch;
    if (quickTab === 'pending') return matchSearch && app.status === 'pending';
    if (quickTab === 'shortlisted') return matchSearch && app.status === 'shortlisted';
    if (quickTab === 'hired') return matchSearch && app.status === 'hired';
    if (quickTab === 'rejected') return matchSearch && app.status === 'rejected';
    return matchSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'hired': return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1"><CheckCircle className="h-3 w-3" />Hired</Badge>;
      case 'shortlisted': return <Badge className="bg-primary/10 text-primary border-primary/20 gap-1"><ArrowUpRight className="h-3 w-3" />Shortlisted</Badge>;
      case 'interviewed': return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 gap-1"><Users className="h-3 w-3" />Interviewed</Badge>;
      case 'rejected': return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
      default: return <Badge variant="secondary" className="gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"><Clock className="h-3 w-3" />Pending</Badge>;
    }
  };

  const getPriorityDot = (priority: string | null) => {
    if (!priority || priority === 'medium') return null;
    if (priority === 'high') return <span className="w-2 h-2 rounded-full bg-destructive inline-block" title="High priority" />;
    return <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" title="Low priority" />;
  };

  const pending = applications.filter((a: any) => a.status === 'pending').length;
  const shortlisted = applications.filter((a: any) => a.status === 'shortlisted').length;
  const hired = applications.filter((a: any) => a.status === 'hired').length;
  const rejected = applications.filter((a: any) => a.status === 'rejected').length;
  const conversionRate = totalCount > 0 ? ((hired / totalCount) * 100).toFixed(1) : '0';

  const handleExport = () => {
    if (!filtered.length) return;
    exportToCSV(
      filtered.map((app: any) => ({
        candidate: app.candidate?.profile?.full_name || 'Unknown',
        job: app.job?.title || 'Unknown',
        company: app.job?.employer?.company_name || '-',
        status: app.status || 'pending',
        applied: app.created_at,
      })),
      'admin-applications',
      [
        { key: 'candidate', label: 'Candidate' },
        { key: 'job', label: 'Job' },
        { key: 'company', label: 'Company' },
        { key: 'status', label: 'Status' },
        { key: 'applied', label: 'Applied' },
      ]
    );
    toast.success('Applications exported');
  };

  return (
    <AdminLayout title="Application Management">
      <TooltipProvider>
        <div className="space-y-5">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Application Management</h2>
                <p className="text-xs text-muted-foreground">Track and review all candidate applications</p>
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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KPICard index={0} title="Total" value={totalCount.toLocaleString()} icon={FileText} gradient="from-blue-500 to-blue-600" />
            <KPICard index={1} title="Pending" value={pending} icon={Clock} gradient="from-amber-500 to-orange-500" subtitle={pending > 0 ? 'Awaiting review' : 'All clear'} />
            <KPICard index={2} title="Shortlisted" value={shortlisted} icon={ArrowUpRight} gradient="from-violet-500 to-purple-600" />
            <KPICard index={3} title="Hired" value={hired} icon={CheckCircle} gradient="from-emerald-500 to-emerald-600" />
            <KPICard index={4} title="Hire Rate" value={`${conversionRate}%`} icon={Target} gradient="from-rose-500 to-pink-600" subtitle={`${rejected} rejected`} />
          </div>

          {/* Quick Tabs */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Tabs value={quickTab} onValueChange={setQuickTab}>
              <TabsList className="bg-muted/40 backdrop-blur-sm border border-border/30 p-1 h-auto rounded-xl">
                <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-1.5">
                  All <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{totalCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-1.5">
                  Pending {pending > 0 && <Badge className="ml-1.5 h-5 px-1.5 text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20">{pending}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="shortlisted" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-1.5">
                  Shortlisted <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{shortlisted}</Badge>
                </TabsTrigger>
                <TabsTrigger value="hired" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-1.5">
                  Hired <Badge className="ml-1.5 h-5 px-1.5 text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{hired}</Badge>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-1.5">
                  Rejected <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{rejected}</Badge>
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
                placeholder="Search by candidate, job, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-card/60 border-border/40 rounded-xl text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40 h-9 rounded-xl bg-card/60 border-border/40 text-xs">
                <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="interviewed">Interviewed</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <AdminDateRangeFilter value={dateRange} onChange={(v) => { setDateRange(v); setPage(1); }} />
          </motion.div>

          {/* Table */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="rounded-2xl border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <Skeleton className="h-10 flex-1 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 rounded-2xl bg-muted/50 mb-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-semibold">No applications found</p>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search query</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-border/30">
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Candidate</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Applied</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {filtered.map((app: any, idx: number) => {
                            const candidate = app.candidate as any;
                            const job = app.job as any;
                            const name = candidate?.profile?.full_name || 'Unknown';
                            const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                            return (
                              <motion.tr
                                key={app.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.02 }}
                                className={`border-b border-border/20 hover:bg-muted/30 transition-colors cursor-pointer ${app.status === 'pending' ? 'border-l-2 border-l-amber-500/50' : ''}`}
                                onClick={() => setSelectedApp(app)}
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2.5">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={candidate?.profile?.avatar_url} />
                                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        {getPriorityDot(app.priority)}
                                        <span className="font-medium text-sm truncate max-w-[160px] block">{name}</span>
                                      </div>
                                      <span className="text-[11px] text-muted-foreground truncate block">{candidate?.job_title || 'No title'}</span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="min-w-0">
                                    <span className="text-sm truncate max-w-[180px] block font-medium">{job?.title || 'Unknown'}</span>
                                    {job?.location_city && (
                                      <span className="text-[11px] text-muted-foreground">{job.location_city}</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-sm truncate max-w-[130px]">{job?.employer?.company_name || '-'}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{getStatusBadge(app.status || 'pending')}</TableCell>
                                <TableCell>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <span className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>{format(new Date(app.created_at), 'PPP p')}</TooltipContent>
                                  </Tooltip>
                                </TableCell>
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-0.5">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedApp(app)}>
                                          <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>View details</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                          <Link to={`/jobs/${job?.id}`}><Briefcase className="h-3.5 w-3.5" /></Link>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>View job</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                          <Link to={`/candidates/${candidate?.id}`}><UserCircle className="h-3.5 w-3.5" /></Link>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>View candidate</TooltipContent>
                                    </Tooltip>
                                  </div>
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />

          {/* Detail Dialog */}
          <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
            <DialogContent className="max-w-lg rounded-2xl">
              {selectedApp && (() => {
                const candidate = selectedApp.candidate as any;
                const job = selectedApp.job as any;
                const name = candidate?.profile?.full_name || 'Unknown';
                const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={candidate?.profile?.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="block">{name}</span>
                          <span className="text-sm font-normal text-muted-foreground">{candidate?.job_title || 'Candidate'}</span>
                        </div>
                      </DialogTitle>
                      <DialogDescription className="flex items-center gap-1.5 mt-1">
                        <Briefcase className="h-3.5 w-3.5" /> Applied for {job?.title} at {job?.employer?.company_name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { label: 'Status', badge: getStatusBadge(selectedApp.status || 'pending') },
                          { label: 'Applied', value: format(new Date(selectedApp.created_at), 'MMM d, yyyy') },
                          { label: 'Stage', value: selectedApp.kanban_stage || 'applied' },
                          { label: 'Priority', value: selectedApp.priority || 'medium' },
                          { label: 'Location', value: job?.location_city || 'Not specified' },
                        ].map((item, i) => (
                          <div key={i} className="p-3 rounded-xl bg-muted/40 border border-border/20">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                            {item.badge || <p className="text-sm font-medium capitalize">{item.value}</p>}
                          </div>
                        ))}
                      </div>
                      {selectedApp.cover_letter && (
                        <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Cover Letter</p>
                          <p className="text-sm leading-relaxed line-clamp-6">{selectedApp.cover_letter}</p>
                        </div>
                      )}
                      <div className="flex justify-end gap-2 pt-1">
                        <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" asChild>
                          <Link to={`/candidates/${candidate?.id}`}><UserCircle className="h-3.5 w-3.5" /> View Candidate</Link>
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5 rounded-xl" asChild>
                          <Link to={`/jobs/${job?.id}`}><Briefcase className="h-3.5 w-3.5" /> View Job</Link>
                        </Button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </AdminLayout>
  );
}
