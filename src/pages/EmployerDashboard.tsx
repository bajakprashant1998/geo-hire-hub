import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  MessageSquare, Calendar, BarChart3, User, Settings, Pencil, Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
import { PlatformNotificationBanner } from '@/components/dashboard/PlatformNotificationBanner';

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, profileLoading, signOut, refreshProfile } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);
  const [employer, setEmployer] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [profileRetryCount, setProfileRetryCount] = useState(0);
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplications: 0,
    scheduledInterviews: 0,
    profileViews: 0
  });
  const [jobToDelete, setJobToDelete] = useState<any>(null);
  const [deletingJob, setDeletingJob] = useState(false);

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
    
    if (profile.user_type !== 'employer') {
      navigate('/candidate-dashboard');
      return;
    }
    fetchEmployerData();
  }, [user, profile, authLoading, profileLoading]);

  const fetchEmployerData = async () => {
    if (!profile) return;
    
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
        const totalViews = jobsWithCounts.reduce((sum, j) => sum + (j.view_count || 0), 0);
        const totalApplications = jobsWithCounts.reduce((sum, j) => sum + (j.applications_count || 0), 0);

        // Count shortlisted as scheduled interviews
        const { count: interviewCount } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'shortlisted')
          .in('job_id', jobsWithCounts.map(j => j.id));

        setStats({
          activeJobs,
          totalApplications,
          scheduledInterviews: interviewCount || 0,
          profileViews: totalViews
        });
      }
    } catch (error) {
      console.error('Error fetching employer data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSectionClick = (value: string) => {
    if (value === 'home') {
      setActiveSection(null);
    } else if (value === 'chat') {
      setChatModalOpen(true);
    } else if (value === 'company') {
      navigate('/company-profile');
    } else if (value === 'settings') {
      navigate('/company-profile');
    } else {
      setActiveSection(value);
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
      
      // Update local state
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
    { icon: Users, label: 'Candidates', value: 'candidates' },
    { icon: FileEdit, label: 'Tasks', value: 'drafts' },
    { icon: MessageSquare, label: 'Chat', value: 'chat' },
    { icon: Calendar, label: 'Interviews', value: 'interviews' },
    { icon: BarChart3, label: 'Analytics', value: 'analytics' },
    { icon: Building2, label: 'Company Profile', value: 'company' },
    { icon: Settings, label: 'Settings', value: 'settings' }
  ];

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[hsl(142,53%,43%)] mx-auto mb-4" />
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
          <Loader2 className="w-10 h-10 animate-spin text-[hsl(142,53%,43%)] mx-auto mb-4" />
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
            <div className="w-20 h-20 bg-[hsl(142,53%,43%)] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">Welcome to Hire for Job</h2>
            <p className="text-muted-foreground mb-8">Sign in to access your employer dashboard</p>
            <Button onClick={() => navigate('/login')} className="w-full h-12 bg-[hsl(142,53%,43%)] hover:bg-[hsl(142,53%,38%)]" size="lg">
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
          <Loader2 className="w-10 h-10 animate-spin text-[hsl(142,53%,43%)] mx-auto mb-4" />
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
                  <Button size="sm" className="bg-[hsl(142,53%,43%)] hover:bg-[hsl(142,53%,38%)]">
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
                      <Button className="bg-[hsl(142,53%,43%)] hover:bg-[hsl(142,53%,38%)]">Post Your First Job</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                jobs.map((job) => (
                  <Card
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedJob?.id === job.id 
                        ? 'ring-2 ring-[hsl(142,53%,43%)] shadow-md' 
                        : 'hover:shadow-md'
                    }`}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-semibold truncate mb-2 text-foreground">{job.title}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${job.is_active ? 'bg-[hsl(142,53%,43%)]/10 text-[hsl(142,53%,43%)]' : 'bg-muted text-muted-foreground'}`}>
                          {job.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-sm text-muted-foreground">{job.applications_count} applicants</span>
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
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl text-foreground">{selectedJob.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {selectedJob.job_address || 'Location not set'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${selectedJob.is_active ? 'bg-[hsl(142,53%,43%)]/10 text-[hsl(142,53%,43%)]' : 'bg-muted text-muted-foreground'}`}>
                          {selectedJob.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <Link to={`/jobs/${selectedJob.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Link to={`/edit-job/${selectedJob.id}`}>
                          <Button variant="outline" size="sm">
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setJobToDelete(selectedJob)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
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
        return employer && <InterviewScheduler employerId={employer.id} />;
      default:
        return null;
    }
  };

  return (
    <EmailVerificationGuard fallbackMessage="Please verify your email to access your employer dashboard.">
      <div className="min-h-screen bg-secondary flex">
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
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
          {/* Header */}
          <EmployerHeader
            companyName={employer?.company_name || 'Your Company'}
            planName="Enterprise Plan"
            avatarUrl={profile.avatar_url}
            onMenuClick={() => setSidebarOpen(true)}
            onSignOut={signOut}
            notificationCount={3}
          />

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
            {activeSection ? (
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
                  <CardContent className="p-6">
                    {renderSectionContent()}
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Dashboard Home View
              <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
                {/* Platform Notifications */}
                <PlatformNotificationBanner userType="employer" />

                {/* Welcome Message */}
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                    Welcome back, {employer?.company_name || 'Company'}!
                  </h1>
                  <p className="text-muted-foreground mt-1">Here's what's happening with your job postings today.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <DashboardStatCard
                    icon={Briefcase}
                    label="Active Jobs"
                    value={stats.activeJobs}
                    subtitle={`+${Math.max(1, Math.floor(stats.activeJobs * 0.2))} this week`}
                    accentColor="blue"
                    onClick={() => setActiveSection('jobs')}
                  />
                  <DashboardStatCard
                    icon={Users}
                    label="Total Applications"
                    value={stats.totalApplications}
                    subtitle={`+${Math.floor(stats.totalApplications * 0.15)} today`}
                    accentColor="amber"
                    onClick={() => setActiveSection('jobs')}
                  />
                  <DashboardStatCard
                    icon={Calendar}
                    label="Scheduled Interviews"
                    value={stats.scheduledInterviews}
                    subtitle={`+${Math.max(1, Math.floor(stats.scheduledInterviews * 0.3))} this week`}
                    accentColor="green"
                  />
                  <DashboardStatCard
                    icon={Eye}
                    label="Profile Views"
                    value={stats.profileViews.toLocaleString()}
                    subtitle="-3% vs last week"
                    accentColor="purple"
                  />
                </div>

                {/* Active Jobs Table + Interviews */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                </div>
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
      </div>
    </EmailVerificationGuard>
  );
};

export default EmployerDashboard;
