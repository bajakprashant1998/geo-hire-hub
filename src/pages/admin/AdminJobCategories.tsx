import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Plus, Pencil, Trash2, Tag, Search, Sparkles, Loader2, ChevronLeft, ChevronRight,
  Filter, FileText, Image, Clock, AlertTriangle, RefreshCw, Download, Hash,
  CheckCircle, XCircle, Layers, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToCSV } from '@/lib/adminExport';

type SmartFilter = 'none' | 'has_description' | 'no_description' | 'has_icon' | 'no_icon' | 'recent';

interface JobCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const ITEMS_PER_PAGE = 50;

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

export default function AdminJobCategories() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [smartFilter, setSmartFilter] = useState<SmartFilter>('none');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<JobCategory | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<JobCategory | null>(null);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [generatingIcon, setGeneratingIcon] = useState(false);
  const [quickTab, setQuickTab] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    is_active: true,
    sort_order: 0,
  });

  const { data: queryResult, isLoading, refetch } = useQuery({
    queryKey: ['admin-job-categories', page, debouncedSearch, statusFilter, smartFilter],
    queryFn: async () => {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      let query = supabase.from('job_categories').select('*', { count: 'exact' });
      if (debouncedSearch.trim()) query = query.or(`name.ilike.%${debouncedSearch.trim()}%,description.ilike.%${debouncedSearch.trim()}%`);
      if (statusFilter === 'active') query = query.eq('is_active', true);
      else if (statusFilter === 'inactive') query = query.eq('is_active', false);
      if (smartFilter === 'has_description') query = query.not('description', 'is', null).neq('description', '');
      else if (smartFilter === 'no_description') query = query.or('description.is.null,description.eq.');
      else if (smartFilter === 'has_icon') query = query.not('icon', 'is', null).neq('icon', '');
      else if (smartFilter === 'no_icon') query = query.or('icon.is.null,icon.eq.');
      else if (smartFilter === 'recent') query = query.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      query = query.order('name', { ascending: true }).range(from, to);
      const { data, error, count } = await query;
      if (error) throw error;
      return { categories: data as JobCategory[], totalCount: count || 0 };
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-job-categories-stats'],
    queryFn: async () => {
      const [totalRes, activeRes, noDescRes, noIconRes] = await Promise.all([
        supabase.from('job_categories').select('id', { count: 'exact', head: true }),
        supabase.from('job_categories').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('job_categories').select('id', { count: 'exact', head: true }).or('description.is.null,description.eq.'),
        supabase.from('job_categories').select('id', { count: 'exact', head: true }).or('icon.is.null,icon.eq.'),
      ]);
      const total = totalRes.count || 0;
      const active = activeRes.count || 0;
      return { total, active, inactive: total - active, noDesc: noDescRes.count || 0, noIcon: noIconRes.count || 0 };
    },
  });

  const categories = queryResult?.categories || [];
  const totalCount = queryResult?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 400);
    setSearchTimeout(timeout);
  };

  const checkDuplicate = async (name: string) => {
    if (!name.trim()) { setDuplicateWarning(''); return; }
    const { data } = await supabase.from('job_categories').select('id, name').ilike('name', name.trim()).limit(1);
    if (data && data.length > 0 && data[0].id !== editingCategory?.id) {
      setDuplicateWarning(`"${data[0].name}" already exists`);
    } else {
      setDuplicateWarning('');
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('job_categories').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-job-categories'] }); queryClient.invalidateQueries({ queryKey: ['admin-job-categories-stats'] }); setDialogOpen(false); resetForm(); toast.success('Category created'); },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from('job_categories').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-job-categories'] }); queryClient.invalidateQueries({ queryKey: ['admin-job-categories-stats'] }); setDialogOpen(false); resetForm(); toast.success('Category updated'); },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('job_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-job-categories'] }); queryClient.invalidateQueries({ queryKey: ['admin-job-categories-stats'] }); setDeleteDialog(null); toast.success('Category deleted'); },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('job_categories').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-job-categories'] }); queryClient.invalidateQueries({ queryKey: ['admin-job-categories-stats'] }); toast.success('Status updated'); },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  const resetForm = () => { setFormData({ name: '', description: '', icon: '', is_active: true, sort_order: 0 }); setEditingCategory(null); setDuplicateWarning(''); };

  const openCreateDialog = () => { resetForm(); setFormData(prev => ({ ...prev, sort_order: (stats?.total || 0) + 1 })); setDialogOpen(true); };

  const openEditDialog = (category: JobCategory) => {
    setEditingCategory(category);
    setDuplicateWarning('');
    setFormData({ name: category.name, description: category.description || '', icon: category.icon || '', is_active: category.is_active, sort_order: category.sort_order });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Category name is required'); return; }
    if (duplicateWarning) { toast.error('Duplicate name'); return; }
    const { data: existing } = await supabase.from('job_categories').select('id').ilike('name', formData.name.trim()).limit(1);
    if (existing && existing.length > 0 && existing[0].id !== editingCategory?.id) {
      toast.error('Duplicate name'); setDuplicateWarning(`"${formData.name.trim()}" already exists`); return;
    }
    if (editingCategory) updateMutation.mutate({ id: editingCategory.id, data: formData });
    else createMutation.mutate(formData);
  };

  const handleGenerateDescription = async () => {
    if (!formData.name.trim()) { toast.error('Enter a category name first'); return; }
    setGeneratingDesc(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-job-description', { body: { jobTitle: formData.name.trim(), jobType: 'Category Description' } });
      if (error) throw error;
      if (typeof data?.description === 'string' && data.description.trim()) {
        setFormData(prev => ({ ...prev, description: data.description.trim() }));
        toast.success('Description generated!');
      } else toast.error('Could not generate description');
    } catch { toast.error('Failed to generate'); } finally { setGeneratingDesc(false); }
  };

  const handleGenerateIcon = async () => {
    if (!formData.name.trim()) { toast.error('Enter a category name first'); return; }
    if (!formData.description.trim()) { toast.error('Enter or generate a description first'); return; }
    setGeneratingIcon(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-job-description', { body: { jobTitle: `ICON_SUGGEST: ${formData.name.trim()}`, jobType: `Description: ${formData.description.trim().substring(0, 200)}` } });
      if (error) throw error;
      const iconMatch = (data?.description || '').match(/[a-z][a-z0-9-]*/i);
      const iconName = iconMatch ? iconMatch[0].toLowerCase().replace(/\s+/g, '-') : '';
      if (iconName) { setFormData(prev => ({ ...prev, icon: iconName })); toast.success(`Icon: ${iconName}`); }
      else toast.error('Could not suggest an icon');
    } catch { toast.error('Failed to generate'); } finally { setGeneratingIcon(false); }
  };

  const handleExport = () => {
    if (!categories.length) return;
    exportToCSV(
      categories.map(c => ({ name: c.name, description: c.description || '', icon: c.icon || '', status: c.is_active ? 'Active' : 'Inactive', created: c.created_at })),
      'job-categories',
      [{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }, { key: 'icon', label: 'Icon' }, { key: 'status', label: 'Status' }, { key: 'created', label: 'Created' }]
    );
    toast.success('Categories exported');
  };

  const handleQuickTab = (val: string) => {
    setQuickTab(val);
    if (val === 'all') { setStatusFilter('all'); setSmartFilter('none'); }
    else if (val === 'active') { setStatusFilter('active'); setSmartFilter('none'); }
    else if (val === 'inactive') { setStatusFilter('inactive'); setSmartFilter('none'); }
    else if (val === 'no_desc') { setStatusFilter('all'); setSmartFilter('no_description'); }
    else if (val === 'no_icon') { setStatusFilter('all'); setSmartFilter('no_icon'); }
    setPage(1);
  };

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const completeness = stats ? Math.round(((stats.total - stats.noDesc) / Math.max(stats.total, 1)) * 100) : 0;

  return (
    <AdminLayout title="Job Categories">
      <TooltipProvider>
        <div className="space-y-5">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
                <Tag className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Job Categories</h2>
                <p className="text-xs text-muted-foreground">Manage {stats?.total?.toLocaleString() || 0} categories across the platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
              <Button size="sm" className="gap-1.5 h-9 text-xs" onClick={openCreateDialog}>
                <Plus className="h-3.5 w-3.5" /> Add Category
              </Button>
            </div>
          </motion.div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KPICard index={0} title="Total" value={(stats?.total || 0).toLocaleString()} icon={Layers} gradient="from-blue-500 to-blue-600" />
            <KPICard index={1} title="Active" value={(stats?.active || 0).toLocaleString()} icon={CheckCircle} gradient="from-emerald-500 to-emerald-600" />
            <KPICard index={2} title="Inactive" value={(stats?.inactive || 0).toLocaleString()} icon={EyeOff} gradient="from-slate-500 to-slate-600" />
            <KPICard index={3} title="Missing Desc" value={stats?.noDesc || 0} icon={FileText} gradient="from-amber-500 to-orange-500" subtitle={stats?.noDesc ? 'Needs attention' : 'All complete'} />
            <KPICard index={4} title="Completeness" value={`${completeness}%`} icon={Tag} gradient="from-violet-500 to-purple-600" subtitle="With descriptions" />
          </div>

          {/* Quick Tabs */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <Tabs value={quickTab} onValueChange={handleQuickTab}>
              <TabsList className="bg-muted/40 backdrop-blur-sm border border-border/30 p-1 h-auto rounded-xl">
                <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-3 py-1.5">
                  All <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{stats?.total || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-3 py-1.5">
                  Active <Badge className="ml-1.5 h-5 px-1.5 text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{stats?.active || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="inactive" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-3 py-1.5">
                  Inactive <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{stats?.inactive || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="no_desc" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-3 py-1.5">
                  No Description {(stats?.noDesc || 0) > 0 && <Badge className="ml-1.5 h-5 px-1.5 text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20">{stats?.noDesc}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="no_icon" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-3 py-1.5">
                  No Icon <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{stats?.noIcon || 0}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          {/* Filters */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search categories by name or description..." value={search} onChange={(e) => handleSearchChange(e.target.value)} className="pl-9 h-9 bg-card/60 border-border/40 rounded-xl text-sm" />
            </div>
            <Select value={smartFilter} onValueChange={(v) => { setSmartFilter(v as SmartFilter); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44 h-9 rounded-xl bg-card/60 border-border/40 text-xs">
                <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Smart Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Filter</SelectItem>
                <SelectItem value="has_description">Has Description</SelectItem>
                <SelectItem value="no_description">Missing Description</SelectItem>
                <SelectItem value="has_icon">Has Icon</SelectItem>
                <SelectItem value="no_icon">Missing Icon</SelectItem>
                <SelectItem value="recent">Added Last 7 Days</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {/* Active filter chips */}
          {(smartFilter !== 'none' || debouncedSearch) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Filters:</span>
              {debouncedSearch && (
                <Badge variant="outline" className="gap-1 text-xs bg-card/60 border-border/40">
                  Search: "{debouncedSearch}"
                  <button onClick={() => { setSearch(''); setDebouncedSearch(''); }} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              {smartFilter !== 'none' && (
                <Badge variant="outline" className="gap-1 text-xs bg-card/60 border-border/40">
                  {smartFilter.replace(/_/g, ' ')}
                  <button onClick={() => setSmartFilter('none')} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="text-[11px] h-6 px-2" onClick={() => { setSearch(''); setDebouncedSearch(''); setSmartFilter('none'); setQuickTab('all'); setStatusFilter('all'); }}>
                Clear all
              </Button>
            </motion.div>
          )}

          {/* Table */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="rounded-2xl border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <Skeleton className="h-8 flex-1 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : categories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 rounded-2xl bg-muted/50 mb-4">
                      <Tag className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-semibold">No categories found</p>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search query</p>
                    <Button size="sm" className="mt-4 gap-1.5" onClick={openCreateDialog}><Plus className="h-3.5 w-3.5" /> Add Category</Button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-border/30">
                            <TableHead className="w-12 text-xs font-semibold uppercase tracking-wider text-muted-foreground">#</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Icon</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Created</TableHead>
                            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {categories.map((category, idx) => (
                              <motion.tr
                                key={category.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.01 }}
                                className={`border-b border-border/20 hover:bg-muted/30 transition-colors ${!category.is_active ? 'opacity-60' : ''}`}
                              >
                                <TableCell>
                                  <span className="text-xs text-muted-foreground tabular-nums">{(page - 1) * ITEMS_PER_PAGE + idx + 1}</span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                      <Tag className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <span className="font-medium text-sm">{category.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {category.description ? (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <span className="text-sm text-muted-foreground max-w-[250px] truncate block">{category.description}</span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs"><p className="text-xs">{category.description}</p></TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 gap-1">
                                      <AlertTriangle className="h-2.5 w-2.5" /> Missing
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {category.icon ? (
                                    <Badge variant="outline" className="text-[10px] gap-1 font-mono"><Hash className="h-2.5 w-2.5" />{category.icon}</Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Switch
                                    checked={category.is_active}
                                    onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: category.id, is_active: checked })}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(category.created_at), { addSuffix: true })}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>{format(new Date(category.created_at), 'PPP')}</TooltipContent>
                                  </Tooltip>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-end gap-0.5">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(category)}>
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Edit</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialog(category)}>
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

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between p-4 border-t border-border/30">
                        <p className="text-xs text-muted-foreground">
                          Page <span className="font-semibold text-foreground">{page}</span> of {totalPages} · {totalCount.toLocaleString()} total
                        </p>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="h-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Button>
                          {getPageNumbers().map((p, i) =>
                            p === '...' ? (
                              <span key={`e${i}`} className="px-1.5 text-muted-foreground text-xs">…</span>
                            ) : (
                              <Button key={p} variant={page === p ? 'default' : 'outline'} size="sm" className="min-w-[32px] h-8 text-xs" onClick={() => setPage(p as number)}>
                                {p}
                              </Button>
                            )
                          )}
                          <Button variant="outline" size="sm" className="h-8" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Create/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {editingCategory ? <Pencil className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </DialogTitle>
                <DialogDescription>
                  {editingCategory ? 'Update the category details below.' : 'Create a new job category for employers to use.'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold">Category Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => { setFormData({ ...formData, name: e.target.value }); checkDuplicate(e.target.value); }}
                    placeholder="e.g., Information Technology"
                    className={`rounded-xl ${duplicateWarning ? 'border-destructive' : ''}`}
                  />
                  {duplicateWarning && (
                    <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{duplicateWarning}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description" className="text-xs font-semibold">Description</Label>
                    <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs h-7 rounded-lg" onClick={handleGenerateDescription} disabled={generatingDesc || !formData.name.trim()}>
                      {generatingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {generatingDesc ? 'Generating...' : 'AI Generate'}
                    </Button>
                  </div>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description of this category" rows={3} className="rounded-xl" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="icon" className="text-xs font-semibold">Icon Name (Lucide)</Label>
                    <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs h-7 rounded-lg" onClick={handleGenerateIcon} disabled={generatingIcon || !formData.name.trim() || !formData.description.trim()}>
                      {generatingIcon ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {generatingIcon ? 'Suggesting...' : 'AI Icon'}
                    </Button>
                  </div>
                  <Input id="icon" value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} placeholder="e.g., laptop, briefcase, heart" className="rounded-xl font-mono text-sm" />
                  <p className="text-[11px] text-muted-foreground">Lucide icon names – lowercase, hyphenated</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sort_order" className="text-xs font-semibold">Sort Order</Label>
                    <Input id="sort_order" type="number" value={formData.sort_order} onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })} className="rounded-xl" />
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center gap-2">
                      <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                      <Label htmlFor="is_active" className="text-xs font-semibold">Active</Label>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" className="rounded-xl" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Dialog */}
          <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" /> Delete Category
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete "<span className="font-semibold text-foreground">{deleteDialog?.name}</span>"? This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDialog(null)}>Cancel</Button>
                <Button variant="destructive" className="rounded-xl" onClick={() => deleteDialog && deleteMutation.mutate(deleteDialog.id)} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </AdminLayout>
  );
}
