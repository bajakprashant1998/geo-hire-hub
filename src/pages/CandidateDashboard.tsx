import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardTab } from '@/hooks/useDashboardTab';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import {
  Briefcase, Bell, Shield, FileText, Sparkles, Eye, Calendar, Star, ChevronRight, User, MessageSquare, Bookmark, Mic,
  MapPin, TrendingUp, Zap, Banknote, Bot, Radar, GraduationCap, Brain, BarChart3, Award, Trophy, Building2, Layout, Users, FileStack
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardAuthGuard } from '@/components/dashboard/DashboardAuthGuard';
import { CandidateDashboardLoading } from '@/components/dashboard/DashboardLoadingSkeleton';
import { ProfileEditModal } from '@/components/candidate/ProfileEditModal';
import { DashboardBottomNav } from '@/components/dashboard/DashboardBottomNav';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { CandidateSectionRouter } from '@/components/candidate/CandidateSectionRouter';
import { CandidateHomeView } from '@/components/candidate/CandidateHomeView';
import { format, isToday, isTomorrow } from 'date-fns';
import { motion } from 'framer-motion';
import { readSessionState, writeSessionState, removeSessionState } from '@/lib/sessionState';

const DASHBOARD_CACHE_KEY = 'candidate_dashboard_state';

