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
  Sparkles, Bell, Filter, Search, Clock
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
import { DashboardMessaging } from '@/components/dashboard/DashboardMessaging';

import { PlanUsagePanel } from '@/components/employer/PlanUsagePanel';
import { JobDraftsSection } from '@/components/employer/JobDraftsSection';
import { SavedCandidatesSection } from '@/components/employer/SavedCandidatesSection';
import { CandidateFilterTool } from '@/components/employer/CandidateFilterTool';
import { ApplicantTabs } from '@/components/employer/ApplicantTabs';
import { InterviewScheduler } from '@/components/employer/InterviewScheduler';
import { JobAnalyticsDashboard } from '@/components/employer/JobAnalyticsDashboard';
import { EmployerInterviewCalendar } from '@/components/employer/EmployerInterviewCalendar';
import { PlatformNotificationBanner } from '@/components/dashboard/PlatformNotificationBanner';
import { TaskManager } from '@/components/employer/TaskManager';
import EmployerDetail from '@/pages/EmployerDetail';
import { EmployerProfileCompletionPrompts } from '@/components/employer/ProfileCompletionPrompts';
import PostJob from '@/pages/PostJob';
import { DashboardBottomNav } from '@/components/dashboard/DashboardBottomNav';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { JobExpiryBadge } from '@/components/employer/JobExpiryBadge';
import { SecuritySettings } from '@/components/candidate/SecuritySettings';
import { NotificationCenter } from '@/components/candidate/NotificationCenter';
import { CompanyProfileSection } from '@/components/employer/CompanyProfileSection';
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
      setActiveSection('chat');
    } else if (value === 'company') {
      setActiveSection('company');
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
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 70, damping: 18 }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Floating badges */}
          <div className="flex justify-center gap-2 mb-5">
            {['Verified Employers', 'AI Screening', 'Smart Hiring'].map((text, i) => (
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
                  <Building2 className="w-11 h-11 text-primary-foreground drop-shadow-sm" />
                </div>
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
                  Build Your Dream Team
                </h2>
                <p className="text-muted-foreground mb-8 text-sm sm:text-base leading-relaxed max-w-sm mx-auto">
                  Sign in to manage job postings, discover top talent, and streamline your hiring process.
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
                  <ChevronRight className="w-4 h-4 ml-1" />
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
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold mb-3">Why employers love us</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: Users, label: 'Top Talent', color: 'text-primary bg-primary/10' },
                    { icon: MapPin, label: 'Local Hiring', color: 'text-success bg-success/10' },
                    { icon: Sparkles, label: 'AI Screening', color: 'text-warning-foreground bg-warning/20' },
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
      case 'jobs': {
        const activeJobCount = jobs.filter(j => j.is_active && j.status === 'open').length;
        const inactiveJobCount = jobs.filter(j => !j.is_active).length;
        const expiredJobCount = jobs.filter(j => j.expires_at && new Date(j.expires_at) < new Date()).length;
        const totalApplicants = jobs.reduce((sum, j) => sum + (j.applications_count || 0), 0);
        const jobSearchQuery = search?.toLowerCase() || '';
        const filteredJobs = jobSearchQuery 
          ? jobs.filter(j => j.title.toLowerCase().includes(jobSearchQuery) || j.job_address?.toLowerCase().includes(jobSearchQuery) || j.job_category?.toLowerCase().includes(jobSearchQuery))
          : jobs;
        
        return (
          <div className="space-y-5">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Jobs', value: jobs.length, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'Active', value: activeJobCount, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
                { label: 'Applicants', value: totalApplicants, icon: Users, color: 'text-warning', bg: 'bg-warning/10' },
                { label: 'Expired', value: expiredJobCount, icon: Clock, color: 'text-destructive', bg: 'bg-destructive/10' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card/60 backdrop-blur border border-border/40"
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', stat.bg)}>
                    <stat.icon className={cn('w-5 h-5', stat.color)} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-5">
              {/* Left: Job List */}
              <div className="lg:col-span-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base text-foreground">Jobs ({filteredJobs.length})</h3>
                  <Button size="sm" className="gap-1.5 rounded-xl shadow-sm" onClick={() => setActiveSection('post-job')}>
                    <Plus className="w-4 h-4" /> New
                  </Button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={search || ''}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-border/60 bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>

                {filteredJobs.length === 0 ? (
                  <Card className="border-dashed border-2 rounded-xl">
                    <CardContent className="p-8 text-center">
                      <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                      <p className="text-muted-foreground mb-4 text-sm">{jobs.length === 0 ? 'No jobs posted yet' : 'No jobs match your search'}</p>
                      {jobs.length === 0 && (
                        <Button className="rounded-xl" onClick={() => setActiveSection('post-job')}>Post Your First Job</Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2 max-h-[calc(100vh-420px)] overflow-y-auto pr-1 scrollbar-thin">
                    {filteredJobs.map((job, idx) => {
                      const isSelected = selectedJob?.id === job.id;
                      const isExpired = job.expires_at && new Date(job.expires_at) < new Date();
                      return (
                        <motion.div
                          key={job.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Card
                            onClick={() => setSelectedJob(job)}
                            className={cn(
                              'cursor-pointer transition-all duration-200 rounded-xl overflow-hidden',
                              isSelected
                                ? 'ring-2 ring-primary bg-primary/5 shadow-lg'
                                : 'hover:shadow-md hover:bg-muted/30 border-border/50'
                            )}
                          >
                            <CardContent className="p-3.5">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-foreground text-sm leading-tight line-clamp-1 flex-1">{job.title}</h4>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                              </div>

                              {/* Location */}
                              {job.job_address && (
                                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 line-clamp-1">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  {job.location_city || job.job_address.split(',')[0]}
                                </p>
                              )}

                              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                <span className={cn(
                                  'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                                  isExpired
                                    ? 'bg-destructive/10 text-destructive'
                                    : job.is_active
                                      ? 'bg-success/10 text-success'
                                      : 'bg-muted text-muted-foreground'
                                )}>
                                  {isExpired ? 'Expired' : job.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Users className="w-3 h-3" />
                                  {job.applications_count}
                                </span>
                                {job.view_count > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Eye className="w-3 h-3" />
                                    {job.view_count}
                                  </span>
                                )}
                                {job.job_category && (
                                  <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full truncate max-w-[80px]">
                                    {job.job_category}
                                  </span>
                                )}
                              </div>

                              {job.expires_at && (
                                <div className="mt-2">
                                  <JobExpiryBadge expiresAt={job.expires_at} />
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: Job Detail + Applicants */}
              <div className="lg:col-span-2">
                {selectedJob ? (
                  <motion.div
                    key={selectedJob.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Job Header Card */}
                    <Card className="shadow-sm border border-border/50 bg-card rounded-xl overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary/60" />
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-lg sm:text-xl text-foreground leading-tight">{selectedJob.title}</CardTitle>
                              <span className={cn(
                                'text-[11px] px-2.5 py-0.5 rounded-full font-semibold',
                                selectedJob.is_active
                                  ? 'bg-success/10 text-success border border-success/20'
                                  : 'bg-muted text-muted-foreground'
                              )}>
                                {selectedJob.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              {selectedJob.job_address || 'Location not set'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap shrink-0">
                            <Link to={`/jobs/${selectedJob.id}`}>
                              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl h-8">
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline text-xs">View</span>
                              </Button>
                            </Link>
                            <Link to={`/edit-job/${selectedJob.id}`}>
                              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl h-8">
                                <Pencil className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline text-xs">Edit</span>
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 rounded-xl h-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                              onClick={() => setJobToDelete(selectedJob)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline text-xs">Delete</span>
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {/* Quick Metrics */}
                      <div className="px-4 sm:px-6 pb-4">
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: 'Applicants', value: selectedJob.applications_count || 0, icon: Users, color: 'text-primary' },
                            { label: 'Views', value: selectedJob.view_count || 0, icon: Eye, color: 'text-muted-foreground' },
                            { label: 'Openings', value: selectedJob.openings || 1, icon: Briefcase, color: 'text-success' },
                          ].map((m) => (
                            <div key={m.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                              <m.icon className={cn('w-4 h-4 shrink-0', m.color)} />
                              <div>
                                <p className="text-sm font-bold text-foreground leading-none">{m.value}</p>
                                <p className="text-[10px] text-muted-foreground">{m.label}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Job meta tags */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {selectedJob.job_type && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{selectedJob.job_type}</span>
                          )}
                          {selectedJob.job_category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent-foreground font-medium">{selectedJob.job_category}</span>
                          )}
                          {selectedJob.salary_range && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                              {selectedJob.salary_currency || '₹'} {selectedJob.salary_range}
                            </span>
                          )}
                          {selectedJob.shift_type && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{selectedJob.shift_type}</span>
                          )}
                        </div>
                      </div>
                    </Card>

                    {/* Applicants Card */}
                    <Card className="shadow-sm border border-border/50 bg-card rounded-xl">
                      <CardContent className="p-4 sm:p-5">
                        <h4 className="font-semibold mb-4 flex items-center gap-2 text-foreground text-sm">
                          <Users className="w-4 h-4 text-primary" /> Applicants
                        </h4>
                        {employer && <ApplicantTabs jobId={selectedJob.id} employerId={employer.id} />}
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <Card className="shadow-sm border border-border/50 bg-card rounded-xl">
                    <CardContent className="p-12 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                      <p className="text-muted-foreground">Select a job to view details & applicants</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        );
      }
      case 'candidates':
        return employer && <CandidateFilterTool employerId={employer.id} />;
      case 'drafts':
        return employer && <JobDraftsSection employerId={employer.id} />;
      case 'chat':
        return <DashboardMessaging />;
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
      case 'company':
        return <CompanyProfileSection onViewPublicProfile={() => setActiveSection('public-profile')} />;
      case 'notifications':
        return <NotificationCenter />;
      case 'security':
        return <SecuritySettings />;
      case 'post-job':
        return <PostJob embedded />;
      default:
        return null;
    }
  };

  return (
    <EmailVerificationGuard fallbackMessage="Please verify your email to access your employer dashboard.">
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/80 flex">
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
          <main className="flex-1 p-2 sm:p-4 lg:p-6 overflow-y-auto pb-20 md:pb-6">
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
                {activeSection === 'candidates' || activeSection === 'post-job' ? (
                  renderSectionContent()
                ) : (
                  <Card className="bg-card/70 backdrop-blur-xl shadow-lg border border-border/50 overflow-visible">
                    <CardContent className="p-2 sm:p-4 md:p-6">
                      {renderSectionContent()}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
                <PlatformNotificationBanner userType="employer" />

                {employer && (
                  <EmployerProfileCompletionPrompts employer={employer} jobCount={jobs.length} />
                )}

                {/* Quick Actions Grid */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 120 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
                    {[
                      { icon: Plus, label: 'Create Job', action: () => setActiveSection('post-job'), color: 'text-primary', bg: 'bg-primary/10' },
                      { icon: Briefcase, label: 'My Jobs', action: () => setActiveSection('jobs'), color: 'text-[hsl(217,89%,61%)]', bg: 'bg-[hsl(217,89%,61%)]/10' },
                      { icon: Filter, label: 'Find Talent', action: () => setActiveSection('candidates'), color: 'text-[hsl(142,53%,43%)]', bg: 'bg-[hsl(142,53%,43%)]/10' },
                      { icon: MessageSquare, label: 'Messages', action: () => setActiveSection('chat'), color: 'text-[hsl(199,89%,48%)]', bg: 'bg-[hsl(199,89%,48%)]/10' },
                      { icon: Calendar, label: 'Interviews', action: () => setActiveSection('interviews'), color: 'text-[hsl(44,70%,45%)]', bg: 'bg-[hsl(44,70%,45%)]/10' },
                      { icon: BarChart3, label: 'Analytics', action: () => setActiveSection('analytics'), color: 'text-[hsl(262,83%,58%)]', bg: 'bg-[hsl(262,83%,58%)]/10' },
                      { icon: FileEdit, label: 'Drafts', action: () => setActiveSection('drafts'), color: 'text-[hsl(25,95%,53%)]', bg: 'bg-[hsl(25,95%,53%)]/10' },
                      { icon: Users, label: 'Tasks', action: () => setActiveSection('tasks'), color: 'text-[hsl(340,82%,52%)]', bg: 'bg-[hsl(340,82%,52%)]/10' },
                    ].map((item, i) => (
                      <motion.button
                        key={item.label}
                        initial={{ opacity: 0, y: 16, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.12 + i * 0.04, type: 'spring', stiffness: 140 }}
                        onClick={item.action}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card/70 backdrop-blur-xl border border-border/40 hover:border-border hover:shadow-md hover:scale-[1.03] transition-all active:scale-95 group"
                      >
                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${item.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

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
                  transition={{ duration: 0.5, delay: 0.3, type: 'spring', stiffness: 100 }}
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