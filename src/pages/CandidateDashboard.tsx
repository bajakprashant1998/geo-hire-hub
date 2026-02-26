import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDashboardTab } from '@/hooks/useDashboardTab';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Briefcase, Bell, Shield, FileText, Sparkles, Loader2,
  Eye, Calendar, Star, ChevronRight, User, MessageSquare, Bookmark, Mic,
  MapPin, TrendingUp, Zap, DollarSign, Bot, Radar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { MessagesPreview } from '@/components/dashboard/MessagesPreview';
import { UpcomingInterviewCard } from '@/components/dashboard/UpcomingInterviewCard';
import { JobMatchCarousel } from '@/components/dashboard/JobMatchCarousel';
import { DashboardMessaging } from '@/components/dashboard/DashboardMessaging';
import { ProfileEditModal } from '@/components/candidate/ProfileEditModal';
import { ResumeAndDocumentManager } from '@/components/candidate/ResumeAndDocumentManager';
import { JobActivityTabs } from '@/components/candidate/JobActivityTabs';
import { NotificationCenter } from '@/components/candidate/NotificationCenter';
import { JobAlertsManager } from '@/components/candidate/JobAlertsManager';
import { SecuritySettings } from '@/components/candidate/SecuritySettings';
import { RecommendedJobs } from '@/components/candidate/RecommendedJobs';
import { CandidateInterviewManager } from '@/components/candidate/CandidateInterviewManager';
import { PlatformNotificationBanner } from '@/components/dashboard/PlatformNotificationBanner';
import { SavedJobsSection } from '@/components/candidate/SavedJobsSection';
import { AIJobMatches } from '@/components/candidate/AIJobMatches';
import { TaskList } from '@/components/candidate/TaskList';
import { AudioResumeCard } from '@/components/candidate/AudioResumeCard';
import { SalaryInsights } from '@/components/candidate/SalaryInsights';
import { CareerBuddyChat } from '@/components/candidate/CareerBuddyChat';
import CandidateDetail from '@/pages/CandidateDetail';
import CandidateProfileEdit from '@/pages/CandidateProfileEdit';
import { ProfileCompletionPrompts } from '@/components/candidate/ProfileCompletionPrompts';
import { DashboardBottomNav } from '@/components/dashboard/DashboardBottomNav';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { AutoApplyManager } from '@/components/candidate/AutoApplyManager';
import { RecentlyViewedJobs } from '@/components/candidate/RecentlyViewedJobs';
import { JobRadar } from '@/components/candidate/JobRadar';
import { PendingTasksWidget } from '@/components/dashboard/PendingTasksWidget';
import { format, isToday, isTomorrow } from 'date-fns';
import { motion } from 'framer-motion';
import { lazy, Suspense } from 'react';

