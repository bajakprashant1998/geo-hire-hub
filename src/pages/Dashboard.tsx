import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Mail,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Eye,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning-foreground',
  reviewed: 'bg-primary/10 text-primary',
  shortlisted: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  hired: 'bg-success/10 text-success',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Candidate state
  const [applications, setApplications] = useState<any[]>([]);
  const [candidateProfile, setCandidateProfile] = useState<any>(null);

  // Employer state
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [employerProfile, setEmployerProfile] = useState<any>(null);

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
          // Fetch jobs
          const { data: jobsData } = await supabase
            .from('jobs')
            .select('*')
            .eq('employer_id', empData.id)
            .order('created_at', { ascending: false });
          setJobs(jobsData || []);

          if (jobsData && jobsData.length > 0) {
            setSelectedJob(jobsData[0].id);
          }
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user, profile, isCandidate]);

  // Fetch applicants when selected job changes
  useEffect(() => {
    if (!selectedJob) return;

    const fetchApplicants = async () => {
      const { data } = await supabase
        .from('applications')
        .select(`
          *,
          candidates (
            id,
            job_title,
            experience_years,
            skills,
            profiles (
              full_name,
              avatar_url,
              user_id
            )
          )
        `)
        .eq('job_id', selectedJob)
        .order('created_at', { ascending: false });
      setApplicants(data || []);
    };

    fetchApplicants();
  }, [selectedJob]);

  const updateApplicationStatus = async (applicationId: string, status: string) => {
    const { error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', applicationId);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Application ${status}`);
      setApplicants((prev) =>
        prev.map((app) => (app.id === applicationId ? { ...app, status } : app))
      );
    }
  };

  const startConversation = async (otherUserId: string) => {
    if (!user) return;

    // Check if conversation exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      navigate(`/messages/${existing.id}`);
    } else {
      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          participant_1: user.id,
          participant_2: otherUserId,
        })
        .select()
        .single();

      if (newConv && !error) {
        navigate(`/messages/${newConv.id}`);
      } else {
        toast.error('Failed to start conversation');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
                  <h1 className="text-2xl font-bold">Welcome, {profile.full_name}</h1>
                  <p className="text-muted-foreground">
                    {isCandidate
                      ? candidateProfile?.job_title || 'Candidate'
                      : employerProfile?.company_name || 'Employer'}
                  </p>
                </div>
              </div>

              {!isCandidate && (
                <Link to="/post-job">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Post a Job
                  </Button>
                </Link>
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
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="shadow-google">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{jobs.length}</p>
                  <p className="text-sm text-muted-foreground">Active Jobs</p>
                </CardContent>
              </Card>
              <Card className="shadow-google">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{applicants.length}</p>
                  <p className="text-sm text-muted-foreground">Total Applicants</p>
                </CardContent>
              </Card>
              <Card className="shadow-google">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-success">
                    {applicants.filter((a) => a.status === 'shortlisted').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Shortlisted</p>
                </CardContent>
              </Card>
              <Card className="shadow-google">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-success">
                    {applicants.filter((a) => a.status === 'hired').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Hired</p>
                </CardContent>
              </Card>
            </div>

            {/* Job Selector and Applicants */}
            <Card className="shadow-google-lg">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Applicants
                    </CardTitle>
                    <CardDescription>Review and manage job applications</CardDescription>
                  </div>

                  {jobs.length > 0 && (
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
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No jobs posted yet</p>
                    <Link to="/post-job">
                      <Button variant="link">Post Your First Job</Button>
                    </Link>
                  </div>
                ) : applicants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No applicants for this job yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applicants.map((app) => (
                      <div
                        key={app.id}
                        className="card-google p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            {app.candidates?.profiles?.avatar_url ? (
                              <img
                                src={app.candidates.profiles.avatar_url}
                                alt=""
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <Users className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium">
                              {app.candidates?.profiles?.full_name || 'Unknown'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {app.candidates?.job_title} • {app.candidates?.experience_years}y exp
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {app.candidates?.skills?.slice(0, 3).map((skill: string) => (
                                <Badge key={skill} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={statusColors[app.status]}>{app.status}</Badge>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startConversation(app.candidates?.profiles?.user_id)}
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Message
                          </Button>

                          {app.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateApplicationStatus(app.id, 'reviewed')}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Review
                              </Button>
                            </>
                          )}

                          {(app.status === 'pending' || app.status === 'reviewed') && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-success"
                                onClick={() => updateApplicationStatus(app.id, 'shortlisted')}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Shortlist
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => updateApplicationStatus(app.id, 'rejected')}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}

                          {app.status === 'shortlisted' && (
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/90"
                              onClick={() => updateApplicationStatus(app.id, 'hired')}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Hire
                            </Button>
                          )}
                        </div>
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
  );
};

export default Dashboard;
