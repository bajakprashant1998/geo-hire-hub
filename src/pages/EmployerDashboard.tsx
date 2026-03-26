import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDashboardTab } from '@/hooks/useDashboardTab';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  MapPin, Briefcase, Building2, Plus, Loader2, Eye, Users, CheckCircle2, ChevronRight, FileEdit, CreditCard, UserCheck,
  MessageSquare, Calendar, BarChart3, User, Settings, Shield, Sparkles, Bell, Filter, Search, Clock, FileText, FlaskConical, ClipboardCheck,
  Database, MessageCircle, Palette, Upload
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { EmployerHeader } from '@/components/dashboard/EmployerHeader';
import { DashboardAuthGuard } from '@/components/dashboard/DashboardAuthGuard';
import { EmployerDashboardLoading } from '@/components/dashboard/DashboardLoadingSkeleton';
import { DashboardBottomNav } from '@/components/dashboard/DashboardBottomNav';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { EmployerSectionRouter } from '@/components/employer/EmployerSectionRouter';
import { EmployerHomeView } from '@/components/employer/EmployerHomeView';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { readSessionState, writeSessionState, removeSessionState } from '@/lib/sessionState';

const DASHBOARD_CACHE_KEY = 'employer_dashboard_state';

type EmployerDashboardCache = {
  profileId: string;
  employer: any;
  jobs: any[];
  planName: string;
  stats: { activeJobs: number; totalApplications: number; scheduledInterviews: number; profileViews: number; notificationCount: number; unreadMessages: number };
};

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const { activeSection, setActiveSection } = useDashboardTab();
  const { user, profile, loading: authLoading, profileLoading, profileResolved, signOut, refreshProfile } = useAuth();
  const cachedDashboard = profile ? readSessionState<EmployerDashboardCache>(DASHBOARD_CACHE_KEY) : null;
  const hasCachedDashboard = !!cachedDashboard && cachedDashboard.profileId === profile?.id;
  const [dataLoading, setDataLoading] = useState(!hasCachedDashboard);
  const [employer, setEmployer] = useState<any>(hasCachedDashboard ? cachedDashboard?.employer ?? null : null);
  const [jobs, setJobs] = useState<any[]>(hasCachedDashboard ? cachedDashboard?.jobs ?? [] : []);
  const [selectedJob, setSelectedJob] = useState<any>(hasCachedDashboard ? cachedDashboard?.jobs?.[0] ?? null : null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [profileRetryCount, setProfileRetryCount] = useState(0);
  const [planName, setPlanName] = useState(hasCachedDashboard ? cachedDashboard?.planName ?? 'Free Plan' : 'Free Plan');
  const [stats, setStats] = useState(hasCachedDashboard ? cachedDashboard?.stats ?? { activeJobs: 0, totalApplications: 0, scheduledInterviews: 0, profileViews: 0, notificationCount: 0, unreadMessages: 0 } : { activeJobs: 0, totalApplications: 0, scheduledInterviews: 0, profileViews: 0, notificationCount: 0, unreadMessages: 0 });
  const [jobToDelete, setJobToDelete] = useState<any>(null);
  const [deletingJob, setDeletingJob] = useState(false);
  // Prevent loading flash on tab focus / TOKEN_REFRESHED re-renders
  const hasLoadedOnce = useRef(false);

  const { refreshTrigger } = useRealtimeDashboard({ userId: user?.id, employerId: employer?.id });

  useEffect(() => {
    if (!profile?.id) {
      removeSessionState(DASHBOARD_CACHE_KEY);
      return;
    }

    if (!employer) return;

    writeSessionState(DASHBOARD_CACHE_KEY, {
      profileId: profile.id,
      employer,
      jobs,
      planName,
      stats,
    });
  }, [profile?.id, employer, jobs, planName, stats]);

  useEffect(() => { if (refreshTrigger > 0 && employer) fetchEmployerData(); }, [refreshTrigger]);

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
    if (profile.user_type !== 'employer') { navigate('/candidate-dashboard'); return; }
    if (hasCachedDashboard) {
      setDataLoading(false);
    }
    fetchEmployerData({ background: hasCachedDashboard });
  }, [user, profile, authLoading, profileResolved]);

  const fetchEmployerData = async ({ background = false }: { background?: boolean } = {}) => {
    if (!profile || !user) return;
    // If already loaded once, always run in background to avoid loading flash on tab switch
    const runBackground = background || hasLoadedOnce.current;
    if (!runBackground) setDataLoading(true);
    const loadingTimeout = !runBackground
      ? setTimeout(() => { setDataLoading(false); toast.error('Dashboard data is taking too long.'); }, 10000)
      : null;
    try {
      const { data: employerData } = await supabase.from('employers').select('*').eq('profile_id', profile.id).maybeSingle();
      setEmployer(employerData);
      if (employerData) {
        const { data: jobsData } = await supabase.from('jobs').select('id, title, status, is_active, created_at, expires_at, job_type, job_address, view_count, employer_id, job_category, slug').eq('employer_id', employerData.id).order('created_at', { ascending: false });
        const jobIds = (jobsData || []).map(j => j.id);
        let appCountMap: Record<string, number> = {};
        if (jobIds.length > 0) {
          const { data: appData } = await supabase.from('applications').select('job_id').in('job_id', jobIds);
          appCountMap = (appData || []).reduce((acc, app) => {
            acc[app.job_id] = (acc[app.job_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        }
        const jobsWithCounts = (jobsData || []).map(job => ({ ...job, applications_count: appCountMap[job.id] || 0 }));
        setJobs(jobsWithCounts);
        if (jobsWithCounts.length > 0) setSelectedJob(jobsWithCounts[0]);
        const activeJobs = jobsWithCounts.filter(j => j.is_active && j.status === 'open' && (!j.expires_at || new Date(j.expires_at) > new Date())).length;
        const totalApplications = jobsWithCounts.reduce((sum, j) => sum + (j.applications_count || 0), 0);
        const [interviewRes, viewRes, notifRes, unreadRes, subRes] = await Promise.all([
          supabase.from('interviews').select('*', { count: 'exact', head: true }).eq('employer_id', employerData.id).in('status', ['scheduled', 'confirmed', 'requested']),
          supabase.from('profile_views').select('*', { count: 'exact', head: true }).eq('profile_id', profile.id),
          supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
          supabase.rpc('get_unread_message_count', { p_user_id: user.id }),
          supabase.from('employer_subscriptions').select('employer_plans(name)').eq('employer_id', employerData.id).eq('status', 'active').maybeSingle(),
        ]);
        const unreadMsgCount = (unreadRes.data as number) || 0;
        if (subRes.data && (subRes.data as any).employer_plans?.name) setPlanName((subRes.data as any).employer_plans.name + ' Plan');
        setStats({ activeJobs, totalApplications, scheduledInterviews: interviewRes.count || 0, profileViews: viewRes.count || 0, notificationCount: notifRes.count || 0, unreadMessages: unreadMsgCount });
        supabase.rpc('calculate_employer_response_rate', { p_employer_id: employerData.id }).then(() => {});
        hasLoadedOnce.current = true;
      }
    } catch (error) { console.error('Error fetching employer data:', error); toast.error('Failed to load some dashboard data.'); }
    finally {
      if (loadingTimeout) clearTimeout(loadingTimeout);
      setDataLoading(false);
    }
  };

  const handleSectionClick = (value: string) => {
    if (value === 'map') { navigate('/'); return; }
    if (value === 'upgrade-plan') { navigate('/plans'); return; }
    setActiveSection(value === 'home' ? null : value);
    setSidebarOpen(false);
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    setDeletingJob(true);
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', jobToDelete.id);
      if (error) throw error;
      setJobs(jobs.filter(j => j.id !== jobToDelete.id));
      if (selectedJob?.id === jobToDelete.id) setSelectedJob(jobs.find(j => j.id !== jobToDelete.id) || null);
      toast.success('Job deleted successfully');
    } catch (error: any) { toast.error('Failed to delete job: ' + error.message); }
    finally { setDeletingJob(false); setJobToDelete(null); }
  };

  const sidebarItems = [
    { icon: MapPin, label: 'Back to Map', value: 'map' },
    { icon: Plus, label: 'Create Job', value: 'post-job' },
    { icon: Briefcase, label: 'Job Postings', value: 'jobs', badge: stats.activeJobs },
    { icon: Filter, label: 'Candidate Finder', value: 'candidates', badge: stats.totalApplications },
    { icon: FileEdit, label: 'Drafts', value: 'drafts' },
    { icon: Users, label: 'Tasks', value: 'tasks' },
    { icon: MessageSquare, label: 'Messages', value: 'chat', badge: stats.unreadMessages },
    { icon: Calendar, label: 'Interviews', value: 'interviews', badge: stats.scheduledInterviews },
    { icon: BarChart3, label: 'Analytics', value: 'analytics' },
    { icon: Building2, label: 'Company Profile', value: 'company' },
    { icon: Eye, label: 'Public Profile', value: 'public-profile' },
    { icon: Bell, label: 'Notifications', value: 'notifications', badge: stats.notificationCount },
    { icon: Shield, label: 'Security', value: 'security' },
    { icon: Sparkles, label: 'AI Screening', value: 'ai-screening' },
    { icon: FileEdit, label: 'JD Optimizer', value: 'jd-optimizer' },
    { icon: CheckCircle2, label: 'Assessments', value: 'assessments' },
    { icon: Sparkles, label: 'Spotlight Stories', value: 'spotlight' },
    { icon: FileText, label: 'Offer Letters', value: 'offer-letters' },
    { icon: Users, label: 'Compare Candidates', value: 'compare-candidates' },
    { icon: ClipboardCheck, label: 'Interview Feedback', value: 'interview-feedback' },
    { icon: Database, label: 'Talent Pool', value: 'talent-pool' },
    { icon: FlaskConical, label: 'A/B Testing', value: 'ab-testing' },
    { icon: MessageCircle, label: 'Team Notes', value: 'team-notes' },
    { icon: Users, label: 'Team Workflows', value: 'team-workflows' },
    { icon: Users, label: 'Team Members', value: 'team' },
    { icon: Sparkles, label: 'Accessibility Check', value: 'accessibility-check' },
    { icon: Palette, label: 'Branding Page', value: 'branding' },
    { icon: Upload, label: 'Bulk Import', value: 'bulk-import' },
    { icon: CreditCard, label: 'Upgrade Plan', value: 'upgrade-plan' },
  ];

  return (
    <DashboardAuthGuard type="employer" authLoading={authLoading} profileLoading={profileLoading} profileResolved={profileResolved} user={user} profile={profile} refreshProfile={refreshProfile} signOut={signOut}>
      {dataLoading ? <EmployerDashboardLoading /> : !profile ? null : (
        <EmailVerificationGuard fallbackMessage="Please verify your email to access your employer dashboard.">
          <SEOHead
            title="Employer Dashboard — Hire for Job"
            description="Manage job postings, review candidates, schedule interviews, and grow your team with Hire for Job."
            canonicalUrl="https://www.hireforjob.com/employer-dashboard"
            noindex
          />
          <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/80 flex overflow-hidden">
            {user && <OnboardingTour userId={user.id} type="employer" />}
            <DashboardSidebar type="employer" items={sidebarItems} activeItem={activeSection} onItemClick={handleSectionClick} userName={employer?.company_name || 'Your Company'} userTitle={employer?.industry || 'Employer'} avatarUrl={profile.avatar_url} onSignOut={signOut} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} profileCompleteness={employer?.profile_completeness || 0} />
            <div className="flex-1 flex flex-col min-h-screen lg:ml-0 overflow-x-hidden">
              <EmployerHeader companyName={employer?.company_name || 'Your Company'} planName={planName} avatarUrl={profile.avatar_url} onMenuClick={() => setSidebarOpen(true)} onSignOut={signOut} notificationCount={stats.notificationCount} profileCompleteness={employer?.profile_completeness || 0} onNotificationClick={() => handleSectionClick('notifications')} onPostJob={() => handleSectionClick('post-job')} />
              <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto pb-24 md:pb-6">
                {activeSection ? (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 100, damping: 20 }} className="max-w-6xl mx-auto">
                    <Button variant="ghost" onClick={() => setActiveSection(null)} className="mb-4 text-muted-foreground hover:text-foreground rounded-xl gap-2 backdrop-blur-sm">
                      <ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard
                    </Button>
                    {activeSection === 'candidates' || activeSection === 'post-job' ? (
                      <EmployerSectionRouter activeSection={activeSection} employer={employer} profile={profile} jobs={jobs} selectedJob={selectedJob} setSelectedJob={setSelectedJob} setJobs={setJobs} setJobToDelete={setJobToDelete} onSectionChange={setActiveSection} search={search} />
                    ) : (
                      <div className="bg-card/70 backdrop-blur-xl shadow-lg border border-border/40 rounded-2xl overflow-hidden">
                        <div className="p-3 sm:p-4 md:p-6">
                          <EmployerSectionRouter activeSection={activeSection} employer={employer} profile={profile} jobs={jobs} selectedJob={selectedJob} setSelectedJob={setSelectedJob} setJobs={setJobs} setJobToDelete={setJobToDelete} onSectionChange={setActiveSection} search={search} />
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <EmployerHomeView
                    employer={employer}
                    profile={profile}
                    jobs={jobs}
                    stats={stats}
                    planName={planName}
                    onSectionClick={handleSectionClick}
                  />
                )}
              </main>
            </div>

            <AlertDialog open={!!jobToDelete} onOpenChange={() => setJobToDelete(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Job Posting</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure you want to delete "{jobToDelete?.title}"? This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletingJob}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteJob} disabled={deletingJob} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {deletingJob ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : 'Delete Job'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <DashboardBottomNav type="employer" activeItem={activeSection} onItemClick={handleSectionClick} messageBadge={stats.unreadMessages} notificationBadge={stats.notificationCount} />
          </div>
        </EmailVerificationGuard>
      )}
    </DashboardAuthGuard>
  );
};

export default EmployerDashboard;
