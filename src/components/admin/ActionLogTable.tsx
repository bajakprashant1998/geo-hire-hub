import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';

interface ActionLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

const actionColors: Record<string, string> = {
  approve: 'bg-success/10 text-success border-success/20',
  reject: 'bg-destructive/10 text-destructive border-destructive/20',
  suspend: 'bg-warning/10 text-warning border-warning/20',
  delete: 'bg-destructive/10 text-destructive border-destructive/20',
  update: 'bg-primary/10 text-primary border-primary/20',
  create: 'bg-success/10 text-success border-success/20',
  block: 'bg-warning/10 text-warning border-warning/20',
  unblock: 'bg-success/10 text-success border-success/20',
  add_role: 'bg-primary/10 text-primary border-primary/20',
  remove_role: 'bg-warning/10 text-warning border-warning/20',
  cleanup: 'bg-muted text-muted-foreground border-muted',
};

export const ActionLogTable = ({ limit = 10 }: { limit?: number }) => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-action-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_action_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as ActionLog[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <div className="text-center py-10">
        <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No admin actions logged yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">Action</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">Target</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">Details</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
              <TableCell>
                <Badge variant="outline" className={actionColors[log.action_type] || 'bg-muted'}>
                  {log.action_type}
                </Badge>
              </TableCell>
              <TableCell className="font-medium text-sm capitalize">{log.target_type}</TableCell>
              <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                {log.details && typeof log.details === 'object' 
                  ? JSON.stringify(log.details).slice(0, 60) + (JSON.stringify(log.details).length > 60 ? '...' : '')
                  : '-'}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(log.created_at), 'MMM d, HH:mm')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
