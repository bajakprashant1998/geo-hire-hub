import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StatsCard } from '@/components/admin/StatsCard';
import { Search, FileText, CheckCircle, Clock, Users, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { PaginationControls } from '@/components/admin/PaginationControls';

const PAGE_SIZE = 20;

export default function AdminApplications() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-applications', statusFilter, page],
    queryFn: async () => {
      let query = supabase
        .from('applications')
        .select(`
          id, status, created_at, cover_letter,
          candidate:candidates(id, job_title, profile:profiles(full_name, avatar_url)),
          job:jobs(id, title, employer:employers(company_name))
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
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
    if (!search) return true;
    const s = search.toLowerCase();
    const candidate = app.candidate as any;
    const job = app.job as any;
    return (
      candidate?.profile?.full_name?.toLowerCase().includes(s) ||
      job?.title?.toLowerCase().includes(s) ||
      job?.employer?.company_name?.toLowerCase().includes(s)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'hired': return <Badge className="bg-success/10 text-success border-success/20">Hired</Badge>;
      case 'shortlisted': return <Badge className="bg-primary/10 text-primary border-primary/20">Shortlisted</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  const pending = applications.filter((a: any) => a.status === 'pending').length;
  const shortlisted = applications.filter((a: any) => a.status === 'shortlisted').length;
  const hired = applications.filter((a: any) => a.status === 'hired').length;

  return (
    <AdminLayout title="Application Management">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Applications" value={totalCount} icon={FileText} />
        <StatsCard title="Pending" value={pending} icon={Clock} variant="warning" />
        <StatsCard title="Shortlisted" value={shortlisted} icon={CheckCircle} variant="success" />
        <StatsCard title="Hired" value={hired} icon={Users} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by candidate, job, or company..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="shortlisted">Shortlisted</SelectItem>
            <SelectItem value="hired">Hired</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No applications found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((app: any) => {
                    const candidate = app.candidate as any;
                    const job = app.job as any;
                    return (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">
                          {candidate?.profile?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Link to={`/jobs/${job?.id}`} className="text-primary hover:underline">
                            {job?.title || 'Unknown'}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {job?.employer?.company_name || '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(app.status || 'pending')}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(app.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Link to={`/candidates/${candidate?.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
    </AdminLayout>
  );
}
