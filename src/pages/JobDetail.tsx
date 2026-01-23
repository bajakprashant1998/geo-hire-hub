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
  Globe,
  Target,
  Award,
  TrendingUp,
  FileText,
  Layers,
  Zap,
  Heart,
  MessageSquare,
  GraduationCap,
  Languages,
  Phone,
  Mail,
  User,
  Gift,
  UserCheck,
  Sunrise,
  Sunset,
  CalendarDays,
  BadgeCheck,
  AlertCircle,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { MailWarning } from 'lucide-react';
import { useStartConversation } from '@/hooks/useStartConversation';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { TooltipProvider } from '@/components/ui/tooltip';

interface JobDetails {
  id: string;
  title: string;
  description: string | null;
  salary_range: string | null;
  job_type: string | null;
  category: string | null;
  latitude: number;
  longitude: number;
  status: string;
  view_count: number | null;
  created_at: string | null;
  // New fields
  openings: number | null;
  experience_type: string | null;
  min_experience: number | null;
  max_experience: number | null;
  has_bonus: boolean | null;
  skills: string[] | null;
  gender_preference: string | null;
  min_age: number | null;
  max_age: number | null;
  education: string | null;
  languages: string[] | null;
  certifications: string | null;
  additional_notes: string | null;
  shift_type: string | null;
  start_time: string | null;
  end_time: string | null;
  work_days: string[] | null;
  interview_time: string | null;
  interview_days: string[] | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_role: string | null;
  organization_size: string | null;
  hiring_urgency: string | null;
  hiring_frequency: string | null;
  job_address: string | null;
  employer: {
    id: string;
    company_name: string;
    industry: string | null;
    website_url: string | null;
    avatar_url: string | null;
    description: string | null;
    user_id: string | null;
    whatsapp_number: string | null;
  };
}

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, isEmailVerified } = useAuth();
  const { startConversation } = useStartConversation();

  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [applying, setApplying] = useState(false);
  const [relatedJobs, setRelatedJobs] = useState<any[]>([]);
  const [applicantCount, setApplicantCount] = useState(0);
  const [contacting, setContacting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchJob();
      checkIfApplied();
      fetchApplicantCount();
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
            description,
            profiles!inner (
              avatar_url,
              user_id,
              whatsapp_number
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
          description: data.employers.description,
          user_id: data.employers.profiles?.user_id,
          whatsapp_number: data.employers.profiles?.whatsapp_number,
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

  const fetchApplicantCount = async () => {
    try {
      const { count } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', id);
      setApplicantCount(count || 0);
    } catch (error) {
      console.error('Error fetching applicant count:', error);
    }
  };

  const checkIfApplied = async () => {
    if (!user) return;

    try {
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
      // Check if email is verified
      if (!isEmailVerified) {
        toast.error('Please verify your email before applying for jobs');
        setApplying(false);
        return;
      }

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

  const handleContactEmployer = async () => {
    if (!job?.employer.user_id) {
      toast.error('Unable to contact this employer');
      return;
    }
    setContacting(true);
    await startConversation(job.employer.user_id, job.id);
    setContacting(false);
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

  const formatTime = (time: string | null) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHour = h % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <div className="relative h-64 md:h-72 bg-gradient-to-r from-destructive/30 to-destructive/10">
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <div className="container mx-auto px-4 -mt-20">
          <Card className="shadow-xl border-0 mb-6">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6">
                <Skeleton className="w-24 h-24 md:w-28 md:h-28 rounded-2xl" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-5 w-48" />
                  <div className="flex gap-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-36" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
        <Card className="max-w-md mx-4 text-center shadow-xl border-0">
          <CardContent className="p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Briefcase className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Job Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The job you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/')} size="lg" className="px-8">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Map
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 to-background pb-24 lg:pb-12">
      {/* Hero Banner with Overlay */}
      <div
        className="relative h-64 md:h-80 bg-cover bg-center"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=600&fit=crop")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-destructive/85 via-destructive/70 to-destructive/50" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />
        
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="container mx-auto px-4 pt-4 md:pt-6">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20 backdrop-blur-sm bg-white/10 rounded-full px-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-28 md:-mt-32 pb-12 relative z-10">
        {/* Main Job Header Card */}
        <Card className="shadow-2xl border-0 mb-8 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Company Logo with Status Badge */}
                <div className="relative flex-shrink-0">
                  <div className="relative">
                    {job.status === 'open' && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:-right-2 bg-success text-success-foreground z-10 shadow-lg px-3 py-1 text-xs font-semibold">
                        Active
                      </Badge>
                    )}
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center shadow-xl border-4 border-background">
                      {job.employer.avatar_url ? (
                        <Avatar className="w-full h-full rounded-xl">
                          <AvatarImage src={job.employer.avatar_url} alt={job.employer.company_name} className="object-cover" />
                          <AvatarFallback className="text-3xl bg-transparent text-white rounded-xl">
                            <Building2 className="w-12 h-12" />
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <FileText className="w-12 h-12 text-white" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Job Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:justify-between">
                    <div className="space-y-3">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                        {job.title}
                      </h1>
                      <Link
                        to={`/employer/${job.employer.id}`}
                        className="inline-flex items-center gap-2 text-lg text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        <Building2 className="w-5 h-5" />
                        {job.employer.company_name}
                        <ExternalLink className="w-4 h-4 opacity-60" />
                      </Link>

                      {/* Info Pills */}
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        {job.job_address && (
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-medium">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            {job.job_address}
                          </div>
                        )}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-medium">
                          <Briefcase className="w-4 h-4 text-muted-foreground" />
                          {job.job_type || 'Full-time'}
                        </div>
                        {job.salary_range && (
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-bold">
                            <DollarSign className="w-4 h-4" />
                            {job.salary_range}
                          </div>
                        )}
                        {job.has_bonus && (
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 text-warning text-sm font-bold">
                            <Gift className="w-4 h-4" />
                            Bonus Available
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Desktop Action Buttons */}
                    <div className="hidden lg:flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleShare}
                        className="rounded-full w-11 h-11 hover:bg-primary/10 hover:text-primary hover:border-primary transition-all"
                      >
                        <Share2 className="w-5 h-5" />
                      </Button>
                      <Button
                        variant={isSaved ? 'default' : 'outline'}
                        size="icon"
                        onClick={handleSave}
                        className={`rounded-full w-11 h-11 transition-all ${isSaved ? '' : 'hover:bg-primary/10 hover:text-primary hover:border-primary'}`}
                      >
                        <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="bg-secondary/50 border-t">
              <div className="flex flex-wrap items-center divide-x divide-border">
                <div className="flex items-center gap-2 px-6 py-4 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Posted</span>
                  <span className="font-semibold">{job.created_at ? formatDate(job.created_at) : 'Recently'}</span>
                </div>
                <div className="flex items-center gap-2 px-6 py-4 text-sm">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">{job.view_count || 0}</span>
                  <span className="text-muted-foreground">views</span>
                </div>
                <div className="flex items-center gap-2 px-6 py-4 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">{applicantCount}</span>
                  <span className="text-muted-foreground">applicants</span>
                </div>
                {job.openings && job.openings > 1 && (
                  <div className="flex items-center gap-2 px-6 py-4 text-sm">
                    <UserCheck className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">{job.openings}</span>
                    <span className="text-muted-foreground">openings</span>
                  </div>
                )}
                {job.category && (
                  <div className="flex items-center gap-2 px-6 py-4 text-sm">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold">{job.category}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Description */}
            {job.description && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="border-b bg-secondary/30">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    Job Description
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {job.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Skills Required */}
            {job.skills && job.skills.length > 0 && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="border-b bg-secondary/30">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    Skills Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="px-4 py-2 text-sm rounded-full">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Job Requirements */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="border-b bg-secondary/30">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-success" />
                  </div>
                  Requirements & Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Experience */}
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Experience</p>
                      <p className="font-medium">
                        {job.experience_type === 'Any' ? 'Any Experience Level' :
                         job.experience_type === 'Fresher Only' ? 'Freshers Only' :
                         job.min_experience || job.max_experience 
                           ? `${job.min_experience || 0} - ${job.max_experience || '10+'} years`
                           : job.experience_type || 'Not specified'}
                      </p>
                    </div>
                  </div>

                  {/* Education */}
                  {job.education && (
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Education</p>
                        <p className="font-medium">{job.education}</p>
                      </div>
                    </div>
                  )}

                  {/* Languages */}
                  {job.languages && job.languages.length > 0 && (
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Languages className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Languages</p>
                        <p className="font-medium">{job.languages.join(', ')}</p>
                      </div>
                    </div>
                  )}

                  {/* Age Preference */}
                  {(job.min_age || job.max_age) && (
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Age Preference</p>
                        <p className="font-medium">
                          {job.min_age && job.max_age 
                            ? `${job.min_age} - ${job.max_age} years`
                            : job.min_age 
                              ? `Minimum ${job.min_age} years`
                              : `Maximum ${job.max_age} years`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Gender Preference */}
                  {job.gender_preference && job.gender_preference !== 'Any' && (
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Gender Preference</p>
                        <p className="font-medium">{job.gender_preference}</p>
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {job.certifications && (
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BadgeCheck className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Certifications</p>
                        <p className="font-medium">{job.certifications}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Notes */}
                {job.additional_notes && (
                  <div className="mt-4 p-4 rounded-xl bg-warning/5 border border-warning/20">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-warning mb-1">Additional Notes</p>
                        <p className="text-sm text-muted-foreground">{job.additional_notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Work Schedule */}
            {(job.shift_type || job.start_time || job.work_days?.length) && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="border-b bg-secondary/30">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-warning" />
                    </div>
                    Work Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Shift Type */}
                    {job.shift_type && (
                      <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                          {job.shift_type.toLowerCase().includes('night') ? (
                            <Sunset className="w-5 h-5 text-warning" />
                          ) : (
                            <Sunrise className="w-5 h-5 text-warning" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Shift Type</p>
                          <p className="font-medium">{job.shift_type}</p>
                        </div>
                      </div>
                    )}

                    {/* Work Hours */}
                    {(job.start_time || job.end_time) && (
                      <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Work Hours</p>
                          <p className="font-medium">
                            {formatTime(job.start_time)} - {formatTime(job.end_time)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Work Days */}
                    {job.work_days && job.work_days.length > 0 && (
                      <div className="sm:col-span-2 flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                          <CalendarDays className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Working Days</p>
                          <div className="flex flex-wrap gap-2">
                            {job.work_days.map((day, index) => (
                              <Badge key={index} variant="outline" className="rounded-full">
                                {day}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Interview Schedule */}
                  {(job.interview_time || (job.interview_days && job.interview_days.length > 0)) && (
                    <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <p className="text-sm font-medium text-primary mb-2">Interview Schedule</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        {job.interview_time && (
                          <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {job.interview_time}
                          </span>
                        )}
                        {job.interview_days && job.interview_days.length > 0 && (
                          <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {job.interview_days.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            {(job.contact_person || job.contact_phone || job.contact_email) && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="border-b bg-secondary/30">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-destructive" />
                    </div>
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {job.contact_person && (
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Contact Person</p>
                          <p className="font-medium">{job.contact_person}</p>
                          {job.contact_role && (
                            <p className="text-xs text-muted-foreground">{job.contact_role}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {job.contact_phone && (
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <a href={`tel:${job.contact_phone}`} className="font-medium text-primary hover:underline">
                            {job.contact_phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {job.contact_email && (
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <a href={`mailto:${job.contact_email}`} className="font-medium text-primary hover:underline break-all">
                            {job.contact_email}
                          </a>
                        </div>
                      </div>
                    )}

                    {job.organization_size && (
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                        <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Organization Size</p>
                          <p className="font-medium">{job.organization_size}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hiring Urgency */}
                  {job.hiring_urgency && (
                    <div className="mt-4 flex items-center gap-2">
                      <Badge 
                        variant={job.hiring_urgency === 'Immediately' ? 'destructive' : 'secondary'}
                        className="rounded-full"
                      >
                        {job.hiring_urgency === 'Immediately' ? '🔥 Hiring Immediately' : '⏳ Can Wait'}
                      </Badge>
                      {job.hiring_frequency && (
                        <Badge variant="outline" className="rounded-full">
                          {job.hiring_frequency}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Company Overview */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="border-b bg-secondary/30">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  About {job.employer.company_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/10 flex-shrink-0">
                    {job.employer.avatar_url ? (
                      <Avatar className="w-16 h-16 rounded-xl">
                        <AvatarImage src={job.employer.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-transparent">
                          <Building2 className="w-8 h-8 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Building2 className="w-8 h-8 text-primary" />
                    )}
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <h4 className="font-bold text-xl mb-1">{job.employer.company_name}</h4>
                      <p className="text-muted-foreground">
                        {job.employer.industry || 'Multiple Industries'}
                      </p>
                    </div>

                    {job.employer.description && (
                      <p className="text-sm text-muted-foreground">
                        {job.employer.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= 4 ? 'text-warning fill-warning' : 'text-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium">4.2</span>
                      <span className="text-sm text-muted-foreground">(128 reviews)</span>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      {job.organization_size && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{job.organization_size}</span>
                        </div>
                      )}
                      {job.employer.website_url && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Globe className="w-4 h-4" />
                          <a href={job.employer.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Visit Website
                          </a>
                        </div>
                      )}
                    </div>

                    <Link
                      to={`/employer/${job.employer.id}`}
                      className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      View Company Profile
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Related Jobs */}
            {relatedJobs.length > 0 && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="border-b bg-secondary/30">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    More Jobs from {job.employer.company_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {relatedJobs.map((relJob) => (
                      <Link
                        key={relJob.id}
                        to={`/jobs/${relJob.id}`}
                        className="group block p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 flex items-center justify-center flex-shrink-0">
                              <Briefcase className="w-6 h-6 text-destructive" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {relJob.title}
                              </h4>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {relJob.job_type || 'Full-time'}
                                </span>
                                {relJob.salary_range && (
                                  <span className="text-success font-medium">{relJob.salary_range}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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

          {/* Sidebar - Sticky Apply Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Apply Card */}
              <Card className="shadow-xl border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                  <CardTitle className="flex items-center gap-3">
                    <Award className="w-6 h-6" />
                    Apply for this Job
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  {hasApplied ? (
                    <div className="text-center py-6">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-success" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">Application Submitted!</h3>
                      <p className="text-sm text-muted-foreground">
                        You've already applied for this position. The employer will contact you if
                        your profile matches their requirements.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Ready to take the next step in your career? Apply now and join{' '}
                        <span className="font-semibold text-foreground">{job.employer.company_name}</span>!
                      </p>

                      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all" size="lg">
                            <Send className="w-5 h-5 mr-2" />
                            Apply Now
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Send className="w-5 h-5 text-primary" />
                              Apply for {job.title}
                            </DialogTitle>
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
                                className="resize-none"
                              />
                            </div>
                          </div>

                          <DialogFooter className="gap-2">
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
                          className="w-full h-11 justify-center gap-2 hover:bg-secondary transition-colors"
                          onClick={handleSave}
                        >
                          <BookmarkPlus className={`w-5 h-5 ${isSaved ? 'fill-primary text-primary' : ''}`} />
                          {isSaved ? 'Saved' : 'Save Job'}
                        </Button>

                        <Button 
                          variant="outline" 
                          className="w-full h-11 justify-center gap-2 hover:bg-secondary transition-colors" 
                          onClick={handleShare}
                        >
                          <Share2 className="w-5 h-5" />
                          Share Job
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats Card */}
              <Card className="shadow-lg border-0">
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Quick Stats
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Competition</span>
                      <Badge variant="secondary" className="bg-warning/10 text-warning border-0">
                        {applicantCount > 20 ? 'High' : applicantCount > 10 ? 'Medium' : 'Low'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Response Rate</span>
                      <span className="font-semibold text-success">85%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Avg. Response Time</span>
                      <span className="font-semibold">2-3 days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Card */}
              <Card className="shadow-lg border-0">
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Have Questions?
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Contact the employer directly if you have any questions about this position.
                  </p>
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleContactEmployer}
                      disabled={contacting}
                    >
                      {contacting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <MessageSquare className="w-4 h-4 mr-2" />
                      )}
                      Send Message
                    </Button>
                    {job.employer.whatsapp_number && (
                      <WhatsAppButton 
                        phoneNumber={job.employer.whatsapp_number}
                        className="w-full"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background/95 backdrop-blur-lg border-t shadow-lg p-4 z-50">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSave}
            className={`w-12 h-12 rounded-xl flex-shrink-0 ${isSaved ? 'bg-primary/10 border-primary text-primary' : ''}`}
          >
            <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleShare}
            className="w-12 h-12 rounded-xl flex-shrink-0"
          >
            <Share2 className="w-5 h-5" />
          </Button>
          {job.employer.whatsapp_number && (
            <WhatsAppButton 
              phoneNumber={job.employer.whatsapp_number}
              variant="icon"
              className="flex-shrink-0"
            />
          )}
          {hasApplied ? (
            <Button disabled className="flex-1 h-12 rounded-xl">
              <CheckCircle className="w-5 h-5 mr-2" />
              Applied
            </Button>
          ) : (
            <Button 
              onClick={() => setApplyDialogOpen(true)} 
              className="flex-1 h-12 rounded-xl text-base font-semibold"
            >
              <Send className="w-5 h-5 mr-2" />
              Apply Now
            </Button>
          )}
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default JobDetail;
