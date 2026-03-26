import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Eye, MessageSquare, Calendar, MapPin, TrendingUp, Sparkles, Zap, Bot, Briefcase,
  ArrowRight, Target, Clock, Flame, ChevronRight, Lightbulb, Rocket, Star, Shield, Award,
  CheckCircle2, BarChart3, Users,
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
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 110, damping: 18 } },
};

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

  const careerTools = [
    { icon: BarChart3, label: 'Market Value', desc: 'Know your worth', onClick: () => onSectionClick('market-value'), color: 'text-pink-500', bg: 'bg-pink-500/8' },
    { icon: TrendingUp, label: 'Career Path', desc: 'Plan your growth', onClick: () => onSectionClick('career-path'), color: 'text-emerald-500', bg: 'bg-emerald-500/8' },
    { icon: Award, label: 'Skill Gap', desc: 'Bridge the gap', onClick: () => onSectionClick('skill-gap'), color: 'text-orange-500', bg: 'bg-orange-500/8' },
    { icon: Users, label: 'Networking', desc: 'Grow connections', onClick: () => onSectionClick('networking'), color: 'text-blue-500', bg: 'bg-blue-500/8' },
  ];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-4 sm:space-y-6 overflow-x-hidden"
    >
      <PlatformNotificationBanner userType="candidate" />

      {candidate && (
        <ProfileCompletionPrompts candidate={candidate} profile={profile} onNavigate={onSectionClick} onEditProfile={() => onSectionClick('profile')} />
      )}

      {/* ─── Hero Welcome + Daily Tip ─── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Welcome Card */}
        <div className="lg:col-span-2 relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-primary/85 to-primary/60 p-5 sm:p-7 flex flex-col justify-between min-h-[160px] sm:min-h-[180px] group">
          {/* Decorative orbs */}
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-white/[0.06] rounded-full blur-3xl transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/[0.04] rounded-full blur-2xl translate-y-12 -translate-x-10" />
          <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-white/[0.03] rounded-full blur-xl" />

          <div className="relative z-10">
            <p className="text-primary-foreground/50 text-[11px] font-bold uppercase tracking-[0.18em] mb-2">{getGreeting()}</p>
            <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-extrabold text-primary-foreground tracking-tight leading-tight">
              {profile.full_name?.split(' ')[0] || 'there'} 👋
            </h1>
            <p className="text-primary-foreground/50 text-sm mt-2 leading-relaxed max-w-lg">
              {stats.applications > 0
                ? `You have ${stats.applications} active application${stats.applications > 1 ? 's' : ''}. Keep the momentum going!`
                : "Your next great opportunity is just one click away. Start exploring."}
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2.5 mt-5">
            <Button
              size="sm"
              variant="secondary"
              className="rounded-xl text-xs font-bold shadow-lg shadow-black/15 gap-1.5 h-9 px-5 hover:scale-[1.02] active:scale-[0.98] transition-transform"
              onClick={() => navigate('/')}
            >
              <MapPin className="w-3.5 h-3.5" /> Explore Jobs
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl text-xs font-semibold text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 gap-1.5 h-9 px-4"
              onClick={() => onSectionClick('job-radar')}
            >
              <Sparkles className="w-3.5 h-3.5" /> Job Radar
            </Button>
            {stats.interviews > 0 && (
              <Badge variant="secondary" className="bg-white/15 text-primary-foreground border-0 text-xs font-semibold gap-1.5 px-3 py-1.5 animate-pulse">
                <Flame className="w-3 h-3" /> {stats.interviews} upcoming
              </Badge>
            )}
          </div>
        </div>

        {/* Daily Focus Tip */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-xl p-5 sm:p-6 flex flex-col justify-between hover:border-primary/20 transition-colors duration-300"
        >
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <tip.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.14em]">Today's Focus</p>
                <p className="text-[10px] text-muted-foreground">Personalized for you</p>
              </div>
            </div>
            <p className="text-sm text-foreground font-medium leading-relaxed">{tip.text}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-5 w-full rounded-xl text-xs font-semibold gap-1.5 h-9 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 transition-all"
            onClick={() => tip.action === 'map' ? navigate('/') : onSectionClick(tip.action)}
          >
            {tip.cta} <ArrowRight className="w-3 h-3" />
          </Button>
        </motion.div>
      </motion.div>

      {/* ─── Stats Row ─── */}
      <motion.div variants={fadeUp} className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-1 lg:grid-cols-5 sm:gap-4">
        <div className="lg:col-span-1">
          <ProfileStrengthCard score={completeness} onImprove={() => onSectionClick('profile')} />
        </div>
        <div className="lg:col-span-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <DashboardStatCard icon={FileText} label="Applied" value={stats.applications} subtitle="total" accentColor="blue" onClick={() => onSectionClick('jobs')} delay={0} />
          <DashboardStatCard icon={Eye} label="Views" value={stats.views} subtitle="profile views" accentColor="green" onClick={onEditProfile} delay={1} />
          <DashboardStatCard icon={MessageSquare} label="Messages" value={stats.unreadMessages} subtitle={stats.unreadMessages > 0 ? 'unread' : 'all read'} accentColor="amber" onClick={() => onSectionClick('messages')} delay={2} />
          <DashboardStatCard icon={Calendar} label="Interviews" value={stats.interviews} subtitle={nextInterviewLabel} accentColor="purple" onClick={() => onSectionClick('interviews')} delay={3} />
        </div>
      </motion.div>

      {/* ─── Quick Actions Grid ─── */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-foreground">Quick Actions</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Jump to frequently used tools</p>
          </div>
          <button
            onClick={() => onSectionClick('job-radar')}
            className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-primary/5"
          >
            Job Radar <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.03 }}
              whileHover={{ y: -4, scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={action.onClick}
              className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl hover:bg-muted/50 transition-all relative group min-w-0"
            >
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ring-1 transition-all duration-200 group-hover:shadow-lg group-hover:ring-2",
                action.bg, action.ring
              )}>
                <action.icon className={cn("w-4 h-4 sm:w-5 sm:h-5", action.color)} />
              </div>
              {action.badge !== undefined && action.badge > 0 && (
                <span className="absolute top-1 right-1 sm:top-1.5 sm:right-2 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1 shadow-md shadow-destructive/30">
                  {action.badge > 99 ? '99+' : action.badge}
                </span>
              )}
              <span className="text-[9px] sm:text-[11px] font-medium text-muted-foreground leading-tight text-center group-hover:text-foreground transition-colors truncate w-full">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ─── Profile Completion Banner (compact) ─── */}
      {completeness < 100 && completeness >= 30 && (
        <motion.div variants={fadeUp}>
          <div className="relative rounded-2xl overflow-hidden border border-primary/15 bg-gradient-to-r from-primary/8 via-primary/4 to-transparent p-4 sm:p-5 hover:border-primary/25 transition-colors">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative shrink-0">
                  <svg width="48" height="48" viewBox="0 0 52 52" className="-rotate-90">
                    <circle cx="26" cy="26" r="21" fill="none" stroke="hsl(var(--border))" strokeWidth="3.5" />
                    <motion.circle
                      cx="26" cy="26" r="21" fill="none" stroke="hsl(var(--primary))" strokeWidth="3.5" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 21}
                      initial={{ strokeDashoffset: 2 * Math.PI * 21 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 21 * (1 - completeness / 100) }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-primary">{completeness}%</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-foreground">Your profile is {completeness}% complete</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                    {completeness < 60
                      ? 'Add skills, experience & photo to stand out'
                      : 'Almost there! A few more steps to go'}
                  </p>
                </div>
              </div>
              <Button size="sm" className="rounded-xl text-xs h-9 px-5 shadow-sm shrink-0 gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-transform w-full sm:w-auto" onClick={() => onSectionClick('profile')}>
                Complete <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Messages + Interviews ─── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl overflow-hidden hover:border-border/60 transition-colors">
          <MessagesPreview profileId={profile.id} onOpenChat={() => onSectionClick('messages')} />
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl overflow-hidden hover:border-border/60 transition-colors">
          <UpcomingInterviewCard />
        </div>
      </motion.div>

      {/* ─── Career Tools Highlight ─── */}
      <motion.div variants={fadeUp}>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground">Career Growth Tools</h2>
          <p className="text-xs text-muted-foreground mt-0.5">AI-powered insights to accelerate your career</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {careerTools.map((tool, i) => (
            <motion.button
              key={tool.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={tool.onClick}
              className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-4 sm:p-5 text-left group hover:border-border/60 hover:shadow-md transition-all duration-200"
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", tool.bg)}>
                <tool.icon className={cn("w-5 h-5", tool.color)} />
              </div>
              <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{tool.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{tool.desc}</p>
              <div className="flex items-center gap-1 mt-3 text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Explore <ArrowRight className="w-3 h-3" />
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ─── Tasks + AI Matches ─── */}
      {candidate && (
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-foreground">Pending Tasks</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Stay on track</p>
              </div>
              <button onClick={() => onSectionClick('tasks')} className="text-[10px] font-semibold text-primary flex items-center gap-0.5 hover:underline">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
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

      {/* ─── Trust Signals / Social Proof ─── */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-border/30 bg-card/40 backdrop-blur-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-4 sm:gap-8 flex-wrap justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-4 h-4 text-success" />
              <span className="text-xs font-medium">SSL Secured</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">Verified Employers</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Star className="w-4 h-4 text-warning" />
              <span className="text-xs font-medium">AI-Powered Matching</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4 text-[hsl(262,83%,58%)]" />
              <span className="text-xs font-medium">Global Network</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground rounded-xl gap-1"
            onClick={() => onSectionClick('security')}
          >
            Privacy & Security <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};
