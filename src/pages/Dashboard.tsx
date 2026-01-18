import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Users,
  Plus,
  MessageSquare,
  Clock,
  Building2,
  Settings,
  Eye,
  Calendar,
  AlertTriangle,
  ChevronRight,
  FileText,
  UserCheck,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Employer components
import { PlanUsagePanel } from '@/components/employer/PlanUsagePanel';
import { ProfileCompletenessBar } from '@/components/employer/ProfileCompletenessBar';
import { VerificationBadge } from '@/components/employer/VerificationBadge';
import { JobActiveToggle } from '@/components/employer/JobActiveToggle';
import { JobExpiryBadge } from '@/components/employer/JobExpiryBadge';
import { JobAnalyticsCard } from '@/components/employer/JobAnalyticsCard';
import { ApplicantTabs } from '@/components/employer/ApplicantTabs';
import { SavedCandidatesSection } from '@/components/employer/SavedCandidatesSection';
import { JobDraftsSection } from '@/components/employer/JobDraftsSection';
import { Bookmark, FileEdit } from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  reviewed: 'bg-primary/10 text-primary border-primary/30',
  shortlisted: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
  hired: 'bg-success/10 text-success border-success/30',
};

interface Job {
  id: string;
  title: string;
  status: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  view_count: number;
}

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Candidate state
  const [applications, setApplications] = useState<any[]>([]);
  const [candidateProfile, setCandidateProfile] = useState<any>(null);

  // Employer state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [employerProfile, setEmployerProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('jobs');

  const isCandidate = profile?.user_type === 'candidate';

  // Fetch data based on user type
  useEffect(() => {
    if (!user || !profile) return;

    const fetchData = async () => {
      setLoading(true);

      if (isCandidate) {
        // Fetch candidate profile
        const { data: candData } = await supabase
          .from('candidates')
          .select('*')
          .eq('profile_id', profile.id)
          .maybeSingle();
        setCandidateProfile(candData);

        if (candData) {
          // Fetch applications
          const { data: appsData } = await supabase
            .from('applications')
            .select(`
              *,
              jobs (
                id,
                title,
                salary_range,
                job_type,
                employers (
                  company_name
                )
              )
            `)
            .eq('candidate_id', candData.id)
            .order('created_at', { ascending: false });
          setApplications(appsData || []);
        }
      } else {
        // Fetch employer profile
        const { data: empData } = await supabase
          .from('employers')
          .select('*')
          .eq('profile_id', profile.id)
          .maybeSingle();
        setEmployerProfile(empData);

        if (empData) {
          // Fetch jobs with new fields
          const { data: jobsData } = await supabase
            .from('jobs')
            .select('id, title, status, is_active, expires_at, created_at, view_count')
            .eq('employer_id', empData.id)
            .order('created_at', { ascending: false });
          setJobs((jobsData || []) as Job[]);

          if (jobsData && jobsData.length > 0) {
            setSelectedJob(jobsData[0].id);
          }
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user, profile, isCandidate]);

  const handleJobToggle = (jobId: string, newState: boolean) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, is_active: newState } : job
    ));
  };

  const renewJob = async (jobId: string) => {
    try {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);
      
      const { error } = await supabase
        .from('jobs')
        .update({ expires_at: newExpiry.toISOString() })
        .eq('id', jobId);

      if (error) throw error;

      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, expires_at: newExpiry.toISOString() } : job
      ));
      toast.success('Job renewed for 30 days');
    } catch (error) {
      toast.error('Failed to renew job');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const canPostJobs = employerProfile?.verification_status === 'approved' && 
                      employerProfile?.profile_completeness >= 100 &&
                      employerProfile?.terms_accepted_at;

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="max-w-md shadow-lg border-0 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Welcome to Hire for Job</h2>
              <p className="text-muted-foreground mb-6">Please sign in to access your dashboard</p>
              <Button onClick={() => navigate('/login')} size="lg" className="w-full">
                Sign In
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!profile.profile_completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="max-w-md shadow-lg border-0 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Complete Your Profile</h2>
              <p className="text-muted-foreground mb-6">
                Finish setting up your profile to unlock all features
              </p>
              <Button onClick={() => navigate('/profile-setup')} size="lg" className="w-full">
                Complete Profile
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-secondary/50 via-background to-background">
        {/* Header */}
        <header className="bg-card/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/">
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 transition-colors">
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Back to Map</TooltipContent>
              </Tooltip>
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <span className="text-primary-foreground font-bold text-sm">HJ</span>
                </div>
                <span className="font-semibold text-lg hidden sm:inline">Hire for Job</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/messages">
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 transition-colors">
                      <MessageSquare className="w-5 h-5" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Messages</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/">
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 transition-colors">
                      <MapPin className="w-5 h-5" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Browse Map</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 md:py-8">
          {/* Welcome Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="mb-6 md:mb-8 shadow-lg border-0 bg-gradient-to-br from-card to-card/95 overflow-hidden">
              <CardContent className="p-5 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-4 ring-primary/5">
                        {isCandidate ? (
                          <Users className="w-7 h-7 md:w-8 md:h-8 text-primary" />
                        ) : (
                          <Building2 className="w-7 h-7 md:w-8 md:h-8 text-primary" />
                        )}
                      </div>
                      {!isCandidate && employerProfile?.verification_status === 'approved' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success rounded-full flex items-center justify-center ring-2 ring-card">
                          <UserCheck className="w-3 h-3 text-success-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Welcome, {profile.full_name}</h1>
                        {!isCandidate && employerProfile && (
                          <VerificationBadge 
                            status={employerProfile.verification_status || 'pending'} 
                            size="sm"
                            showLabel={false}
                          />
                        )}
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        {isCandidate
                          ? candidateProfile?.job_title || 'Job Seeker'
                          : employerProfile?.company_name || 'Employer'}
                      </p>
                    </div>
                  </div>

                  {!isCandidate && (
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Link to="/company-profile">
                        <Button variant="outline" size="sm" className="gap-2 rounded-xl hover:bg-secondary transition-colors">
                          <Settings className="w-4 h-4" />
                          <span className="hidden sm:inline">Edit Profile</span>
                        </Button>
                      </Link>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Link to="/post-job">
                              <Button 
                                disabled={!canPostJobs} 
                                size="sm" 
                                className="gap-2 rounded-xl shadow-md hover:shadow-lg transition-all"
                              >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Post a Job</span>
                              </Button>
                            </Link>
                          </div>
                        </TooltipTrigger>
                        {!canPostJobs && (
                          <TooltipContent className="max-w-xs">
                            Complete your profile & get verified to post jobs
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {loading ? (
            <div className="grid lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <Skeleton className="h-48 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
              </div>
              <div className="lg:col-span-3 space-y-4">
                <Skeleton className="h-12 w-96 rounded-xl" />
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-40 rounded-2xl" />
              </div>
            </div>
          ) : isCandidate ? (
            /* Candidate Dashboard */
            <motion.div 
              className="grid md:grid-cols-3 gap-6"
              variants={staggerChildren}
              initial="initial"
              animate="animate"
            >
              {/* Stats */}
              <motion.div variants={fadeInUp} className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="shadow-md border-0 hover:shadow-lg transition-shadow group cursor-default">
                  <CardContent className="p-5 text-center">
                    <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-3xl font-bold text-primary">{applications.length}</p>
                    <p className="text-sm text-muted-foreground mt-1">Applications</p>
                  </CardContent>
                </Card>
                <Card className="shadow-md border-0 hover:shadow-lg transition-shadow group cursor-default">
                  <CardContent className="p-5 text-center">
                    <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-warning/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Clock className="w-5 h-5 text-warning" />
                    </div>
                    <p className="text-3xl font-bold text-warning">
                      {applications.filter((a) => a.status === 'pending').length}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Pending</p>
                  </CardContent>
                </Card>
                <Card className="shadow-md border-0 hover:shadow-lg transition-shadow group cursor-default">
                  <CardContent className="p-5 text-center">
                    <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-success/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <UserCheck className="w-5 h-5 text-success" />
                    </div>
                    <p className="text-3xl font-bold text-success">
                      {applications.filter((a) => a.status === 'shortlisted').length}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Shortlisted</p>
                  </CardContent>
                </Card>
                <Card className="shadow-md border-0 hover:shadow-lg transition-shadow group cursor-default">
                  <CardContent className="p-5 text-center">
                    <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Trophy className="w-5 h-5 text-destructive" />
                    </div>
                    <p className="text-3xl font-bold text-destructive">
                      {applications.filter((a) => a.status === 'rejected').length}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Rejected</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Applications List */}
              <motion.div variants={fadeInUp} className="md:col-span-3">
                <Card className="shadow-lg border-0">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2.5 text-lg">
                          <div className="p-2 rounded-xl bg-primary/10">
                            <Briefcase className="w-5 h-5 text-primary" />
                          </div>
                          Your Applications
                        </CardTitle>
                        <CardDescription className="mt-1.5">Track the status of your job applications</CardDescription>
                      </div>
                      <Link to="/">
                        <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                          <MapPin className="w-4 h-4" />
                          Find Jobs
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {applications.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                          <Briefcase className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <p className="text-muted-foreground mb-4">You haven't applied to any jobs yet</p>
                        <Link to="/">
                          <Button className="gap-2 rounded-xl">
                            <MapPin className="w-4 h-4" />
                            Browse Jobs on Map
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <AnimatePresence>
                          {applications.map((app, index) => (
                            <motion.div
                              key={app.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="group p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all bg-card hover:bg-primary/[0.02] cursor-pointer"
                              onClick={() => navigate(`/jobs/${app.jobs?.id}`)}
                            >
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-medium group-hover:text-primary transition-colors">{app.jobs?.title}</h3>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    {app.jobs?.employers?.company_name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                    <Badge variant="secondary" className="rounded-lg">{app.jobs?.job_type}</Badge>
                                    <Badge className={`${statusColors[app.status]} rounded-lg border`}>{app.status}</Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
                                  <Clock className="w-4 h-4" />
                                  {formatDate(app.created_at)}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          ) : (
            /* Employer Dashboard */
            <div className="grid lg:grid-cols-4 gap-6">
              {/* Sidebar */}
              <motion.div 
                className="lg:col-span-1 space-y-5"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* Plan Usage Panel */}
                {employerProfile && (
                  <PlanUsagePanel employerId={employerProfile.id} />
                )}

                {/* Profile Completeness */}
                {employerProfile && employerProfile.profile_completeness < 100 && (
                  <Card className="shadow-md border-0 overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-warning to-warning/60" />
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-warning/10">
                          <AlertTriangle className="w-4 h-4 text-warning" />
                        </div>
                        Complete Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ProfileCompletenessBar 
                        completeness={employerProfile.profile_completeness || 0}
                        compact
                      />
                      <p className="text-xs text-muted-foreground mt-2 mb-3">
                        Complete your profile to unlock job posting
                      </p>
                      <Link to="/company-profile">
                        <Button variant="outline" size="sm" className="w-full rounded-xl gap-2">
                          <Settings className="w-4 h-4" />
                          Complete Profile
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Stats */}
                <Card className="shadow-md border-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm text-muted-foreground">Total Jobs</span>
                      <span className="font-semibold text-lg">{jobs.length}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm text-muted-foreground">Active Jobs</span>
                      <span className="font-semibold text-lg text-success">
                        {jobs.filter(j => j.is_active && j.status === 'open').length}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className="text-sm text-muted-foreground">Expiring Soon</span>
                      <span className="font-semibold text-lg text-warning">
                        {jobs.filter(j => {
                          const days = Math.ceil((new Date(j.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                          return days <= 7 && days > 0;
                        }).length}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Main Content */}
              <motion.div 
                className="lg:col-span-3 space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-4 w-full max-w-xl bg-muted/50 p-1 rounded-xl h-auto">
                    <TabsTrigger 
                      value="jobs" 
                      className="gap-2 py-2.5 rounded-lg data-[state=active]:shadow-md transition-all"
                    >
                      <Briefcase className="w-4 h-4" />
                      <span className="hidden sm:inline">My Jobs</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="drafts" 
                      className="gap-2 py-2.5 rounded-lg data-[state=active]:shadow-md transition-all"
                    >
                      <FileEdit className="w-4 h-4" />
                      <span className="hidden sm:inline">Drafts</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="applicants" 
                      className="gap-2 py-2.5 rounded-lg data-[state=active]:shadow-md transition-all"
                    >
                      <Users className="w-4 h-4" />
                      <span className="hidden sm:inline">Applicants</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="saved" 
                      className="gap-2 py-2.5 rounded-lg data-[state=active]:shadow-md transition-all"
                    >
                      <Bookmark className="w-4 h-4" />
                      <span className="hidden sm:inline">Saved</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Jobs Tab */}
                  <TabsContent value="jobs" className="mt-6">
                    {jobs.length === 0 ? (
                      <Card className="shadow-lg border-0">
                        <CardContent className="p-10 text-center">
                          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-muted/50 flex items-center justify-center">
                            <Briefcase className="w-10 h-10 text-muted-foreground/50" />
                          </div>
                          <h3 className="font-semibold text-lg mb-2">No Jobs Posted Yet</h3>
                          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                            Start attracting top talent by posting your first job listing
                          </p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-block">
                                <Link to="/post-job">
                                  <Button disabled={!canPostJobs} size="lg" className="gap-2 rounded-xl">
                                    <Plus className="w-4 h-4" />
                                    Post Your First Job
                                  </Button>
                                </Link>
                              </div>
                            </TooltipTrigger>
                            {!canPostJobs && (
                              <TooltipContent className="max-w-xs">
                                Complete your profile and get verified to post jobs
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        <AnimatePresence>
                          {jobs.map((job, index) => (
                            <motion.div
                              key={job.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <Card className="shadow-md border-0 hover:shadow-lg transition-all overflow-hidden group">
                                <CardContent className="p-5">
                                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                    {/* Job Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="font-semibold text-lg truncate">{job.title}</h3>
                                        <Badge 
                                          variant={job.status === 'open' ? 'default' : 'secondary'}
                                          className="rounded-lg"
                                        >
                                          {job.status}
                                        </Badge>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-lg">
                                          <Calendar className="w-4 h-4" />
                                          Posted {formatDate(job.created_at)}
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-lg">
                                          <Eye className="w-4 h-4" />
                                          {job.view_count || 0} views
                                        </span>
                                      </div>
                                      
                                      {/* Expiry Badge */}
                                      <div className="mt-3">
                                        <JobExpiryBadge 
                                          expiresAt={job.expires_at} 
                                          showRenewButton
                                          onRenew={() => renewJob(job.id)}
                                        />
                                      </div>
                                    </div>

                                    {/* Controls */}
                                    <div className="flex items-center gap-4 lg:flex-col lg:items-end">
                                      {employerProfile && (
                                        <JobActiveToggle
                                          jobId={job.id}
                                          employerId={employerProfile.id}
                                          isActive={job.is_active}
                                          onToggle={(newState) => handleJobToggle(job.id, newState)}
                                        />
                                      )}
                                      <div className="flex items-center gap-2">
                                        <Link to={`/jobs/${job.id}`}>
                                          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl hover:bg-primary/5 hover:border-primary/50 transition-colors">
                                            <Eye className="w-4 h-4" />
                                            View
                                          </Button>
                                        </Link>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          className="gap-1.5 rounded-xl hover:bg-primary/5 hover:border-primary/50 transition-colors"
                                          onClick={() => {
                                            setSelectedJob(job.id);
                                            setActiveTab('applicants');
                                          }}
                                        >
                                          <Users className="w-4 h-4" />
                                          Applicants
                                        </Button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Analytics */}
                                  <div className="mt-5 pt-5 border-t border-border/50">
                                    <JobAnalyticsCard jobId={job.id} compact />
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </TabsContent>

                  {/* Applicants Tab */}
                  <TabsContent value="applicants" className="mt-6">
                    {jobs.length === 0 ? (
                      <Card className="shadow-lg border-0">
                        <CardContent className="p-10 text-center">
                          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-muted/50 flex items-center justify-center">
                            <Users className="w-10 h-10 text-muted-foreground/50" />
                          </div>
                          <h3 className="font-semibold text-lg mb-2">No Applicants Yet</h3>
                          <p className="text-muted-foreground">Post a job to start receiving applicants</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {/* Job Selector */}
                        <Card className="shadow-md border-0">
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <span className="text-sm text-muted-foreground font-medium">Viewing applicants for:</span>
                              <Select value={selectedJob || ''} onValueChange={setSelectedJob}>
                                <SelectTrigger className="w-full sm:w-72 rounded-xl">
                                  <SelectValue placeholder="Select a job" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {jobs.map((job) => (
                                    <SelectItem key={job.id} value={job.id} className="rounded-lg">
                                      {job.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Applicant Tabs */}
                        {selectedJob && employerProfile && (
                          <ApplicantTabs 
                            jobId={selectedJob} 
                            employerId={employerProfile.id} 
                          />
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* Drafts Tab */}
                  <TabsContent value="drafts" className="mt-6">
                    {employerProfile && (
                      <JobDraftsSection employerId={employerProfile.id} />
                    )}
                  </TabsContent>

                  {/* Saved Candidates Tab */}
                  <TabsContent value="saved" className="mt-6">
                    {employerProfile && (
                      <SavedCandidatesSection employerId={employerProfile.id} />
                    )}
                  </TabsContent>
                </Tabs>
              </motion.div>
            </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
};

export default Dashboard;
