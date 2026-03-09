import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Briefcase, Building2, Plus, Users, ChevronRight, MessageSquare, Calendar, BarChart3, Sparkles,
  Bell, Filter, Search, ArrowRight, Target, TrendingUp, Clock, Flame, Zap, FileText,
} from 'lucide-react';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { ActiveJobsTable } from '@/components/dashboard/ActiveJobsTable';
import { EmployerInterviewsCard } from '@/components/dashboard/EmployerInterviewsCard';
import { PlatformNotificationBanner } from '@/components/dashboard/PlatformNotificationBanner';
import { PendingTasksWidget } from '@/components/dashboard/PendingTasksWidget';
import { EmployerProfileCompletionPrompts } from '@/components/employer/ProfileCompletionPrompts';
import { HiringPipeline } from '@/components/employer/HiringPipeline';
import { RecentActivityFeed } from '@/components/employer/RecentActivityFeed';
import { RecentMessagesWidget } from '@/components/employer/RecentMessagesWidget';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface EmployerHomeViewProps {
  employer: any;
  profile: any;
  jobs: any[];
  stats: {
    activeJobs: number;
    totalApplications: number;
    scheduledInterviews: number;
    profileViews: number;
    notificationCount: number;
    unreadMessages: number;
  };
  planName: string;
  onSectionClick: (section: string) => void;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 18 } },
};

function getHiringHealth(stats: EmployerHomeViewProps['stats']): { label: string; color: string; tip: string } {
  if (stats.activeJobs === 0) return { label: 'No active jobs', color: 'text-muted-foreground', tip: 'Post a job to start receiving applications' };
  const ratio = stats.totalApplications / Math.max(stats.activeJobs, 1);
  if (ratio >= 10) return { label: 'Excellent', color: 'text-success', tip: 'Strong candidate pipeline — review and shortlist' };
  if (ratio >= 3) return { label: 'Healthy', color: 'text-primary', tip: 'Good traction — keep your job descriptions optimized' };
  return { label: 'Needs Attention', color: 'text-warning-foreground', tip: 'Try optimizing job titles and descriptions for more reach' };
}

