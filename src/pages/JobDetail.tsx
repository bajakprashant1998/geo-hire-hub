import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  IndianRupee,
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
  Loader2,
  Sparkles,
  ChevronRight,
  Timer,
  Flame,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useStartConversation } from '@/hooks/useStartConversation';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { GovernmentJobBadge, GovernmentEmployerBadge } from '@/components/government';
import { motion, AnimatePresence } from 'framer-motion';

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
  job_category: string | null;
  employer: {
    id: string;
    company_name: string;
    industry: string | null;
    website_url: string | null;
    avatar_url: string | null;
    description: string | null;
    user_id: string | null;
    whatsapp_number: string | null;
    is_government: boolean | null;
  };
}

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  // Auto-open apply dialog from query param
  useEffect(() => {
    if (searchParams.get('action') === 'apply' && !loading && job && !hasApplied && user) {
      setApplyDialogOpen(true);
    }
  }, [searchParams, loading, job, hasApplied, user]);

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
            is_government,
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
          is_government: data.employers.is_government,
        },
      });

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

  const isNew = job?.created_at && new Date(job.created_at) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const isGovernmentJob = job?.job_category === 'government';

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
        <div className="h-48 md:h-64 bg-gradient-to-r from-primary/20 to-primary/5 animate-pulse" />
        <div className="container mx-auto px-4 -mt-16 md:-mt-24">
          <div className="glass-morphism rounded-3xl p-6 md:p-8 mb-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Skeleton className="w-20 h-20 md:w-24 md:h-24 rounded-2xl" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <div className="flex gap-3">
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-8 w-32 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not Found State
  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-morphism rounded-3xl p-8 md:p-12 text-center max-w-md"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
            <Briefcase className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Job Not Found</h2>
          <p className="text-muted-foreground mb-6">
            This job listing may have been removed or is no longer available.
          </p>
          <Button onClick={() => navigate('/')} size="lg" className="rounded-full px-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Explore Jobs
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background pb-28 lg:pb-12">
        {/* Compact Hero Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`relative overflow-hidden ${
            isGovernmentJob 
              ? 'bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500' 
              : 'bg-gradient-to-br from-primary via-primary/90 to-destructive/80'
          }`}
        >
          {/* Decorative Elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
          </div>
          
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }} />

          <div className="container mx-auto px-4 py-4 md:py-6 relative z-10">
            {/* Back Button & Badge Row */}
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="text-white/90 hover:text-white hover:bg-white/10 rounded-full -ml-2"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                {isNew && (
                  <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                    <Sparkles className="w-3 h-3 mr-1" />
                    New
                  </Badge>
                )}
                {isGovernmentJob && (
                  <GovernmentJobBadge className="hidden md:flex bg-white/20 border-white/30 text-white" />
                )}
              </div>
            </div>

            {/* Job Title & Company */}
            <div className="pb-16 md:pb-20">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight"
              >
                {job.title}
              </motion.h1>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3 flex-wrap"
              >
                <Link
                  to={`/employers/${job.employer.id}`}
                  className="inline-flex items-center gap-2 text-white/90 hover:text-white font-medium transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    {job.employer.avatar_url ? (
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={job.employer.avatar_url} />
                        <AvatarFallback className="bg-transparent text-white text-xs">
                          {job.employer.company_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Building2 className="w-4 h-4" />
                    )}
                  </div>
                  <span>{job.employer.company_name}</span>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                {job.employer.is_government && (
                  <GovernmentEmployerBadge variant="compact" className="bg-white/20 border-white/30 text-white" />
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Card - Floating */}
        <div className="container mx-auto px-4 -mt-12 md:-mt-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-morphism rounded-3xl shadow-2xl border border-white/20 mb-6 overflow-hidden"
          >
            {/* Key Info Pills */}
            <div className="p-4 md:p-6 border-b border-border/50">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                {job.job_address && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-medium">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="truncate max-w-[200px]">{job.job_address}</span>
                  </div>
                )}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-medium">
                  <Briefcase className="w-4 h-4 text-primary" />
                  {job.job_type || 'Full-time'}
                </div>
                {job.salary_range && (
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-success/10 text-success text-sm font-bold">
                    <IndianRupee className="w-4 h-4" />
                    {job.salary_range}
                  </div>
                )}
                {job.has_bonus && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 text-warning text-sm font-bold">
                    <Gift className="w-4 h-4" />
                    +Bonus
                  </div>
                )}
                {job.hiring_urgency === 'Immediately' && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive text-sm font-bold animate-pulse">
                    <Flame className="w-4 h-4" />
                    Urgent
                  </div>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border/50 bg-secondary/30">
              <div className="flex items-center justify-center gap-2 p-4 text-sm">
                <Timer className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Posted</span>
                <span className="font-semibold">{job.created_at ? formatDate(job.created_at) : 'Recently'}</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-4 text-sm">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">{job.view_count || 0}</span>
                <span className="text-muted-foreground">views</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-4 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">{applicantCount}</span>
                <span className="text-muted-foreground">applicants</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-4 text-sm">
                <UserCheck className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">{job.openings || 1}</span>
                <span className="text-muted-foreground">{(job.openings || 1) > 1 ? 'openings' : 'opening'}</span>
              </div>
            </div>
          </motion.div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Job Description */}
              {job.description && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="glass-morphism border-0 shadow-lg overflow-hidden">
                    <div className="p-5 md:p-6 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                      <h2 className="flex items-center gap-3 text-lg font-semibold">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        About This Role
                      </h2>
                    </div>
                    <CardContent className="p-5 md:p-6">
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {job.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Skills */}
              {job.skills && job.skills.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <Card className="glass-morphism border-0 shadow-lg overflow-hidden">
                    <div className="p-5 md:p-6 border-b border-border/50 bg-gradient-to-r from-warning/5 to-transparent">
                      <h2 className="flex items-center gap-3 text-lg font-semibold">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-warning" />
                        </div>
                        Skills Required
                      </h2>
                    </div>
                    <CardContent className="p-5 md:p-6">
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map((skill, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="px-4 py-2 text-sm rounded-full bg-gradient-to-r from-secondary to-secondary/80 hover:from-primary/10 hover:to-primary/5 transition-colors"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Requirements Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="glass-morphism border-0 shadow-lg overflow-hidden">
                  <div className="p-5 md:p-6 border-b border-border/50 bg-gradient-to-r from-success/5 to-transparent">
                    <h2 className="flex items-center gap-3 text-lg font-semibold">
                      <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                        <Target className="w-5 h-5 text-success" />
                      </div>
                      Requirements
                    </h2>
                  </div>
                  <CardContent className="p-5 md:p-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Experience */}
                      <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/30 hover:border-primary/20 transition-colors">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Experience</p>
                          <p className="font-semibold text-foreground">
                            {job.experience_type === 'Any' ? 'Any Level' :
                             job.experience_type === 'Fresher Only' ? 'Freshers Welcome' :
                             job.min_experience || job.max_experience 
                               ? `${job.min_experience || 0} - ${job.max_experience || '10+'} years`
                               : job.experience_type || 'Not specified'}
                          </p>
                        </div>
                      </div>

                      {/* Education */}
                      {job.education && (
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/30 hover:border-primary/20 transition-colors">
                          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Education</p>
                            <p className="font-semibold text-foreground">{job.education}</p>
                          </div>
                        </div>
                      )}

                      {/* Languages */}
                      {job.languages && job.languages.length > 0 && (
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/30 hover:border-primary/20 transition-colors">
                          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Languages className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Languages</p>
                            <p className="font-semibold text-foreground">{job.languages.join(', ')}</p>
                          </div>
                        </div>
                      )}

                      {/* Age */}
                      {(job.min_age || job.max_age) && (
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/30 hover:border-primary/20 transition-colors">
                          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Age</p>
                            <p className="font-semibold text-foreground">
                              {job.min_age && job.max_age 
                                ? `${job.min_age} - ${job.max_age} years`
                                : job.min_age 
                                  ? `Min ${job.min_age} years`
                                  : `Max ${job.max_age} years`}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Certifications */}
                      {job.certifications && (
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/30 hover:border-primary/20 transition-colors sm:col-span-2">
                          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <BadgeCheck className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Certifications</p>
                            <p className="font-semibold text-foreground">{job.certifications}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Additional Notes */}
                    {job.additional_notes && (
                      <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-warning/5 to-warning/10 border border-warning/20">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-warning mb-1">Note from Employer</p>
                            <p className="text-sm text-muted-foreground">{job.additional_notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Work Schedule */}
              {(job.shift_type || job.start_time || job.work_days?.length) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                >
                  <Card className="glass-morphism border-0 shadow-lg overflow-hidden">
                    <div className="p-5 md:p-6 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                      <h2 className="flex items-center gap-3 text-lg font-semibold">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-primary" />
                        </div>
                        Work Schedule
                      </h2>
                    </div>
                    <CardContent className="p-5 md:p-6">
                      <div className="grid sm:grid-cols-2 gap-4">
                        {job.shift_type && (
                          <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/30">
                            <div className="w-11 h-11 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                              {job.shift_type.toLowerCase().includes('night') ? (
                                <Sunset className="w-5 h-5 text-warning" />
                              ) : (
                                <Sunrise className="w-5 h-5 text-warning" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Shift</p>
                              <p className="font-semibold text-foreground">{job.shift_type}</p>
                            </div>
                          </div>
                        )}

                        {(job.start_time || job.end_time) && (
                          <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/30">
                            <div className="w-11 h-11 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                              <Clock className="w-5 h-5 text-warning" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Hours</p>
                              <p className="font-semibold text-foreground">
                                {formatTime(job.start_time)} - {formatTime(job.end_time)}
                              </p>
                            </div>
                          </div>
                        )}

                        {job.work_days && job.work_days.length > 0 && (
                          <div className="sm:col-span-2 flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/30">
                            <div className="w-11 h-11 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                              <CalendarDays className="w-5 h-5 text-warning" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Working Days</p>
                              <div className="flex flex-wrap gap-2">
                                {job.work_days.map((day, index) => (
                                  <Badge key={index} variant="outline" className="rounded-full px-3 py-1">
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
                        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                          <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Interview Schedule
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {job.interview_time && (
                              <span className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {job.interview_time}
                              </span>
                            )}
                            {job.interview_days && job.interview_days.length > 0 && (
                              <span className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4" />
                                {job.interview_days.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Contact Information */}
              {(job.contact_person || job.contact_phone || job.contact_email) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Card className="glass-morphism border-0 shadow-lg overflow-hidden">
                    <div className="p-5 md:p-6 border-b border-border/50 bg-gradient-to-r from-destructive/5 to-transparent">
                      <h2 className="flex items-center gap-3 text-lg font-semibold">
                        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                          <Phone className="w-5 h-5 text-destructive" />
                        </div>
                        Contact Information
                      </h2>
                    </div>
                    <CardContent className="p-5 md:p-6">
                      <div className="grid sm:grid-cols-2 gap-4">
                        {job.contact_person && (
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/30">
                            <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-destructive" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Contact Person</p>
                              <p className="font-semibold text-foreground">{job.contact_person}</p>
                              {job.contact_role && (
                                <p className="text-xs text-muted-foreground">{job.contact_role}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {job.contact_phone && (
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/30">
                            <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                              <Phone className="w-5 h-5 text-destructive" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                              <a href={`tel:${job.contact_phone}`} className="font-semibold text-primary hover:underline">
                                {job.contact_phone}
                              </a>
                            </div>
                          </div>
                        )}

                        {job.contact_email && (
                          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/30 sm:col-span-2">
                            <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                              <Mail className="w-5 h-5 text-destructive" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                              <a href={`mailto:${job.contact_email}`} className="font-semibold text-primary hover:underline break-all">
                                {job.contact_email}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Company Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
              >
                <Card className="glass-morphism border-0 shadow-lg overflow-hidden">
                  <div className="p-5 md:p-6 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                    <h2 className="flex items-center gap-3 text-lg font-semibold">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      About {job.employer.company_name}
                    </h2>
                  </div>
                  <CardContent className="p-5 md:p-6">
                    <div className="flex flex-col sm:flex-row items-start gap-5">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 flex-shrink-0 ${
                        isGovernmentJob 
                          ? 'bg-gradient-to-br from-emerald-100 to-teal-50 border-emerald-200' 
                          : 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/10'
                      }`}>
                        {job.employer.avatar_url ? (
                          <Avatar className="w-14 h-14 rounded-xl">
                            <AvatarImage src={job.employer.avatar_url} className="object-cover" />
                            <AvatarFallback className="bg-transparent text-primary">
                              <Building2 className="w-7 h-7" />
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <Building2 className={`w-7 h-7 ${isGovernmentJob ? 'text-emerald-600' : 'text-primary'}`} />
                        )}
                      </div>

                      <div className="flex-1 space-y-4">
                        <div>
                          <h4 className="font-bold text-xl mb-1">{job.employer.company_name}</h4>
                          <p className="text-muted-foreground">{job.employer.industry || 'Multiple Industries'}</p>
                        </div>

                        {job.employer.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
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
                            <a 
                              href={job.employer.website_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <Globe className="w-4 h-4" />
                              Visit Website
                            </a>
                          )}
                        </div>

                        <Link
                          to={`/employer/${job.employer.id}`}
                          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors text-sm"
                        >
                          View Full Profile
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Related Jobs */}
              {relatedJobs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <Card className="glass-morphism border-0 shadow-lg overflow-hidden">
                    <div className="p-5 md:p-6 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
                      <h2 className="flex items-center gap-3 text-lg font-semibold">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-primary" />
                        </div>
                        More from {job.employer.company_name}
                      </h2>
                    </div>
                    <CardContent className="p-5 md:p-6">
                      <div className="space-y-3">
                        {relatedJobs.map((relJob) => (
                          <Link
                            key={relJob.id}
                            to={`/jobs/${relJob.id}`}
                            className="group flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-gradient-to-r from-muted/40 to-transparent hover:from-primary/5 hover:border-primary/30 transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {relJob.title}
                                </h4>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                  <span>{relJob.job_type || 'Full-time'}</span>
                                  {relJob.salary_range && (
                                    <span className="text-success font-medium">{relJob.salary_range}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-6">
                {/* Apply Card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="glass-morphism border-0 shadow-xl overflow-hidden">
                    <div className={`p-5 ${
                      isGovernmentJob 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600' 
                        : 'bg-gradient-to-r from-primary to-primary/80'
                    } text-white`}>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        {hasApplied ? 'Application Status' : 'Ready to Apply?'}
                      </h3>
                    </div>
                    <CardContent className="p-5 space-y-4">
                      {hasApplied ? (
                        <div className="text-center py-4">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center"
                          >
                            <CheckCircle className="w-8 h-8 text-success" />
                          </motion.div>
                          <h3 className="text-lg font-bold mb-2">Applied Successfully!</h3>
                          <p className="text-sm text-muted-foreground">
                            Your application has been submitted. We'll notify you when there's an update.
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Take the next step in your career at{' '}
                            <span className="font-semibold text-foreground">{job.employer.company_name}</span>
                          </p>

                          <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                className={`w-full h-12 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all ${
                                  isGovernmentJob 
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700' 
                                    : ''
                                }`} 
                                size="lg"
                              >
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
                                  Submit your application to {job.employer.company_name}
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                                  <Textarea
                                    id="coverLetter"
                                    placeholder="Tell the employer why you're a great fit..."
                                    rows={6}
                                    value={coverLetter}
                                    onChange={(e) => setCoverLetter(e.target.value)}
                                    className="resize-none rounded-xl"
                                  />
                                </div>
                              </div>

                              <DialogFooter className="gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setApplyDialogOpen(false)}
                                  disabled={applying}
                                  className="rounded-xl"
                                >
                                  Cancel
                                </Button>
                                <Button onClick={handleApply} disabled={applying} className="rounded-xl">
                                  {applying ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Submitting...
                                    </>
                                  ) : (
                                    'Submit Application'
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Separator />

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="flex-1 h-11 rounded-xl"
                              onClick={handleSave}
                            >
                              <Heart className={`w-4 h-4 mr-2 ${isSaved ? 'fill-primary text-primary' : ''}`} />
                              {isSaved ? 'Saved' : 'Save'}
                            </Button>
                            <Button 
                              variant="outline" 
                              className="flex-1 h-11 rounded-xl" 
                              onClick={handleShare}
                            >
                              <Share2 className="w-4 h-4 mr-2" />
                              Share
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Quick Stats */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card className="glass-morphism border-0 shadow-lg">
                    <CardContent className="p-5">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Insights
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Competition</span>
                          <Badge 
                            variant="secondary" 
                            className={`rounded-full ${
                              applicantCount > 20 
                                ? 'bg-destructive/10 text-destructive' 
                                : applicantCount > 10 
                                  ? 'bg-warning/10 text-warning' 
                                  : 'bg-success/10 text-success'
                            }`}
                          >
                            {applicantCount > 20 ? 'High' : applicantCount > 10 ? 'Medium' : 'Low'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Response Rate</span>
                          <span className="font-semibold text-success">85%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Avg. Response</span>
                          <span className="font-semibold">2-3 days</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Contact Card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 }}
                >
                  <Card className="glass-morphism border-0 shadow-lg">
                    <CardContent className="p-5">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        Questions?
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Reach out directly to the employer
                      </p>
                      <div className="space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full rounded-xl"
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
                            className="w-full rounded-xl"
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Fixed Bottom Bar */}
        <AnimatePresence>
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 lg:hidden glass-morphism border-t shadow-2xl p-4 z-50 safe-area-pb"
          >
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
                  className="flex-shrink-0 w-12 h-12 rounded-xl"
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
                  className={`flex-1 h-12 rounded-xl text-base font-semibold ${
                    isGovernmentJob 
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600' 
                      : ''
                  }`}
                >
                  <Send className="w-5 h-5 mr-2" />
                  Apply Now
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
};

export default JobDetail;
