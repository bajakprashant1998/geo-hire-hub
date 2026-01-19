import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, MessageSquare, Briefcase, Bell, Building2, 
  Plus, Loader2, TrendingUp, Eye, Users, CheckCircle2,
  LayoutDashboard, LogOut, Menu, X, Home, Settings, FileEdit
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { motion } from 'framer-motion';

import { PlanUsagePanel } from '@/components/employer/PlanUsagePanel';
import { JobDraftsSection } from '@/components/employer/JobDraftsSection';
import { SavedCandidatesSection } from '@/components/employer/SavedCandidatesSection';
import { ProfileCompletenessBar } from '@/components/employer/ProfileCompletenessBar';
import { VerificationBadge } from '@/components/employer/VerificationBadge';
import { ApplicantTabs } from '@/components/employer/ApplicantTabs';

// Google-colored Quick Stats Card
const QuickStatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  colorClass,
  iconBg
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  trend?: string; 
  colorClass: string;
  iconBg: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="overflow-hidden group hover:shadow-google-hover transition-all duration-300 border border-border/50 bg-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className={`text-3xl font-bold font-heading tracking-tight ${colorClass}`}>{value}</p>
            {trend && (
              <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{trend}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${iconBg} transition-transform group-hover:scale-110 shadow-google`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// Welcome Banner for Employer
const WelcomeBanner = ({ 
  companyName, 
  completeness, 
  verificationStatus 
}: { 
  companyName: string; 
  completeness: number;
  verificationStatus: 'pending' | 'approved' | 'rejected';
}) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-google-lg p-6 sm:p-8 mb-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm font-medium">{greeting}</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">{companyName} 🏢</h1>
            <VerificationBadge status={verificationStatus} />
          </div>
          <p className="text-muted-foreground text-sm max-w-md">
            {completeness < 100 
              ? `Your profile is ${completeness}% complete. Complete it to start posting jobs!`
              : "Your company profile is complete! Start posting jobs and finding talent."}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Profile Score Circle */}
          <div className="bg-secondary rounded-2xl px-5 py-4 border border-border">
            <div className="flex items-center gap-4">
              <div className="relative">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
                  <circle 
                    cx="32" cy="32" r="26" fill="none" 
                    stroke="hsl(142, 76%, 36%)" strokeWidth="5"
                    strokeDasharray={`${completeness * 1.63} 163`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-google-green font-heading">
                  {completeness}%
                </span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground text-sm">Profile Score</p>
                <p className="text-muted-foreground text-xs">Company profile</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-google-green/5 rounded-full" />
      <div className="absolute right-16 top-8 w-8 h-8 bg-google-blue/10 rounded-full" />
      <div className="absolute right-8 top-20 w-12 h-12 bg-google-yellow/10 rounded-full" />
    </motion.div>
  );
};

// Job Card Component
const JobCard = ({ job, onSelect }: { job: any; onSelect: () => void }) => (
  <Card className="shadow-google hover:shadow-google-lg transition-all cursor-pointer" onClick={onSelect}>
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold truncate">{job.title}</h4>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {job.job_address?.split(',')[0] || 'Location not set'}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {job.view_count || 0} views
            </span>
            <span>•</span>
            <span>{job.applications_count || 0} applicants</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={job.is_active ? 'default' : 'secondary'}>
            {job.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {job.status === 'open' ? 'Open' : 'Closed'}
          </Badge>
        </div>
      </div>
    </CardContent>
  </Card>
);

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employer, setEmployer] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
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
      // Fetch employer profile
      const { data: employerData } = await supabase
        .from('employers')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      setEmployer(employerData);

      if (employerData) {
        // Fetch jobs with application counts
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

        // Calculate stats
        const activeJobs = jobsWithCounts.filter(j => j.is_active && j.status === 'open').length;
        const totalViews = jobsWithCounts.reduce((sum, j) => sum + (j.view_count || 0), 0);
        const totalApplicants = jobsWithCounts.reduce((sum, j) => sum + (j.applications_count || 0), 0);

        // Count hired
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 shadow-google-lg border border-border">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold font-heading mb-2">Welcome Back!</h2>
            <p className="text-muted-foreground mb-6">Please sign in to access your employer dashboard</p>
            <Button onClick={() => navigate('/login')} className="w-full rounded-xl" size="lg">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'jobs', icon: Briefcase, label: 'Jobs' },
    { id: 'candidates', icon: Users, label: 'Candidates' },
    { id: 'drafts', icon: FileEdit, label: 'Drafts' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <EmailVerificationGuard fallbackMessage="Please verify your email to access your employer dashboard.">
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-google">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left */}
              <div className="flex items-center gap-3">
                <Link to="/">
                  <Button variant="ghost" size="icon" className="rounded-xl hover:bg-secondary">
                    <Home className="w-5 h-5" />
                  </Button>
                </Link>
                <div className="hidden sm:flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-google-green rounded-xl flex items-center justify-center shadow-google">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-lg font-heading">Hire for Job</span>
                </div>
              </div>

              {/* Center - Desktop Nav */}
              <nav className="hidden lg:flex items-center bg-secondary rounded-full p-1 border border-border">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeTab === item.id 
                        ? 'bg-google-green text-white shadow-google' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </nav>

              {/* Right */}
              <div className="flex items-center gap-2">
                <Link to="/post-job">
                  <Button size="sm" className="rounded-xl bg-google-green hover:bg-google-green/90 shadow-google">
                    <Plus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Post Job</span>
                  </Button>
                </Link>
                <Link to="/messages">
                  <Button variant="ghost" size="icon" className="rounded-xl relative hover:bg-secondary">
                    <MessageSquare className="w-5 h-5" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="rounded-xl lg:hidden hover:bg-secondary" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
                <div className="hidden sm:flex items-center gap-3 ml-2 pl-3 border-l border-border">
                  <Avatar className="w-9 h-9 border-2 border-google-green/20">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-google-green text-white text-sm font-medium">
                      {employer?.company_name?.charAt(0) || 'E'}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile Nav */}
            {mobileMenuOpen && (
              <motion.nav 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden pt-3 pb-2 mt-3 border-t border-border"
              >
                <div className="grid grid-cols-5 gap-1">
                  {navItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                      className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl text-xs font-medium transition-all ${
                        activeTab === item.id 
                          ? 'bg-google-green text-white' 
                          : 'text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </motion.nav>
            )}
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Welcome Banner */}
          <WelcomeBanner 
            companyName={employer?.company_name || 'Your Company'} 
            completeness={employer?.profile_completeness || 0}
            verificationStatus={(employer?.verification_status || 'pending') as 'pending' | 'approved' | 'rejected'}
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <QuickStatCard 
              icon={Briefcase} 
              label="Active Jobs" 
              value={stats.activeJobs} 
              colorClass="text-google-blue"
              iconBg="bg-google-blue"
            />
            <QuickStatCard 
              icon={Eye} 
              label="Total Views" 
              value={stats.totalViews}
              trend="+15% this week"
              colorClass="text-google-red"
              iconBg="bg-google-red"
            />
            <QuickStatCard 
              icon={Users} 
              label="Applicants" 
              value={stats.applicants}
              colorClass="text-google-yellow"
              iconBg="bg-google-yellow"
            />
            <QuickStatCard 
              icon={CheckCircle2} 
              label="Hired" 
              value={stats.hired}
              colorClass="text-google-green"
              iconBg="bg-google-green"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Link to="/post-job">
              <Button className="rounded-xl bg-google-green hover:bg-google-green/90 shadow-google">
                <Plus className="w-4 h-4 mr-2" /> Post New Job
              </Button>
            </Link>
            <Link to="/company-profile">
              <Button variant="outline" className="rounded-xl border-border hover:bg-secondary hover:border-google-green/30">
                <Building2 className="w-4 h-4 mr-2" /> Edit Company Profile
              </Button>
            </Link>
            <Link to="/plans">
              <Button variant="outline" className="rounded-xl border-border hover:bg-secondary">
                <TrendingUp className="w-4 h-4 mr-2" /> View Plans
              </Button>
            </Link>
          </div>

          {/* Tab Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 space-y-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="grid lg:grid-cols-3 gap-6"
              >
                <div className="lg:col-span-1 space-y-6">
                  {employer && <PlanUsagePanel employerId={employer.id} />}
                  
                  {/* Profile Completeness */}
                  <Card className="shadow-google">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        Company Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ProfileCompletenessBar 
                        completeness={employer?.profile_completeness || 0} 
                      />
                      <Link to="/company-profile" className="block mt-4">
                        <Button variant="outline" size="sm" className="w-full rounded-lg">
                          Complete Profile
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  {/* Recent Jobs */}
                  <Card className="shadow-google">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-primary" />
                          Your Jobs
                        </CardTitle>
                        <Link to="/post-job">
                          <Button size="sm" variant="ghost" className="rounded-lg">
                            <Plus className="w-4 h-4 mr-1" /> New
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {jobs.length === 0 ? (
                        <div className="text-center py-8">
                          <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                          <p className="text-muted-foreground mb-2">No jobs posted yet</p>
                          <Link to="/post-job">
                            <Button size="sm" className="rounded-lg">Post Your First Job</Button>
                          </Link>
                        </div>
                      ) : (
                        jobs.slice(0, 3).map((job) => (
                          <JobCard 
                            key={job.id} 
                            job={job} 
                            onSelect={() => {
                              setSelectedJob(job);
                              setActiveTab('jobs');
                            }} 
                          />
                        ))
                      )}
                      {jobs.length > 3 && (
                        <Button 
                          variant="ghost" 
                          className="w-full rounded-lg"
                          onClick={() => setActiveTab('jobs')}
                        >
                          View All Jobs ({jobs.length})
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {/* Saved Candidates Preview */}
                  {employer && <SavedCandidatesSection employerId={employer.id} />}
                </div>
              </motion.div>
            </TabsContent>

            {/* Jobs Tab */}
            <TabsContent value="jobs" className="mt-0 space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Jobs List */}
                <div className="lg:col-span-1 space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">All Jobs ({jobs.length})</h3>
                    <Link to="/post-job">
                      <Button size="sm" className="rounded-lg">
                        <Plus className="w-4 h-4 mr-1" /> New
                      </Button>
                    </Link>
                  </div>
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedJob?.id === job.id 
                          ? 'border-google-green bg-google-green/5 shadow-google' 
                          : 'border-border hover:border-google-green/30 hover:bg-secondary/50'
                      }`}
                    >
                      <h4 className="font-medium truncate">{job.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Badge variant={job.is_active ? 'default' : 'secondary'} className="text-xs">
                          {job.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <span>{job.applications_count} applicants</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Job Details & Applicants */}
                <div className="lg:col-span-2">
                  {selectedJob ? (
                    <Card className="shadow-google">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{selectedJob.title}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {selectedJob.job_address || 'Location not set'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={selectedJob.is_active ? 'default' : 'secondary'}>
                              {selectedJob.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Link to={`/jobs/${selectedJob.id}`}>
                              <Button variant="outline" size="sm" className="rounded-lg">
                                View
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <h4 className="font-medium mb-4">Applicants</h4>
                        {employer && (
                          <ApplicantTabs jobId={selectedJob.id} employerId={employer.id} />
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="shadow-google">
                      <CardContent className="p-8 text-center">
                        <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">Select a job to view applicants</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Candidates Tab */}
            <TabsContent value="candidates" className="mt-0">
              {employer && <SavedCandidatesSection employerId={employer.id} />}
            </TabsContent>

            {/* Drafts Tab */}
            <TabsContent value="drafts" className="mt-0">
              {employer && <JobDraftsSection employerId={employer.id} />}
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="mt-0 space-y-6">
              <Card className="shadow-google">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Company Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <Link to="/company-profile">
                      <Button variant="outline" className="w-full justify-start rounded-xl">
                        <Building2 className="w-4 h-4 mr-3" />
                        Edit Company Profile
                      </Button>
                    </Link>
                    <Link to="/plans">
                      <Button variant="outline" className="w-full justify-start rounded-xl">
                        <TrendingUp className="w-4 h-4 mr-3" />
                        Manage Subscription
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {employer && (
                <Card className="shadow-google">
                  <CardHeader>
                    <CardTitle className="text-base">Plan & Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PlanUsagePanel employerId={employer.id} />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </EmailVerificationGuard>
  );
};

export default EmployerDashboard;
