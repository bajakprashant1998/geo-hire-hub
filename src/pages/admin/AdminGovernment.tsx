import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Trash2, Globe, Building2, Shield, Edit, Search, CheckCircle,
  XCircle, AlertTriangle, Landmark, MapPin, RefreshCw, ExternalLink, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface GovernmentDomain {
  id: string;
  domain: string;
  country: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

export default function AdminGovernment() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editDomain, setEditDomain] = useState<GovernmentDomain | null>(null);
  const [deletingDomain, setDeletingDomain] = useState<GovernmentDomain | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [employerSearch, setEmployerSearch] = useState('');
  const [formData, setFormData] = useState({
    domain: '',
    country: '',
    description: '',
    is_active: true,
  });

  const { data: domains, isLoading } = useQuery({
    queryKey: ['admin-government-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('government_domains')
        .select('*')
        .order('domain');
      if (error) throw error;
      return data as GovernmentDomain[];
    },
  });

  const { data: verifiedEmployers, isLoading: employersLoading } = useQuery({
    queryKey: ['admin-government-employers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('id, company_name, government_email_domain, location_country, location_city, verified_at, slug')
        .eq('is_government', true)
        .eq('government_domain_verified', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingEmployers } = useQuery({
    queryKey: ['admin-government-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('id, company_name, government_email_domain, created_at')
        .eq('is_government', true)
        .eq('government_domain_verified', false);
      if (error) throw error;
      return data;
    },
  });

  const saveDomainMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const domainData = {
        domain: data.domain.toLowerCase().trim(),
        country: data.country || null,
        description: data.description || null,
        is_active: data.is_active,
      };
      if (data.id) {
        const { error } = await supabase.from('government_domains').update(domainData).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('government_domains').insert(domainData);
        if (error) throw error;
      }
      await supabase.rpc('log_admin_action', {
        p_action_type: data.id ? 'update' : 'create',
        p_target_type: 'government_domain',
        p_target_id: data.domain,
        p_details: domainData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-government-domains'] });
      setIsCreating(false);
      setEditDomain(null);
      resetForm();
      toast.success('Domain saved successfully');
    },
    onError: (error) => toast.error('Failed to save domain: ' + error.message),
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('government_domains').delete().eq('id', id);
      if (error) throw error;
      await supabase.rpc('log_admin_action', {
        p_action_type: 'delete',
        p_target_type: 'government_domain',
        p_target_id: id,
        p_details: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-government-domains'] });
      setDeletingDomain(null);
      toast.success('Domain deleted');
    },
    onError: (error) => toast.error('Failed to delete domain: ' + error.message),
  });

  const resetForm = () => setFormData({ domain: '', country: '', description: '', is_active: true });

  const openEditDialog = (domain: GovernmentDomain) => {
    setFormData({
      domain: domain.domain,
      country: domain.country || '',
      description: domain.description || '',
      is_active: domain.is_active,
    });
    setEditDomain(domain);
  };

  const handleSave = () => {
    if (!formData.domain.trim()) { toast.error('Domain is required'); return; }
    saveDomainMutation.mutate({ ...formData, id: editDomain?.id });
  };

  const activeDomains = domains?.filter(d => d.is_active).length || 0;
  const inactiveDomains = (domains?.length || 0) - activeDomains;
  const totalEmployers = verifiedEmployers?.length || 0;
  const pendingCount = pendingEmployers?.length || 0;

  const filteredDomains = useMemo(() => {
    let list = domains || [];
    if (searchQuery) list = list.filter(d =>
      d.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (statusFilter === 'active') list = list.filter(d => d.is_active);
    if (statusFilter === 'inactive') list = list.filter(d => !d.is_active);
    return list;
  }, [domains, searchQuery, statusFilter]);

  const filteredEmployers = useMemo(() => {
    if (!employerSearch) return verifiedEmployers || [];
    return (verifiedEmployers || []).filter(e =>
      e.company_name.toLowerCase().includes(employerSearch.toLowerCase()) ||
      e.government_email_domain?.toLowerCase().includes(employerSearch.toLowerCase())
    );
  }, [verifiedEmployers, employerSearch]);

  // Group domains by country
  const countryGroups = useMemo(() => {
    const map: Record<string, number> = {};
    domains?.forEach(d => {
      const key = d.country || 'Unspecified';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [domains]);

  const stats = [
    { title: 'Total Domains', value: domains?.length || 0, icon: Globe, gradient: 'from-primary/10 to-primary/5', iconColor: 'text-primary' },
    { title: 'Active Domains', value: activeDomains, icon: Shield, gradient: 'from-emerald-500/10 to-emerald-500/5', iconColor: 'text-emerald-600' },
    { title: 'Verified Employers', value: totalEmployers, icon: Building2, gradient: 'from-blue-500/10 to-blue-500/5', iconColor: 'text-blue-600' },
    { title: 'Pending Verification', value: pendingCount, icon: AlertTriangle, gradient: pendingCount > 0 ? 'from-amber-500/10 to-amber-500/5' : 'from-muted/10 to-muted/5', iconColor: pendingCount > 0 ? 'text-amber-600' : 'text-muted-foreground' },
  ];

  return (
    <AdminLayout title="Government Management">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <motion.div key={stat.title} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <Card className={`bg-gradient-to-br ${stat.gradient} border-0 shadow-sm`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-background/80 ${stat.iconColor}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-medium text-sm text-foreground">{pendingCount} employer{pendingCount > 1 ? 's' : ''} pending government verification</p>
                <p className="text-xs text-muted-foreground">These employers have claimed government status but are not yet domain-verified.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Tabs defaultValue="domains" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="domains" className="gap-1.5"><Globe className="h-3.5 w-3.5" />Domains</TabsTrigger>
          <TabsTrigger value="employers" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />Employers</TabsTrigger>
          <TabsTrigger value="overview" className="gap-1.5"><Landmark className="h-3.5 w-3.5" />Overview</TabsTrigger>
        </TabsList>

        {/* Domains Tab */}
        <TabsContent value="domains">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
              <div>
                <CardTitle className="text-base">Trusted Government Domains</CardTitle>
                <CardDescription className="text-xs mt-1">Employers with matching email addresses are auto-verified for government status.</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search domains..."
                    className="pl-8 h-9 w-48 text-xs"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-1">
                  {(['all', 'active', 'inactive'] as const).map(s => (
                    <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'ghost'} className="h-8 text-xs capitalize" onClick={() => setStatusFilter(s)}>
                      {s}{s === 'active' ? ` (${activeDomains})` : s === 'inactive' ? ` (${inactiveDomains})` : ''}
                    </Button>
                  ))}
                </div>
                <Button size="sm" className="h-8 gap-1.5" onClick={() => { resetForm(); setIsCreating(true); }}>
                  <Plus className="h-3.5 w-3.5" />Add Domain
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : filteredDomains.length === 0 ? (
                <div className="text-center py-16">
                  <Globe className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">{searchQuery || statusFilter !== 'all' ? 'No domains match your filters' : 'No government domains configured'}</p>
                  {!searchQuery && statusFilter === 'all' && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => { resetForm(); setIsCreating(true); }}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Add your first domain
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredDomains.map((domain, i) => (
                        <motion.tr
                          key={domain.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.03, 0.5) }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${domain.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                              <span className="font-mono text-sm font-medium">{domain.domain}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {domain.country ? (
                              <span className="flex items-center gap-1 text-sm"><MapPin className="h-3 w-3 text-muted-foreground" />{domain.country}</span>
                            ) : <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{domain.description || '—'}</TableCell>
                          <TableCell>
                            {domain.is_active ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Active</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{formatDistanceToNow(new Date(domain.created_at), { addSuffix: true })}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(domain)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingDomain(domain)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employers Tab */}
        <TabsContent value="employers" className="space-y-4">
          {/* Verified */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />Verified Government Employers
                </CardTitle>
                <CardDescription className="text-xs mt-1">{totalEmployers} employer{totalEmployers !== 1 ? 's' : ''} with confirmed government domain.</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search employers..." className="pl-8 h-9 w-48 text-xs" value={employerSearch} onChange={e => setEmployerSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {employersLoading ? (
                <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : filteredEmployers.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">{employerSearch ? 'No employers match your search' : 'No verified government employers'}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Verified Domain</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Verified</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredEmployers.map((emp, i) => (
                        <motion.tr
                          key={emp.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.03, 0.5) }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                <Landmark className="h-4 w-4 text-emerald-600" />
                              </div>
                              <span className="font-medium text-sm">{emp.company_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{emp.government_email_domain || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {[emp.location_city, emp.location_country].filter(Boolean).join(', ') || '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {emp.verified_at ? formatDistanceToNow(new Date(emp.verified_at), { addSuffix: true }) : '—'}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pending */}
          {(pendingEmployers?.length || 0) > 0 && (
            <Card className="border-amber-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />Pending Verification
                </CardTitle>
                <CardDescription className="text-xs">These employers claimed government status but haven't been domain-verified yet.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Claimed Domain</TableHead>
                      <TableHead>Applied</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingEmployers?.map(emp => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium text-sm">{emp.company_name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{emp.government_email_domain || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(emp.created_at), { addSuffix: true })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Country Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Domains by Country</CardTitle>
                <CardDescription className="text-xs">Distribution of trusted government domains across countries.</CardDescription>
              </CardHeader>
              <CardContent>
                {countryGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                ) : (
                  <div className="space-y-2.5">
                    {countryGroups.map(([country, count], i) => {
                      const pct = Math.round((count / (domains?.length || 1)) * 100);
                      return (
                        <motion.div
                          key={country}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex items-center gap-3"
                        >
                          <span className="text-sm font-medium w-32 truncate">{country}</span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-emerald-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: i * 0.06 + 0.2, duration: 0.5 }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-12 text-right">{count}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">How It Works</CardTitle>
                <CardDescription className="text-xs">Government verification flow overview.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { step: '1', title: 'Domain Registration', desc: 'Admin adds trusted government email domains (e.g., gov.in, nic.in).', icon: Globe },
                    { step: '2', title: 'Employer Sign-up', desc: 'Employers register with their government email address.', icon: Building2 },
                    { step: '3', title: 'Auto-Verification', desc: 'System matches email domain and auto-verifies government status.', icon: CheckCircle },
                    { step: '4', title: 'Badge & Access', desc: 'Verified employers get a government badge and can post government jobs.', icon: Shield },
                  ].map((item, i) => (
                    <motion.div
                      key={item.step}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold shrink-0 mt-0.5">
                        {item.step}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isCreating || !!editDomain} onOpenChange={() => { setIsCreating(false); setEditDomain(null); resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editDomain ? 'Edit Domain' : 'Add Government Domain'}</DialogTitle>
            <DialogDescription>
              {editDomain
                ? 'Update the details for this government domain.'
                : 'Add a trusted government email domain. Employers with matching emails will be auto-verified.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Domain *</Label>
              <Input
                value={formData.domain}
                onChange={e => setFormData({ ...formData, domain: e.target.value })}
                placeholder="e.g., gov.uk, nic.in"
              />
              <p className="text-[11px] text-muted-foreground">Enter the email domain without @ prefix.</p>
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g., India, United Kingdom"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Indian Government National Informatics Centre"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <Label className="text-sm">Active</Label>
                <p className="text-[11px] text-muted-foreground">Inactive domains won't be used for auto-verification.</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreating(false); setEditDomain(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveDomainMutation.isPending}>
              {saveDomainMutation.isPending ? 'Saving...' : editDomain ? 'Update' : 'Add Domain'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingDomain} onOpenChange={() => setDeletingDomain(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Government Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-mono font-medium">{deletingDomain?.domain}</span>? Employers previously verified through this domain will keep their status, but no new verifications will occur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingDomain && deleteDomainMutation.mutate(deletingDomain.id)}
            >
              Delete Domain
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
