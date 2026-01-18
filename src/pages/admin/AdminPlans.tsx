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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { StatsCard } from '@/components/admin/StatsCard';

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

export default function AdminPlans() {
  const queryClient = useQueryClient();
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    max_active_jobs: 1,
    features: '',
    is_active: true,
    sort_order: 0,
  });
  const [upgradeDialog, setUpgradeDialog] = useState<{
    subscription: Subscription | null;
    newPlanId: string;
  }>({ subscription: null, newPlanId: '' });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employer_plans')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as Plan[];
    },
  });

  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employer_subscriptions')
        .select(`
          *,
          employer:employers!employer_subscriptions_employer_id_fkey(id, company_name),
          plan:employer_plans!employer_subscriptions_plan_id_fkey(id, name, price_monthly)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Subscription[];
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const planData = {
        name: data.name,
        description: data.description || null,
        price_monthly: data.price_monthly,
        price_yearly: data.price_yearly || null,
        max_active_jobs: data.max_active_jobs,
        features: data.features ? data.features.split('\n').filter(Boolean) : [],
        is_active: data.is_active,
        sort_order: data.sort_order,
      };

      if (data.id) {
        const { error } = await supabase
          .from('employer_plans')
          .update(planData)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employer_plans')
          .insert(planData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      setEditPlan(null);
      setIsCreating(false);
      resetForm();
      toast.success('Plan saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save plan: ' + error.message);
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employer_plans')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      toast.success('Plan deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete plan: ' + error.message);
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ id, planId }: { id: string; planId: string }) => {
      const { error } = await supabase
        .from('employer_subscriptions')
        .update({ plan_id: planId })
        .eq('id', id);
      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        p_action_type: 'update',
        p_target_type: 'subscription',
        p_target_id: id,
        p_details: { new_plan_id: planId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      setUpgradeDialog({ subscription: null, newPlanId: '' });
      toast.success('Subscription updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update subscription: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_monthly: 0,
      price_yearly: 0,
      max_active_jobs: 1,
      features: '',
      is_active: true,
      sort_order: 0,
    });
  };

  const openEditDialog = (plan: Plan) => {
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly || 0,
      max_active_jobs: plan.max_active_jobs,
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      is_active: plan.is_active,
      sort_order: plan.sort_order,
    });
    setEditPlan(plan);
  };

  const handleSave = () => {
    savePlanMutation.mutate({
      ...formData,
      id: editPlan?.id,
    });
  };

  // Calculate stats
  const activeSubscriptions = subscriptions?.filter(s => s.status === 'active') || [];
  const totalRevenue = activeSubscriptions.reduce((sum, s) => sum + (s.plan?.price_monthly || 0), 0);

  return (
    <AdminLayout title="Plans & Revenue">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatsCard
          title="Monthly Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          variant="success"
        />
        <StatsCard
          title="Active Subscriptions"
          value={activeSubscriptions.length}
          icon={TrendingUp}
        />
        <StatsCard
          title="Total Plans"
          value={plans?.length || 0}
          icon={Users}
        />
      </div>

      {/* Plans Management */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Subscription Plans</CardTitle>
          <Button onClick={() => { resetForm(); setIsCreating(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </CardHeader>
        <CardContent>
          {plansLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Price/mo</TableHead>
                  <TableHead>Max Jobs</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans?.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>${plan.price_monthly}</TableCell>
                    <TableCell>{plan.max_active_jobs}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap max-w-xs">
                        {Array.isArray(plan.features) && plan.features.slice(0, 2).map((f, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
                        ))}
                        {Array.isArray(plan.features) && plan.features.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{plan.features.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {plan.is_active ? (
                        <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(plan)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deletePlanMutation.mutate(plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Employer Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {subsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period Start</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions?.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {sub.employer?.company_name}
                    </TableCell>
                    <TableCell>{sub.plan?.name}</TableCell>
                    <TableCell className="capitalize">{sub.billing_cycle}</TableCell>
                    <TableCell>
                      {sub.status === 'active' ? (
                        <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                      ) : (
                        <Badge variant="secondary">{sub.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(sub.current_period_start), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUpgradeDialog({ subscription: sub, newPlanId: sub.plan?.id || '' })}
                      >
                        Change Plan
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Plan Edit/Create Dialog */}
      <Dialog 
        open={!!editPlan || isCreating} 
        onOpenChange={() => { setEditPlan(null); setIsCreating(false); resetForm(); }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
            <DialogDescription>Configure the subscription plan details.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Pro"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monthly Price ($)</Label>
                <Input
                  type="number"
                  value={formData.price_monthly}
                  onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Yearly Price ($)</Label>
                <Input
                  type="number"
                  value={formData.price_yearly}
                  onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max Active Jobs</Label>
              <Input
                type="number"
                value={formData.max_active_jobs}
                onChange={(e) => setFormData({ ...formData, max_active_jobs: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Features (one per line)</Label>
              <Textarea
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                className="min-h-24"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setEditPlan(null); setIsCreating(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={savePlanMutation.isPending || !formData.name}
            >
              {savePlanMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog 
        open={!!upgradeDialog.subscription} 
        onOpenChange={() => setUpgradeDialog({ subscription: null, newPlanId: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Update plan for {upgradeDialog.subscription?.employer?.company_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select New Plan</Label>
              <Select
                value={upgradeDialog.newPlanId}
                onValueChange={(value) => setUpgradeDialog({ ...upgradeDialog, newPlanId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plan..." />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - ${plan.price_monthly}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpgradeDialog({ subscription: null, newPlanId: '' })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (upgradeDialog.subscription && upgradeDialog.newPlanId) {
                  updateSubscriptionMutation.mutate({
                    id: upgradeDialog.subscription.id,
                    planId: upgradeDialog.newPlanId,
                  });
                }
              }}
              disabled={updateSubscriptionMutation.isPending || !upgradeDialog.newPlanId}
            >
              {updateSubscriptionMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