type CandidateDashboardCache = {
  profileId: string;
  candidate: any;
  nextInterviewLabel: string;
  stats: { applications: number; views: number; unreadMessages: number; interviews: number; unreadNotifications: number };
};

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { activeSection, setActiveSection } = useDashboardTab();
  const { user, profile, loading: authLoading, profileLoading, profileResolved, signOut, refreshProfile } = useAuth();
  const cachedDashboard = profile ? readSessionState<CandidateDashboardCache>(DASHBOARD_CACHE_KEY) : null;
  const hasCachedDashboard = !!cachedDashboard && cachedDashboard.profileId === profile?.id;
  const [dataLoading, setDataLoading] = useState(!hasCachedDashboard);
  const [candidate, setCandidate] = useState<any>(hasCachedDashboard ? cachedDashboard?.candidate ?? null : null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileRetryCount, setProfileRetryCount] = useState(0);
  // Prevent loading flash on tab focus / TOKEN_REFRESHED re-renders
  const hasLoadedOnce = useRef(false);
  const [nextInterviewLabel, setNextInterviewLabel] = useState(hasCachedDashboard ? cachedDashboard?.nextInterviewLabel ?? 'None scheduled' : 'None scheduled');
  const [stats, setStats] = useState(hasCachedDashboard ? cachedDashboard?.stats ?? { applications: 0, views: 0, unreadMessages: 0, interviews: 0, unreadNotifications: 0 } : { applications: 0, views: 0, unreadMessages: 0, interviews: 0, unreadNotifications: 0 });

  const { refreshTrigger } = useRealtimeDashboard({ userId: user?.id, candidateId: candidate?.id });

  useEffect(() => {
    if (!profile?.id) {
      removeSessionState(DASHBOARD_CACHE_KEY);
      return;
    }

    if (!candidate) return;

    writeSessionState(DASHBOARD_CACHE_KEY, {
      profileId: profile.id,
      candidate,
      nextInterviewLabel,
      stats,
    });
  }, [profile?.id, candidate, nextInterviewLabel, stats]);

  useEffect(() => { if (refreshTrigger > 0 && candidate) fetchCandidate(); }, [refreshTrigger]);

  useEffect(() => {
    if (user && !profile && !profileLoading && profileRetryCount < 3) {
      const timer = setTimeout(() => { refreshProfile(); setProfileRetryCount(prev => prev + 1); }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, profile, profileLoading, profileRetryCount, refreshProfile]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login', { replace: true }); return; }
    if (user && !profileResolved) return;
    if (!profile) { setDataLoading(false); return; }
    if (profile.user_type !== 'candidate') { navigate('/employer-dashboard'); return; }
    if (hasCachedDashboard) {
      setDataLoading(false);
    }
    fetchCandidate({ background: hasCachedDashboard });
  }, [user, profile, authLoading, profileResolved]);

  const fetchCandidate = async ({ background = false }: { background?: boolean } = {}) => {
    if (!profile || !user) return;
    // If already loaded once, always run in background to avoid loading flash on tab switch
    const runBackground = background || hasLoadedOnce.current;
    if (!runBackground) setDataLoading(true);
    const loadingTimeout = !runBackground
      ? setTimeout(() => { setDataLoading(false); toast.error('Dashboard data is taking too long.'); }, 10000)
      : null;
    try {
      const { data } = await supabase.from('candidates').select('*').eq('profile_id', profile.id).maybeSingle();
      setCandidate(data);
      if (data) {
        const [appsRes, interviewsRes, unreadRes, viewRes, notifRes, nextInterviewRes] = await Promise.all([
          supabase.from('applications').select('id, status, job_id').eq('candidate_id', data.id),
          supabase.from('interviews').select('id', { count: 'exact', head: true }).eq('candidate_id', data.id).in('status', ['requested', 'confirmed', 'scheduled']),
          supabase.rpc('get_unread_message_count', { p_user_id: user.id }),
          supabase.from('profile_views').select('*', { count: 'exact', head: true }).eq('profile_id', profile.id),
          supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
          supabase.from('interviews').select('scheduled_date').eq('candidate_id', data.id).eq('status', 'scheduled').gte('scheduled_date', new Date().toISOString().split('T')[0]).order('scheduled_date', { ascending: true }).limit(1).maybeSingle(),
        ]);
        const unreadMsgCount = (unreadRes.data as number) || 0;
        const nextInterview = nextInterviewRes.data;
        if (nextInterview?.scheduled_date) {
          const d = new Date(nextInterview.scheduled_date);
          if (isToday(d)) setNextInterviewLabel('Next: Today');
          else if (isTomorrow(d)) setNextInterviewLabel('Next: Tomorrow');
          else setNextInterviewLabel(`Next: ${format(d, 'MMM d')}`);
        } else { setNextInterviewLabel('None scheduled'); }
        setStats({ applications: (appsRes.data || []).length, views: viewRes.count || 0, unreadMessages: unreadMsgCount, interviews: interviewsRes.count || 0, unreadNotifications: notifRes.count || 0 });
        hasLoadedOnce.current = true;
      }
    } catch (error) { console.error('Error fetching candidate data:', error); toast.error('Failed to load some dashboard data.'); }
    finally {
      if (loadingTimeout) clearTimeout(loadingTimeout);
      setDataLoading(false);
    }
  };

  const handleSectionClick = (value: string) => {
    if (value === 'map') { navigate('/'); return; }
    setActiveSection(value === 'home' ? null : value);
    setSidebarOpen(false);
  };

  const calculateCompleteness = () => {
    if (!profile || !candidate) return 0;
    const checks = [profile.full_name, profile.avatar_url, candidate.job_title, candidate.skills?.length > 0, candidate.experience_years > 0, candidate.education?.length > 0, profile.latitude && profile.longitude, candidate.bio?.length > 20, candidate.resume_url];
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
    { icon: Banknote, label: 'Salary Insights', value: 'salary-insights' },
    { icon: Banknote, label: 'Negotiation Coach', value: 'negotiation-coach' },
    { icon: Bot, label: 'Talk to My Buddy', value: 'career-buddy' },
    { icon: TrendingUp, label: 'Application Tracker', value: 'app-tracker' },
    { icon: Star, label: 'Referrals & Rewards', value: 'referrals' },
    { icon: GraduationCap, label: 'Assessments', value: 'assessments' },
    { icon: Brain, label: 'Interview Prep', value: 'interview-prep' },
    { icon: BarChart3, label: 'Market Value', value: 'market-value' },
    { icon: Award, label: 'Badges', value: 'badges' },
    { icon: Trophy, label: 'Leaderboard', value: 'leaderboard' },
    { icon: Bell, label: 'Follow-Up Reminders', value: 'follow-ups' },
    { icon: Brain, label: 'Skill Gap Analyzer', value: 'skill-gap' },
    { icon: Calendar, label: 'Availability Slots', value: 'availability' },
    { icon: BarChart3, label: 'Compare Jobs', value: 'compare-jobs' },
    { icon: TrendingUp, label: 'Career Path', value: 'career-path' },
    { icon: Star, label: 'Culture Match', value: 'culture-match' },
    { icon: Sparkles, label: 'Smart Digest', value: 'smart-digest' },
    { icon: Building2, label: 'Company Watchlist', value: 'watchlist' },
    { icon: Layout, label: 'Portfolio', value: 'portfolio' },
    { icon: BarChart3, label: 'My Analytics', value: 'analytics' },
    { icon: Users, label: 'Networking', value: 'networking' },
    { icon: FileText, label: 'Letter Templates', value: 'templates' },
  ];

  return (
    <DashboardAuthGuard type="candidate" authLoading={authLoading} profileLoading={profileLoading} profileResolved={profileResolved} user={user} profile={profile} refreshProfile={refreshProfile} signOut={signOut}>
      {dataLoading ? <CandidateDashboardLoading /> : !profile ? null : (
        <EmailVerificationGuard fallbackMessage="Please verify your email to access your dashboard.">
          <SEOHead
            title="Candidate Dashboard — Hire for Job"
            description="Manage your job applications, track interviews, build AI resumes, and discover career opportunities on Hire for Job."
            canonicalUrl="https://www.hireforjob.com/candidate-dashboard"
            noindex
          />
          <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/80 flex overflow-hidden">
            {user && <OnboardingTour userId={user.id} type="candidate" />}
            <DashboardSidebar type="candidate" items={sidebarItems} activeItem={activeSection} onItemClick={handleSectionClick} userName={profile.full_name} userTitle={candidate?.job_title || 'Job Seeker'} avatarUrl={profile.avatar_url} onSignOut={signOut} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} profileCompleteness={calculateCompleteness()} />
            <div className="flex-1 flex flex-col min-h-screen lg:ml-0 overflow-x-hidden">
              <DashboardHeader type="candidate" userName={profile.full_name} userTitle={candidate?.job_title} avatarUrl={profile.avatar_url} onMenuClick={() => setSidebarOpen(true)} onSignOut={signOut} messageCount={stats.unreadMessages} notificationCount={stats.unreadNotifications} profileCompleteness={calculateCompleteness()} onNotificationClick={() => handleSectionClick('notifications')} />
              <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto pb-24 md:pb-6">
                {activeSection ? (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 100, damping: 20 }} className="max-w-6xl mx-auto">
                    <Button variant="ghost" onClick={() => setActiveSection(null)} className="mb-4 text-muted-foreground hover:text-foreground rounded-xl gap-2 backdrop-blur-sm">
                      <ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard
                    </Button>
                    <div className="bg-card/70 backdrop-blur-xl shadow-lg border border-border/40 rounded-2xl overflow-hidden">
                      <div className="p-3 sm:p-4 md:p-6">
                        <CandidateSectionRouter activeSection={activeSection} candidate={candidate} profile={profile} onNavigate={handleSectionClick} onUpdate={fetchCandidate} />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <CandidateHomeView profile={profile} candidate={candidate} stats={stats} nextInterviewLabel={nextInterviewLabel} completeness={calculateCompleteness()} onSectionClick={handleSectionClick} onEditProfile={() => setEditModalOpen(true)} />
                )}
              </main>
            </div>
            {profile && candidate && <ProfileEditModal open={editModalOpen} onOpenChange={setEditModalOpen} profile={profile} candidate={candidate} onSave={() => { fetchCandidate(); refreshProfile(); }} />}
            <DashboardBottomNav type="candidate" activeItem={activeSection} onItemClick={handleSectionClick} messageBadge={stats.unreadMessages} notificationBadge={stats.unreadNotifications} />
          </div>
        </EmailVerificationGuard>
      )}
    </DashboardAuthGuard>
  );
};

export default CandidateDashboard;
