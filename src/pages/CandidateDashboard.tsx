import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Briefcase, Bell, Shield, FileText, Sparkles, Loader2, 
  Eye, Calendar, Star, ChevronRight, User, MessageSquare, Bookmark, Mic
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
import { ResumeUpload } from '@/components/candidate/ResumeUpload';
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
import CandidateDetail from '@/pages/CandidateDetail';
import { ProfileCompletionPrompts } from '@/components/candidate/ProfileCompletionPrompts';

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, profileLoading, signOut, refreshProfile } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);
  const [candidate, setCandidate] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileRetryCount, setProfileRetryCount] = useState(0);
  const [stats, setStats] = useState({
    applications: 0,
    views: 0,
    unreadMessages: 0,
    interviews: 0
  });

  // Realtime dashboard updates
  const { refreshTrigger } = useRealtimeDashboard({
    userId: user?.id,
    candidateId: candidate?.id,
  });

  // Re-fetch stats when realtime events trigger
  useEffect(() => {
    if (refreshTrigger > 0 && candidate) {
      fetchCandidate();
    }
  }, [refreshTrigger]);

  // Retry profile fetch if user exists but profile is null
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
    // Wait for auth to finish loading
    if (authLoading) return;
    
    // If no user after auth loaded, they need to login
    if (!user) return;
    
    // Wait for profile to load (but don't wait forever)
    if (!profile && profileLoading) return;
    
    // If profile still null after loading, show fallback
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
    if (!profile) return;
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

      // Get real profile view count from job_views for jobs the candidate applied to
      const { count: viewCount } = await supabase
        .from('job_views')
        .select('*', { count: 'exact', head: true })
        .in('job_id', applications.map(a => a.job_id || '').filter(Boolean));

      setStats({
        applications: applications.length,
        views: viewCount || 0,
        unreadMessages: messagesRes.data?.length || 0,
        interviews
      });
    }

    setDataLoading(false);
  };

  const handleProfileSave = () => {
    fetchCandidate();
    refreshProfile();
  };

  const handleSectionClick = (value: string) => {
    if (value === 'home') {
      setActiveSection(null);
    } else if (value === 'messages') {
      setChatModalOpen(true);
    } else if (value === 'ai-resume') {
      navigate('/ai-resume-builder');
    } else {
      setActiveSection(value);
    }
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
    { icon: Calendar, label: 'Scheduled Interviews', value: 'interviews' },
    { icon: FileText, label: 'Tasks', value: 'tasks' },
    { icon: Bookmark, label: 'Saved Jobs', value: 'saved' },
    { icon: FileText, label: 'Resume', value: 'resume' },
    { icon: Mic, label: 'Audio Resume', value: 'audio-resume' },
    { icon: Sparkles, label: 'AI Resume Builder', value: 'ai-resume' },
    { icon: Bell, label: 'Notifications', value: 'notifications' },
    { icon: User, label: 'Edit Profile', value: 'profile' },
    { icon: Eye, label: 'Public Profile', value: 'public-profile' },
    { icon: Sparkles, label: 'Job Alerts', value: 'alerts' },
    { icon: Shield, label: 'Security', value: 'security' }
  ];

  // Show loading while auth is being checked
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

  // Show loading while profile is being fetched (with timeout protection)
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

  // Show login prompt only after auth has finished loading and no user
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

  // Show error state if profile failed to load
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
              <Button onClick={() => refreshProfile()} variant="outline" className="flex-1">
                Retry
              </Button>
              <Button onClick={() => signOut()} variant="destructive" className="flex-1">
                Sign Out
              </Button>
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

  // Render expanded section content
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'jobs':
        return candidate && <JobActivityTabs candidateId={candidate.id} />;
      case 'saved':
        return candidate && <SavedJobsSection candidateId={candidate.id} />;
      case 'interviews':
        return candidate && <InterviewCalendar candidateId={candidate.id} />;
      case 'profile':
        setEditModalOpen(true);
        setActiveSection(null);
        return null;
      case 'resume':
        return candidate && <ResumeUpload candidate={candidate} onUpdate={fetchCandidate} />;
      case 'audio-resume':
        return candidate && <AudioResumeCard candidate={candidate} onUpdate={fetchCandidate} />;
      case 'alerts':
        return candidate && <JobAlertsManager candidateId={candidate.id} />;
      case 'security':
        return <SecuritySettings />;
      case 'tasks':
        return candidate && <TaskList candidateId={candidate.id} />;
      case 'notifications':
        return <NotificationCenter />;
      case 'public-profile':
        return candidate && <CandidateDetail id={candidate.id} />;
      case 'recommended':
        return candidate && (
          <RecommendedJobs 
            candidateId={candidate.id}
            skills={candidate.skills || []}
            latitude={profile.latitude}
            longitude={profile.longitude}
          />
        );
      default:
        return null;
    }
  };

  return (
    <EmailVerificationGuard fallbackMessage="Please verify your email to access your dashboard.">
      <div className="min-h-screen bg-secondary flex overflow-x-hidden">
        {/* Sidebar */}
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
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-0 overflow-x-hidden">
          {/* Header */}
          <DashboardHeader
            type="candidate"
            userName={profile.full_name}
            userTitle={candidate?.job_title}
            avatarUrl={profile.avatar_url}
            onMenuClick={() => setSidebarOpen(true)}
            onSignOut={signOut}
            messageCount={stats.unreadMessages}
            notificationCount={2}
            profileCompleteness={completeness}
          />

          {/* Main Content */}
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto">
            {activeSection && activeSection !== 'messages' && activeSection !== 'profile' ? (
              // Section Content View
              <div className="max-w-6xl mx-auto">
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveSection(null)}
                  className="mb-4 text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4 rotate-180 mr-2" />
                  Back to Dashboard
                </Button>
                <Card className="bg-card shadow-sm border">
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    {renderSectionContent()}
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Dashboard Home View
              <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
                <PlatformNotificationBanner userType="candidate" />

                {/* Profile Completion Prompts */}
                {candidate && (
                  <ProfileCompletionPrompts
                    candidate={candidate}
                    profile={profile}
                    onNavigate={handleSectionClick}
                    onEditProfile={() => setEditModalOpen(true)}
                  />
                )}
                {/* Quick Actions Bar */}
            {completeness < 100 && (
                  <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-2.5 sm:gap-3 mb-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-xs sm:text-base">Complete your profile ({completeness}%)</p>
                          <p className="text-[11px] sm:text-sm text-muted-foreground leading-snug">
                            Add more details to attract employers.
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs sm:text-sm h-8 sm:h-9"
                          onClick={() => setEditModalOpen(true)}
                        >
                          Quick Edit
                        </Button>
                        <Button 
                          size="sm" 
                          className="text-xs sm:text-sm h-8 sm:h-9"
                          onClick={() => navigate('/candidate-settings')}
                        >
                          Edit Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                  <DashboardStatCard
                    icon={FileText}
                    label="Total Applied"
                    value={stats.applications}
                    subtitle={`+${Math.floor(stats.applications * 0.2)} this week`}
                    accentColor="blue"
                    onClick={() => setActiveSection('jobs')}
                  />
                  <DashboardStatCard
                    icon={Eye}
                    label="Profile Views"
                    value={stats.views}
                    subtitle="+12% this month"
                    accentColor="green"
                    onClick={() => setEditModalOpen(true)}
                  />
                  <DashboardStatCard
                    icon={MessageSquare}
                    label="Unread Messages"
                    value={stats.unreadMessages}
                    subtitle={stats.unreadMessages > 0 ? `${Math.min(2, stats.unreadMessages)} urgent` : 'All caught up'}
                    accentColor="amber"
                    onClick={() => setChatModalOpen(true)}
                  />
                  <DashboardStatCard
                    icon={Calendar}
                    label="Upcoming Interviews"
                    value={stats.interviews}
                    subtitle={stats.interviews > 0 ? 'Next: Tomorrow' : 'None scheduled'}
                    accentColor="purple"
                  />
                </div>

                {/* Messages Preview + Interview Card Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
                  <div className="lg:col-span-2">
                    <MessagesPreview profileId={profile.id} onOpenChat={() => setChatModalOpen(true)} />
                  </div>
                  <div>
                    <UpcomingInterviewCard />
                  </div>
                </div>

                {/* AI-Powered Job Matches */}
                {candidate && (
                  <AIJobMatches candidateId={candidate.id} />
                )}

                {/* Jobs Matching Your Profile (Quick Carousel) */}
                {candidate && (
                  <JobMatchCarousel 
                    candidateId={candidate.id} 
                    skills={candidate.skills || []} 
                  />
                )}
              </div>
            )}
          </main>
        </div>

        {/* Profile Edit Modal */}
        {profile && candidate && (
          <ProfileEditModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            profile={profile}
            candidate={candidate}
            onSave={handleProfileSave}
          />
        )}

        {/* Chat Modal */}
        <ChatModal 
          isOpen={chatModalOpen} 
          onClose={() => setChatModalOpen(false)} 
        />
      </div>
    </EmailVerificationGuard>
  );
};

export default CandidateDashboard;
