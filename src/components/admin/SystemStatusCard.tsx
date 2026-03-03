import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, Shield, Server } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  icon: typeof Activity;
  latency?: number;
}

export function SystemStatusCard() {
  const { data: services, isLoading } = useQuery({
    queryKey: ['admin-system-status'],
    queryFn: async () => {
      const start = performance.now();
      const results: ServiceStatus[] = [];

      // Test DB
      try {
        const dbStart = performance.now();
        const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
        const dbLatency = Math.round(performance.now() - dbStart);
        results.push({
          name: 'Database',
          status: error ? 'degraded' : dbLatency > 2000 ? 'degraded' : 'operational',
          icon: Database,
          latency: dbLatency,
        });
      } catch {
        results.push({ name: 'Database', status: 'down', icon: Database });
      }

      // Test Auth
      try {
        const authStart = performance.now();
        const { error } = await supabase.auth.getSession();
        const authLatency = Math.round(performance.now() - authStart);
        results.push({
          name: 'Authentication',
          status: error ? 'degraded' : 'operational',
          icon: Shield,
          latency: authLatency,
        });
      } catch {
        results.push({ name: 'Authentication', status: 'down', icon: Shield });
      }

      // Test Storage
      try {
        const stStart = performance.now();
        const { error } = await supabase.storage.listBuckets();
        const stLatency = Math.round(performance.now() - stStart);
        results.push({
          name: 'Storage',
          status: error ? 'degraded' : 'operational',
          icon: Server,
          latency: stLatency,
        });
      } catch {
        results.push({ name: 'Storage', status: 'down', icon: Server });
      }

      return results;
    },
    refetchInterval: 60_000,
  });

  const statusColors = {
    operational: 'bg-success/10 text-success border-success/20',
    degraded: 'bg-warning/10 text-warning border-warning/20',
    down: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  const allOperational = services?.every(s => s.status === 'operational');

  return (
    <Card className="rounded-xl border-border/40 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            System Status
          </div>
          {!isLoading && (
            <Badge variant="outline" className={allOperational ? statusColors.operational : statusColors.degraded}>
              {allOperational ? 'All Operational' : 'Issues Detected'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="space-y-2">
            {services?.map((service) => {
              const Icon = service.icon;
              return (
                <div key={service.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {service.latency !== undefined && (
                      <span className="text-xs text-muted-foreground tabular-nums">{service.latency}ms</span>
                    )}
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      service.status === 'operational' ? 'bg-success' :
                      service.status === 'degraded' ? 'bg-warning' : 'bg-destructive'
                    }`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
