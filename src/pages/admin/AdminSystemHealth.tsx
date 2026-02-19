import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatsCard } from '@/components/admin/StatsCard';
import {
  Activity,
  Database,
  Users,
  HardDrive,
  Search,
  Download,
  Shield,
  FileText,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';

interface ActionLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export default function AdminSystemHealth() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');

  // System stats
  const { data: systemStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-system-stats'],
    queryFn: async () => {
      const [profiles, jobs, applications, messages, conversations, interviews] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('jobs').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('conversations').select('*', { count: 'exact', head: true }),
        supabase.from('interviews').select('*', { count: 'exact', head: true }),
      ]);

      return {
        totalUsers: profiles.count || 0,
        totalJobs: jobs.count || 0,
        totalApplications: applications.count || 0,
        totalMessages: messages.count || 0,
        totalConversations: conversations.count || 0,
        totalInterviews: interviews.count || 0,
      };
    },
  });

  // Full audit log with pagination
  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['admin-audit-log', filterType, filterAction],
    queryFn: async () => {
      let query = supabase
        .from('admin_action_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filterType !== 'all') {
        query = query.eq('target_type', filterType);
      }
      if (filterAction !== 'all') {
        query = query.eq('action_type', filterAction);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActionLog[];
    },
  });

  const filteredLogs = auditLogs?.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.action_type.toLowerCase().includes(term) ||
      log.target_type.toLowerCase().includes(term) ||
      log.target_id.toLowerCase().includes(term) ||
      JSON.stringify(log.details).toLowerCase().includes(term)
    );
  });

  const actionTypes = [...new Set(auditLogs?.map(l => l.action_type) || [])];
  const targetTypes = [...new Set(auditLogs?.map(l => l.target_type) || [])];

  const exportAuditLog = () => {
    if (!filteredLogs) return;
    const csv = [
      'Date,Action,Target Type,Target ID,Details',
      ...filteredLogs.map(l =>
        `"${format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss')}","${l.action_type}","${l.target_type}","${l.target_id}","${JSON.stringify(l.details).replace(/"/g, '""')}"`
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const actionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-success/10 text-success border-success/20';
      case 'update': return 'bg-primary/10 text-primary border-primary/20';
      case 'delete': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'block': case 'suspend': return 'bg-warning/10 text-warning border-warning/20';
      default: return '';
    }
  };

  return (
    <AdminLayout title="System Health & Audit">
      {/* System Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {statsLoading ? (
          [...Array(6)].map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>)
        ) : (
          <>
            <StatsCard title="Users" value={systemStats?.totalUsers || 0} icon={Users} />
            <StatsCard title="Jobs" value={systemStats?.totalJobs || 0} icon={FileText} />
            <StatsCard title="Applications" value={systemStats?.totalApplications || 0} icon={Database} />
            <StatsCard title="Messages" value={systemStats?.totalMessages || 0} icon={Activity} />
            <StatsCard title="Conversations" value={systemStats?.totalConversations || 0} icon={HardDrive} />
            <StatsCard title="Interviews" value={systemStats?.totalInterviews || 0} icon={Clock} />
          </>
        )}
      </div>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Audit Log
              </CardTitle>
              <CardDescription>{filteredLogs?.length || 0} actions recorded</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportAuditLog}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audit log..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map(t => (
                  <SelectItem key={t} value={t}>{t.replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Targets</SelectItem>
                {targetTypes.map(t => (
                  <SelectItem key={t} value={t}>{t.replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Target ID</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge className={actionColor(log.action_type)}>
                          {log.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{log.target_type}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">
                        {log.target_id}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <pre className="text-xs text-muted-foreground truncate">
                          {JSON.stringify(log.details)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredLogs?.length && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
