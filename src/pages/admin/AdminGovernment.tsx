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
  Plus, 
  Trash2, 
  Globe, 
  Building2,
  Shield,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { StatsCard } from '@/components/admin/StatsCard';

interface GovernmentDomain {
  id: string;
  domain: string;
  country: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminGovernment() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editDomain, setEditDomain] = useState<GovernmentDomain | null>(null);
  const [formData, setFormData] = useState({
    domain: '',
    country: '',
    description: '',
    is_active: true
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

  const { data: verifiedEmployers } = useQuery({
    queryKey: ['admin-government-employers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('id, company_name, government_email_domain')
        .eq('is_government', true)
        .eq('government_domain_verified', true);
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
        is_active: data.is_active
      };

      if (data.id) {
        const { error } = await supabase
          .from('government_domains')
          .update(domainData)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('government_domains')
          .insert(domainData);
        if (error) throw error;
      }

      await supabase.rpc('log_admin_action', {
        p_action_type: data.id ? 'update' : 'create',
        p_target_type: 'government_domain',
        p_target_id: data.domain,
        p_details: domainData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-government-domains'] });
      setIsCreating(false);
      setEditDomain(null);
      resetForm();
      toast.success('Domain saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save domain: ' + error.message);
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('government_domains')
        .delete()
        .eq('id', id);
      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        p_action_type: 'delete',
        p_target_type: 'government_domain',
        p_target_id: id,
        p_details: {}
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-government-domains'] });
      toast.success('Domain deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete domain: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      domain: '',
      country: '',
      description: '',
      is_active: true
    });
  };

  const openEditDialog = (domain: GovernmentDomain) => {
    setFormData({
      domain: domain.domain,
      country: domain.country || '',
      description: domain.description || '',
      is_active: domain.is_active
    });
    setEditDomain(domain);
  };

  const handleSave = () => {
    if (!formData.domain.trim()) {
      toast.error('Domain is required');
      return;
    }
    saveDomainMutation.mutate({
      ...formData,
      id: editDomain?.id
    });
  };

  const activeDomains = domains?.filter(d => d.is_active).length || 0;
  const totalEmployers = verifiedEmployers?.length || 0;

  return (
    <AdminLayout title="Government Domains">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatsCard title="Total Domains" value={domains?.length || 0} icon={Globe} />
        <StatsCard title="Active Domains" value={activeDomains} icon={Shield} variant="success" />
        <StatsCard title="Verified Employers" value={totalEmployers} icon={Building2} variant="warning" />
      </div>

      {/* Domains Table */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Trusted Government Domains</CardTitle>
          <Button onClick={() => { resetForm(); setIsCreating(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Domain
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : domains?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No government domains configured
            </p>
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
                {domains?.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-mono">{domain.domain}</TableCell>
                    <TableCell>{domain.country || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{domain.description || '-'}</TableCell>
                    <TableCell>
                      {domain.is_active ? (
                        <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(domain.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(domain)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteDomainMutation.mutate(domain.id)}
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

      {/* Verified Employers */}
      <Card>
        <CardHeader>
          <CardTitle>Verified Government Employers</CardTitle>
        </CardHeader>
        <CardContent>
          {verifiedEmployers?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No verified government employers
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Verified Domain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifiedEmployers?.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.company_name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {emp.government_email_domain}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={isCreating || !!editDomain} 
        onOpenChange={() => { setIsCreating(false); setEditDomain(null); resetForm(); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editDomain ? 'Edit Domain' : 'Add Government Domain'}</DialogTitle>
            <DialogDescription>
              Add a trusted government email domain. Employers with matching email addresses will be auto-verified.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Domain *</Label>
              <Input
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="e.g., gov.uk, nic.in"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g., India, United Kingdom"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Indian Government"
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
              onClick={() => { setIsCreating(false); setEditDomain(null); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveDomainMutation.isPending}
            >
              {saveDomainMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
