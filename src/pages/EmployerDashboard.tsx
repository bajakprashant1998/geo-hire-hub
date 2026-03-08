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
  Sparkles, Bell, Filter, Search, Clock, FileText, FlaskConical, ClipboardCheck,
  Database, MessageCircle
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
import { RecentActivityFeed } from '@/components/employer/RecentActivityFeed';
import { HiringPipeline } from '@/components/employer/HiringPipeline';
import { PendingTasksWidget } from '@/components/dashboard/PendingTasksWidget';
import { AIScreeningPanel } from '@/components/employer/AIScreeningPanel';
import { SkillAssessmentManager } from '@/components/employer/SkillAssessmentManager';
import { JDOptimizer } from '@/components/employer/JDOptimizer';
import { SpotlightStories } from '@/components/employer/SpotlightStories';
import { OfferLetterGenerator } from '@/components/employer/OfferLetterGenerator';
import { CandidateComparisonBoard } from '@/components/employer/CandidateComparisonBoard';
import { InterviewFeedbackForms } from '@/components/employer/InterviewFeedbackForms';
import { TalentPoolCRM } from '@/components/employer/TalentPoolCRM';
import { JobABTesting } from '@/components/employer/JobABTesting';
import { TeamCollaborationNotes } from '@/components/employer/TeamCollaborationNotes';
import { AccessibilityScoreChecker } from '@/components/employer/AccessibilityScoreChecker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Brain } from 'lucide-react';

