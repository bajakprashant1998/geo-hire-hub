import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Eye, MessageSquare, Calendar, MapPin, TrendingUp, Sparkles, Zap, Bot, Briefcase,
  ArrowRight, Target, Clock, Flame, ChevronRight, Lightbulb, Rocket,
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
import { useMemo } from 'react';

interface CandidateHomeViewProps {
  profile: any;
  candidate: any;
  stats: { applications: number; views: number; unreadMessages: number; interviews: number; unreadNotifications: number };
  nextInterviewLabel: string;
  completeness: number;
  onSectionClick: (section: string) => void;
  onEditProfile: () => void;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 18 } },
};

// Contextual daily tips based on profile state
function getDailyTip(stats: CandidateHomeViewProps['stats'], completeness: number): { icon: React.ElementType; text: string; cta: string; action: string } {
  if (completeness < 50) return { icon: Target, text: 'Complete your profile to get 3× more recruiter views', cta: 'Complete Profile', action: 'profile' };
  if (stats.applications === 0) return { icon: Rocket, text: 'Apply to your first job — it only takes a few clicks!', cta: 'Find Jobs', action: 'map' };
  if (stats.unreadMessages > 0) return { icon: MessageSquare, text: `You have ${stats.unreadMessages} unread message${stats.unreadMessages > 1 ? 's' : ''} waiting`, cta: 'Read Now', action: 'messages' };
  if (stats.interviews > 0) return { icon: Calendar, text: 'You have upcoming interviews — prepare with AI coach', cta: 'Prepare', action: 'interview-prep' };
  return { icon: Lightbulb, text: 'Keep your profile fresh — update skills and preferences regularly', cta: 'Update', action: 'profile' };
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
  const tip = useMemo(() => getDailyTip(stats, completeness), [stats, completeness]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    { icon: MapPin, label: 'Find Jobs', onClick: () => navigate('/'), color: 'text-primary', bg: 'bg-primary/10', ring: 'ring-primary/20' },
    { icon: Briefcase, label: 'Applications', onClick: () => onSectionClick('jobs'), color: 'text-primary', bg: 'bg-primary/10', ring: 'ring-primary/20', badge: stats.applications },
    { icon: MessageSquare, label: 'Messages', onClick: () => onSectionClick('messages'), color: 'text-success', bg: 'bg-success/10', ring: 'ring-success/20', badge: stats.unreadMessages },
    { icon: Calendar, label: 'Interviews', onClick: () => onSectionClick('interviews'), color: 'text-[hsl(262,83%,58%)]', bg: 'bg-[hsl(262,83%,58%)]/10', ring: 'ring-[hsl(262,83%,58%)]/20', badge: stats.interviews },
    { icon: FileText, label: 'Resume', onClick: () => onSectionClick('resume'), color: 'text-warning-foreground', bg: 'bg-warning/10', ring: 'ring-warning/20' },
    { icon: Sparkles, label: 'AI Resume', onClick: () => onSectionClick('ai-resume'), color: 'text-primary', bg: 'bg-primary/10', ring: 'ring-primary/20' },
    { icon: Zap, label: 'Auto Apply', onClick: () => onSectionClick('auto-apply'), color: 'text-success', bg: 'bg-success/10', ring: 'ring-success/20' },
    { icon: Bot, label: 'Career Buddy', onClick: () => onSectionClick('career-buddy'), color: 'text-[hsl(262,83%,58%)]', bg: 'bg-[hsl(262,83%,58%)]/10', ring: 'ring-[hsl(262,83%,58%)]/20' },
  ];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-4 sm:space-y-5"
    >
      <PlatformNotificationBanner userType="candidate" />

      {candidate && (
        <ProfileCompletionPrompts candidate={candidate} profile={profile} onNavigate={onSectionClick} onEditProfile={() => onSectionClick('profile')} />
      )}

      {/* ─── Hero Welcome + Daily Tip ─── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Welcome Card */}
        <div className="lg:col-span-2 relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-primary/85 to-primary/65 p-5 sm:p-6 flex flex-col justify-between min-h-[160px]">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl translate-y-10 -translate-x-8" />
          <div className="relative z-10">
            <p className="text-primary-foreground/60 text-[11px] font-semibold uppercase tracking-[0.15em] mb-1.5">{getGreeting()}</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground tracking-tight leading-tight">
              {profile.full_name?.split(' ')[0] || 'there'} 👋
            </h2>
            <p className="text-primary-foreground/55 text-sm mt-1.5 leading-relaxed max-w-md">
              {stats.applications > 0
                ? `You have ${stats.applications} active application${stats.applications > 1 ? 's' : ''}. Keep the momentum going!`
                : "Your next great opportunity is just one click away."
              }
            </p>
          </div>
          <div className="relative z-10 flex flex-wrap items-center gap-2 mt-4">
            <Button
              size="sm"
              variant="secondary"
              className="rounded-xl text-xs font-bold shadow-lg shadow-black/10 gap-1.5 h-9 px-4"
              onClick={() => navigate('/')}
            >
              <MapPin className="w-3.5 h-3.5" /> Explore Jobs
            </Button>
            {stats.interviews > 0 && (
              <Badge variant="secondary" className="bg-white/15 text-primary-foreground border-0 text-xs font-semibold gap-1 px-2.5 py-1">
                <Flame className="w-3 h-3" /> {stats.interviews} upcoming interview{stats.interviews > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Daily Focus Tip */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-xl p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <tip.icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-[11px] font-bold text-primary uppercase tracking-[0.12em]">Today's Focus</p>
            </div>
            <p className="text-sm text-foreground font-medium leading-relaxed">{tip.text}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full rounded-xl text-xs font-semibold gap-1.5 h-9 border-primary/20 text-primary hover:bg-primary/5"
            onClick={() => tip.action === 'map' ? navigate('/') : onSectionClick(tip.action)}
          >
            {tip.cta} <ArrowRight className="w-3 h-3" />
          </Button>
        </motion.div>
      </motion.div>

      {/* ─── Stats Row ─── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-1">
          <ProfileStrengthCard score={completeness} onImprove={() => onSectionClick('profile')} />
        </div>
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <DashboardStatCard icon={FileText} label="Applied" value={stats.applications} subtitle="total" accentColor="blue" onClick={() => onSectionClick('jobs')} delay={0} />
          <DashboardStatCard icon={Eye} label="Views" value={stats.views} subtitle="profile views" accentColor="green" onClick={onEditProfile} delay={1} />
          <DashboardStatCard icon={MessageSquare} label="Messages" value={stats.unreadMessages} subtitle={stats.unreadMessages > 0 ? 'unread' : 'all read'} accentColor="amber" onClick={() => onSectionClick('messages')} delay={2} />
          <DashboardStatCard icon={Calendar} label="Interviews" value={stats.interviews} subtitle={nextInterviewLabel} accentColor="purple" onClick={() => onSectionClick('interviews')} delay={3} />
        </div>
      </motion.div>

      {/* ─── Quick Actions Grid ─── */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Quick Actions</p>
          <button
            onClick={() => onSectionClick('job-radar')}
            className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            Job Radar <ChevronRight className="w-3 h-3" />
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

      {/* ─── Profile Completion Banner (compact) ─── */}
      {completeness < 100 && completeness >= 30 && (
        <motion.div variants={fadeUp}>
          <div className="relative rounded-2xl overflow-hidden border border-primary/10 bg-gradient-to-r from-primary/8 via-primary/4 to-transparent p-3.5 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                  <motion.circle
                    cx="22" cy="22" r="18" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 18}
                    initial={{ strokeDashoffset: 2 * Math.PI * 18 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 18 * (1 - completeness / 100) }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-primary">{completeness}%</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground">Your profile is {completeness}% complete</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {completeness < 60
                    ? 'Add your skills, experience, and a photo to stand out'
                    : 'Almost there! A few more steps to maximize visibility'}
                </p>
              </div>
              <Button size="sm" className="rounded-xl text-xs h-8 px-4 shadow-sm shrink-0 gap-1" onClick={() => navigate('/candidate-profile')}>
                Complete <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Messages + Interviews ─── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl overflow-hidden">
          <MessagesPreview profileId={profile.id} onOpenChat={() => onSectionClick('messages')} />
        </div>
        <div className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl overflow-hidden">
          <UpcomingInterviewCard />
        </div>
      </motion.div>

      {/* ─── Tasks + AI Matches ─── */}
      {candidate && (
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-xl p-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-3">Pending Tasks</p>
            <PendingTasksWidget type="candidate" candidateId={candidate.id} onViewAll={() => onSectionClick('tasks')} />
          </div>
          <div className="lg:col-span-2">
            <AIJobMatches candidateId={candidate.id} />
          </div>
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <RecentlyViewedJobs />
      </motion.div>

      {candidate && (
        <motion.div variants={fadeUp}>
          <JobMatchCarousel candidateId={candidate.id} skills={candidate.skills || []} />
        </motion.div>
      )}
    </motion.div>
  );
};
