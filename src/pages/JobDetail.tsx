import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Star,
  Users,
  Eye,
  Share2,
  BookmarkPlus,
  Send,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface JobDetails {
  id: string;
  title: string;
  description: string | null;
  salary_range: string | null;
  job_type: string | null;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string | null;
  employer: {
    id: string;
    company_name: string;
    industry: string | null;
    website_url: string | null;
    avatar_url: string | null;
  };
}

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [applying, setApplying] = useState(false);
  const [relatedJobs, setRelatedJobs] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchJob();
      checkIfApplied();
    }
  }, [id]);

  const fetchJob = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          employers!inner (
            id,
            company_name,
            industry,
            website_url,
            profiles!inner (
              avatar_url
            )
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setLoading(false);
        return;
      }

      setJob({
        ...data,
        employer: {
          id: data.employers.id,
          company_name: data.employers.company_name,
          industry: data.employers.industry,
          website_url: data.employers.website_url,
          avatar_url: data.employers.profiles?.avatar_url,
        },
      });

      // Fetch related jobs from same employer
      const { data: related } = await supabase
        .from('jobs')
        .select('id, title, job_type, salary_range, created_at')
        .eq('employer_id', data.employers.id)
        .neq('id', id)
        .eq('status', 'open')
        .limit(3);

      setRelatedJobs(related || []);
    } catch (error: any) {
      console.error('Error fetching job:', error);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const checkIfApplied = async () => {
    if (!user) return;

    try {
      // Get candidate id for current user
      const { data: candidate } = await supabase
        .from('candidates')
        .select('id')
        .eq('profile_id', profile?.id)
        .maybeSingle();

      if (!candidate) return;

      const { data: application } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', id)
        .eq('candidate_id', candidate.id)
        .maybeSingle();

      setHasApplied(!!application);
    } catch (error) {
      console.error('Error checking application status:', error);
    }
  };

  const handleApply = async () => {
    if (!user || !profile) {
      toast.error('Please login to apply');
      navigate('/login');
      return;
    }

    if (profile.user_type !== 'candidate') {
      toast.error('Only candidates can apply for jobs');
      return;
    }

    setApplying(true);

    try {
      // Get candidate id
      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (candidateError) throw candidateError;

      if (!candidate) {
        toast.error('Please complete your profile first');
        navigate('/profile-setup');
        return;
      }

      // Create application
      const { error: applicationError } = await supabase
        .from('applications')
        .insert({
          job_id: id,
          candidate_id: candidate.id,
          cover_letter: coverLetter || null,
        });

      if (applicationError) throw applicationError;

      setHasApplied(true);
      setApplyDialogOpen(false);
      toast.success('Application submitted successfully!');
    } catch (error: any) {
      console.error('Error applying:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast.success(isSaved ? 'Job removed from saved' : 'Job saved successfully!');
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: job?.title,
        text: `Check out this job at ${job?.employer.company_name}`,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary">
        <div className="bg-gradient-to-r from-destructive/20 to-destructive/10 h-48" />
        <div className="container mx-auto px-4 -mt-24">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-24 rounded-lg" />
                  <Skeleton className="h-8 w-48 mt-4" />
                  <Skeleton className="h-4 w-32 mt-2" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Job Not Found</h2>
          <p className="text-muted-foreground mb-4">The job you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/')}>Back to Map</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Hero Banner */}
      <div
        className="h-48 relative bg-cover bg-center"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(234, 67, 53, 0.8), rgba(234, 67, 53, 0.4)), url("https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&h=400&fit=crop")',
        }}
      >
        <div className="container mx-auto px-4 pt-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-20 pb-12">
        {/* Job Header Card */}
        <Card className="shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Company Logo */}
              <div className="relative">
                {job.status === 'open' && (
                  <Badge className="absolute -top-2 -right-2 bg-success text-success-foreground z-10">
                    Active
                  </Badge>
                )}
                <Avatar className="w-24 h-24 rounded-lg border-4 border-background shadow-lg">
                  <AvatarImage src={job.employer.avatar_url || ''} alt={job.employer.company_name} />
                  <AvatarFallback className="text-2xl bg-destructive text-destructive-foreground rounded-lg">
                    <Building2 className="w-10 h-10" />
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">{job.title}</h1>
                    <Link
                      to={`/employer/${job.employer.id}`}
                      className="text-primary hover:underline flex items-center gap-1 mt-1"
                    >
                      <Building2 className="w-4 h-4" />
                      {job.employer.company_name}
                    </Link>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        Location on map
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {job.job_type || 'Full-time'}
                      </span>
                      {job.salary_range && (
                        <span className="flex items-center gap-1 text-success font-medium">
                          <DollarSign className="w-4 h-4" />
                          {job.salary_range}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handleShare}>
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={isSaved ? 'default' : 'outline'}
                      size="icon"
                      onClick={handleSave}
                    >
                      <BookmarkPlus className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    </Button>
                  </div>
                </div>

                {/* Job Meta */}
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Posted {job.created_at ? formatDate(job.created_at) : 'Recently'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {Math.floor(Math.random() * 500) + 100} views
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {Math.floor(Math.random() * 50) + 5} applicants
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Description */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  {job.description ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{job.description}</p>
                  ) : (
                    <p>
                      We are looking for talented individuals to join our team at{' '}
                      {job.employer.company_name}. This is an exciting opportunity to work on
                      challenging projects and grow your career in a dynamic environment.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Job Details */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Job Type</p>
                      <p className="font-medium">{job.job_type || 'Full-time'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Salary Range</p>
                      <p className="font-medium">{job.salary_range || 'Competitive'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium">{job.employer.industry || 'Various'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Posted Date</p>
                      <p className="font-medium">
                        {job.created_at
                          ? new Date(job.created_at).toLocaleDateString('en-IN', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Recently'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Overview */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>About {job.employer.company_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="w-16 h-16 rounded-lg">
                    <AvatarImage src={job.employer.avatar_url || ''} />
                    <AvatarFallback className="bg-secondary rounded-lg">
                      <Building2 className="w-8 h-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold">{job.employer.company_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {job.employer.industry || 'Multiple Industries'}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= 4 ? 'text-warning fill-warning' : 'text-muted'
                          }`}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">4.2</span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/employer/${job.employer.id}`}
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  View Company Profile
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </CardContent>
            </Card>

            {/* Related Jobs */}
            {relatedJobs.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>More Jobs from {job.employer.company_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {relatedJobs.map((relJob) => (
                      <Link
                        key={relJob.id}
                        to={`/job/${relJob.id}`}
                        className="block p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-foreground">{relJob.title}</h4>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {relJob.job_type}
                              </span>
                              {relJob.salary_range && (
                                <span className="text-primary font-medium">{relJob.salary_range}</span>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            View Job
                          </Button>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Apply Card */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg sticky top-6">
              <CardHeader>
                <CardTitle>Apply for this Job</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasApplied ? (
                  <div className="text-center py-6">
                    <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Application Submitted!</h3>
                    <p className="text-sm text-muted-foreground">
                      You've already applied for this position. The employer will contact you if
                      your profile matches their requirements.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Ready to take the next step in your career? Apply now and join{' '}
                      {job.employer.company_name}!
                    </p>

                    <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full" size="lg">
                          <Send className="w-4 h-4 mr-2" />
                          Apply Now
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Apply for {job.title}</DialogTitle>
                          <DialogDescription>
                            Submit your application to {job.employer.company_name}. Make sure your
                            profile is up to date!
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                            <Textarea
                              id="coverLetter"
                              placeholder="Tell the employer why you're a great fit for this role..."
                              rows={6}
                              value={coverLetter}
                              onChange={(e) => setCoverLetter(e.target.value)}
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setApplyDialogOpen(false)}
                            disabled={applying}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleApply} disabled={applying}>
                            {applying ? 'Submitting...' : 'Submit Application'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Separator />

                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleSave}
                      >
                        <BookmarkPlus className={`w-4 h-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
                        {isSaved ? 'Saved' : 'Save Job'}
                      </Button>

                      <Button variant="outline" className="w-full" onClick={handleShare}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share Job
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
