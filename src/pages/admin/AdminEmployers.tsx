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
  CheckCircle, 
  XCircle, 
  Ban, 
  Eye, 
  Search,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { VerificationBadge } from '@/components/employer/VerificationBadge';
import { PaginationControls } from '@/components/admin/PaginationControls';

const PAGE_SIZE = 20;

interface Employer {
  id: string;
  company_name: string;
  industry: string | null;
  country_code: string | null;
  tax_id: string | null;
  verification_status: string;
  is_suspended: boolean;
  profile_completeness: number;
  office_photo_url: string | null;
  business_card_url: string | null;
  created_at: string;
  profile: {
    full_name: string;
    user_id: string;
  };
}

export default function AdminEmployers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: 'approve' | 'reject' | 'suspend' | null;
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
        .select(`
          *,
          profile:profiles!employers_profile_id_fkey(full_name, user_id)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (statusFilter !== 'all') {
        if (statusFilter === 'suspended') {
          query = query.eq('is_suspended', true);
        } else {
          query = query.eq('verification_status', statusFilter);
        }
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { employers: data as unknown as Employer[], total: count || 0 };
    },
  });

  const employers = data?.employers;
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const updateEmployerMutation = useMutation({
    mutationFn: async ({ 
      id, 
      updates, 
      actionType 
    }: { 
      id: string; 
      updates: Record<string, unknown>; 
      actionType: string;
    }) => {
      const { error } = await supabase
        .from('employers')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;

      // Log admin action
      await supabase.rpc('log_admin_action', {
        p_action_type: actionType,
        p_target_type: 'employer',
        p_target_id: id,
        p_details: { reason: actionReason, ...updates }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-employers'] });
      setActionDialog({ type: null, employer: null });
      setActionReason('');
      toast.success('Employer updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update employer: ' + error.message);
    },
  });

  const handleAction = () => {
    if (!actionDialog.employer || !actionDialog.type) return;

    const updates: Record<string, unknown> = {};
    
    switch (actionDialog.type) {
      case 'approve':
        updates.verification_status = 'approved';
        updates.verified_at = new Date().toISOString();
        break;
      case 'reject':
        updates.verification_status = 'rejected';
        updates.verification_notes = actionReason;
        break;
      case 'suspend':
        updates.is_suspended = true;
        updates.suspended_reason = actionReason;
        updates.suspended_at = new Date().toISOString();
        break;
    }

    updateEmployerMutation.mutate({
      id: actionDialog.employer.id,
      updates,
      actionType: actionDialog.type,
    });
  };

  const filteredEmployers = employers?.filter((emp) =>
    emp.company_name.toLowerCase().includes(search.toLowerCase()) ||
    emp.profile?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Employer Management">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employers</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Employers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployers?.map((employer) => (
                  <TableRow key={employer.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{employer.company_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{employer.profile?.full_name}</TableCell>
                    <TableCell>{employer.country_code || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <VerificationBadge 
                          status={employer.verification_status as 'pending' | 'approved' | 'rejected'} 
                          size="sm"
                          showLabel={false}
                        />
                        {employer.is_suspended && (
                          <Badge variant="destructive">Suspended</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{employer.profile_completeness}%</span>
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary"
                            style={{ width: `${employer.profile_completeness}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(employer.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedEmployer(employer)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/employers/${employer.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        {employer.verification_status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-success hover:text-success"
                              onClick={() => setActionDialog({ type: 'approve', employer })}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setActionDialog({ type: 'reject', employer })}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {!employer.is_suspended && employer.verification_status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-warning hover:text-warning"
                            onClick={() => setActionDialog({ type: 'suspend', employer })}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Detail Dialog */}
      <Dialog open={!!selectedEmployer} onOpenChange={() => setSelectedEmployer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedEmployer?.company_name}</DialogTitle>
            <DialogDescription>Employer Details</DialogDescription>
          </DialogHeader>
          {selectedEmployer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <p className="font-medium">{selectedEmployer.profile?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Industry</p>
                  <p className="font-medium">{selectedEmployer.industry || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="font-medium">{selectedEmployer.country_code || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tax ID</p>
                  <p className="font-medium">{selectedEmployer.tax_id || '-'}</p>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-4">
                <h4 className="font-medium">Trust Documents</h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedEmployer.office_photo_url ? (
                    <a 
                      href={selectedEmployer.office_photo_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img 
                        src={selectedEmployer.office_photo_url} 
                        alt="Office" 
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        Office Photo <ExternalLink className="h-3 w-3" />
                      </p>
                    </a>
                  ) : (
                    <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">No office photo</p>
                    </div>
                  )}
                  {selectedEmployer.business_card_url ? (
                    <a 
                      href={selectedEmployer.business_card_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img 
                        src={selectedEmployer.business_card_url} 
                        alt="Business Card" 
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        Business Card <ExternalLink className="h-3 w-3" />
                      </p>
                    </a>
                  ) : (
                    <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">No business card</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog 
        open={!!actionDialog.type} 
        onOpenChange={() => {
          setActionDialog({ type: null, employer: null });
          setActionReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'approve' && 'Approve Employer'}
              {actionDialog.type === 'reject' && 'Reject Employer'}
              {actionDialog.type === 'suspend' && 'Suspend Employer'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' && 
                `Are you sure you want to approve ${actionDialog.employer?.company_name}? They will be able to post jobs.`}
              {actionDialog.type === 'reject' && 
                `Provide a reason for rejecting ${actionDialog.employer?.company_name}.`}
              {actionDialog.type === 'suspend' && 
                `Provide a reason for suspending ${actionDialog.employer?.company_name}. Their jobs will be hidden.`}
            </DialogDescription>
          </DialogHeader>
          
          {(actionDialog.type === 'reject' || actionDialog.type === 'suspend') && (
            <Textarea
              placeholder="Enter reason..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="min-h-24"
            />
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ type: null, employer: null });
                setActionReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.type === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={
                updateEmployerMutation.isPending ||
                ((actionDialog.type === 'reject' || actionDialog.type === 'suspend') && !actionReason.trim())
              }
            >
              {updateEmployerMutation.isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
