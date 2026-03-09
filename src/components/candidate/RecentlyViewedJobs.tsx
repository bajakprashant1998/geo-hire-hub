import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Briefcase, ChevronRight, Loader2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface RecentJob {
  job_id: string;
  viewed_at: string;
  job: {
    id: string;
    title: string;
    salary_range: string | null;
    job_type: string | null;
    location_city: string | null;
    location_state: string | null;
    location_country: string | null;
    slug: string | null;
    employer: {
      company_name: string;
    };
  };
}

export const RecentlyViewedJobs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchRecentlyViewed();
  }, [user]);

  const fetchRecentlyViewed = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('job_views')
      .select(`
        job_id,
        viewed_at,
        job:jobs!inner (
          id, title, salary_range, job_type, location_city, location_state, location_country, slug, is_active, status, expires_at,
          employer:employers!inner ( company_name )
        )
      `)
      .eq('viewer_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      const now = new Date().toISOString();
      // Deduplicate by job_id (keep most recent view) and filter expired/inactive
      const seen = new Set<string>();
      const unique = (data as unknown as RecentJob[]).filter((item) => {
        if (seen.has(item.job_id)) return false;
        const job = item.job as any;
        if (!job.is_active || job.status !== 'open') return false;
        if (job.expires_at && job.expires_at < now) return false;
        seen.add(item.job_id);
        return true;
      });
      setJobs(unique.slice(0, 5));
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="border border-border/40 bg-card/50 backdrop-blur-2xl rounded-2xl relative overflow-hidden">
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="border border-border/40 bg-card/50 backdrop-blur-2xl rounded-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 dark:ring-white/5 pointer-events-none" />

        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Eye className="w-4 h-4 text-primary" />
            </div>
            Recently Viewed Jobs
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0 relative z-10 space-y-2">
          {jobs.map((item, i) => {
            const job = item.job;
            const location = [job.location_city, job.location_state].filter(Boolean).join(', ');

            return (
              <motion.div
                key={`${item.job_id}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  if (job.slug) {
                    const parts = ['/jobs'];
                    if (job.location_country) parts.push(encodeURIComponent(job.location_country.toLowerCase().replace(/\s+/g, '-')));
                    if (job.location_state) parts.push(encodeURIComponent(job.location_state.toLowerCase().replace(/\s+/g, '-')));
                    if (job.location_city) parts.push(encodeURIComponent(job.location_city.toLowerCase().replace(/\s+/g, '-')));
                    parts.push(job.slug);
                    navigate(parts.join('/'));
                  } else {
                    navigate(`/jobs/${job.id}`);
                  }
                }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-all group border border-transparent hover:border-border/40"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4.5 h-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                    {job.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{job.employer.company_name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {location && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" /> {location}
                      </span>
                    )}
                    {job.job_type && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 rounded-md">
                        {job.job_type}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {formatDistanceToNow(new Date(item.viewed_at), { addSuffix: true })}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
};
