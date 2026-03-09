import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDashboardTab } from '@/hooks/useDashboardTab';
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
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { DashboardAuthGuard } from '@/components/dashboard/DashboardAuthGuard';
import { EmployerDashboardLoading } from '@/components/dashboard/DashboardLoadingSkeleton';
import { ActiveJobsTable } from '@/components/dashboard/ActiveJobsTable';
import { EmployerInterviewsCard } from '@/components/dashboard/EmployerInterviewsCard';
import { PlatformNotificationBanner } from '@/components/dashboard/PlatformNotificationBanner';
import { PendingTasksWidget } from '@/components/dashboard/PendingTasksWidget';
import { DashboardBottomNav } from '@/components/dashboard/DashboardBottomNav';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { EmployerProfileCompletionPrompts } from '@/components/employer/ProfileCompletionPrompts';
import { HiringPipeline } from '@/components/employer/HiringPipeline';
import { RecentActivityFeed } from '@/components/employer/RecentActivityFeed';
import { RecentMessagesWidget } from '@/components/employer/RecentMessagesWidget';
import { EmployerSectionRouter } from '@/components/employer/EmployerSectionRouter';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const { activeSection, setActiveSection } = useDashboardTab();
  const { user, profile, loading: authLoading, profileLoading, signOut, refreshProfile } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);
  const [employer, setEmployer] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [profileRetryCount, setProfileRetryCount] = useState(0);
  const [planName, setPlanName] = useState('Free Plan');
  const [stats, setStats] = useState({ activeJobs: 0, totalApplications: 0, scheduledInterviews: 0, profileViews: 0, notificationCount: 0 });
  const [jobToDelete, setJobToDelete] = useState<any>(null);
  const [deletingJob, setDeletingJob] = useState(false);

  const { refreshTrigger } = useRealtimeDashboard({ userId: user?.id, employerId: employer?.id });

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
    if (!profile && profileLoading) return;
    if (!profile) { setDataLoading(false); return; }
    if (profile.user_type !== 'employer') { navigate('/candidate-dashboard'); return; }
    fetchEmployerData();
  }, [user, profile, authLoading, profileLoading]);

  const fetchEmployerData = async () => {
    if (!profile || !user) return;
    const loadingTimeout = setTimeout(() => { setDataLoading(false); toast.error('Dashboard data is taking too long.'); }, 10000);
    try {
      const { data: employerData } = await supabase.from('employers').select('*').eq('profile_id', profile.id).maybeSingle();
      setEmployer(employerData);
      if (employerData) {
        const { data: jobsData } = await supabase.from('jobs').select('*').eq('employer_id', employerData.id).order('created_at', { ascending: false });
        const jobsWithCounts = await Promise.all((jobsData || []).map(async (job) => {
          const { count } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('job_id', job.id);
          return { ...job, applications_count: count || 0 };
        }));
        setJobs(jobsWithCounts);
        if (jobsWithCounts.length > 0) setSelectedJob(jobsWithCounts[0]);
        const activeJobs = jobsWithCounts.filter(j => j.is_active && j.status === 'open').length;
        const totalApplications = jobsWithCounts.reduce((sum, j) => sum + (j.applications_count || 0), 0);
        const { count: interviewCount } = await supabase.from('interviews').select('*', { count: 'exact', head: true }).eq('employer_id', employerData.id).in('status', ['scheduled', 'confirmed', 'requested']);
        const { count: viewCount } = await supabase.from('profile_views').select('*', { count: 'exact', head: true }).eq('profile_id', profile.id);
        const { count: notifCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false);
        const { data: subData } = await supabase.from('employer_subscriptions').select('employer_plans(name)').eq('employer_id', employerData.id).eq('status', 'active').maybeSingle();
        if (subData && (subData as any).employer_plans?.name) setPlanName((subData as any).employer_plans.name + ' Plan');
        setStats({ activeJobs, totalApplications, scheduledInterviews: interviewCount || 0, profileViews: viewCount || 0, notificationCount: notifCount || 0 });

        // Refresh response rate in background
        supabase.rpc('calculate_employer_response_rate', { p_employer_id: employerData.id }).then(() => {});
      }
    } catch (error) { console.error('Error fetching employer data:', error); toast.error('Failed to load some dashboard data.'); }
    finally { clearTimeout(loadingTimeout); setDataLoading(false); }
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
    { icon: MessageSquare, label: 'Messages', value: 'chat' },
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
    <DashboardAuthGuard type="employer" authLoading={authLoading} profileLoading={profileLoading} user={user} profile={profile} refreshProfile={refreshProfile} signOut={signOut}>
      {dataLoading ? <EmployerDashboardLoading /> : !profile ? null : (
        <EmailVerificationGuard fallbackMessage="Please verify your email to access your employer dashboard.">
          <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/80 flex overflow-x-hidden">
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
                  /* ─── HOME VIEW ─── */
                  <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
                    <PlatformNotificationBanner userType="employer" />
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, type: 'spring', stiffness: 120, damping: 16 }} className="lg:col-span-5 relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-primary/70 p-5 sm:p-6 flex flex-col justify-between border border-primary/20 min-h-[180px]">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
                        <div className="relative z-10">
                          <p className="text-primary-foreground/70 text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                            {(() => { const h = new Date().getHours(); return h < 12 ? '🌅 Good morning' : h < 17 ? '☀️ Good afternoon' : '🌙 Good evening'; })()}
                          </p>
                          <h3 className="text-xl sm:text-2xl font-bold text-primary-foreground leading-tight">{employer?.company_name || 'Your Company'}</h3>
                          <p className="text-primary-foreground/60 text-sm mt-2 leading-relaxed max-w-xs">
                            {stats.totalApplications > 0 ? `${stats.totalApplications} application${stats.totalApplications !== 1 ? 's' : ''} awaiting review across ${stats.activeJobs} active job${stats.activeJobs !== 1 ? 's' : ''}.` : stats.activeJobs > 0 ? `Your ${stats.activeJobs} job${stats.activeJobs > 1 ? 's are' : ' is'} live and attracting candidates.` : 'Post your first job to start receiving applications from top talent.'}
                          </p>
                        </div>
                        <div className="relative z-10 flex items-center gap-2 mt-4">
                          <Button size="sm" variant="secondary" className="rounded-xl text-xs font-semibold shadow-lg gap-1.5" onClick={() => setActiveSection('post-job')}><Plus className="w-3.5 h-3.5" />Post a Job</Button>
                          <Button size="sm" variant="ghost" className="rounded-xl text-xs font-medium text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 gap-1.5" onClick={() => setActiveSection('candidates')}><Search className="w-3.5 h-3.5" />Find Talent</Button>
                        </div>
                      </motion.div>
                      <div className="lg:col-span-7 grid grid-cols-2 gap-2 sm:gap-3">
                        <DashboardStatCard icon={Briefcase} label="Active Jobs" value={stats.activeJobs} subtitle="currently open" accentColor="blue" onClick={() => setActiveSection('jobs')} delay={0} />
                        <DashboardStatCard icon={Users} label="Applications" value={stats.totalApplications} subtitle="across all jobs" accentColor="amber" onClick={() => setActiveSection('jobs')} delay={1} />
                        <DashboardStatCard icon={Calendar} label="Interviews" value={stats.scheduledInterviews} subtitle="upcoming" accentColor="green" onClick={() => setActiveSection('interviews')} delay={2} />
                        <DashboardStatCard icon={Eye} label="Profile Views" value={stats.profileViews} subtitle="all time" accentColor="purple" delay={3} />
                      </div>
                    </div>

                    {employer && (employer.profile_completeness || 0) < 80 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <EmployerProfileCompletionPrompts employer={employer} jobCount={jobs.length} />
                      </motion.div>
                    )}

                    {/* Today's Focus */}
                    {(() => {
                      const nudges: { icon: any; label: string; desc: string; action: string; color: string; bg: string }[] = [];
                      if (stats.totalApplications > 0) nudges.push({ icon: Users, label: 'Review Applications', desc: `${stats.totalApplications} waiting`, action: 'jobs', color: 'text-primary', bg: 'bg-primary/10' });
                      if (stats.scheduledInterviews > 0) nudges.push({ icon: Calendar, label: 'Upcoming Interviews', desc: `${stats.scheduledInterviews} scheduled`, action: 'interviews', color: 'text-success', bg: 'bg-success/10' });
                      if (stats.notificationCount > 0) nudges.push({ icon: Bell, label: 'Unread Notifications', desc: `${stats.notificationCount} new`, action: 'notifications', color: 'text-warning-foreground', bg: 'bg-warning/10' });
                      if (employer && (employer.profile_completeness || 0) < 60) nudges.push({ icon: Building2, label: 'Complete Profile', desc: `${employer.profile_completeness || 0}% complete`, action: 'company', color: 'text-destructive', bg: 'bg-destructive/10' });
                      if (stats.activeJobs === 0) nudges.push({ icon: Plus, label: 'Post Your First Job', desc: 'Start attracting talent', action: 'post-job', color: 'text-primary', bg: 'bg-primary/10' });
                      if (nudges.length === 0) return null;
                      return (
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl p-4 overflow-hidden">
                          <div className="absolute -top-12 -right-12 w-36 h-36 bg-warning/8 rounded-full blur-3xl pointer-events-none" />
                          <div className="flex items-center gap-2 mb-3"><div className="w-5 h-5 rounded-md bg-warning/15 flex items-center justify-center"><Sparkles className="w-3 h-3 text-warning-foreground" /></div><p className="text-xs font-semibold text-foreground">Today's Focus</p></div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {nudges.slice(0, 4).map((nudge, i) => (
                              <motion.button key={nudge.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.28 + i * 0.05 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveSection(nudge.action)} className="flex items-center gap-3 p-3 rounded-xl bg-card/80 border border-border/30 hover:border-border/60 hover:shadow-sm transition-all text-left group">
                                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', nudge.bg)}><nudge.icon className={cn('w-4 h-4', nudge.color)} /></div>
                                <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{nudge.label}</p><p className="text-[10px] text-muted-foreground truncate">{nudge.desc}</p></div>
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 shrink-0 transition-colors" />
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      );
                    })()}

                    {/* Quick Actions */}
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl p-3 sm:p-4 overflow-hidden">
                      <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 relative z-10">Quick Actions</p>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2 relative z-10">
                        {[
                          { icon: Plus, label: 'Create Job', onClick: () => setActiveSection('post-job'), color: 'text-primary', bg: 'bg-primary/10' },
                          { icon: Briefcase, label: 'My Jobs', onClick: () => setActiveSection('jobs'), color: 'text-primary', bg: 'bg-primary/8' },
                          { icon: Filter, label: 'Find Talent', onClick: () => setActiveSection('candidates'), color: 'text-success', bg: 'bg-success/10' },
                          { icon: MessageSquare, label: 'Messages', onClick: () => setActiveSection('chat'), color: 'text-accent-foreground', bg: 'bg-accent/10' },
                          { icon: Calendar, label: 'Interviews', onClick: () => setActiveSection('interviews'), color: 'text-warning-foreground', bg: 'bg-warning/10' },
                          { icon: BarChart3, label: 'Analytics', onClick: () => setActiveSection('analytics'), color: 'text-primary', bg: 'bg-primary/10' },
                          { icon: Sparkles, label: 'AI Screen', onClick: () => setActiveSection('ai-screening'), color: 'text-accent-foreground', bg: 'bg-accent/10' },
                          { icon: Building2, label: 'Company', onClick: () => setActiveSection('company'), color: 'text-success', bg: 'bg-success/10' },
                        ].map((action, i) => (
                          <motion.button key={action.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 + i * 0.03 }} whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }} onClick={action.onClick} className="flex flex-col items-center gap-1 p-2.5 sm:p-3 rounded-xl bg-card/70 backdrop-blur-md border border-border/30 hover:border-border/60 hover:shadow-md transition-all">
                            <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center", action.bg)}><action.icon className={cn("w-4 h-4 sm:w-5 sm:h-5", action.color)} /></div>
                            <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground leading-tight">{action.label}</span>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>

                    {/* Active Jobs + Pipeline */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} className="lg:col-span-2 relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl overflow-hidden">
                        <div className="relative z-10 p-1">{employer && <ActiveJobsTable employerId={employer.id} onManageJobs={() => setActiveSection('jobs')} />}</div>
                      </motion.div>
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }} className="relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl overflow-hidden">
                        <div className="relative z-10 p-4 sm:p-5">{employer && <HiringPipeline employerId={employer.id} />}</div>
                      </motion.div>
                    </div>

                    {/* Interviews + Tasks + Messages */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }} className="relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl overflow-hidden">
                        <div className="relative z-10 p-1">{employer && <EmployerInterviewsCard employerId={employer.id} />}</div>
                      </motion.div>
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.53 }} className="relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl overflow-hidden">
                        <div className="relative z-10 p-4 sm:p-5">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pending Tasks</p>
                          {employer && <PendingTasksWidget type="employer" employerId={employer.id} onViewAll={() => setActiveSection('tasks')} />}
                        </div>
                      </motion.div>
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }} className="relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl overflow-hidden">
                        <div className="relative z-10 p-4 sm:p-5">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Messages</p>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-primary px-2 rounded-lg" onClick={() => setActiveSection('chat')}>View All</Button>
                          </div>
                          <RecentMessagesWidget profileId={profile.id} onOpenChat={() => setActiveSection('chat')} />
                        </div>
                      </motion.div>
                    </div>

                    {/* Recent Activity */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.63 }} className="relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl overflow-hidden">
                      <div className="relative z-10 p-4 sm:p-5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</p>
                        {employer && profile && <RecentActivityFeed employerId={employer.id} profileId={profile.id} />}
                      </div>
                    </motion.div>
                  </div>
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

            <DashboardBottomNav type="employer" activeItem={activeSection} onItemClick={handleSectionClick} />
          </div>
        </EmailVerificationGuard>
      )}
    </DashboardAuthGuard>
  );
};

export default EmployerDashboard;