const AIResumeBuilder = lazy(() => import('@/pages/AIResumeBuilder'));
import { cn } from '@/lib/utils';

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { activeSection, setActiveSection } = useDashboardTab();
  const { user, profile, loading: authLoading, profileLoading, signOut, refreshProfile } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);
  const [candidate, setCandidate] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileRetryCount, setProfileRetryCount] = useState(0);
  const [nextInterviewLabel, setNextInterviewLabel] = useState('None scheduled');
  const [stats, setStats] = useState({
    applications: 0,
    views: 0,
    unreadMessages: 0,
    interviews: 0,
    unreadNotifications: 0,
  });

  const { refreshTrigger } = useRealtimeDashboard({
    userId: user?.id,
    candidateId: candidate?.id,
  });

  useEffect(() => {
    if (refreshTrigger > 0 && candidate) {
      fetchCandidate();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    if (user && !profile && !profileLoading && profileRetryCount < 3) {
      const timer = setTimeout(() => {
        refreshProfile();
        setProfileRetryCount(prev => prev + 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, profile, profileLoading, profileRetryCount, refreshProfile]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!profile && profileLoading) return;
    if (!profile) {
      setDataLoading(false);
      return;
    }
    if (profile.user_type !== 'candidate') {
      navigate('/employer-dashboard');
      return;
    }
    fetchCandidate();
  }, [user, profile, authLoading, profileLoading]);

  const fetchCandidate = async () => {
    if (!profile || !user) return;
    const { data } = await supabase
      .from('candidates')
      .select('*')
      .eq('profile_id', profile.id)
      .maybeSingle();
    setCandidate(data);

    if (data) {
      const [appsRes, messagesRes, interviewsRes] = await Promise.all([
        supabase.from('applications').select('id, status, job_id').eq('candidate_id', data.id),
        supabase.from('messages').select('id').eq('is_read', false).neq('sender_id', user.id),
        supabase.from('interviews').select('id', { count: 'exact', head: true }).eq('candidate_id', data.id).in('status', ['requested', 'confirmed', 'scheduled'])
      ]);

      const applications = appsRes.data || [];
      const interviews = interviewsRes.count || 0;

      const { count: viewCount } = await supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profile.id);

      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      const { data: nextInterview } = await supabase
        .from('interviews')
        .select('scheduled_date')
        .eq('candidate_id', data.id)
        .eq('status', 'scheduled')
        .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextInterview?.scheduled_date) {
        const d = new Date(nextInterview.scheduled_date);
        if (isToday(d)) setNextInterviewLabel('Next: Today');
        else if (isTomorrow(d)) setNextInterviewLabel('Next: Tomorrow');
        else setNextInterviewLabel(`Next: ${format(d, 'MMM d')}`);
      } else {
        setNextInterviewLabel('None scheduled');
      }

      setStats({
        applications: applications.length,
        views: viewCount || 0,
        unreadMessages: messagesRes.data?.length || 0,
        interviews,
        unreadNotifications: notifCount || 0,
      });
    }
    setDataLoading(false);
  };

  const handleProfileSave = () => {
    fetchCandidate();
    refreshProfile();
  };

  const handleSectionClick = (value: string) => {
    if (value === 'map') { navigate('/'); return; }
    if (value === 'messages') { setActiveSection('messages'); }
    else { setActiveSection(value === 'home' ? null : value); }
    setSidebarOpen(false);
  };

  const calculateCompleteness = () => {
    if (!profile || !candidate) return 0;
    const checks = [
      profile.full_name,
      profile.avatar_url,
      candidate.job_title,
      candidate.skills?.length > 0,
      candidate.experience_years > 0,
      candidate.education?.length > 0,
      profile.latitude && profile.longitude,
      candidate.bio?.length > 20,
      candidate.resume_url
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  };

  const sidebarItems = [
    { icon: MapPin, label: 'Back to Map', value: 'map' },
    { icon: Radar, label: 'Job Radar', value: 'job-radar' },
    { icon: Briefcase, label: 'My Applications', value: 'jobs', badge: stats.applications },
    { icon: MessageSquare, label: 'Messages', value: 'messages', badge: stats.unreadMessages },
    { icon: Calendar, label: 'Interviews', value: 'interviews', badge: stats.interviews },
    { icon: FileText, label: 'Tasks', value: 'tasks' },
    { icon: Bookmark, label: 'Saved Jobs', value: 'saved' },
    { icon: Star, label: 'Recommended Jobs', value: 'recommended' },
    { icon: FileText, label: 'Resume & Documents', value: 'resume' },
    { icon: Mic, label: 'Audio Resume', value: 'audio-resume' },
    { icon: Sparkles, label: 'AI Resume Builder', value: 'ai-resume' },
    { icon: Bell, label: 'Notifications', value: 'notifications', badge: stats.unreadNotifications },
    { icon: User, label: 'Edit Profile', value: 'profile' },
    { icon: Eye, label: 'Public Profile', value: 'public-profile' },
    { icon: Sparkles, label: 'Job Alerts', value: 'alerts' },
    { icon: Shield, label: 'Security', value: 'security' },
    { icon: Zap, label: 'Auto Apply', value: 'auto-apply' },
    { icon: DollarSign, label: 'Salary Insights', value: 'salary-insights' },
    { icon: Bot, label: 'Talk to My Buddy', value: 'career-buddy' }
  ];

  // Quick action buttons for dashboard home — full 8-item grid
  const quickActions = [
    { icon: MapPin, label: 'Find Jobs', onClick: () => navigate('/'), color: 'text-primary', bg: 'bg-primary/10' },
    { icon: Briefcase, label: 'Applications', onClick: () => handleSectionClick('jobs'), color: 'text-[hsl(217,89%,61%)]', bg: 'bg-[hsl(217,89%,61%)]/10' },
    { icon: MessageSquare, label: 'Messages', onClick: () => handleSectionClick('messages'), color: 'text-success', bg: 'bg-success/10' },
    { icon: Calendar, label: 'Interviews', onClick: () => handleSectionClick('interviews'), color: 'text-[hsl(262,83%,58%)]', bg: 'bg-[hsl(262,83%,58%)]/10' },
    { icon: FileText, label: 'Resume', onClick: () => handleSectionClick('resume'), color: 'text-warning-foreground', bg: 'bg-warning/10' },
    { icon: Sparkles, label: 'AI Match', onClick: () => handleSectionClick('ai-resume'), color: 'text-primary', bg: 'bg-primary/10' },
    { icon: Zap, label: 'Auto Apply', onClick: () => handleSectionClick('auto-apply'), color: 'text-success', bg: 'bg-success/10' },
    { icon: Bot, label: 'Career Buddy', onClick: () => handleSectionClick('career-buddy'), color: 'text-[hsl(262,83%,58%)]', bg: 'bg-[hsl(262,83%,58%)]/10' },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (user && !profile && profileLoading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ x: [0, -25, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/12 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ x: [0, 15, 0], y: [0, 15, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute top-10 right-1/4 w-48 h-48 bg-primary/6 rounded-full blur-2xl"
          />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 70, damping: 18 }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Floating badges above card */}
          <div className="flex justify-center gap-2 mb-5">
            {['10K+ Jobs', '5K+ Companies', 'AI Powered'].map((text, i) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="px-3 py-1 rounded-full bg-card/80 backdrop-blur-md border border-border/40 shadow-sm"
              >
                <span className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">{text}</span>
              </motion.div>
            ))}
          </div>

          <Card className="shadow-2xl shadow-primary/5 border border-border/40 backdrop-blur-xl bg-card/90 rounded-3xl overflow-hidden">
            {/* Gradient accent strip */}
            <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary/60" />

            <CardContent className="p-8 sm:p-10 text-center">
              {/* Animated layered icon */}
              <motion.div
                initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 180, damping: 14 }}
                className="relative mx-auto mb-8 w-24 h-24"
              >
                <motion.div
                  animate={{ rotate: [6, 8, 6] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 bg-primary/15 rounded-3xl"
                />
                <motion.div
                  animate={{ rotate: [-3, -5, -3] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 bg-primary/10 rounded-3xl"
                />
                <div className="relative w-full h-full bg-gradient-to-br from-primary to-primary/80 rounded-3xl flex items-center justify-center shadow-xl shadow-primary/30">
                  <Briefcase className="w-11 h-11 text-primary-foreground drop-shadow-sm" />
                </div>
                {/* Sparkle accent */}
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-lg"
                >
                  <Sparkles className="w-3 h-3 text-accent-foreground" />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground tracking-tight">
                  Your Career Starts Here
                </h2>
                <p className="text-muted-foreground mb-8 text-sm sm:text-base leading-relaxed max-w-sm mx-auto">
                  Sign in to access your personalized dashboard, AI-powered job matching, and one-click applications.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full h-13 text-base font-semibold rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  size="lg"
                >
                  Sign In to Continue
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </Button>
                <Button
                  onClick={() => navigate('/signup')}
                  variant="ghost"
                  className="w-full h-11 text-sm rounded-2xl hover:bg-primary/5 text-muted-foreground hover:text-foreground"
                  size="lg"
                >
                  New here? <span className="font-semibold text-primary ml-1">Create an account</span>
                </Button>
              </motion.div>

              {/* Feature highlights */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mt-8 pt-6 border-t border-border/30"
              >
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold mb-3">Why candidates love us</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: Sparkles, label: 'AI Matching', color: 'text-primary bg-primary/10' },
                    { icon: MapPin, label: 'Local Jobs', color: 'text-success bg-success/10' },
                    { icon: Zap, label: 'Auto Apply', color: 'text-warning-foreground bg-warning/20' },
                  ].map((feat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.55 + i * 0.08 }}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-muted/30 hover:bg-muted/60 transition-colors cursor-default group"
                    >
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110', feat.color)}>
                        <feat.icon className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground">{feat.label}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </CardContent>
          </Card>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-xs text-muted-foreground/50 mt-6"
          >
            By continuing, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-foreground/70 transition-colors">Terms</Link>{' & '}
            <Link to="/privacy" className="underline hover:text-foreground/70 transition-colors">Privacy Policy</Link>
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">Profile Not Found</h2>
            <p className="text-muted-foreground mb-8">We couldn't load your profile. Please try again or contact support.</p>
            <div className="flex gap-3">
              <Button onClick={() => refreshProfile()} variant="outline" className="flex-1">Retry</Button>
              <Button onClick={() => signOut()} variant="destructive" className="flex-1">Sign Out</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const completeness = calculateCompleteness();

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'jobs': return candidate && <JobActivityTabs candidateId={candidate.id} />;
      case 'saved': return candidate && <SavedJobsSection candidateId={candidate.id} />;
      case 'interviews': return candidate && <CandidateInterviewManager candidateId={candidate.id} />;
      case 'profile': return <CandidateProfileEdit embedded />;
      case 'resume': return candidate && <ResumeAndDocumentManager candidate={candidate} onUpdate={fetchCandidate} />;
      case 'audio-resume': return candidate && <AudioResumeCard candidate={candidate} onUpdate={fetchCandidate} />;
      case 'alerts': return candidate && <JobAlertsManager candidateId={candidate.id} />;
      case 'security': return <SecuritySettings />;
      case 'tasks': return candidate && <TaskList candidateId={candidate.id} />;
      case 'messages': return <DashboardMessaging />;
      case 'notifications': return <NotificationCenter />;
      case 'public-profile': return candidate && <CandidateDetail id={candidate.id} />;
      case 'recommended': return candidate && (
        <RecommendedJobs candidateId={candidate.id} skills={candidate.skills || []} latitude={profile.latitude} longitude={profile.longitude} />
      );
      case 'auto-apply': return candidate && <AutoApplyManager candidateId={candidate.id} />;
      case 'job-radar': return candidate && <JobRadar candidateId={candidate.id} candidate={candidate} profile={profile} />;
      case 'salary-insights': return <SalaryInsights />;
      case 'career-buddy': return <CareerBuddyChat />;
      case 'ai-resume': return (
        <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
          <AIResumeBuilder embedded />
        </Suspense>
      );
      default: return null;
    }
  };

  return (
    <EmailVerificationGuard fallbackMessage="Please verify your email to access your dashboard.">
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/80 flex overflow-x-hidden">
        {user && <OnboardingTour userId={user.id} type="candidate" />}
        <DashboardSidebar
          type="candidate"
          items={sidebarItems}
          activeItem={activeSection}
          onItemClick={handleSectionClick}
          userName={profile.full_name}
          userTitle={candidate?.job_title || 'Job Seeker'}
          avatarUrl={profile.avatar_url}
          onSignOut={signOut}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          profileCompleteness={completeness}
        />

        <div className="flex-1 flex flex-col min-h-screen lg:ml-0 overflow-x-hidden">
          <DashboardHeader
            type="candidate"
            userName={profile.full_name}
            userTitle={candidate?.job_title}
            avatarUrl={profile.avatar_url}
            onMenuClick={() => setSidebarOpen(true)}
            onSignOut={signOut}
            messageCount={stats.unreadMessages}
            notificationCount={stats.unreadNotifications}
            profileCompleteness={completeness}
            onNotificationClick={() => handleSectionClick('notifications')}
          />

          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto pb-24 md:pb-6">
            {activeSection ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                className="max-w-6xl mx-auto"
              >
                <Button
                  variant="ghost"
                  onClick={() => setActiveSection(null)}
                  className="mb-4 text-muted-foreground hover:text-foreground rounded-xl gap-2 backdrop-blur-sm"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Back to Dashboard
                </Button>
                <div className="bg-card/70 backdrop-blur-xl shadow-lg border border-border/40 rounded-2xl overflow-hidden">
                  <div className="p-3 sm:p-4 md:p-6">
                    {renderSectionContent()}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
                <PlatformNotificationBanner userType="candidate" />

                {candidate && (
                  <ProfileCompletionPrompts
                    candidate={candidate}
                    profile={profile}
                    onNavigate={handleSectionClick}
                    onEditProfile={() => handleSectionClick('profile')}
                  />
                )}

                {completeness < 100 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="bg-gradient-to-r from-primary/12 via-primary/5 to-transparent backdrop-blur-xl border border-primary/15 rounded-2xl overflow-hidden p-3 sm:p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-lg shadow-primary/10">
                          <TrendingUp className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground text-sm sm:text-base">Complete your profile ({completeness}%)</p>
                          <p className="text-[11px] sm:text-sm text-muted-foreground leading-snug">
                            Profiles with 80%+ completeness get 3x more views
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="text-xs sm:text-sm h-9 rounded-xl backdrop-blur-sm border-border/50" onClick={() => setEditModalOpen(true)}>
                          Quick Edit
                        </Button>
                        <Button size="sm" className="text-xs sm:text-sm h-9 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20" onClick={() => navigate('/candidate-profile')}>
                          Edit Profile
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
                  {/* Row 1: Stat Cards */}
                  <div className="col-span-1 md:col-span-1 lg:col-span-1">
                    <DashboardStatCard icon={FileText} label="Applied" value={stats.applications} subtitle="all time" accentColor="blue" onClick={() => setActiveSection('jobs')} delay={0} />
                  </div>
                  <div className="col-span-1 md:col-span-1 lg:col-span-1">
                    <DashboardStatCard icon={Eye} label="Profile Views" value={stats.views} subtitle="all time" accentColor="green" onClick={() => setEditModalOpen(true)} delay={1} />
                  </div>
                  <div className="col-span-1 md:col-span-1 lg:col-span-1">
                    <DashboardStatCard icon={MessageSquare} label="Messages" value={stats.unreadMessages} subtitle={stats.unreadMessages > 0 ? 'unread' : 'all caught up'} accentColor="amber" onClick={() => setActiveSection('messages')} delay={2} />
                  </div>
                  <div className="col-span-1 md:col-span-1 lg:col-span-1">
                    <DashboardStatCard icon={Calendar} label="Interviews" value={stats.interviews} subtitle={nextInterviewLabel} accentColor="purple" delay={3} />
                  </div>

                  {/* Row 1 cont: Hero Welcome Card (desktop only) */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 120, damping: 16 }}
                    className="hidden lg:flex col-span-2 row-span-1 relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-primary/70 p-5 flex-col justify-between border border-primary/20"
                  >
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
                    <div className="relative z-10">
                      <p className="text-primary-foreground/80 text-xs font-semibold uppercase tracking-wider mb-1">Welcome back</p>
                      <h3 className="text-xl font-bold text-primary-foreground leading-tight">
                        {profile.full_name?.split(' ')[0] || 'there'} 👋
                      </h3>
                      <p className="text-primary-foreground/70 text-sm mt-1.5 leading-snug">
                        {stats.applications > 0
                          ? `You have ${stats.applications} active application${stats.applications > 1 ? 's' : ''}`
                          : 'Start applying to find your dream job'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="relative z-10 mt-3 w-fit rounded-xl text-xs font-semibold shadow-lg"
                      onClick={() => navigate('/')}
                    >
                      <MapPin className="w-3.5 h-3.5 mr-1" />
                      Explore Jobs
                    </Button>
                  </motion.div>
                </div>

                {/* Quick Actions Grid — all screens */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl p-4 overflow-hidden"
                >
                  <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[hsl(262,83%,58%)]/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 dark:ring-white/5 pointer-events-none" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 relative z-10">Quick Actions</p>
                  <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 relative z-10">
                    {quickActions.map((action, i) => (
                      <motion.button
                        key={action.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 + i * 0.04 }}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={action.onClick}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card/70 backdrop-blur-md border border-border/30 hover:border-border/60 hover:shadow-lg transition-all"
                      >
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", action.bg)}>
                          <action.icon className={cn("w-5 h-5", action.color)} />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground">{action.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Messages + Interview — Glassmorphism bento containers */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-2 relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl overflow-hidden"
                  >
                    <div className="absolute -top-12 -left-12 w-36 h-36 bg-warning/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 dark:ring-white/5 pointer-events-none" />
                    <div className="relative z-10">
                      <MessagesPreview profileId={profile.id} onOpenChat={() => setActiveSection('messages')} />
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl overflow-hidden"
                  >
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[hsl(262,83%,58%)]/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 dark:ring-white/5 pointer-events-none" />
                    <div className="relative z-10">
                      <UpcomingInterviewCard />
                    </div>
                  </motion.div>
                </div>

                {/* Pending Tasks + AI Matches */}
                {candidate && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.55 }}
                      className="relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl overflow-hidden"
                    >
                      <div className="absolute -top-12 -left-12 w-36 h-36 bg-warning/10 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 dark:ring-white/5 pointer-events-none" />
                      <div className="relative z-10 p-4 sm:p-5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pending Tasks</p>
                        <PendingTasksWidget
                          type="candidate"
                          candidateId={candidate.id}
                          onViewAll={() => handleSectionClick('tasks')}
                        />
                      </div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="lg:col-span-2"
                    >
                      <AIJobMatches candidateId={candidate.id} />
                    </motion.div>
                  </div>
                )}
                <RecentlyViewedJobs />

                {candidate && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
                    <JobMatchCarousel candidateId={candidate.id} skills={candidate.skills || []} />
                  </motion.div>
                )}
              </div>
            )}
          </main>
        </div>

        {profile && candidate && (
          <ProfileEditModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            profile={profile}
            candidate={candidate}
            onSave={handleProfileSave}
          />
        )}

        
        <DashboardBottomNav type="candidate" activeItem={activeSection} onItemClick={handleSectionClick} />
      </div>
    </EmailVerificationGuard>
  );
};

export default CandidateDashboard;
