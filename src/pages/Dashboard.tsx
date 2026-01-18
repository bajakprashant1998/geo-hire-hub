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
  ToggleLeft,
  Calendar,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Employer components
import { PlanUsagePanel } from '@/components/employer/PlanUsagePanel';
import { ProfileCompletenessBar } from '@/components/employer/ProfileCompletenessBar';
import { VerificationBadge } from '@/components/employer/VerificationBadge';
import { JobActiveToggle } from '@/components/employer/JobActiveToggle';
import { JobExpiryBadge } from '@/components/employer/JobExpiryBadge';
import { JobAnalyticsCard } from '@/components/employer/JobAnalyticsCard';
import { ApplicantTabs } from '@/components/employer/ApplicantTabs';

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning-foreground',
  reviewed: 'bg-primary/10 text-primary',
  shortlisted: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  hired: 'bg-success/10 text-success',
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
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">Please log in to view your dashboard</p>
            <Button onClick={() => navigate('/login')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile.profile_completed) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Complete Your Profile</h2>
            <p className="text-muted-foreground mb-4">
              Finish setting up your profile to access all features
            </p>
            <Button onClick={() => navigate('/profile-setup')}>Complete Profile</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">GJ</span>
              </div>
              <span className="font-semibold hidden sm:inline">GeoJobs Dashboard</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/messages">
              <Button variant="ghost" size="icon">
                <MessageSquare className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="icon">
                <MapPin className="w-5 h-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Card */}
        <Card className="mb-8 shadow-google">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  {isCandidate ? (
                    <Users className="w-7 h-7 text-primary" />
                  ) : (
                    <Building2 className="w-7 h-7 text-primary" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold">Welcome, {profile.full_name}</h1>
                    {!isCandidate && employerProfile && (
                      <VerificationBadge 
                        status={employerProfile.verification_status || 'pending'} 
                        size="sm"
                        showLabel={false}
                      />
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    {isCandidate
                      ? candidateProfile?.job_title || 'Candidate'
                      : employerProfile?.company_name || 'Employer'}
                  </p>
                </div>
              </div>

              {!isCandidate && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to="/company-profile">
                    <Button variant="outline" size="sm" className="sm:size-default">
                      <Settings className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Edit Profile</span>
                    </Button>
                  </Link>
                  <Link to="/post-job">
                    <Button disabled={!canPostJobs} size="sm" className="sm:size-default">
                      <Plus className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Post a Job</span>
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : isCandidate ? (
          /* Candidate Dashboard */
          <div className="grid md:grid-cols-3 gap-6">
            {/* Stats */}
            <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="shadow-google">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{applications.length}</p>
                  <p className="text-sm text-muted-foreground">Applications</p>
                </CardContent>
              </Card>
              <Card className="shadow-google">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-warning">
                    {applications.filter((a) => a.status === 'pending').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </CardContent>
              </Card>
              <Card className="shadow-google">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-success">
                    {applications.filter((a) => a.status === 'shortlisted').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Shortlisted</p>
                </CardContent>
              </Card>
              <Card className="shadow-google">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-destructive">
                    {applications.filter((a) => a.status === 'rejected').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </CardContent>
              </Card>
            </div>

            {/* Applications List */}
            <div className="md:col-span-3">
              <Card className="shadow-google-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    Your Applications
                  </CardTitle>
                  <CardDescription>Track the status of your job applications</CardDescription>
                </CardHeader>
                <CardContent>
                  {applications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No applications yet</p>
                      <Link to="/">
                        <Button variant="link">Browse Jobs on Map</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {applications.map((app) => (
                        <div
                          key={app.id}
                          className="card-google p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div>
                            <h3 className="font-medium">{app.jobs?.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {app.jobs?.employers?.company_name}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary">{app.jobs?.job_type}</Badge>
                              <Badge className={statusColors[app.status]}>{app.status}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {formatDate(app.created_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Employer Dashboard */
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Plan Usage Panel */}
              {employerProfile && (
                <PlanUsagePanel employerId={employerProfile.id} />
              )}

              {/* Profile Completeness */}
              {employerProfile && employerProfile.profile_completeness < 100 && (
                <Card className="shadow-google border-warning/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Complete Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ProfileCompletenessBar 
                      completeness={employerProfile.profile_completeness || 0}
                      compact
                    />
                    <Link to="/company-profile">
                      <Button variant="outline" size="sm" className="w-full mt-3">
                        Complete Profile
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Quick Stats */}
              <Card className="shadow-google">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Jobs</span>
                    <span className="font-medium">{jobs.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Jobs</span>
                    <span className="font-medium text-success">
                      {jobs.filter(j => j.is_active && j.status === 'open').length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expiring Soon</span>
                    <span className="font-medium text-warning">
                      {jobs.filter(j => {
                        const days = Math.ceil((new Date(j.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return days <= 7 && days > 0;
                      }).length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-2 w-full max-w-md">
                  <TabsTrigger value="jobs" className="gap-2">
                    <Briefcase className="w-4 h-4" />
                    My Jobs
                  </TabsTrigger>
                  <TabsTrigger value="applicants" className="gap-2">
                    <Users className="w-4 h-4" />
                    Applicants
                  </TabsTrigger>
                </TabsList>

                {/* Jobs Tab */}
                <TabsContent value="jobs" className="mt-6">
                  {jobs.length === 0 ? (
                    <Card className="shadow-google">
                      <CardContent className="p-8 text-center">
                        <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground mb-4">No jobs posted yet</p>
                        <Link to="/post-job">
                          <Button disabled={!canPostJobs}>
                            <Plus className="w-4 h-4 mr-2" />
                            Post Your First Job
                          </Button>
                        </Link>
                        {!canPostJobs && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Complete your profile and get verified to post jobs
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {jobs.map((job) => (
                        <Card key={job.id} className="shadow-google">
                          <CardContent className="p-4">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              {/* Job Info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <h3 className="font-semibold text-lg">{job.title}</h3>
                                  <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
                                    {job.status}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    Posted {formatDate(job.created_at)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-4 h-4" />
                                    {job.view_count || 0} views
                                  </span>
                                </div>
                                
                                {/* Expiry Badge */}
                                <div className="mt-2">
                                  <JobExpiryBadge 
                                    expiresAt={job.expires_at} 
                                    showRenewButton
                                    onRenew={() => renewJob(job.id)}
                                  />
                                </div>
                              </div>

                              {/* Controls */}
                              <div className="flex items-center gap-4">
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
                                    <Button variant="outline" size="sm">
                                      <Eye className="w-4 h-4 mr-1" />
                                      View
                                    </Button>
                                  </Link>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedJob(job.id);
                                      setActiveTab('applicants');
                                    }}
                                  >
                                    <Users className="w-4 h-4 mr-1" />
                                    Applicants
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Analytics */}
                            <div className="mt-4 pt-4 border-t">
                              <JobAnalyticsCard jobId={job.id} compact />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Applicants Tab */}
                <TabsContent value="applicants" className="mt-6">
                  {jobs.length === 0 ? (
                    <Card className="shadow-google">
                      <CardContent className="p-8 text-center">
                        <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">Post a job to receive applicants</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {/* Job Selector */}
                      <Card className="shadow-google">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">Viewing applicants for:</span>
                            <Select value={selectedJob || ''} onValueChange={setSelectedJob}>
                              <SelectTrigger className="w-64">
                                <SelectValue placeholder="Select a job" />
                              </SelectTrigger>
                              <SelectContent>
                                {jobs.map((job) => (
                                  <SelectItem key={job.id} value={job.id}>
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
              </Tabs>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