const AIScreeningWithJobSelector = ({ jobs }: { jobs: any[] }) => {
  const [selectedJobId, setSelectedJobId] = useState('');
  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Brain className="w-5 h-5 text-primary" />
        <Select value={selectedJobId} onValueChange={setSelectedJobId}>
          <SelectTrigger className="w-full max-w-md rounded-xl">
            <SelectValue placeholder="Select a job to screen applicants" />
          </SelectTrigger>
          <SelectContent>
            {jobs.filter(j => j.is_active).map(j => (
              <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedJobId ? (
        <AIScreeningPanel jobId={selectedJobId} jobTitle={selectedJob?.title || ''} />
      ) : (
        <div className="text-center p-8 text-muted-foreground border rounded-xl border-dashed">
          <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Select a job above to run AI screening on its applicants</p>
        </div>
      )}
    </div>
  );
};

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
    const loadingTimeout = setTimeout(() => {
      setDataLoading(false);
      toast.error('Dashboard data is taking too long. Some info may be missing.');
    }, 10000);
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
          .in('status', ['scheduled', 'confirmed', 'requested']);

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
      toast.error('Failed to load some dashboard data. Please refresh.');
    } finally {
      clearTimeout(loadingTimeout);
      setDataLoading(false);
    }
  };

  const handleSectionClick = (value: string) => {
    if (value === 'map') { navigate('/'); return; }
    if (value === 'chat') {
      setActiveSection('chat');
    } else if (value === 'company') {
      setActiveSection('company');
    } else if (value === 'upgrade-plan') {
      navigate('/plans');
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
    { icon: Sparkles, label: 'Accessibility Check', value: 'accessibility-check' },
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
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/80 flex">
        <aside className="hidden lg:block w-[264px] bg-card/95 border-r border-border/30 animate-pulse">
          <div className="p-4 space-y-4">
            <div className="h-8 bg-muted/60 rounded-xl w-32" />
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-9 bg-muted/40 rounded-xl" />
              ))}
            </div>
          </div>
        </aside>
        <div className="flex-1">
          <div className="h-16 bg-card/80 border-b border-border/30 animate-pulse px-6 flex items-center gap-4">
            <div className="h-6 bg-muted/50 rounded-lg w-48" />
            <div className="flex-1" />
            <div className="h-8 w-8 bg-muted/50 rounded-full" />
          </div>
          <div className="p-6 space-y-4 max-w-6xl mx-auto animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-card/60 border border-border/30 rounded-2xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 h-64 bg-card/60 border border-border/30 rounded-2xl" />
              <div className="h-64 bg-card/60 border border-border/30 rounded-2xl" />
            </div>
          </div>
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
      case 'ai-screening':
        return employer && <AIScreeningWithJobSelector jobs={jobs} />;
      case 'jd-optimizer':
        return <JDOptimizer />;
      case 'assessments':
        return employer && <SkillAssessmentManager employerId={employer.id} />;
      case 'spotlight':
        return employer && <SpotlightStories employerId={employer.id} companyName={employer.company_name} isOwner />;
      case 'offer-letters':
        return employer && <OfferLetterGenerator employerId={employer.id} companyName={employer.company_name} />;
      case 'compare-candidates':
        return employer && <CandidateComparisonBoard employerId={employer.id} />;
      case 'interview-feedback':
        return employer && <InterviewFeedbackForms employerId={employer.id} />;
      case 'talent-pool':
        return employer && <TalentPoolCRM employerId={employer.id} />;
      case 'ab-testing':
        return employer && <JobABTesting employerId={employer.id} />;
      case 'team-notes':
        return employer && <TeamCollaborationNotes employerId={employer.id} />;
      case 'accessibility-check':
        return <AccessibilityScoreChecker />;
      case 'post-job':
        return <PostJob embedded />;
      default:
        return null;
    }
  };
  return (
    <EmailVerificationGuard fallbackMessage="Please verify your email to access your employer dashboard.">
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/80 flex overflow-x-hidden">
        {user && <OnboardingTour userId={user.id} type="employer" />}
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

        <div className="flex-1 flex flex-col min-h-screen lg:ml-0 overflow-x-hidden">
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
                {activeSection === 'candidates' || activeSection === 'post-job' ? (
                  renderSectionContent()
                ) : (
                  <div className="bg-card/70 backdrop-blur-xl shadow-lg border border-border/40 rounded-2xl overflow-hidden">
                    <div className="p-3 sm:p-4 md:p-6">
                      {renderSectionContent()}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
                <PlatformNotificationBanner userType="employer" />

                {employer && (
                  <EmployerProfileCompletionPrompts employer={employer} jobCount={jobs.length} />
                )}

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
                  {/* Row 1: Stat Cards */}
                  <div className="col-span-1">
                    <DashboardStatCard icon={Briefcase} label="Active Jobs" value={stats.activeJobs} subtitle="currently open" accentColor="blue" onClick={() => setActiveSection('jobs')} delay={0} />
                  </div>
                  <div className="col-span-1">
                    <DashboardStatCard icon={Users} label="Applications" value={stats.totalApplications} subtitle="across all jobs" accentColor="amber" onClick={() => setActiveSection('jobs')} delay={1} />
                  </div>
                  <div className="col-span-1">
                    <DashboardStatCard icon={Calendar} label="Interviews" value={stats.scheduledInterviews} subtitle="upcoming" accentColor="green" onClick={() => setActiveSection('interviews')} delay={2} />
                  </div>
                  <div className="col-span-1">
                    <DashboardStatCard icon={Eye} label="Profile Views" value={stats.profileViews} subtitle="all time" accentColor="purple" delay={3} />
                  </div>

                  {/* Hero Welcome Card (desktop only) */}
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
                        {employer?.company_name || 'Your Company'} 👋
                      </h3>
                      <p className="text-primary-foreground/70 text-sm mt-1.5 leading-snug">
                        {stats.activeJobs > 0
                          ? `You have ${stats.activeJobs} active job${stats.activeJobs > 1 ? 's' : ''} and ${stats.totalApplications} application${stats.totalApplications !== 1 ? 's' : ''} waiting.`
                          : 'Post your first job to start receiving applications from top talent.'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="relative z-10 mt-3 w-fit rounded-xl text-xs font-semibold shadow-lg"
                      onClick={() => setActiveSection('post-job')}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Post a Job
                    </Button>
                  </motion.div>
                </div>

                {/* Quick Actions Grid */}
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
                    {[
                      { icon: Plus, label: 'Create Job', onClick: () => setActiveSection('post-job'), color: 'text-primary', bg: 'bg-primary/10' },
                      { icon: Briefcase, label: 'My Jobs', onClick: () => setActiveSection('jobs'), color: 'text-[hsl(217,89%,61%)]', bg: 'bg-[hsl(217,89%,61%)]/10' },
                      { icon: Filter, label: 'Find Talent', onClick: () => setActiveSection('candidates'), color: 'text-success', bg: 'bg-success/10' },
                      { icon: MessageSquare, label: 'Messages', onClick: () => setActiveSection('chat'), color: 'text-[hsl(262,83%,58%)]', bg: 'bg-[hsl(262,83%,58%)]/10' },
                      { icon: Calendar, label: 'Interviews', onClick: () => setActiveSection('interviews'), color: 'text-warning-foreground', bg: 'bg-warning/10' },
                      { icon: BarChart3, label: 'Analytics', onClick: () => setActiveSection('analytics'), color: 'text-primary', bg: 'bg-primary/10' },
                      { icon: FileEdit, label: 'Drafts', onClick: () => setActiveSection('drafts'), color: 'text-success', bg: 'bg-success/10' },
                      { icon: Users, label: 'Tasks', onClick: () => setActiveSection('tasks'), color: 'text-[hsl(262,83%,58%)]', bg: 'bg-[hsl(262,83%,58%)]/10' },
                    ].map((action, i) => (
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

                {/* Active Jobs + Hiring Pipeline — Glassmorphism bento */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-2 relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl overflow-hidden"
                  >
                    <div className="absolute -top-12 -left-12 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 dark:ring-white/5 pointer-events-none" />
                    <div className="relative z-10 p-1">
                      {employer && (
                        <ActiveJobsTable
                          employerId={employer.id}
                          onManageJobs={() => setActiveSection('jobs')}
                        />
                      )}
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl overflow-hidden"
                  >
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-success/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 dark:ring-white/5 pointer-events-none" />
                    <div className="relative z-10 p-4 sm:p-5">
                      {employer && <HiringPipeline employerId={employer.id} />}
                    </div>
                  </motion.div>
                </div>

                {/* Pending Tasks + Recent Activity */}
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
                      {employer && (
                        <PendingTasksWidget
                          type="employer"
                          employerId={employer.id}
                          onViewAll={() => setActiveSection('tasks')}
                        />
                      )}
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="lg:col-span-2 relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl overflow-hidden"
                  >
                    <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 dark:ring-white/5 pointer-events-none" />
                    <div className="relative z-10 p-4 sm:p-5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</p>
                      {employer && profile && <RecentActivityFeed employerId={employer.id} profileId={profile.id} />}
                    </div>
                  </motion.div>
                </div>

                {/* Interviews Card */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  className="relative rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl overflow-hidden"
                >
                  <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-[hsl(262,83%,58%)]/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 dark:ring-white/5 pointer-events-none" />
                  <div className="relative z-10 p-1">
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

        <DashboardBottomNav type="employer" activeItem={activeSection} onItemClick={handleSectionClick} />
      </div>
    </EmailVerificationGuard>
  );
};

export default EmployerDashboard;