import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No admin actions logged yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Action</TableHead>
          <TableHead>Target</TableHead>
          <TableHead>Details</TableHead>
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell>
              <Badge 
                variant="outline" 
                className={actionColors[log.action_type] || 'bg-muted'}
              >
                {log.action_type}
              </Badge>
            </TableCell>
            <TableCell className="font-medium">
              {log.target_type}
            </TableCell>
            <TableCell className="max-w-xs truncate text-muted-foreground">
              {log.details && typeof log.details === 'object' 
                ? JSON.stringify(log.details).slice(0, 50) + '...'
                : '-'}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(log.created_at), 'MMM d, HH:mm')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
