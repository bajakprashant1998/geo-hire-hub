import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDashboardTab } from '@/hooks/useDashboardTab';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  MapPin, Briefcase, Building2, Plus, Loader2, Eye, Users,
  CheckCircle2, ChevronRight, FileEdit, CreditCard, UserCheck,
  MessageSquare, Calendar, BarChart3, User, Settings, Pencil, Trash2, Shield,
  Sparkles, Bell
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { EmployerHeader } from '@/components/dashboard/EmployerHeader';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { ActiveJobsTable } from '@/components/dashboard/ActiveJobsTable';
import { EmployerInterviewsCard } from '@/components/dashboard/EmployerInterviewsCard';
import { ChatModal } from '@/components/messaging/ChatModal';

import { PlanUsagePanel } from '@/components/employer/PlanUsagePanel';
import { JobDraftsSection } from '@/components/employer/JobDraftsSection';
import { SavedCandidatesSection } from '@/components/employer/SavedCandidatesSection';
import { ApplicantTabs } from '@/components/employer/ApplicantTabs';
import { InterviewScheduler } from '@/components/employer/InterviewScheduler';
import { JobAnalyticsDashboard } from '@/components/employer/JobAnalyticsDashboard';
import { EmployerInterviewCalendar } from '@/components/employer/EmployerInterviewCalendar';
import { PlatformNotificationBanner } from '@/components/dashboard/PlatformNotificationBanner';
import { TaskManager } from '@/components/employer/TaskManager';
import EmployerDetail from '@/pages/EmployerDetail';
import { EmployerProfileCompletionPrompts } from '@/components/employer/ProfileCompletionPrompts';
import { DashboardBottomNav } from '@/components/dashboard/DashboardBottomNav';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { JobExpiryBadge } from '@/components/employer/JobExpiryBadge';
import { SecuritySettings } from '@/components/candidate/SecuritySettings';
import { NotificationCenter } from '@/components/candidate/NotificationCenter';
import { motion } from 'framer-motion';

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const { activeSection, setActiveSection } = useDashboardTab();
  const { user, profile, loading: authLoading, profileLoading, signOut, refreshProfile } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);
  const [employer, setEmployer] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [profileRetryCount, setProfileRetryCount] = useState(0);
  const [planName, setPlanName] = useState('Free Plan');
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplications: 0,
    scheduledInterviews: 0,
    profileViews: 0,
    notificationCount: 0
  });
  const [jobToDelete, setJobToDelete] = useState<any>(null);
  const [deletingJob, setDeletingJob] = useState(false);

  // Realtime dashboard updates
  const { refreshTrigger } = useRealtimeDashboard({
    userId: user?.id,
    employerId: employer?.id,
  });

  // Re-fetch data when realtime events trigger
  useEffect(() => {
    if (refreshTrigger > 0 && employer) {
      fetchEmployerData();
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
    if (authLoading) return;
    if (!user) return;
    if (!profile && profileLoading) return;
    if (!profile) {
      setDataLoading(false);
      return;
    }
    if (profile.user_type !== 'employer') {
      navigate('/candidate-dashboard');
      return;
    }
    fetchEmployerData();
  }, [user, profile, authLoading, profileLoading]);

  const fetchEmployerData = async () => {
    if (!profile || !user) return;

    try {
      const { data: employerData } = await supabase
        .from('employers')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      setEmployer(employerData);

      if (employerData) {
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('*')
          .eq('employer_id', employerData.id)
          .order('created_at', { ascending: false });

        const jobsWithCounts = await Promise.all(
          (jobsData || []).map(async (job) => {
            const { count } = await supabase
              .from('applications')
              .select('*', { count: 'exact', head: true })
              .eq('job_id', job.id);
            return { ...job, applications_count: count || 0 };
          })
        );

        setJobs(jobsWithCounts);
        if (jobsWithCounts.length > 0) {
          setSelectedJob(jobsWithCounts[0]);
        }

        const activeJobs = jobsWithCounts.filter(j => j.is_active && j.status === 'open').length;
        const totalApplications = jobsWithCounts.reduce((sum, j) => sum + (j.applications_count || 0), 0);

        // Count from interviews table
        const { count: interviewCount } = await supabase
          .from('interviews')
          .select('*', { count: 'exact', head: true })
          .eq('employer_id', employerData.id)
          .eq('status', 'scheduled');

        // Real profile views from profile_views table
        const { count: viewCount } = await supabase
          .from('profile_views')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', profile.id);

        // Real unread notification count
        const { count: notifCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        // Fetch plan name from subscription
        const { data: subData } = await supabase
          .from('employer_subscriptions')
          .select('employer_plans(name)')
          .eq('employer_id', employerData.id)
          .eq('status', 'active')
          .maybeSingle();

        if (subData && (subData as any).employer_plans?.name) {
          setPlanName((subData as any).employer_plans.name + ' Plan');
        }

        setStats({
          activeJobs,
          totalApplications,
          scheduledInterviews: interviewCount || 0,
          profileViews: viewCount || 0,
          notificationCount: notifCount || 0
        });
      }
    } catch (error) {
      console.error('Error fetching employer data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSectionClick = (value: string) => {
    if (value === 'chat') {
      setChatModalOpen(true);
    } else if (value === 'company') {
      navigate('/company-profile');
    } else if (value === 'settings') {
      navigate('/employer-settings');
    } else if (value === 'upgrade-plan') {
      navigate('/plans');
      return;
    } else {
      setActiveSection(value === 'home' ? null : value);
    }
    setSidebarOpen(false);
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;

    setDeletingJob(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobToDelete.id);

      if (error) throw error;

      setJobs(jobs.filter(j => j.id !== jobToDelete.id));
      if (selectedJob?.id === jobToDelete.id) {
        setSelectedJob(jobs.find(j => j.id !== jobToDelete.id) || null);
      }

      toast.success('Job deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete job: ' + error.message);
    } finally {
      setDeletingJob(false);
      setJobToDelete(null);
    }
  };

  const sidebarItems = [
    { icon: Briefcase, label: 'Job Postings', value: 'jobs', badge: stats.activeJobs },
    { icon: Users, label: 'Applicants', value: 'candidates', badge: stats.totalApplications },
    { icon: FileEdit, label: 'Drafts', value: 'drafts' },
    { icon: Users, label: 'Tasks', value: 'tasks' },
    { icon: MessageSquare, label: 'Messages', value: 'chat' },
    { icon: Calendar, label: 'Interviews', value: 'interviews', badge: stats.scheduledInterviews },
    { icon: BarChart3, label: 'Analytics', value: 'analytics' },
    { icon: Building2, label: 'Company Profile', value: 'company' },
    { icon: Eye, label: 'Public Profile', value: 'public-profile' },
    { icon: Bell, label: 'Notifications', value: 'notifications', badge: stats.notificationCount },
    { icon: Shield, label: 'Security', value: 'security' },
    { icon: CreditCard, label: 'Upgrade Plan', value: 'upgrade-plan' }
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
              <Building2 className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">Welcome to Hire for Job</h2>
            <p className="text-muted-foreground mb-8">Sign in to access your employer dashboard</p>
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
              <Building2 className="w-10 h-10 text-destructive" />
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

  // Render expanded section content
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'jobs':
        return (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-foreground">All Jobs ({jobs.length})</h3>
                <Link to="/post-job">
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" /> New
                  </Button>
                </Link>
              </div>
              {jobs.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="p-8 text-center">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground mb-4">No jobs posted yet</p>
                    <Link to="/post-job">
                      <Button>Post Your First Job</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                jobs.map((job) => (
                  <Card
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`cursor-pointer transition-all duration-200 ${selectedJob?.id === job.id
                      ? 'ring-2 ring-primary shadow-md'
                      : 'hover:shadow-md'
                      }`}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-semibold truncate mb-2 text-foreground">{job.title}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${job.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {job.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-sm text-muted-foreground">{job.applications_count} applicants</span>
                        {job.expires_at && <JobExpiryBadge expiresAt={job.expires_at} />}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="lg:col-span-2">
              {selectedJob ? (
                <Card className="shadow-sm border bg-card">
                  <CardHeader className="border-b">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg sm:text-xl text-foreground">{selectedJob.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {selectedJob.job_address || 'Location not set'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${selectedJob.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {selectedJob.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <Link to={`/jobs/${selectedJob.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                        </Link>
                        <Link to={`/edit-job/${selectedJob.id}`}>
                          <Button variant="outline" size="sm">
                            <Pencil className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setJobToDelete(selectedJob)}
                        >
                          <Trash2 className="w-4 h-4 sm:mr-1" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <h4 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
                      <Users className="w-4 h-4" /> Applicants
                    </h4>
                    {employer && <ApplicantTabs jobId={selectedJob.id} employerId={employer.id} />}
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-sm border bg-card">
                  <CardContent className="p-12 text-center">
                    <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
                    <p className="text-muted-foreground text-lg">Select a job to view applicants</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );
      case 'candidates':
        return employer && <SavedCandidatesSection employerId={employer.id} />;
      case 'drafts':
        return employer && <JobDraftsSection employerId={employer.id} />;
      case 'tasks':
        return employer && <TaskManager employerId={employer.id} />;
      case 'plan':
        return employer && <PlanUsagePanel employerId={employer.id} />;
      case 'analytics':
        return employer && (
          <div className="space-y-6">
            <JobAnalyticsDashboard employerId={employer.id} />
            <PlanUsagePanel employerId={employer.id} />
          </div>
        );
      case 'interviews':
        return employer && (
          <div className="space-y-6">
            <EmployerInterviewCalendar employerId={employer.id} />
            <InterviewScheduler employerId={employer.id} />
          </div>
        );
      case 'public-profile':
        return employer && <EmployerDetail id={employer.id} />;
      case 'notifications':
        return <NotificationCenter />;
      case 'security':
        return <SecuritySettings />;
      default:
        return null;
    }
  };

  return (
    <EmailVerificationGuard fallbackMessage="Please verify your email to access your employer dashboard.">
      <div className="min-h-screen bg-secondary flex">
        {/* Onboarding Tour */}
        {user && <OnboardingTour userId={user.id} type="employer" />}
        {/* Sidebar */}
        <DashboardSidebar
          type="employer"
          items={sidebarItems}
          activeItem={activeSection}
          onItemClick={handleSectionClick}
          userName={employer?.company_name || 'Your Company'}
          userTitle={employer?.industry || 'Employer'}
          avatarUrl={profile.avatar_url}
          onSignOut={signOut}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          profileCompleteness={employer?.profile_completeness || 0}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
          {/* Header */}
          <EmployerHeader
            companyName={employer?.company_name || 'Your Company'}
            planName={planName}
            avatarUrl={profile.avatar_url}
            onMenuClick={() => setSidebarOpen(true)}
            onSignOut={signOut}
            notificationCount={stats.notificationCount}
            profileCompleteness={employer?.profile_completeness || 0}
            onNotificationClick={() => handleSectionClick('notifications')}
          />

          {/* Main Content */}
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto pb-20 md:pb-6">
            {activeSection ? (
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
              <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
                <PlatformNotificationBanner userType="employer" />

                {employer && (
                  <EmployerProfileCompletionPrompts employer={employer} jobCount={jobs.length} />
                )}

                {/* Mobile Quick Actions */}
                <div className="grid grid-cols-4 gap-2 sm:hidden">
                  {[
                    { icon: Plus, label: 'Post Job', action: () => navigate('/post-job'), color: 'text-[hsl(217,89%,61%)]', bg: 'bg-[hsl(217,89%,61%)]/10' },
                    { icon: Users, label: 'Candidates', action: () => setActiveSection('candidates'), color: 'text-[hsl(142,53%,43%)]', bg: 'bg-[hsl(142,53%,43%)]/10' },
                    { icon: BarChart3, label: 'Analytics', action: () => setActiveSection('analytics'), color: 'text-[hsl(262,83%,58%)]', bg: 'bg-[hsl(262,83%,58%)]/10' },
                    { icon: Calendar, label: 'Interviews', action: () => setActiveSection('interviews'), color: 'text-[hsl(44,70%,45%)]', bg: 'bg-[hsl(44,98%,50%)]/10' },
                  ].map((item, i) => (
                    <motion.button
                      key={item.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={item.action}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border/50 hover:shadow-md transition-all active:scale-95"
                    >
                      <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                        <item.icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <DashboardStatCard
                    icon={Briefcase}
                    label="Active Jobs"
                    value={stats.activeJobs}
                    subtitle="currently open"
                    accentColor="blue"
                    onClick={() => setActiveSection('jobs')}
                    delay={0}
                  />
                  <DashboardStatCard
                    icon={Users}
                    label="Total Applications"
                    value={stats.totalApplications}
                    subtitle="across all jobs"
                    accentColor="amber"
                    onClick={() => setActiveSection('jobs')}
                    delay={1}
                  />
                  <DashboardStatCard
                    icon={Calendar}
                    label="Scheduled Interviews"
                    value={stats.scheduledInterviews}
                    subtitle="upcoming"
                    accentColor="green"
                    delay={2}
                  />
                  <DashboardStatCard
                    icon={Eye}
                    label="Profile Views"
                    value={stats.profileViews}
                    subtitle="all time"
                    accentColor="purple"
                    delay={3}
                  />
                </div>

                {/* Active Jobs Table + Interviews */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                >
                  <div className="md:col-span-2 lg:col-span-2">
                    {employer && (
                      <ActiveJobsTable
                        employerId={employer.id}
                        onManageJobs={() => setActiveSection('jobs')}
                      />
                    )}
                  </div>
                  <div className="md:col-span-2 lg:col-span-1">
                    {employer && <EmployerInterviewsCard employerId={employer.id} />}
                  </div>
                </motion.div>
              </div>
            )}
          </main>
        </div>

        {/* Chat Modal */}
        <ChatModal
          isOpen={chatModalOpen}
          onClose={() => setChatModalOpen(false)}
        />

        {/* Delete Job Confirmation Dialog */}
        <AlertDialog open={!!jobToDelete} onOpenChange={() => setJobToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Job Posting</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{jobToDelete?.title}"? This action cannot be undone.
                All associated applications will also be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingJob}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteJob}
                disabled={deletingJob}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletingJob ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Job'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Mobile Bottom Nav */}
        <DashboardBottomNav
          type="employer"
          activeItem={activeSection}
          onItemClick={handleSectionClick}
        />
      </div>
    </EmailVerificationGuard>
  );
};

export default EmployerDashboard;