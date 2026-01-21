import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Briefcase, Building2, Plus, Loader2, Eye, Users, 
  CheckCircle2, ChevronRight, FileEdit, CreditCard, UserCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatCard } from '@/components/dashboard/StatCard';

import { PlanUsagePanel } from '@/components/employer/PlanUsagePanel';
import { JobDraftsSection } from '@/components/employer/JobDraftsSection';
import { SavedCandidatesSection } from '@/components/employer/SavedCandidatesSection';
import { VerificationBadge } from '@/components/employer/VerificationBadge';
import { ApplicantTabs } from '@/components/employer/ApplicantTabs';

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employer, setEmployer] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const handleSectionClick = (value: string) => {
    if (value === 'home') {
      setActiveSection(null);
    } else {
      setActiveSection(value);
    }
    setSidebarOpen(false);
  };

  const sidebarItems = [
    { icon: Briefcase, label: 'My Jobs', value: 'jobs', badge: stats.activeJobs },
    { icon: Users, label: 'Saved Candidates', value: 'candidates' },
    { icon: FileEdit, label: 'Drafts', value: 'drafts' },
    { icon: CreditCard, label: 'Subscription', value: 'plan' }
  ];

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-gray-900">Welcome to Hire for Job</h2>
            <p className="text-gray-500 mb-8">Sign in to access your employer dashboard</p>
            <Button onClick={() => navigate('/login')} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700" size="lg">
              Sign In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const completeness = employer?.profile_completeness || 0;

  // Render expanded section content
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'jobs':
        return (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-gray-900">All Jobs ({jobs.length})</h3>
                <Link to="/post-job">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-1" /> New
                  </Button>
                </Link>
              </div>
              {jobs.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="p-8 text-center">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 mb-4">No jobs posted yet</p>
                    <Link to="/post-job">
                      <Button className="bg-emerald-600 hover:bg-emerald-700">Post Your First Job</Button>
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
                        ? 'ring-2 ring-emerald-500 shadow-md' 
                        : 'hover:shadow-md border-gray-100'
                    }`}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-semibold truncate mb-2 text-gray-900">{job.title}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={job.is_active ? 'default' : 'secondary'} className={job.is_active ? 'bg-emerald-500' : ''}>
                          {job.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-sm text-gray-500">{job.applications_count} applicants</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="lg:col-span-2">
              {selectedJob ? (
                <Card className="shadow-sm border-0 bg-white">
                  <CardHeader className="border-b">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl text-gray-900">{selectedJob.title}</CardTitle>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {selectedJob.job_address || 'Location not set'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedJob.is_active ? 'default' : 'secondary'} className={selectedJob.is_active ? 'bg-emerald-500' : ''}>
                          {selectedJob.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Link to={`/jobs/${selectedJob.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <h4 className="font-semibold mb-4 flex items-center gap-2 text-gray-900">
                      <Users className="w-4 h-4" /> Applicants
                    </h4>
                    {employer && <ApplicantTabs jobId={selectedJob.id} employerId={employer.id} />}
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-sm border-0 bg-white">
                  <CardContent className="p-12 text-center">
                    <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                    <p className="text-gray-500 text-lg">Select a job to view applicants</p>
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
      <div className="min-h-screen bg-[#F4F6F9] flex">
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
          <DashboardHeader
            type="employer"
            userName={employer?.company_name || 'Your Company'}
            userTitle={employer?.industry}
            avatarUrl={profile.avatar_url}
            onMenuClick={() => setSidebarOpen(true)}
            onSignOut={signOut}
            messageCount={0}
            notificationCount={0}
          />

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
            {activeSection ? (
              // Section Content View
              <div className="max-w-6xl mx-auto">
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveSection(null)}
                  className="mb-4 text-gray-600 hover:text-gray-900"
                >
                  <ChevronRight className="w-4 h-4 rotate-180 mr-2" />
                  Back to Dashboard
                </Button>
                <Card className="bg-white shadow-sm border-0">
                  <CardContent className="p-6">
                    {renderSectionContent()}
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Dashboard Home View
              <div className="max-w-6xl mx-auto space-y-6">
                {/* Welcome Banner */}
                <Card className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white border-0 shadow-lg overflow-hidden">
                  <CardContent className="p-6 lg:p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h1 className="text-2xl lg:text-3xl font-bold">
                            {employer?.company_name || 'Your Company'}
                          </h1>
                          <VerificationBadge status={(employer?.verification_status || 'pending') as 'pending' | 'approved' | 'rejected'} />
                        </div>
                        <p className="text-emerald-100 text-lg">
                          {completeness < 100 
                            ? `Profile ${completeness}% complete. Complete it to boost visibility!`
                            : "Profile complete. Start finding the perfect candidates!"}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-4">
                          <Link to="/post-job">
                            <Button className="bg-white text-emerald-700 hover:bg-emerald-50">
                              <Plus className="w-4 h-4 mr-2" /> Post New Job
                            </Button>
                          </Link>
                          <Link to="/company-profile">
                            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                              Edit Company Profile
                            </Button>
                          </Link>
                        </div>
                      </div>
                      
                      {/* Profile Completeness Circle */}
                      <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                        <div className="relative w-20 h-20">
                          <svg className="w-20 h-20 -rotate-90">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                            <circle 
                              cx="40" cy="40" r="34" fill="none" 
                              stroke="white" strokeWidth="6"
                              strokeDasharray={`${completeness * 2.14} 214`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">{completeness}%</span>
                        </div>
                        <div>
                          <p className="font-semibold text-lg">Profile Score</p>
                          <p className="text-emerald-100 text-sm">
                            {completeness === 100 ? 'Excellent!' : 'Keep improving'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    icon={Briefcase}
                    label="Active Jobs"
                    value={stats.activeJobs}
                    iconColor="bg-emerald-500"
                    onClick={() => setActiveSection('jobs')}
                  />
                  <StatCard
                    icon={Eye}
                    label="Total Views"
                    value={stats.totalViews}
                    trend="+15%"
                    trendUp={true}
                    iconColor="bg-blue-500"
                  />
                  <StatCard
                    icon={Users}
                    label="Applicants"
                    value={stats.applicants}
                    trend="+23%"
                    trendUp={true}
                    iconColor="bg-purple-500"
                  />
                  <StatCard
                    icon={UserCheck}
                    label="Hired"
                    value={stats.hired}
                    iconColor="bg-amber-500"
                  />
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card 
                    className="bg-white shadow-sm border-0 cursor-pointer hover:shadow-md transition-all group"
                    onClick={() => setActiveSection('jobs')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <Briefcase className="w-6 h-6 text-emerald-600" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mt-4">Manage Jobs</h3>
                      <p className="text-sm text-gray-500 mt-1">View and manage all your job postings</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-white shadow-sm border-0 cursor-pointer hover:shadow-md transition-all group"
                    onClick={() => setActiveSection('candidates')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                          <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mt-4">Saved Candidates</h3>
                      <p className="text-sm text-gray-500 mt-1">View candidates you've bookmarked</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-white shadow-sm border-0 cursor-pointer hover:shadow-md transition-all group"
                    onClick={() => setActiveSection('plan')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                          <CreditCard className="w-6 h-6 text-blue-600" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mt-4">Subscription & Plan</h3>
                      <p className="text-sm text-gray-500 mt-1">Manage your subscription and limits</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Jobs Table */}
                <Card className="bg-white shadow-sm border-0">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg text-gray-900">Recent Job Postings</CardTitle>
                    <Link to="/post-job">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="w-4 h-4 mr-2" /> Post Job
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {jobs.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No jobs posted yet</p>
                        <Link to="/post-job">
                          <Button variant="link" className="text-emerald-600 mt-2">
                            Post your first job
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {jobs.slice(0, 5).map((job) => (
                          <div 
                            key={job.id} 
                            className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedJob(job);
                              setActiveSection('jobs');
                            }}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{job.title}</h4>
                                <p className="text-sm text-gray-500">{job.applications_count} applicants • {job.view_count || 0} views</p>
                              </div>
                            </div>
                            <Badge variant={job.is_active ? 'default' : 'secondary'} className={job.is_active ? 'bg-emerald-500' : ''}>
                              {job.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
    </EmailVerificationGuard>
  );
};

export default EmployerDashboard;
