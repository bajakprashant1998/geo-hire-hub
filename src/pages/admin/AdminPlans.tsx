import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Edit, Trash2, Banknote, TrendingUp, Users, Crown, Zap, Shield,
  ArrowUpRight, Calendar, Building2, CreditCard, Search, Download,
  ToggleLeft, CheckCircle, XCircle, Clock, Star, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  max_active_jobs: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface Subscription {
  id: string;
  status: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string | null;
  created_at: string;
  employer: {
    id: string;
    company_name: string;
  };
  plan: {
    id: string;
    name: string;
    price_monthly: number;
  };
}

// ─── Stat Card ───
function StatCard({ icon: Icon, label, value, sub, gradient }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
  gradient: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="relative overflow-hidden border-0 shadow-lg">
        <div className={`absolute inset-0 ${gradient} opacity-[0.07]`} />
        <CardContent className="p-5 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold text-foreground">{value}</p>
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
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>;
    case 'cancelled':
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1"><XCircle className="h-3 w-3" />Cancelled</Badge>;
    case 'expired':
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Expired</Badge>;
    default:
      return <Badge variant="outline" className="gap-1 capitalize">{status}</Badge>;
  }
}

// ─── Plan Icon ───
function PlanIcon({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (lower.includes('enterprise') || lower.includes('premium')) return <Crown className="h-4 w-4 text-amber-500" />;
  if (lower.includes('pro') || lower.includes('business')) return <Zap className="h-4 w-4 text-primary" />;
  if (lower.includes('free') || lower.includes('starter')) return <Shield className="h-4 w-4 text-muted-foreground" />;
  return <Star className="h-4 w-4 text-primary" />;
}

export default function AdminPlans() {
  const queryClient = useQueryClient();
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Plan | null>(null);
  const [searchPlans, setSearchPlans] = useState('');
  const [searchSubs, setSearchSubs] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '', description: '', price_monthly: 0, price_yearly: 0,
    max_active_jobs: 1, features: '', is_active: true, sort_order: 0,
  });
  const [upgradeDialog, setUpgradeDialog] = useState<{
    subscription: Subscription | null; newPlanId: string;
  }>({ subscription: null, newPlanId: '' });

  // ─── Queries ───
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employer_plans').select('*').order('sort_order');
      if (error) throw error;
      return data as Plan[];
    },
  });

  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employer_subscriptions')
        .select(`*, employer:employers!employer_subscriptions_employer_id_fkey(id, company_name), plan:employer_plans!employer_subscriptions_plan_id_fkey(id, name, price_monthly)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Subscription[];
    },
  });

  // ─── Mutations ───
  const savePlanMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const planData = {
        name: data.name, description: data.description || null,
        price_monthly: data.price_monthly, price_yearly: data.price_yearly || null,
        max_active_jobs: data.max_active_jobs,
        features: data.features ? data.features.split('\n').filter(Boolean) : [],
        is_active: data.is_active, sort_order: data.sort_order,
      };
      if (data.id) {
        const { error } = await supabase.from('employer_plans').update(planData).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employer_plans').insert(planData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      setEditPlan(null); setIsCreating(false); resetForm();
      toast.success('Plan saved successfully');
    },
    onError: (error) => toast.error('Failed to save plan: ' + error.message),
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employer_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      setDeleteConfirm(null);
      toast.success('Plan deleted');
    },
    onError: (error) => toast.error('Failed to delete: ' + error.message),
  });

  const togglePlanMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('employer_plans').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      toast.success('Plan status updated');
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, planId }: { id: string; planId: string }) => {
      const { error } = await supabase.from('employer_subscriptions').update({ plan_id: planId }).eq('id', id);
      if (error) throw error;
      await supabase.rpc('log_admin_action', {
        p_action_type: 'update', p_target_type: 'subscription',
        p_target_id: id, p_details: { new_plan_id: planId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      setUpgradeDialog({ subscription: null, newPlanId: '' });
      toast.success('Subscription updated');
    },
    onError: (error) => toast.error('Failed to update: ' + error.message),
  });

  const resetForm = () => setFormData({
    name: '', description: '', price_monthly: 0, price_yearly: 0,
    max_active_jobs: 1, features: '', is_active: true, sort_order: 0,
  });

  const openEditDialog = (plan: Plan) => {
    setFormData({
      name: plan.name, description: plan.description || '',
      price_monthly: plan.price_monthly, price_yearly: plan.price_yearly || 0,
      max_active_jobs: plan.max_active_jobs,
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      is_active: plan.is_active, sort_order: plan.sort_order,
    });
    setEditPlan(plan);
  };

  const handleSave = () => savePlanMutation.mutate({ ...formData, id: editPlan?.id });

  const exportSubscriptionsCSV = () => {
    if (!subscriptions?.length) return;
    const headers = ['Company', 'Plan', 'Billing', 'Status', 'Start Date'];
    const rows = subscriptions.map(s => [
      s.employer?.company_name || '', s.plan?.name || '', s.billing_cycle || '',
      s.status, format(new Date(s.current_period_start), 'yyyy-MM-dd'),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'subscriptions.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported subscriptions');
  };

  // ─── Computed ───
  const activeSubs = subscriptions?.filter(s => s.status === 'active') || [];
  const totalRevenue = activeSubs.reduce((sum, s) => sum + (s.plan?.price_monthly || 0), 0);
  const activePlans = plans?.filter(p => p.is_active) || [];
  const cancelledSubs = subscriptions?.filter(s => s.status === 'cancelled') || [];

  const filteredPlans = plans?.filter(p =>
    p.name.toLowerCase().includes(searchPlans.toLowerCase())
  ) || [];

  const filteredSubs = subscriptions?.filter(s => {
    const matchSearch = !searchSubs || 
      s.employer?.company_name?.toLowerCase().includes(searchSubs.toLowerCase()) ||
      s.plan?.name?.toLowerCase().includes(searchSubs.toLowerCase());
    const matchStatus = subStatusFilter === 'all' || s.status === subStatusFilter;
    return matchSearch && matchStatus;
  }) || [];

  return (
    <AdminLayout title="Plans & Revenue">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Banknote} label="Monthly Revenue" value={`$${totalRevenue.toLocaleString()}`}
          sub={`From ${activeSubs.length} active subscriptions`}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatCard icon={TrendingUp} label="Active Subscriptions" value={activeSubs.length}
          sub={cancelledSubs.length > 0 ? `${cancelledSubs.length} cancelled` : 'All healthy'}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
        <StatCard icon={CreditCard} label="Active Plans" value={activePlans.length}
          sub={`${(plans?.length || 0) - activePlans.length} inactive`}
          gradient="bg-gradient-to-br from-violet-500 to-violet-600" />
        <StatCard icon={Users} label="Total Subscribers" value={subscriptions?.length || 0}
          sub="All time"
          gradient="bg-gradient-to-br from-amber-500 to-amber-600" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="plans" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CreditCard className="h-4 w-4" />Plans
            <Badge variant="secondary" className="text-xs ml-1">{plans?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Building2 className="h-4 w-4" />Subscriptions
            <Badge variant="secondary" className="text-xs ml-1">{subscriptions?.length || 0}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ─── Plans Tab ─── */}
        <TabsContent value="plans">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg">Subscription Plans</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Manage pricing tiers and features</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search plans..." value={searchPlans}
                    onChange={e => setSearchPlans(e.target.value)}
                    className="pl-9 w-full sm:w-52" />
                </div>
                <Button onClick={() => { resetForm(); setIsCreating(true); }} className="gap-2 shrink-0">
                  <Plus className="h-4 w-4" />New Plan
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {plansLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No plans found</p>
                  <p className="text-sm">Create your first subscription plan to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="w-[200px]">Plan</TableHead>
                        <TableHead>Pricing</TableHead>
                        <TableHead>Limits</TableHead>
                        <TableHead>Features</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right w-[140px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredPlans.map((plan, i) => (
                          <motion.tr key={plan.id}
                            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="border-b transition-colors data-[state=selected]:bg-muted hover:bg-muted/50"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-muted"><PlanIcon name={plan.name} /></div>
                                <div>
                                  <p className="font-semibold text-foreground">{plan.name}</p>
                                  {plan.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]">{plan.description}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="text-lg font-bold text-foreground">${plan.price_monthly}</span>
                                <span className="text-xs text-muted-foreground">/mo</span>
                              </div>
                              {plan.price_yearly ? (
                                <p className="text-xs text-muted-foreground">${plan.price_yearly}/yr</p>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1 font-mono">
                                {plan.max_active_jobs} {plan.max_active_jobs === 1 ? 'job' : 'jobs'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap max-w-[200px]">
                                {Array.isArray(plan.features) && plan.features.slice(0, 2).map((f, j) => (
                                  <Badge key={j} variant="secondary" className="text-[11px] font-normal">{f}</Badge>
                                ))}
                                {Array.isArray(plan.features) && plan.features.length > 2 && (
                                  <Badge variant="outline" className="text-[11px]">+{plan.features.length - 2}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch checked={plan.is_active} 
                                  onCheckedChange={(checked) => togglePlanMutation.mutate({ id: plan.id, is_active: checked })}
                                />
                                <span className={`text-xs font-medium ${plan.is_active ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                  {plan.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8"
                                  onClick={() => openEditDialog(plan)}>
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteConfirm(plan)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
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
        </TabsContent>

        {/* ─── Subscriptions Tab ─── */}
        <TabsContent value="subscriptions">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
              <div>
                <CardTitle className="text-lg">Employer Subscriptions</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Monitor and manage active subscriptions</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search company..." value={searchSubs}
                    onChange={e => setSearchSubs(e.target.value)}
                    className="pl-9 w-full sm:w-52" />
                </div>
                <Select value={subStatusFilter} onValueChange={setSubStatusFilter}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="gap-2 shrink-0"
                  onClick={exportSubscriptionsCSV} disabled={!subscriptions?.length}>
                  <Download className="h-4 w-4" />Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {subsLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : filteredSubs.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No subscriptions found</p>
                  <p className="text-sm">Subscriptions will appear here when employers sign up.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead>Company</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Billing</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Since</TableHead>
                        <TableHead className="text-right w-[140px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredSubs.map((sub, i) => (
                          <motion.tr key={sub.id}
                            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Building2 className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground">{sub.employer?.company_name}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    Joined {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <PlanIcon name={sub.plan?.name || ''} />
                                <div>
                                  <p className="font-medium text-foreground text-sm">{sub.plan?.name}</p>
                                  <p className="text-[11px] text-muted-foreground">${sub.plan?.price_monthly}/mo</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize font-normal">
                                {sub.billing_cycle || 'monthly'}
                              </Badge>
                            </TableCell>
                            <TableCell><StatusBadge status={sub.status} /></TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm text-foreground">{format(new Date(sub.current_period_start), 'MMM d, yyyy')}</p>
                                {sub.current_period_end && (
                                  <p className="text-[11px] text-muted-foreground">
                                    Ends {format(new Date(sub.current_period_end), 'MMM d, yyyy')}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8"
                                onClick={() => setUpgradeDialog({ subscription: sub, newPlanId: sub.plan?.id || '' })}>
                                Change Plan <ChevronRight className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
              {filteredSubs.length > 0 && (
                <div className="px-6 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
                  Showing {filteredSubs.length} of {subscriptions?.length || 0} subscriptions
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Create/Edit Plan Dialog ─── */}
      <Dialog open={!!editPlan || isCreating}
        onOpenChange={() => { setEditPlan(null); setIsCreating(false); resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editPlan ? <><Edit className="h-4 w-4" />Edit Plan</> : <><Plus className="h-4 w-4" />Create Plan</>}
            </DialogTitle>
            <DialogDescription>Configure the subscription plan details and features.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan Name</Label>
                <Input value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Pro" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort Order</Label>
                <Input type="number" value={formData.sort_order}
                  onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
              <Input value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..." />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly ($)</Label>
                <Input type="number" value={formData.price_monthly}
                  onChange={e => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Yearly ($)</Label>
                <Input type="number" value={formData.price_yearly}
                  onChange={e => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Jobs</Label>
                <Input type="number" value={formData.max_active_jobs}
                  onChange={e => setFormData({ ...formData, max_active_jobs: parseInt(e.target.value) || 1 })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Features (one per line)</Label>
              <Textarea value={formData.features}
                onChange={e => setFormData({ ...formData, features: e.target.value })}
                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                className="min-h-24 font-mono text-sm" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div>
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">Make this plan available for purchase</p>
              </div>
              <Switch checked={formData.is_active}
                onCheckedChange={checked => setFormData({ ...formData, is_active: checked })} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline"
              onClick={() => { setEditPlan(null); setIsCreating(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave}
              disabled={savePlanMutation.isPending || !formData.name} className="gap-2">
              {savePlanMutation.isPending ? 'Saving...' : editPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm ─── */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteConfirm?.name}" plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this plan. Any active subscriptions on this plan may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && deletePlanMutation.mutate(deleteConfirm.id)}>
              {deletePlanMutation.isPending ? 'Deleting...' : 'Delete Plan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Change Plan Dialog ─── */}
      <Dialog open={!!upgradeDialog.subscription}
        onOpenChange={() => setUpgradeDialog({ subscription: null, newPlanId: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />Change Subscription Plan
            </DialogTitle>
            <DialogDescription>
              Update plan for <span className="font-medium text-foreground">{upgradeDialog.subscription?.employer?.company_name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {upgradeDialog.subscription?.plan && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-1">Current Plan</p>
                <div className="flex items-center gap-2">
                  <PlanIcon name={upgradeDialog.subscription.plan.name} />
                  <span className="font-medium">{upgradeDialog.subscription.plan.name}</span>
                  <span className="text-muted-foreground text-sm">${upgradeDialog.subscription.plan.price_monthly}/mo</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Plan</Label>
              <Select value={upgradeDialog.newPlanId}
                onValueChange={value => setUpgradeDialog({ ...upgradeDialog, newPlanId: value })}>
                <SelectTrigger><SelectValue placeholder="Select plan..." /></SelectTrigger>
                <SelectContent>
                  {plans?.filter(p => p.is_active).map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex items-center gap-2">
                        <PlanIcon name={plan.name} />
                        {plan.name} — ${plan.price_monthly}/mo
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline"
              onClick={() => setUpgradeDialog({ subscription: null, newPlanId: '' })}>Cancel</Button>
            <Button onClick={() => {
              if (upgradeDialog.subscription && upgradeDialog.newPlanId) {
                updateSubscriptionMutation.mutate({ id: upgradeDialog.subscription.id, planId: upgradeDialog.newPlanId });
              }
            }} disabled={updateSubscriptionMutation.isPending || !upgradeDialog.newPlanId}>
              {updateSubscriptionMutation.isPending ? 'Updating...' : 'Update Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
