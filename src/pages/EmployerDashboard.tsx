import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  MapPin, MessageSquare, Briefcase, Building2, 
  Plus, Loader2, TrendingUp, Eye, Users, CheckCircle2,
  LogOut, Menu, X, Home, ChevronRight, Settings,
  ArrowUpRight, FileEdit, BarChart3, UserCheck, Clock,
  Target, Sparkles, Shield, CreditCard
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { motion, AnimatePresence } from 'framer-motion';

import { PlanUsagePanel } from '@/components/employer/PlanUsagePanel';
import { JobDraftsSection } from '@/components/employer/JobDraftsSection';
import { SavedCandidatesSection } from '@/components/employer/SavedCandidatesSection';
import { VerificationBadge } from '@/components/employer/VerificationBadge';
import { ApplicantTabs } from '@/components/employer/ApplicantTabs';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } }
};

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employer, setEmployer] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalViews: 0,
    applicants: 0,
    hired: 0
  });

  useEffect(() => {
    if (!user || !profile) return;
    if (profile.user_type !== 'employer') {
      navigate('/candidate-dashboard');
      return;
    }
    fetchEmployerData();
  }, [user, profile]);

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
        const totalApplicants = jobsWithCounts.reduce((sum, j) => sum + (j.applications_count || 0), 0);

        const { count: hiredCount } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'hired')
          .in('job_id', jobsWithCounts.map(j => j.id));

        setStats({
          activeJobs,
          totalViews,
          applicants: totalApplicants,
          hired: hiredCount || 0
        });
      }
    } catch (error) {
      console.error('Error fetching employer data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500/5 via-background to-secondary flex items-center justify-center p-4">
        <motion.div {...fadeInUp}>
          <Card className="w-full max-w-md border-0 shadow-2xl bg-card/80 backdrop-blur-xl">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/25">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Welcome to Hire for Job</h2>
              <p className="text-muted-foreground mb-8">Sign in to access your employer dashboard</p>
              <Button onClick={() => navigate('/login')} className="w-full h-12 rounded-2xl text-base font-semibold bg-emerald-600 hover:bg-emerald-700" size="lg">
                Sign In to Continue
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500/5 via-background to-secondary flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
          <p className="text-muted-foreground font-medium">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const completeness = employer?.profile_completeness || 0;

  // Render expanded section content
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'jobs':
        return (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">All Jobs ({jobs.length})</h3>
                <Link to="/post-job">
                  <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-1" /> New
                  </Button>
                </Link>
              </div>
              {jobs.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground mb-4">No jobs posted yet</p>
                    <Link to="/post-job">
                      <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700">Post Your First Job</Button>
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
                        ? 'ring-2 ring-emerald-500 shadow-lg' 
                        : 'hover:shadow-md border-border/50'
                    }`}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-semibold truncate mb-2">{job.title}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={job.is_active ? 'default' : 'secondary'} className={job.is_active ? 'bg-emerald-500' : ''}>
                          {job.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{job.applications_count} applicants</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="lg:col-span-2">
              {selectedJob ? (
                <Card className="shadow-lg border-0">
                  <CardHeader className="border-b">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{selectedJob.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {selectedJob.job_address || 'Location not set'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedJob.is_active ? 'default' : 'secondary'} className={selectedJob.is_active ? 'bg-emerald-500' : ''}>
                          {selectedJob.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Link to={`/jobs/${selectedJob.id}`}>
                          <Button variant="outline" size="sm" className="rounded-lg">View</Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Applicants
                    </h4>
                    {employer && <ApplicantTabs jobId={selectedJob.id} employerId={employer.id} />}
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-lg border-0">
                  <CardContent className="p-12 text-center">
                    <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
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
      default:
        return null;
    }
  };

  return (
    <EmailVerificationGuard fallbackMessage="Please verify your email to access your employer dashboard.">
      <div className="min-h-screen bg-gradient-to-br from-emerald-500/5 via-background to-secondary/30">
        {/* Minimal Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg hidden sm:block">Hire for Job</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/post-job">
                <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 hidden sm:flex">
                  <Plus className="w-4 h-4 mr-2" /> Post Job
                </Button>
                <Button size="icon" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 sm:hidden">
                  <Plus className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/messages">
                <Button variant="ghost" size="icon" className="rounded-xl relative">
                  <MessageSquare className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="rounded-xl md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-border/50 ml-2">
                <Avatar className="w-9 h-9 ring-2 ring-emerald-500/20 hover:ring-emerald-500/40 transition-all cursor-pointer">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-semibold">
                    {employer?.company_name?.charAt(0) || 'E'}
                  </AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="icon" onClick={signOut} className="rounded-xl text-muted-foreground hover:text-destructive">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl"
              >
                <div className="container mx-auto px-4 py-4 space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-emerald-500 text-white">{employer?.company_name?.charAt(0) || 'E'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{employer?.company_name || 'Your Company'}</p>
                      <VerificationBadge status={(employer?.verification_status || 'pending') as 'pending' | 'approved' | 'rejected'} />
                    </div>
                  </div>
                  <Button variant="ghost" onClick={signOut} className="w-full justify-start text-destructive">
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <AnimatePresence mode="wait">
            {activeSection ? (
              // Expanded Section View
              <motion.div
                key="section"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveSection(null)}
                  className="rounded-xl gap-2 mb-4"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Back to Dashboard
                </Button>
                {renderSectionContent()}
              </motion.div>
            ) : (
              // Dashboard Grid View
              <motion.div
                key="dashboard"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-6"
              >
                {/* Hero Welcome Section */}
                <motion.div variants={fadeInUp} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 p-6 sm:p-8 text-white">
                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-3">
                      <p className="text-white/80 font-medium">{greeting}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl sm:text-4xl font-bold">{employer?.company_name || 'Your Company'}</h1>
                        <VerificationBadge status={(employer?.verification_status || 'pending') as 'pending' | 'approved' | 'rejected'} />
                      </div>
                      <p className="text-white/80 max-w-md">
                        {completeness < 100 
                          ? `Profile ${completeness}% complete. Complete it to start posting jobs!`
                          : "Profile complete. Start finding the perfect candidates!"}
                      </p>
                      <div className="flex flex-wrap gap-3 pt-2">
                        <Link to="/post-job">
                          <Button className="bg-white text-emerald-600 hover:bg-white/90 rounded-xl shadow-lg font-semibold">
                            <Plus className="w-4 h-4 mr-2" /> Post New Job
                          </Button>
                        </Link>
                        <Link to="/company-profile">
                          <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl">
                            <Building2 className="w-4 h-4 mr-2" /> Edit Profile
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Profile Score */}
                    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                      <div className="relative w-20 h-20">
                        <svg className="w-20 h-20 -rotate-90">
                          <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                          <circle 
                            cx="40" cy="40" r="34" fill="none" 
                            stroke="white" strokeWidth="6"
                            strokeDasharray={`${completeness * 2.14} 214`}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">{completeness}%</span>
                      </div>
                      <div>
                        <p className="font-semibold text-lg">Profile Score</p>
                        <p className="text-white/70 text-sm">
                          {completeness === 100 ? 'Verified!' : 'Complete to verify'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                  <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
                </motion.div>

                {/* Bento Grid Stats */}
                <motion.div variants={fadeInUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { icon: Briefcase, label: 'Active Jobs', value: stats.activeJobs, color: 'from-blue-500 to-blue-600' },
                    { icon: Eye, label: 'Total Views', value: stats.totalViews, color: 'from-rose-500 to-rose-600', trend: '+15%' },
                    { icon: Users, label: 'Applicants', value: stats.applicants, color: 'from-amber-500 to-amber-600' },
                    { icon: CheckCircle2, label: 'Hired', value: stats.hired, color: 'from-emerald-500 to-emerald-600' }
                  ].map((stat, i) => (
                    <Card key={i} className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer bg-card/80 backdrop-blur-sm">
                      <CardContent className="p-5">
                        <div className={`absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br ${stat.color} rounded-full opacity-10 group-hover:opacity-20 transition-opacity`} />
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 shadow-lg`}>
                          <stat.icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-3xl font-bold mb-1">{stat.value}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                          {stat.trend && (
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
                              <TrendingUp className="w-3 h-3" /> {stat.trend}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>

                {/* Bento Action Grid */}
                <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Job Management */}
                  <Card 
                    className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card/80 backdrop-blur-sm lg:col-span-2"
                    onClick={() => setActiveSection('jobs')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                          <Briefcase className="w-6 h-6 text-white" />
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Manage Jobs</h3>
                      <p className="text-muted-foreground mb-4">View all your job postings, track applicants, and manage hiring pipeline</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Target className="w-4 h-4" /> {stats.activeJobs} active
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="w-4 h-4" /> {stats.applicants} applicants
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Post Job CTA */}
                  <Link to="/post-job" className="block">
                    <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white h-full">
                      <CardContent className="p-6 h-full flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Plus className="w-6 h-6 text-white" />
                          </div>
                          <ArrowUpRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Post New Job</h3>
                        <p className="text-white/80 text-sm flex-1">Create a new job posting and find the perfect candidates</p>
                      </CardContent>
                    </Card>
                  </Link>

                  {/* Saved Candidates */}
                  <Card 
                    className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card/80 backdrop-blur-sm"
                    onClick={() => setActiveSection('candidates')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                          <UserCheck className="w-6 h-6 text-white" />
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Saved Candidates</h3>
                      <p className="text-muted-foreground text-sm">View and manage your saved candidate profiles</p>
                    </CardContent>
                  </Card>

                  {/* Job Drafts */}
                  <Card 
                    className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card/80 backdrop-blur-sm"
                    onClick={() => setActiveSection('drafts')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                          <FileEdit className="w-6 h-6 text-white" />
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Drafts</h3>
                      <p className="text-muted-foreground text-sm">Continue editing your saved job drafts</p>
                    </CardContent>
                  </Card>

                  {/* Plan & Usage */}
                  <Card 
                    className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card/80 backdrop-blur-sm"
                    onClick={() => setActiveSection('plan')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                          <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Plan & Usage</h3>
                      <p className="text-muted-foreground text-sm">View your subscription and job posting limits</p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Recent Jobs Preview */}
                {jobs.length > 0 && (
                  <motion.div variants={fadeInUp}>
                    <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-emerald-600" />
                            Recent Jobs
                          </CardTitle>
                          <Button variant="ghost" size="sm" onClick={() => setActiveSection('jobs')} className="rounded-xl">
                            View All <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {jobs.slice(0, 3).map((job) => (
                            <Card 
                              key={job.id} 
                              className="cursor-pointer hover:shadow-md transition-all border-border/50"
                              onClick={() => { setSelectedJob(job); setActiveSection('jobs'); }}
                            >
                              <CardContent className="p-4">
                                <h4 className="font-semibold truncate mb-2">{job.title}</h4>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span className="truncate">{job.job_address?.split(',')[0] || 'No location'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <Badge variant={job.is_active ? 'default' : 'secondary'} className={job.is_active ? 'bg-emerald-500' : ''}>
                                    {job.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">{job.applications_count} applicants</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Bottom Row */}
                <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company Profile */}
                  <Link to="/company-profile">
                    <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card/80 backdrop-blur-sm h-full">
                      <CardContent className="p-6 flex items-center gap-5 h-full">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg flex-shrink-0">
                          <Building2 className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold mb-1">Company Profile</h3>
                          <p className="text-muted-foreground text-sm">Update company info, logo, and verification documents</p>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 transition-colors flex-shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>

                  {/* Plans */}
                  <Link to="/plans">
                    <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card/80 backdrop-blur-sm h-full">
                      <CardContent className="p-6 flex items-center gap-5 h-full">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg flex-shrink-0">
                          <CreditCard className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold mb-1">Upgrade Plan</h3>
                          <p className="text-muted-foreground text-sm">Unlock more features and job posting slots</p>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 transition-colors flex-shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </EmailVerificationGuard>
  );
};

export default EmployerDashboard;
