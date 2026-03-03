import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Briefcase, FileText, Shield, Bell } from 'lucide-react';

interface LiveEvent {
  id: string;
  type: 'registration' | 'job_posted' | 'application' | 'report' | 'moderation';
  message: string;
  timestamp: Date;
}

const eventIcons = {
  registration: UserPlus,
  job_posted: Briefcase,
  application: FileText,
  report: Shield,
  moderation: Bell,
};

const eventColors = {
  registration: 'bg-primary/10 text-primary',
  job_posted: 'bg-success/10 text-success',
  application: 'bg-warning/10 text-warning',
  report: 'bg-destructive/10 text-destructive',
  moderation: 'bg-muted text-muted-foreground',
};

export function LiveActivityFeed() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    // Load recent events
    const loadRecent = async () => {
      const [profiles, jobs, apps] = await Promise.all([
        supabase.from('profiles').select('id, full_name, user_type, created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('jobs').select('id, title, created_at').order('created_at', { ascending: false }).limit(3),
        supabase.from('applications').select('id, created_at').order('created_at', { ascending: false }).limit(3),
      ]);

      const initial: LiveEvent[] = [
        ...(profiles.data?.map(p => ({
          id: `reg-${p.id}`,
          type: 'registration' as const,
          message: `${p.full_name} signed up as ${p.user_type}`,
          timestamp: new Date(p.created_at),
        })) || []),
        ...(jobs.data?.map(j => ({
          id: `job-${j.id}`,
          type: 'job_posted' as const,
          message: `New job posted: "${j.title}"`,
          timestamp: new Date(j.created_at),
        })) || []),
        ...(apps.data?.map(a => ({
          id: `app-${a.id}`,
          type: 'application' as const,
          message: `New application submitted`,
          timestamp: new Date(a.created_at),
        })) || []),
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 8);

      setEvents(initial);
    };

    loadRecent();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('admin-live-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
        const p = payload.new as { id: string; full_name: string; user_type: string };
        setEvents(prev => [{
          id: `reg-${p.id}-${Date.now()}`,
          type: 'registration' as const,
          message: `${p.full_name || 'New user'} signed up as ${p.user_type || 'user'}`,
          timestamp: new Date(),
        }, ...prev].slice(0, 10));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jobs' }, (payload) => {
        const j = payload.new as { id: string; title: string };
        setEvents(prev => [{
          id: `job-${j.id}-${Date.now()}`,
          type: 'job_posted' as const,
          message: `New job posted: "${j.title}"`,
          timestamp: new Date(),
        }, ...prev].slice(0, 10));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'applications' }, () => {
        setEvents(prev => [{
          id: `app-${Date.now()}`,
          type: 'application' as const,
          message: `New application submitted`,
          timestamp: new Date(),
        }, ...prev].slice(0, 10));
      })
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live Feed</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
          <span className="text-[10px] text-muted-foreground">{isLive ? 'Live' : 'Connecting...'}</span>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {events.map((event) => {
          const Icon = eventIcons[event.type];
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-2.5 py-2 border-b border-border/30 last:border-0"
            >
              <div className={`p-1.5 rounded-md ${eventColors[event.type]} shrink-0 mt-0.5`}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{event.message}</p>
                <p className="text-[10px] text-muted-foreground">{format(event.timestamp, 'HH:mm:ss')}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {events.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
      )}
    </div>
  );
}