export const EmployerHomeView = ({
  employer,
  profile,
  jobs,
  stats,
  planName,
  onSectionClick,
}: EmployerHomeViewProps) => {
  const health = useMemo(() => getHiringHealth(stats), [stats]);

  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  const quickActions = [
    { icon: Plus, label: 'Post Job', onClick: () => onSectionClick('post-job'), color: 'text-primary', bg: 'bg-primary/10', ring: 'ring-primary/20', primary: true },
    { icon: Briefcase, label: 'My Jobs', onClick: () => onSectionClick('jobs'), color: 'text-primary', bg: 'bg-primary/8', ring: 'ring-primary/15', badge: stats.activeJobs },
    { icon: Filter, label: 'Find Talent', onClick: () => onSectionClick('candidates'), color: 'text-success', bg: 'bg-success/10', ring: 'ring-success/20' },
    { icon: MessageSquare, label: 'Messages', onClick: () => onSectionClick('chat'), color: 'text-[hsl(262,83%,58%)]', bg: 'bg-[hsl(262,83%,58%)]/10', ring: 'ring-[hsl(262,83%,58%)]/20', badge: stats.unreadMessages },
    { icon: Calendar, label: 'Interviews', onClick: () => onSectionClick('interviews'), color: 'text-warning-foreground', bg: 'bg-warning/10', ring: 'ring-warning/20', badge: stats.scheduledInterviews },
    { icon: BarChart3, label: 'Analytics', onClick: () => onSectionClick('analytics'), color: 'text-primary', bg: 'bg-primary/10', ring: 'ring-primary/20' },
    { icon: Sparkles, label: 'AI Screen', onClick: () => onSectionClick('ai-screening'), color: 'text-success', bg: 'bg-success/10', ring: 'ring-success/20' },
    { icon: Building2, label: 'Company', onClick: () => onSectionClick('company'), color: 'text-[hsl(262,83%,58%)]', bg: 'bg-[hsl(262,83%,58%)]/10', ring: 'ring-[hsl(262,83%,58%)]/20' },
  ];

  // Today's focus nudges
  const nudges = useMemo(() => {
    const list: { icon: any; label: string; desc: string; action: string; color: string; bg: string }[] = [];
    if (stats.totalApplications > 0) list.push({ icon: Users, label: 'Review Applications', desc: `${stats.totalApplications} waiting`, action: 'jobs', color: 'text-primary', bg: 'bg-primary/10' });
    if (stats.scheduledInterviews > 0) list.push({ icon: Calendar, label: 'Upcoming Interviews', desc: `${stats.scheduledInterviews} scheduled`, action: 'interviews', color: 'text-success', bg: 'bg-success/10' });
    if (stats.notificationCount > 0) list.push({ icon: Bell, label: 'Unread Notifications', desc: `${stats.notificationCount} new`, action: 'notifications', color: 'text-warning-foreground', bg: 'bg-warning/10' });
    if (employer && (employer.profile_completeness || 0) < 60) list.push({ icon: Building2, label: 'Complete Profile', desc: `${employer.profile_completeness || 0}% done`, action: 'company', color: 'text-destructive', bg: 'bg-destructive/10' });
    if (stats.activeJobs === 0) list.push({ icon: Plus, label: 'Post Your First Job', desc: 'Start attracting talent', action: 'post-job', color: 'text-primary', bg: 'bg-primary/10' });
    return list;
  }, [stats, employer]);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-4 sm:space-y-5"
    >
      <PlatformNotificationBanner userType="employer" />

      {/* ─── Hero Welcome + Hiring Health ─── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Welcome Card */}
        <div className="lg:col-span-2 relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-primary/85 to-primary/65 p-5 sm:p-6 flex flex-col justify-between min-h-[170px]">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl translate-y-10 -translate-x-8" />
          <div className="relative z-10">
            <p className="text-primary-foreground/60 text-[11px] font-semibold uppercase tracking-[0.15em] mb-1.5">{getGreeting()}</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground tracking-tight leading-tight">
              {employer?.company_name || 'Your Company'} 🏢
            </h2>
            <p className="text-primary-foreground/55 text-sm mt-1.5 leading-relaxed max-w-md">
              {stats.totalApplications > 0
                ? `${stats.totalApplications} application${stats.totalApplications !== 1 ? 's' : ''} awaiting review across ${stats.activeJobs} active job${stats.activeJobs !== 1 ? 's' : ''}.`
                : stats.activeJobs > 0
                  ? `Your ${stats.activeJobs} job${stats.activeJobs > 1 ? 's are' : ' is'} live and attracting candidates.`
                  : 'Post your first job to start receiving applications from top talent.'
              }
            </p>
          </div>
          <div className="relative z-10 flex flex-wrap items-center gap-2 mt-4">
            <Button size="sm" variant="secondary" className="rounded-xl text-xs font-bold shadow-lg shadow-black/10 gap-1.5 h-9 px-4" onClick={() => onSectionClick('post-job')}>
              <Plus className="w-3.5 h-3.5" /> Post a Job
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl text-xs font-medium text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 gap-1.5 h-9" onClick={() => onSectionClick('candidates')}>
              <Search className="w-3.5 h-3.5" /> Find Talent
            </Button>
            {stats.scheduledInterviews > 0 && (
              <Badge variant="secondary" className="bg-white/15 text-primary-foreground border-0 text-xs font-semibold gap-1 px-2.5 py-1">
                <Flame className="w-3 h-3" /> {stats.scheduledInterviews} interview{stats.scheduledInterviews > 1 ? 's' : ''} today
              </Badge>
            )}
          </div>
        </div>

        {/* Hiring Health Card */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <p className="text-[11px] font-bold text-primary uppercase tracking-[0.12em]">Hiring Health</p>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn("text-lg font-extrabold", health.color)}>{health.label}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{health.tip}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/40 p-2.5 text-center">
              <p className="text-lg font-extrabold text-foreground">{stats.activeJobs}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Active Jobs</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-2.5 text-center">
              <p className="text-lg font-extrabold text-foreground">{stats.totalApplications}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Applications</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* ─── Stats Row ─── */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <DashboardStatCard icon={Briefcase} label="Active Jobs" value={stats.activeJobs} subtitle="currently open" accentColor="blue" onClick={() => onSectionClick('jobs')} delay={0} />
        <DashboardStatCard icon={Users} label="Applications" value={stats.totalApplications} subtitle="across all jobs" accentColor="amber" onClick={() => onSectionClick('jobs')} delay={1} />
        <DashboardStatCard icon={Calendar} label="Interviews" value={stats.scheduledInterviews} subtitle="upcoming" accentColor="green" onClick={() => onSectionClick('interviews')} delay={2} />
        <DashboardStatCard icon={MessageSquare} label="Messages" value={stats.unreadMessages} subtitle="awaiting reply" accentColor="purple" onClick={() => onSectionClick('chat')} delay={3} />
      </motion.div>

      {/* ─── Profile Completion Prompts ─── */}
      {employer && (employer.profile_completeness || 0) < 80 && (
        <motion.div variants={fadeUp}>
          <EmployerProfileCompletionPrompts employer={employer} jobCount={jobs.length} />
        </motion.div>
      )}

      {/* ─── Today's Focus ─── */}
      {nudges.length > 0 && (
        <motion.div variants={fadeUp} className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl p-4 overflow-hidden relative">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-warning/6 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <div className="w-6 h-6 rounded-lg bg-warning/15 flex items-center justify-center">
              <Target className="w-3 h-3 text-warning-foreground" />
            </div>
            <p className="text-[11px] font-bold text-foreground uppercase tracking-[0.12em]">Today's Focus</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 relative z-10">
            {nudges.slice(0, 4).map((nudge, i) => (
              <motion.button
                key={nudge.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSectionClick(nudge.action)}
                className="flex items-center gap-3 p-3 rounded-xl bg-card/80 border border-border/30 hover:border-border/60 hover:shadow-sm transition-all text-left group"
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', nudge.bg)}>
                  <nudge.icon className={cn('w-4 h-4', nudge.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{nudge.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{nudge.desc}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 shrink-0 transition-colors" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── Quick Actions Grid ─── */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Quick Actions</p>
          <button
            onClick={() => onSectionClick('analytics')}
            className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            View Analytics <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.03 }}
              whileHover={{ y: -3, scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={action.onClick}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-muted/50 transition-all relative group"
            >
              <div className={cn(
                "w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center ring-1 transition-shadow group-hover:shadow-md",
                action.bg, action.ring
              )}>
                <action.icon className={cn("w-4.5 h-4.5 sm:w-5 sm:h-5", action.color)} />
              </div>
              {action.badge !== undefined && action.badge > 0 && (
                <span className="absolute top-1 right-1 sm:top-1.5 sm:right-2 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1 shadow-sm">
                  {action.badge > 99 ? '99+' : action.badge}
                </span>
              )}
              <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground leading-tight text-center group-hover:text-foreground transition-colors">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ─── Active Jobs + Pipeline ─── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl overflow-hidden">
          <div className="p-1">{employer && <ActiveJobsTable employerId={employer.id} onManageJobs={() => onSectionClick('jobs')} />}</div>
        </div>
        <div className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl overflow-hidden">
          <div className="p-4 sm:p-5">{employer && <HiringPipeline employerId={employer.id} />}</div>
        </div>
      </motion.div>

      {/* ─── Interviews + Tasks + Messages ─── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl overflow-hidden">
          <div className="p-1">{employer && <EmployerInterviewsCard employerId={employer.id} />}</div>
        </div>
        <div className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl overflow-hidden">
          <div className="p-4 sm:p-5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">Pending Tasks</p>
            {employer && <PendingTasksWidget type="employer" employerId={employer.id} onViewAll={() => onSectionClick('tasks')} />}
          </div>
        </div>
        <div className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl overflow-hidden">
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Recent Messages</p>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-primary px-2 rounded-lg" onClick={() => onSectionClick('chat')}>View All</Button>
            </div>
            <RecentMessagesWidget profileId={profile.id} onOpenChat={() => onSectionClick('chat')} />
          </div>
        </div>
      </motion.div>

      {/* ─── Recent Activity ─── */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl overflow-hidden">
        <div className="p-4 sm:p-5">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">Recent Activity</p>
          {employer && profile && <RecentActivityFeed employerId={employer.id} profileId={profile.id} />}
        </div>
      </motion.div>
    </motion.div>
  );
};
