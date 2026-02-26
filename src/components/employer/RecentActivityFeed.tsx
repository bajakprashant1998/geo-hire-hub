import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, Briefcase, Calendar, Eye, MessageSquare, CheckCircle,
  Clock, UserPlus, FileText, Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'application' | 'interview' | 'view' | 'message' | 'job';
  title: string;
  subtitle: string;
  timestamp: string;
  avatar?: string | null;
  initials: string;
}

interface RecentActivityFeedProps {
  employerId: string;
  profileId: string;
}

const activityIcons: Record<string, { icon: any; color: string; bg: string }> = {
  application: { icon: UserPlus, color: 'text-primary', bg: 'bg-primary/10' },
  interview: { icon: Calendar, color: 'text-success', bg: 'bg-success/10' },
  view: { icon: Eye, color: 'text-muted-foreground', bg: 'bg-muted' },
  message: { icon: MessageSquare, color: 'text-primary', bg: 'bg-primary/10' },
  job: { icon: Briefcase, color: 'text-warning-foreground', bg: 'bg-warning/10' },
};

export const RecentActivityFeed = ({ employerId, profileId }: RecentActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, [employerId]);

  const fetchActivity = async () => {
    try {
      const results: ActivityItem[] = [];

      // Fetch recent applications
      const { data: apps } = await supabase
        .from('applications')
        .select(`id, created_at, job:jobs!inner(title, employer_id), candidate:candidates!inner(profile_id, job_title)`)
        .eq('job.employer_id', employerId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (apps) {
        for (const app of apps) {
          const a = app as any;
          const { data: prof } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', a.candidate.profile_id).maybeSingle();
          results.push({
            id: `app-${a.id}`,
            type: 'application',
            title: `${prof?.full_name || 'Someone'} applied`,
            subtitle: a.job.title,
            timestamp: a.created_at,
            avatar: prof?.avatar_url,
            initials: (prof?.full_name || 'U').slice(0, 2).toUpperCase(),
          });
        }
      }

      // Fetch recent interviews
      const { data: interviews } = await supabase
        .from('interviews')
        .select(`id, created_at, status, scheduled_date, candidate_id, candidates!inner(profile_id), jobs!inner(title)`)
        .eq('employer_id', employerId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (interviews) {
        for (const iv of interviews) {
          const i = iv as any;
          const { data: prof } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', i.candidates.profile_id).maybeSingle();
          results.push({
            id: `iv-${i.id}`,
            type: 'interview',
            title: `Interview ${i.status === 'confirmed' ? 'confirmed' : i.status === 'requested' ? 'requested' : 'scheduled'}`,
            subtitle: `${prof?.full_name || 'Candidate'} • ${i.jobs.title}`,
            timestamp: i.created_at,
            avatar: prof?.avatar_url,
            initials: (prof?.full_name || 'C').slice(0, 2).toUpperCase(),
          });
        }
      }

      // Sort by timestamp
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(results.slice(0, 8));
    } catch (err) {
      console.error('Activity feed error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No recent activity</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Post a job to start receiving applications</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity, i) => {
        const config = activityIcons[activity.type];
        const IconComponent = config.icon;
        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors group cursor-default"
          >
            <div className="relative">
              <Avatar className="w-9 h-9">
                <AvatarImage src={activity.avatar || undefined} />
                <AvatarFallback className={cn("text-[10px] font-semibold", config.bg, config.color)}>
                  {activity.initials}
                </AvatarFallback>
              </Avatar>
              <div className={cn("absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-card", config.bg)}>
                <IconComponent className={cn("w-2.5 h-2.5", config.color)} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{activity.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{activity.subtitle}</p>
            </div>
            <span className="text-[10px] text-muted-foreground/60 shrink-0">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: false })}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};
