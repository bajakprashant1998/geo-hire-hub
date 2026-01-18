import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, FileText, UserCheck, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface JobAnalyticsCardProps {
  jobId: string;
  compact?: boolean;
}

interface Analytics {
  views: number;
  applications: number;
  shortlisted: number;
  hired: number;
}

export const JobAnalyticsCard = ({ jobId, compact = false }: JobAnalyticsCardProps) => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_job_analytics', { p_job_id: jobId });

        if (error) throw error;
        setAnalytics(data as unknown as Analytics);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchAnalytics();
    }
  }, [jobId]);

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  const stats = [
    { icon: Eye, label: 'Views', value: analytics.views, color: 'text-primary' },
    { icon: FileText, label: 'Applications', value: analytics.applications, color: 'text-warning' },
    { icon: UserCheck, label: 'Shortlisted', value: analytics.shortlisted, color: 'text-success' },
    { icon: Trophy, label: 'Hired', value: analytics.hired, color: 'text-primary' },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-1">
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
            <span className="font-medium">{stat.value}</span>
            <span className="text-muted-foreground hidden sm:inline">{stat.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className="shadow-google">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Job Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <stat.icon className={`w-6 h-6 mx-auto mb-1 ${stat.color}`} />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
