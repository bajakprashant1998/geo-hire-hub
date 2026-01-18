import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  CheckCircle, 
  XCircle, 
  Eye,
  Building2,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

export default function AdminReports() {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<(EmployerReport | JobReport) & { type: 'employer' | 'job' } | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: 'resolve' | 'dismiss' | null;
    report: (EmployerReport | JobReport) & { reportType: 'employer' | 'job' } | null;
  }>({ type: null, report: null });
  const [adminNotes, setAdminNotes] = useState('');

  const { data: employerReports, isLoading: empLoading } = useQuery({
    queryKey: ['admin-employer-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employer_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmployerReport[];
    },
  });

  const { data: jobReports, isLoading: jobLoading } = useQuery({
    queryKey: ['admin-job-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as JobReport[];
    },
  });

  const updateEmployerReportMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('employer_reports')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-employer-reports'] });
      setActionDialog({ type: null, report: null });
      setAdminNotes('');
      toast.success('Report updated');
    },
    onError: (error) => {
      toast.error('Failed to update report: ' + error.message);
    },
  });

  const updateJobReportMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('job_reports')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-job-reports'] });
      setActionDialog({ type: null, report: null });
      setAdminNotes('');
      toast.success('Report updated');
    },
    onError: (error) => {
      toast.error('Failed to update report: ' + error.message);
    },
  });

  const handleAction = () => {
    if (!actionDialog.report || !actionDialog.type) return;

    const updates = {
      status: actionDialog.type === 'resolve' ? 'resolved' : 'dismissed',
      admin_notes: adminNotes || null,
      resolved_at: new Date().toISOString(),
    };

    if (actionDialog.report.reportType === 'employer') {
      updateEmployerReportMutation.mutate({ id: actionDialog.report.id, updates });
    } else {
      updateJobReportMutation.mutate({ id: actionDialog.report.id, updates });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return <Badge className="bg-success/10 text-success border-success/20">Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="secondary">Dismissed</Badge>;
      default:
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Pending</Badge>;
    }
  };

  const pendingEmployerReports = employerReports?.filter(r => r.status === 'pending') || [];
  const pendingJobReports = jobReports?.filter(r => r.status === 'pending') || [];

  return (
    <AdminLayout title="Reports & Moderation">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Employer Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingEmployerReports.length}</div>
            <p className="text-sm text-muted-foreground">pending review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingJobReports.length}</div>
            <p className="text-sm text-muted-foreground">pending review</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="employers">
            <TabsList className="mb-4">
              <TabsTrigger value="employers">
                Employer Reports ({employerReports?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="jobs">
                Job Reports ({jobReports?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employers">
              {empLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : employerReports?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No employer reports</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reported</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employerReports?.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {report.reason}
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(report.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedReport({ ...report, type: 'employer' })}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {report.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-success hover:text-success"
                                  onClick={() => setActionDialog({ 
                                    type: 'resolve', 
                                    report: { ...report, reportType: 'employer' } 
                                  })}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground"
                                  onClick={() => setActionDialog({ 
                                    type: 'dismiss', 
                                    report: { ...report, reportType: 'employer' } 
                                  })}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="jobs">
              {jobLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : jobReports?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No job reports</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reported</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobReports?.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {report.reason}
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(report.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedReport({ ...report, type: 'job' })}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {report.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-success hover:text-success"
                                  onClick={() => setActionDialog({ 
                                    type: 'resolve', 
                                    report: { ...report, reportType: 'job' } 
                                  })}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground"
                                  onClick={() => setActionDialog({ 
                                    type: 'dismiss', 
                                    report: { ...report, reportType: 'job' } 
                                  })}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>
              {selectedReport?.type === 'employer' ? 'Employer' : 'Job'} report
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Reason</p>
                <p className="font-medium">{selectedReport.reason}</p>
              </div>
              {selectedReport.details && (
                <div>
                  <p className="text-sm text-muted-foreground">Details</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedReport.details}</p>
                </div>
              )}
              {selectedReport.admin_notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Admin Notes</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{selectedReport.admin_notes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedReport.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reported</p>
                  <p className="font-medium">
                    {format(new Date(selectedReport.created_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog 
        open={!!actionDialog.type} 
        onOpenChange={() => {
          setActionDialog({ type: null, report: null });
          setAdminNotes('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'resolve' ? 'Resolve Report' : 'Dismiss Report'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'resolve' 
                ? 'Mark this report as resolved and add any notes.'
                : 'Dismiss this report if it\'s invalid or spam.'}
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            placeholder="Add notes (optional)..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="min-h-24"
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ type: null, report: null });
                setAdminNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.type === 'resolve' ? 'default' : 'secondary'}
              onClick={handleAction}
              disabled={updateEmployerReportMutation.isPending || updateJobReportMutation.isPending}
            >
              {(updateEmployerReportMutation.isPending || updateJobReportMutation.isPending) 
                ? 'Processing...' 
                : actionDialog.type === 'resolve' ? 'Resolve' : 'Dismiss'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
