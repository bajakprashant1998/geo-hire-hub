import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FlaskConical, BarChart3, Loader2, Eye, Users, ArrowRight, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface JobABTestingProps {
  employerId: string;
}

export const JobABTesting = ({ employerId }: JobABTestingProps) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobA, setJobA] = useState('');
  const [jobB, setJobB] = useState('');
  const [comparison, setComparison] = useState<{ a: any; b: any } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title, description, created_at, is_active, status')
        .eq('employer_id', employerId)
        .order('created_at', { ascending: false });
      setJobs(data || []);
      setLoading(false);
    };
    fetchJobs();
  }, [employerId]);

  const handleCompare = async () => {
    if (!jobA || !jobB) {
      toast.error('Select two jobs to compare');
      return;
    }
    if (jobA === jobB) {
      toast.error('Select two different jobs');
      return;
    }

    setLoading(true);
    try {
      const [aApps, bApps, aViews, bViews] = await Promise.all([
        supabase.from('applications').select('id, status, created_at', { count: 'exact' }).eq('job_id', jobA),
        supabase.from('applications').select('id, status, created_at', { count: 'exact' }).eq('job_id', jobB),
        supabase.from('job_views').select('id', { count: 'exact' }).eq('job_id', jobA),
        supabase.from('job_views').select('id', { count: 'exact' }).eq('job_id', jobB),
      ]);

      const jobAData = jobs.find(j => j.id === jobA);
      const jobBData = jobs.find(j => j.id === jobB);

      const aAppCount = aApps.count || 0;
      const bAppCount = bApps.count || 0;
      const aViewCount = aViews.count || 0;
      const bViewCount = bViews.count || 0;

      setComparison({
        a: {
          ...jobAData,
          applications: aAppCount,
          views: aViewCount,
          conversionRate: aViewCount > 0 ? ((aAppCount / aViewCount) * 100).toFixed(1) : '0',
          shortlisted: (aApps.data || []).filter((a: any) => a.status === 'shortlisted').length,
        },
        b: {
          ...jobBData,
          applications: bAppCount,
          views: bViewCount,
          conversionRate: bViewCount > 0 ? ((bAppCount / bViewCount) * 100).toFixed(1) : '0',
          shortlisted: (bApps.data || []).filter((a: any) => a.status === 'shortlisted').length,
        },
      });
    } catch {
      toast.error('Failed to compare jobs');
    } finally {
      setLoading(false);
    }
  };

  const MetricRow = ({ label, valueA, valueB, unit = '' }: { label: string; valueA: number | string; valueB: number | string; unit?: string }) => {
    const numA = typeof valueA === 'string' ? parseFloat(valueA) : valueA;
    const numB = typeof valueB === 'string' ? parseFloat(valueB) : valueB;
    const winner = numA > numB ? 'a' : numB > numA ? 'b' : 'tie';
    const max = Math.max(numA, numB, 1);

    return (
      <div className="space-y-2 py-3 border-b border-border/20 last:border-0">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-lg font-bold', winner === 'a' ? 'text-success' : 'text-foreground')}>
                {valueA}{unit}
              </span>
              {winner === 'a' && <Trophy className="w-4 h-4 text-warning" />}
            </div>
            <Progress value={(numA / max) * 100} className="h-2" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-lg font-bold', winner === 'b' ? 'text-success' : 'text-foreground')}>
                {valueB}{unit}
              </span>
              {winner === 'b' && <Trophy className="w-4 h-4 text-warning" />}
            </div>
            <Progress value={(numB / max) * 100} className="h-2" />
          </div>
        </div>
      </div>
    );
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Job Post A/B Testing</h2>
          <p className="text-sm text-muted-foreground">Compare performance of two job listings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] gap-3 items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Job A</label>
          <Select value={jobA} onValueChange={setJobA}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Select first job" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center pb-1">
          <span className="text-sm font-bold text-muted-foreground">VS</span>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Job B</label>
          <Select value={jobB} onValueChange={setJobB}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Select second job" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleCompare} disabled={loading} className="gap-2 rounded-xl">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
        Compare Performance
      </Button>

      {comparison && (
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <Badge variant="outline" className="mb-1">Job A</Badge>
                <p className="text-sm font-semibold text-foreground truncate">{comparison.a.title}</p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="mb-1">Job B</Badge>
                <p className="text-sm font-semibold text-foreground truncate">{comparison.b.title}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MetricRow label="Total Views" valueA={comparison.a.views} valueB={comparison.b.views} />
            <MetricRow label="Applications" valueA={comparison.a.applications} valueB={comparison.b.applications} />
            <MetricRow label="Conversion Rate" valueA={comparison.a.conversionRate} valueB={comparison.b.conversionRate} unit="%" />
            <MetricRow label="Shortlisted" valueA={comparison.a.shortlisted} valueB={comparison.b.shortlisted} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
