import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Users, Clock, CheckCircle, XCircle, UserCheck, FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HiringPipelineProps {
  employerId: string;
}

interface PipelineStage {
  label: string;
  count: number;
  icon: any;
  color: string;
  bg: string;
}

export const HiringPipeline = ({ employerId }: HiringPipelineProps) => {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPipeline();
  }, [employerId]);

  const fetchPipeline = async () => {
    try {
      const { data: jobs } = await supabase.from('jobs').select('id').eq('employer_id', employerId);
      if (!jobs || jobs.length === 0) { setLoading(false); return; }
      
      const jobIds = jobs.map(j => j.id);
      const { data: apps } = await supabase
        .from('applications')
        .select('status')
        .in('job_id', jobIds);

      if (apps) {
        const counts: Record<string, number> = {};
        apps.forEach(a => {
          const s = a.status || 'pending';
          counts[s] = (counts[s] || 0) + 1;
        });

        setTotal(apps.length);
        setStages([
          { label: 'New', count: counts['pending'] || 0, icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Reviewing', count: counts['reviewing'] || 0, icon: FileText, color: 'text-warning-foreground', bg: 'bg-warning/10' },
          { label: 'Shortlisted', count: counts['shortlisted'] || 0, icon: UserCheck, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Hired', count: counts['hired'] || 0, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Rejected', count: counts['rejected'] || 0, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
        ]);
      }
    } catch (err) {
      console.error('Pipeline error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }

  if (total === 0) {
    return (
      <div className="text-center py-6">
        <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground">No applicants yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hiring Pipeline</p>
        <Badge variant="outline" className="text-[10px]">{total} total</Badge>
      </div>
      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted/50">
        {stages.filter(s => s.count > 0).map((stage, i) => (
          <motion.div
            key={stage.label}
            initial={{ width: 0 }}
            animate={{ width: `${(stage.count / total) * 100}%` }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
            className={cn("h-full rounded-full", stage.bg.replace('/10', '/60'))}
            title={`${stage.label}: ${stage.count}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {stages.map((stage) => (
          <div key={stage.label} className="text-center">
            <p className="text-sm font-bold text-foreground">{stage.count}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">{stage.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
