import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsCard } from '@/components/admin/StatsCard';
import { AlertTriangle, Shield, CheckCircle, Search, Flag, Building2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminFraudDetection() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('open');

  // Fraud flags
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

  // Duplicate tax IDs detection
  const { data: duplicateTaxIds } = useQuery({
    queryKey: ['admin-duplicate-tax-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('tax_id, company_name, id')
        .not('tax_id', 'is', null)
        .not('tax_id', 'eq', '');
      if (error) throw error;
      // Find duplicates
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

  // Duplicate company names
  const { data: duplicateNames } = useQuery({
    queryKey: ['admin-duplicate-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employers')
        .select('company_name, id, verification_status');
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

  // Rapid job posts (employers with >5 jobs in last 24h)
  const { data: rapidPosters } = useQuery({
    queryKey: ['admin-rapid-posters'],
    queryFn: async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { data, error } = await supabase
        .from('jobs')
        .select('employer_id, title, created_at')
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      const empMap: Record<string, number> = {};
      data?.forEach(j => { empMap[j.employer_id] = (empMap[j.employer_id] || 0) + 1; });
      return Object.entries(empMap).filter(([_, count]) => count > 5).map(([id, count]) => ({ employer_id: id, count }));
    },
  });

  // Bot-like auto-apply (candidates with >20 applications in last 24h)
  const { data: botApplicants } = useQuery({
    queryKey: ['admin-bot-applicants'],
    queryFn: async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { data, error } = await supabase
        .from('auto_apply_logs')
        .select('candidate_id, status, created_at')
        .gte('created_at', yesterday.toISOString());
      if (error) throw error;
      const candMap: Record<string, number> = {};
      data?.forEach(a => { candMap[a.candidate_id] = (candMap[a.candidate_id] || 0) + 1; });
      return Object.entries(candMap).filter(([_, count]) => count > 20).map(([id, count]) => ({ candidate_id: id, count }));
    },
  });

  const updateFlagMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('fraud_flags')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fraud-flags'] });
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
      toast.success('Flag created');
    },
  });

  const openFlags = flags?.filter(f => f.status === 'open').length || 0;
  const totalDuplicates = (duplicateTaxIds?.length || 0) + (duplicateNames?.length || 0);

  return (
    <AdminLayout title="Fraud Detection">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Open Flags" value={openFlags} icon={AlertTriangle} variant={openFlags > 0 ? 'destructive' : 'default'} />
        <StatsCard title="Duplicate Accounts" value={totalDuplicates} icon={Building2} variant={totalDuplicates > 0 ? 'warning' : 'default'} />
        <StatsCard title="Rapid Posters (24h)" value={rapidPosters?.length || 0} icon={Flag} variant={(rapidPosters?.length || 0) > 0 ? 'warning' : 'default'} />
        <StatsCard title="Bot Applicants (24h)" value={botApplicants?.length || 0} icon={Users} variant={(botApplicants?.length || 0) > 0 ? 'warning' : 'default'} />
      </div>

      <Tabs defaultValue="flags">
        <TabsList className="mb-4">
          <TabsTrigger value="flags">Fraud Flags</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicate Detection</TabsTrigger>
          <TabsTrigger value="patterns">Suspicious Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="flags">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Flagged Accounts</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0">
              {flagsLoading ? (
                <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Flag</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flags?.map(flag => (
                      <TableRow key={flag.id}>
                        <TableCell className="capitalize">{flag.target_type}</TableCell>
                        <TableCell><Badge variant="outline">{flag.flag_type.replace(/_/g, ' ')}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{flag.target_id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge className={flag.status === 'open' ? 'bg-destructive/10 text-destructive' : flag.status === 'reviewed' ? 'bg-success/10 text-success' : ''} variant="secondary">
                            {flag.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(flag.created_at), 'MMM d, HH:mm')}</TableCell>
                        <TableCell className="text-right space-x-1">
                          {flag.status === 'open' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => updateFlagMutation.mutate({ id: flag.id, status: 'reviewed' })}>
                                <CheckCircle className="h-3 w-3 mr-1" /> Review
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => updateFlagMutation.mutate({ id: flag.id, status: 'dismissed' })}>
                                Dismiss
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!flags || flags.length === 0) && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No flags found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duplicates">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Duplicate Tax IDs</CardTitle>
                <CardDescription>Employers sharing the same tax identifier</CardDescription>
              </CardHeader>
              <CardContent>
                {duplicateTaxIds?.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No duplicate tax IDs found ✓</p>
                ) : (
                  <div className="space-y-3">
                    {duplicateTaxIds?.map(([taxId, employers]) => (
                      <div key={taxId} className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">Tax ID: <span className="font-mono">{taxId}</span></p>
                        <div className="flex flex-wrap gap-2">
                          {employers.map(e => (
                            <Badge key={e.id} variant="secondary">{e.company_name}</Badge>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => createFlagMutation.mutate({
                            target_type: 'employer',
                            target_id: employers[0].id,
                            flag_type: 'duplicate_tax_id',
                            details: { tax_id: taxId, employer_ids: employers.map(e => e.id) },
                          })}
                        >
                          <Flag className="h-3 w-3 mr-1" /> Flag
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Duplicate Company Names</CardTitle>
              </CardHeader>
              <CardContent>
                {duplicateNames?.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No duplicates found ✓</p>
                ) : (
                  <div className="space-y-3">
                    {duplicateNames?.map(([name, employers]) => (
                      <div key={name} className="border rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">{employers[0].company_name}</p>
                        <div className="flex gap-2">
                          {employers.map(e => (
                            <Badge key={e.id} variant={e.verification_status === 'approved' ? 'default' : 'secondary'}>
                              {e.verification_status}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rapid Job Posting (5+ in 24h)</CardTitle>
              </CardHeader>
              <CardContent>
                {!rapidPosters?.length ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No suspicious activity ✓</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employer ID</TableHead>
                        <TableHead>Posts (24h)</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rapidPosters.map(rp => (
                        <TableRow key={rp.employer_id}>
                          <TableCell className="font-mono text-xs">{rp.employer_id.slice(0, 12)}...</TableCell>
                          <TableCell><Badge variant="destructive">{rp.count} posts</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => createFlagMutation.mutate({
                              target_type: 'employer', target_id: rp.employer_id,
                              flag_type: 'rapid_job_posts', details: { count: rp.count },
                            })}>
                              <Flag className="h-3 w-3 mr-1" /> Flag
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bot-like Auto-Apply (20+ in 24h)</CardTitle>
              </CardHeader>
              <CardContent>
                {!botApplicants?.length ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">No suspicious activity ✓</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidate ID</TableHead>
                        <TableHead>Applications (24h)</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {botApplicants.map(ba => (
                        <TableRow key={ba.candidate_id}>
                          <TableCell className="font-mono text-xs">{ba.candidate_id.slice(0, 12)}...</TableCell>
                          <TableCell><Badge variant="destructive">{ba.count} apps</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => createFlagMutation.mutate({
                              target_type: 'candidate', target_id: ba.candidate_id,
                              flag_type: 'bot_applications', details: { count: ba.count },
                            })}>
                              <Flag className="h-3 w-3 mr-1" /> Flag
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
