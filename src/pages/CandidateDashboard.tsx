import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDashboardTab } from '@/hooks/useDashboardTab';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Briefcase, Bell, Shield, FileText, Sparkles, Loader2,
  Eye, Calendar, Star, ChevronRight, User, MessageSquare, Bookmark, Mic,
  MapPin, TrendingUp, Zap, DollarSign
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
import { ChatModal } from '@/components/messaging/ChatModal';
import { ProfileEditModal } from '@/components/candidate/ProfileEditModal';
import { ResumeAndDocumentManager } from '@/components/candidate/ResumeAndDocumentManager';
import { JobActivityTabs } from '@/components/candidate/JobActivityTabs';
import { NotificationCenter } from '@/components/candidate/NotificationCenter';
import { JobAlertsManager } from '@/components/candidate/JobAlertsManager';
import { SecuritySettings } from '@/components/candidate/SecuritySettings';
import { RecommendedJobs } from '@/components/candidate/RecommendedJobs';
import { InterviewCalendar } from '@/components/candidate/InterviewCalendar';
import { PlatformNotificationBanner } from '@/components/dashboard/PlatformNotificationBanner';
import { SavedJobsSection } from '@/components/candidate/SavedJobsSection';
import { AIJobMatches } from '@/components/candidate/AIJobMatches';
import { TaskList } from '@/components/candidate/TaskList';
import { AudioResumeCard } from '@/components/candidate/AudioResumeCard';
import { SalaryInsights } from '@/components/candidate/SalaryInsights';
import CandidateDetail from '@/pages/CandidateDetail';
import { ProfileCompletionPrompts } from '@/components/candidate/ProfileCompletionPrompts';
import { DashboardBottomNav } from '@/components/dashboard/DashboardBottomNav';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { format, isToday, isTomorrow } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { activeSection, setActiveSection } = useDashboardTab();
  const { user, profile, loading: authLoading, profileLoading, signOut, refreshProfile } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);
  const [candidate, setCandidate] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
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
      const [appsRes, messagesRes] = await Promise.all([
        supabase.from('applications').select('id, status, job_id').eq('candidate_id', data.id),
        supabase.from('messages').select('id').eq('is_read', false).neq('sender_id', profile.id)
      ]);

      const applications = appsRes.data || [];
      const interviews = applications.filter(a => a.status === 'shortlisted').length;

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
    if (value === 'messages') { setChatModalOpen(true); }
    else if (value === 'ai-resume') navigate('/ai-resume-builder');
    else if (value === 'profile') navigate('/candidate-profile');
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
    { icon: DollarSign, label: 'Salary Insights', value: 'salary-insights' }
  ];

  // Quick action buttons for dashboard home
  const quickActions = [
    { icon: MapPin, label: 'Find Jobs', onClick: () => navigate('/'), color: 'bg-[hsl(217,89%,61%)]/10 text-[hsl(217,89%,61%)]' },
    { icon: FileText, label: 'My Resume', onClick: () => handleSectionClick('resume'), color: 'bg-[hsl(142,53%,43%)]/10 text-[hsl(142,53%,43%)]' },
    { icon: Sparkles, label: 'AI Match', onClick: () => {}, color: 'bg-[hsl(262,83%,58%)]/10 text-[hsl(262,83%,58%)]' },
    { icon: Bookmark, label: 'Saved', onClick: () => handleSectionClick('saved'), color: 'bg-[hsl(44,70%,45%)]/10 text-[hsl(44,70%,45%)]' },
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
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">Welcome to Hire for Job</h2>
            <p className="text-muted-foreground mb-8">Sign in to access your personalized dashboard</p>
            <Button onClick={() => navigate('/login')} className="w-full h-12" size="lg">
              Sign In to Continue
            </Button>
          </CardContent>
        </Card>
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
      case 'interviews': return candidate && <InterviewCalendar candidateId={candidate.id} />;
      case 'profile': navigate('/candidate-profile'); return null;
      case 'resume': return candidate && <ResumeAndDocumentManager candidate={candidate} onUpdate={fetchCandidate} />;
      case 'audio-resume': return candidate && <AudioResumeCard candidate={candidate} onUpdate={fetchCandidate} />;
      case 'alerts': return candidate && <JobAlertsManager candidateId={candidate.id} />;
      case 'security': return <SecuritySettings />;
      case 'tasks': return candidate && <TaskList candidateId={candidate.id} />;
      case 'notifications': return <NotificationCenter />;
      case 'public-profile': return candidate && <CandidateDetail id={candidate.id} />;
      case 'recommended': return candidate && (
        <RecommendedJobs candidateId={candidate.id} skills={candidate.skills || []} latitude={profile.latitude} longitude={profile.longitude} />
      );
      case 'salary-insights': return <SalaryInsights />;
      default: return null;
    }
  };

  return (
    <EmailVerificationGuard fallbackMessage="Please verify your email to access your dashboard.">
      <div className="min-h-screen bg-secondary flex overflow-x-hidden">
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
            {activeSection && activeSection !== 'messages' && activeSection !== 'profile' ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="max-w-6xl mx-auto"
              >
                <Button
                  variant="ghost"
                  onClick={() => setActiveSection(null)}
                  className="mb-4 text-muted-foreground hover:text-foreground rounded-xl"
                >
                  <ChevronRight className="w-4 h-4 rotate-180 mr-2" />
                  Back to Dashboard
                </Button>
                <Card className="bg-card shadow-sm border rounded-2xl">
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    {renderSectionContent()}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
                <PlatformNotificationBanner userType="candidate" />

                {candidate && (
                  <ProfileCompletionPrompts
                    candidate={candidate}
                    profile={profile}
                    onNavigate={handleSectionClick}
                    onEditProfile={() => navigate('/candidate-profile')}
                  />
                )}

                {completeness < 100 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 rounded-2xl overflow-hidden">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
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
                          <Button variant="outline" size="sm" className="text-xs sm:text-sm h-9 rounded-xl" onClick={() => setEditModalOpen(true)}>
                            Quick Edit
                          </Button>
                          <Button size="sm" className="text-xs sm:text-sm h-9 rounded-xl" onClick={() => navigate('/candidate-profile')}>
                            Edit Profile
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Quick Actions - Mobile */}
                <div className="grid grid-cols-4 gap-2 sm:hidden">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border/50 hover:shadow-sm transition-all active:scale-95"
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", action.color)}>
                        <action.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">{action.label}</span>
                    </button>
                  ))}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                  <DashboardStatCard
                    icon={FileText}
                    label="Applied"
                    value={stats.applications}
                    subtitle="all time"
                    accentColor="blue"
                    onClick={() => setActiveSection('jobs')}
                    delay={0}
                  />
                  <DashboardStatCard
                    icon={Eye}
                    label="Profile Views"
                    value={stats.views}
                    subtitle="all time"
                    accentColor="green"
                    onClick={() => setEditModalOpen(true)}
                    delay={1}
                  />
                  <DashboardStatCard
                    icon={MessageSquare}
                    label="Messages"
                    value={stats.unreadMessages}
                    subtitle={stats.unreadMessages > 0 ? 'unread' : 'all caught up'}
                    accentColor="amber"
                    onClick={() => setChatModalOpen(true)}
                    delay={2}
                  />
                  <DashboardStatCard
                    icon={Calendar}
                    label="Interviews"
                    value={stats.interviews}
                    subtitle={nextInterviewLabel}
                    accentColor="purple"
                    delay={3}
                  />
                </div>

                {/* Messages + Interview */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
                  <div className="lg:col-span-2">
                    <MessagesPreview profileId={profile.id} onOpenChat={() => setChatModalOpen(true)} />
                  </div>
                  <div>
                    <UpcomingInterviewCard />
                  </div>
                </div>

                {candidate && <AIJobMatches candidateId={candidate.id} />}

                {candidate && (
                  <JobMatchCarousel candidateId={candidate.id} skills={candidate.skills || []} />
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

        <ChatModal isOpen={chatModalOpen} onClose={() => setChatModalOpen(false)} />
        <DashboardBottomNav type="candidate" activeItem={activeSection} onItemClick={handleSectionClick} />
      </div>
    </EmailVerificationGuard>
  );
};

export default CandidateDashboard;
