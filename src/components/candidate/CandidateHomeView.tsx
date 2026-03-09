import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  FileText, Eye, MessageSquare, Calendar, MapPin, TrendingUp, Sparkles, Zap, Bot, Briefcase,
} from 'lucide-react';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { MessagesPreview } from '@/components/dashboard/MessagesPreview';
import { UpcomingInterviewCard } from '@/components/dashboard/UpcomingInterviewCard';
import { JobMatchCarousel } from '@/components/dashboard/JobMatchCarousel';
import { PlatformNotificationBanner } from '@/components/dashboard/PlatformNotificationBanner';
import { ProfileCompletionPrompts } from '@/components/candidate/ProfileCompletionPrompts';
import { AIJobMatches } from '@/components/candidate/AIJobMatches';
import { PendingTasksWidget } from '@/components/dashboard/PendingTasksWidget';
import { ProfileStrengthCard } from '@/components/candidate/ProfileStrengthCard';
import { RecentlyViewedJobs } from '@/components/candidate/RecentlyViewedJobs';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CandidateHomeViewProps {
  profile: any;
  candidate: any;
  stats: { applications: number; views: number; unreadMessages: number; interviews: number; unreadNotifications: number };
  nextInterviewLabel: string;
  completeness: number;
  onSectionClick: (section: string) => void;
  onEditProfile: () => void;
}

export const CandidateHomeView = ({
  profile,
  candidate,
  stats,
  nextInterviewLabel,
  completeness,
  onSectionClick,
  onEditProfile,
}: CandidateHomeViewProps) => {
  const navigate = useNavigate();

  const quickActions = [
    { icon: MapPin, label: 'Find Jobs', onClick: () => navigate('/'), color: 'text-primary', bg: 'bg-primary/10' },
    { icon: Briefcase, label: 'Applications', onClick: () => onSectionClick('jobs'), color: 'text-primary', bg: 'bg-primary/10' },
    { icon: MessageSquare, label: 'Messages', onClick: () => onSectionClick('messages'), color: 'text-success', bg: 'bg-success/10' },
    { icon: Calendar, label: 'Interviews', onClick: () => onSectionClick('interviews'), color: 'text-accent', bg: 'bg-accent/10' },
    { icon: FileText, label: 'Resume', onClick: () => onSectionClick('resume'), color: 'text-warning-foreground', bg: 'bg-warning/10' },
    { icon: Sparkles, label: 'AI Resume', onClick: () => onSectionClick('ai-resume'), color: 'text-primary', bg: 'bg-primary/10' },
    { icon: Zap, label: 'Auto Apply', onClick: () => onSectionClick('auto-apply'), color: 'text-success', bg: 'bg-success/10' },
    { icon: Bot, label: 'Career Buddy', onClick: () => onSectionClick('career-buddy'), color: 'text-accent', bg: 'bg-accent/10' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5">
      <PlatformNotificationBanner userType="candidate" />

      {candidate && (
        <ProfileCompletionPrompts candidate={candidate} profile={profile} onNavigate={onSectionClick} onEditProfile={() => onSectionClick('profile')} />
      )}

      {completeness < 100 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/10 rounded-2xl p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">Complete your profile — {completeness}%</p>
                <p className="text-[11px] text-muted-foreground">Complete profiles get 3× more views</p>
              </div>
              <Button size="sm" className="rounded-xl text-xs h-8 shadow-sm shrink-0" onClick={() => navigate('/candidate-profile')}>
                Complete
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <DashboardStatCard icon={FileText} label="Applied" value={stats.applications} subtitle="total" accentColor="blue" onClick={() => onSectionClick('jobs')} delay={0} />
        <DashboardStatCard icon={Eye} label="Views" value={stats.views} subtitle="profile views" accentColor="green" onClick={onEditProfile} delay={1} />
        <DashboardStatCard icon={MessageSquare} label="Messages" value={stats.unreadMessages} subtitle={stats.unreadMessages > 0 ? 'unread' : 'all read'} accentColor="amber" onClick={() => onSectionClick('messages')} delay={2} />
        <DashboardStatCard icon={Calendar} label="Interviews" value={stats.interviews} subtitle={nextInterviewLabel} accentColor="purple" onClick={() => onSectionClick('interviews')} delay={3} />
      </div>

      {/* Welcome + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-primary/70 p-5 flex flex-col justify-between min-h-[140px]">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <p className="text-primary-foreground/70 text-[11px] font-semibold uppercase tracking-wider mb-1">Welcome back</p>
            <h3 className="text-xl font-bold text-primary-foreground">{profile.full_name?.split(' ')[0] || 'there'} 👋</h3>
            <p className="text-primary-foreground/60 text-sm mt-1 leading-snug">
              {stats.applications > 0 ? `${stats.applications} active application${stats.applications > 1 ? 's' : ''}` : 'Start applying to jobs today'}
            </p>
          </div>
          <Button size="sm" variant="secondary" className="relative z-10 mt-3 w-fit rounded-xl text-xs font-semibold shadow-md" onClick={() => navigate('/')}>
            <MapPin className="w-3.5 h-3.5 mr-1" /> Explore Jobs
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="lg:col-span-3 rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</p>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((action, i) => (
              <motion.button key={action.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.03 }} whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={action.onClick} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", action.bg)}>
                  <action.icon className={cn("w-4 h-4", action.color)} />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground leading-tight text-center">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Messages + Interviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-2 rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl overflow-hidden">
          <MessagesPreview profileId={profile.id} onOpenChat={() => onSectionClick('messages')} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl overflow-hidden">
          <UpcomingInterviewCard />
        </motion.div>
      </div>

      {/* Tasks + AI Matches */}
      {candidate && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pending Tasks</p>
            <PendingTasksWidget type="candidate" candidateId={candidate.id} onViewAll={() => onSectionClick('tasks')} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="lg:col-span-2">
            <AIJobMatches candidateId={candidate.id} />
          </motion.div>
        </div>
      )}

      <RecentlyViewedJobs />

      {candidate && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <JobMatchCarousel candidateId={candidate.id} skills={candidate.skills || []} />
        </motion.div>
      )}
    </div>
  );
};
