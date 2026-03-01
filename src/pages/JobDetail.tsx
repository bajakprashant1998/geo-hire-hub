import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ReportDialog } from '@/components/ReportDialog';
import { VerificationBadge } from '@/components/employer/VerificationBadge';
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
  Users,
  Eye,
  Share2,
  Send,
  CheckCircle,
  Globe,
  Target,
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
  ExternalLink,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useStartConversation } from '@/hooks/useStartConversation';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { GovernmentJobBadge, GovernmentEmployerBadge } from '@/components/government';
import { motion, AnimatePresence } from 'framer-motion';
import { SEOHead } from '@/components/SEOHead';
import { BreadcrumbNav, buildBreadcrumbJsonLd } from '@/components/BreadcrumbNav';
import type { BreadcrumbItem } from '@/components/BreadcrumbNav';
import { SalaryBadge } from '@/components/SalaryBadge';

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
    verification_status: 'pending' | 'approved' | 'rejected';
    verification_method: string | null;
    google_business_verified: boolean | null;
    is_government: boolean | null;
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const JobDetail = () => {
  const params = useParams();
  // Support both /jobs/:id (UUID) and /jobs/.../:slug (SEO)
  const identifier = params.slug || params.id || params['*']?.split('/').pop();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, isEmailVerified } = useAuth();
  const { startConversation } = useStartConversation();

  const [job, setJob] = useState<JobDetails | null>(null);
  const [resolvedId, setResolvedId] = useState<string | null>(null);
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
    if (searchParams.get('action') === 'apply' && !loading && job && !hasApplied && user) {
      setApplyDialogOpen(true);
    }
  }, [searchParams, loading, job, hasApplied, user]);

  // Resolve slug to ID & redirect UUID URLs to SEO slugs
  useEffect(() => {
    if (!identifier) return;
    if (UUID_REGEX.test(identifier)) {
      // UUID access — check if slug exists and redirect
      supabase
        .from('jobs')
        .select('id, slug, location_country, location_state, location_city')
        .eq('id', identifier)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setResolvedId(data.id);
            if (data.slug) {
              const parts = ['/jobs'];
              if (data.location_country) parts.push(encodeURIComponent(data.location_country.toLowerCase().replace(/\s+/g, '-')));
              if (data.location_state) parts.push(encodeURIComponent(data.location_state.toLowerCase().replace(/\s+/g, '-')));
              if (data.location_city) parts.push(encodeURIComponent(data.location_city.toLowerCase().replace(/\s+/g, '-')));
              parts.push(data.slug);
              const seoPath = parts.join('/');
              const currentPath = window.location.pathname;
              if (currentPath !== seoPath) {
                navigate(seoPath + window.location.search, { replace: true });
              }
            }
          } else {
            setLoading(false);
          }
        });
    } else {
      // Slug access — resolve to ID
      supabase
        .from('jobs')
        .select('id')
        .eq('slug', identifier)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setResolvedId(data.id);
          else setLoading(false);
        });
    }
  }, [identifier]);

  useEffect(() => {
    if (resolvedId) {
      fetchJob();
      checkIfApplied();
      fetchApplicantCount();
    }
  }, [resolvedId]);

  const baseUrl = 'https://www.hireforjob.com';
  const jobSeoTitle = job ? `${job.title} at ${job.employer.company_name} | HireForJob` : 'Job Details | HireForJob';
  const jobSeoDesc = job ? `Apply for ${job.title} at ${job.employer.company_name}. ${job.job_type || 'Full-time'}${job.salary_range ? ` | ${job.salary_range}` : ''}${job.job_address ? ` | ${job.job_address}` : ''}` : '';
  const jobCanonical = job ? `${baseUrl}${window.location.pathname}` : undefined;

  // Build rich JobPosting JSON-LD
  const jobJsonLd = job ? (() => {
    const created = job.created_at ? new Date(job.created_at) : new Date();
    const validThrough = new Date(created);
    validThrough.setDate(validThrough.getDate() + 30);

    const addressParts = job.job_address?.split(',').map(s => s.trim()) || [];
    const jobLocation: Record<string, any> = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        ...(addressParts.length >= 1 && { addressLocality: addressParts[0] }),
        ...(addressParts.length >= 2 && { addressRegion: addressParts[1] }),
        ...(addressParts.length >= 3 && { addressCountry: addressParts[2] }),
        ...(job.job_address && { streetAddress: job.job_address }),
      },
    };

    return {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: job.title,
      description: job.description || '',
      identifier: { '@type': 'PropertyValue', name: job.employer.company_name, value: job.id },
      hiringOrganization: {
        '@type': 'Organization',
        name: job.employer.company_name,
        ...(job.employer.avatar_url && { logo: job.employer.avatar_url }),
        ...(job.employer.website_url && { sameAs: job.employer.website_url }),
      },
      employmentType: job.job_type?.toUpperCase().replace(/\s+/g, '_') || 'FULL_TIME',
      datePosted: created.toISOString(),
      validThrough: validThrough.toISOString(),
      directApply: true,
      jobLocation,
      ...(job.salary_range && {
        baseSalary: {
          '@type': 'MonetaryAmount',
          currency: 'INR',
          value: { '@type': 'QuantitativeValue', value: job.salary_range, unitText: 'MONTH' },
        },
      }),
    };
  })() : undefined;

  // Breadcrumb data
  const breadcrumbItems: BreadcrumbItem[] = job ? [
    { label: 'Jobs', href: '/browse-jobs' },
    ...(job.job_address ? [{ label: job.job_address }] : []),
    { label: job.title },
  ] : [];
  const breadcrumbJsonLd = job ? buildBreadcrumbJsonLd(breadcrumbItems) : undefined;

  const id = resolvedId;

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
            verification_status,
            verification_method,
            google_business_verified,
            profiles!inner (
              avatar_url,
              user_id,
              whatsapp_number
            )
          )
        `)
        .eq('id', resolvedId)
        .maybeSingle();

      if (error) throw error;
      if (!data) { setLoading(false); return; }

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
          verification_status: (data.employers.verification_status as any) || 'pending',
          verification_method: data.employers.verification_method || null,
          google_business_verified: data.employers.google_business_verified || null,
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
    if (!user || !profile) { toast.error('Please login to apply'); navigate('/login'); return; }
    if (profile.user_type !== 'candidate') { toast.error('Only candidates can apply for jobs'); return; }
    setApplying(true);
    try {
      if (!isEmailVerified) { toast.error('Please verify your email before applying for jobs'); setApplying(false); return; }
      const { data: candidate, error: candidateError } = await supabase.from('candidates').select('id').eq('profile_id', profile.id).maybeSingle();
      if (candidateError) throw candidateError;
      if (!candidate) { toast.error('Please complete your profile first'); navigate('/profile-setup'); return; }
      const { error: applicationError } = await supabase.from('applications').insert({ job_id: id, candidate_id: candidate.id, cover_letter: coverLetter || null });
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
      await navigator.share({ title: job?.title, text: `Check out this job at ${job?.employer.company_name}`, url: window.location.href });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleContactEmployer = async () => {
    if (!job?.employer.user_id) { toast.error('Unable to contact this employer'); return; }
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
  const accentColor = isGovernmentJob ? 'emerald' : 'primary';

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-10 w-3/4 mb-3" />
          <Skeleton className="h-6 w-1/2 mb-6" />
          <div className="flex gap-3 mb-8">
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-36 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
          <Skeleton className="h-48 rounded-2xl mb-6" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Not Found State
  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted flex items-center justify-center">
            <Briefcase className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Job Not Found</h2>
          <p className="text-muted-foreground mb-6">This job listing may have been removed or is no longer available.</p>
          <Button onClick={() => navigate('/')} className="rounded-full px-8">
            <ArrowLeft className="w-4 h-4 mr-2" /> Explore Jobs
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8">
      <SEOHead title={jobSeoTitle} description={jobSeoDesc} canonicalUrl={jobCanonical} ogType="article" ogImage={job?.employer.avatar_url || undefined} jsonLd={jobJsonLd} breadcrumbJsonLd={breadcrumbJsonLd} publishedTime={job?.created_at || undefined} />
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 max-w-4xl pt-2">
        <BreadcrumbNav items={breadcrumbItems} />
      </div>
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 max-w-4xl flex items-center justify-between h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex items-center gap-1">
            <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleSave} className={`rounded-full ${isSaved ? 'text-destructive' : 'text-muted-foreground'}`}>
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
            </TooltipTrigger><TooltipContent>{isSaved ? 'Remove from saved' : 'Save job'}</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleShare} className="rounded-full text-muted-foreground">
              <Share2 className="w-5 h-5" />
            </Button>
            </TooltipTrigger><TooltipContent>Share</TooltipContent></Tooltip>
            <ReportDialog targetId={id || ''} targetType="job" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl py-6">
        {/* ===== HERO SECTION ===== */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {isGovernmentJob && <GovernmentJobBadge variant="large" />}
            {isNew && (
              <Badge className="bg-warning/15 text-warning border-warning/30 gap-1">
                <Sparkles className="w-3 h-3" /> New Listing
              </Badge>
            )}
            {job.hiring_urgency === 'Immediately' && (
              <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1 animate-pulse">
                <Flame className="w-3 h-3" /> Urgent Hiring
              </Badge>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">{job.title}</h1>

          {/* Company */}
          <Link
            to={`/employers/${job.employer.id}`}
            className="inline-flex items-center gap-3 mb-5 group"
          >
            <Avatar className="w-10 h-10 border-2 border-border">
              <AvatarImage src={job.employer.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {job.employer.company_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{job.employer.company_name}</span>
                <VerificationBadge status={job.employer.verification_status} size="sm" showLabel={false} verificationMethod={job.employer.verification_method} googleBusinessVerified={job.employer.google_business_verified || false} />
                {job.employer.is_government && <GovernmentEmployerBadge variant="compact" />}
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {job.employer.industry && <span className="text-sm text-muted-foreground">{job.employer.industry}</span>}
            </div>
          </Link>

          {/* Key Info Pills */}
          <div className="flex flex-wrap gap-2">
            {job.job_address && (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm font-normal rounded-lg">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="truncate max-w-[200px]">{job.job_address}</span>
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm font-normal rounded-lg">
              <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
              {job.job_type || 'Full-time'}
            </Badge>
            {job.salary_range && (
              <Badge className="gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-success/10 text-success border-success/20 hover:bg-success/15">
                <IndianRupee className="w-3.5 h-3.5" />
                {job.salary_range}
              </Badge>
            )}
            {job.salary_range && <SalaryBadge salaryRange={job.salary_range} />}
            {job.has_bonus && (
              <Badge className="gap-1 px-3 py-1.5 text-sm font-semibold rounded-lg bg-warning/10 text-warning border-warning/20">
                <Gift className="w-3.5 h-3.5" /> +Bonus
              </Badge>
            )}
          </div>
        </motion.div>

        {/* ===== STATS ROW ===== */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { icon: Timer, label: 'Posted', value: job.created_at ? formatDate(job.created_at) : 'Recently' },
            { icon: Eye, label: 'Views', value: String(job.view_count || 0) },
            { icon: Users, label: 'Applicants', value: String(applicantCount) },
            { icon: UserCheck, label: 'Openings', value: String(job.openings || 1) },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50 border border-border/50">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-bold text-foreground truncate">{stat.value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ===== APPLY CTA (Desktop) ===== */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="hidden lg:block mb-8">
          <div className={`flex items-center justify-between p-5 rounded-2xl border ${
            isGovernmentJob ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-primary/5 border-primary/20'
          }`}>
            {hasApplied ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-semibold">Application Submitted</p>
                  <p className="text-sm text-muted-foreground">We'll notify you when there's an update</p>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="font-semibold text-foreground">Interested in this role?</p>
                  <p className="text-sm text-muted-foreground">Apply now and take the next step in your career</p>
                </div>
                <div className="flex items-center gap-3">
                  <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" className={`rounded-xl px-8 gap-2 ${isGovernmentJob ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>
                        <Send className="w-4 h-4" /> Apply Now
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-primary" />Apply for {job.title}</DialogTitle>
                        <DialogDescription>Submit your application to {job.employer.company_name}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                          <Textarea id="coverLetter" placeholder="Tell the employer why you're a great fit..." rows={6} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} className="resize-none rounded-xl" />
                        </div>
                      </div>
                      <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setApplyDialogOpen(false)} disabled={applying} className="rounded-xl">Cancel</Button>
                        <Button onClick={handleApply} disabled={applying} className="rounded-xl">
                          {applying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Submit Application'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" onClick={handleContactEmployer} disabled={contacting} className="rounded-xl gap-2">
                    {contacting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                    Message
                  </Button>
                  {job.employer.whatsapp_number && (
                    <WhatsAppButton phoneNumber={job.employer.whatsapp_number} className="rounded-xl" />
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* ===== MAIN CONTENT ===== */}
        <div className="space-y-6">
          {/* About this role */}
          {job.description && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-border/50 shadow-sm">
                <CardContent className="p-5 md:p-6">
                  <h2 className="flex items-center gap-2.5 text-lg font-bold mb-4">
                    <FileText className="w-5 h-5 text-primary" /> About This Role
                  </h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{job.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="border-border/50 shadow-sm">
                <CardContent className="p-5 md:p-6">
                  <h2 className="flex items-center gap-2.5 text-lg font-bold mb-4">
                    <Zap className="w-5 h-5 text-warning" /> Skills Required
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="px-3.5 py-1.5 text-sm rounded-lg font-medium">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Requirements */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-5 md:p-6">
                <h2 className="flex items-center gap-2.5 text-lg font-bold mb-4">
                  <Target className="w-5 h-5 text-success" /> Requirements
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <RequirementItem
                    icon={TrendingUp}
                    label="Experience"
                    value={
                      job.experience_type === 'Any' ? 'Any Level' :
                      job.experience_type === 'Fresher Only' ? 'Freshers Welcome' :
                      job.min_experience || job.max_experience
                        ? `${job.min_experience || 0} - ${job.max_experience || '10+'} years`
                        : job.experience_type || 'Not specified'
                    }
                  />
                  {job.education && <RequirementItem icon={GraduationCap} label="Education" value={job.education} />}
                  {job.languages && job.languages.length > 0 && <RequirementItem icon={Languages} label="Languages" value={job.languages.join(', ')} />}
                  {(job.min_age || job.max_age) && (
                    <RequirementItem
                      icon={User}
                      label="Age"
                      value={job.min_age && job.max_age ? `${job.min_age} - ${job.max_age} years` : job.min_age ? `Min ${job.min_age} years` : `Max ${job.max_age} years`}
                    />
                  )}
                  {job.certifications && <RequirementItem icon={BadgeCheck} label="Certifications" value={job.certifications} fullWidth />}
                </div>
                {job.additional_notes && (
                  <div className="mt-4 flex items-start gap-3 p-4 rounded-xl bg-warning/5 border border-warning/15">
                    <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-warning mb-0.5">Note from Employer</p>
                      <p className="text-sm text-muted-foreground">{job.additional_notes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Work Schedule */}
          {(job.shift_type || job.start_time || job.work_days?.length) && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Card className="border-border/50 shadow-sm">
                <CardContent className="p-5 md:p-6">
                  <h2 className="flex items-center gap-2.5 text-lg font-bold mb-4">
                    <Clock className="w-5 h-5 text-primary" /> Work Schedule
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {job.shift_type && (
                      <RequirementItem
                        icon={job.shift_type.toLowerCase().includes('night') ? Sunset : Sunrise}
                        label="Shift"
                        value={job.shift_type}
                      />
                    )}
                    {(job.start_time || job.end_time) && (
                      <RequirementItem icon={Clock} label="Hours" value={`${formatTime(job.start_time)} - ${formatTime(job.end_time)}`} />
                    )}
                  </div>
                  {job.work_days && job.work_days.length > 0 && (
                    <div className="mt-3 p-4 rounded-xl bg-muted/50 border border-border/50">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">Working Days</p>
                      <div className="flex flex-wrap gap-2">
                        {job.work_days.map((day, i) => (
                          <Badge key={i} variant="outline" className="rounded-lg px-3 py-1">{day}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {(job.interview_time || (job.interview_days && job.interview_days.length > 0)) && (
                    <div className="mt-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
                      <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Interview Schedule
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {job.interview_time && <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{job.interview_time}</span>}
                        {job.interview_days && job.interview_days.length > 0 && (
                          <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />{job.interview_days.join(', ')}</span>
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
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-border/50 shadow-sm">
                <CardContent className="p-5 md:p-6">
                  <h2 className="flex items-center gap-2.5 text-lg font-bold mb-4">
                    <Phone className="w-5 h-5 text-destructive" /> Contact Information
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {job.contact_person && (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
                        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Contact Person</p>
                          <p className="font-semibold">{job.contact_person}</p>
                          {job.contact_role && <p className="text-xs text-muted-foreground">{job.contact_role}</p>}
                        </div>
                      </div>
                    )}
                    {job.contact_phone && (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
                        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                          <Phone className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <a href={`tel:${job.contact_phone}`} className="font-semibold text-primary hover:underline">{job.contact_phone}</a>
                        </div>
                      </div>
                    )}
                    {job.contact_email && (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50 sm:col-span-2">
                        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                          <Mail className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <a href={`mailto:${job.contact_email}`} className="font-semibold text-primary hover:underline break-all">{job.contact_email}</a>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Company Overview */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-5 md:p-6">
                <h2 className="flex items-center gap-2.5 text-lg font-bold mb-4">
                  <Building2 className="w-5 h-5 text-primary" /> About {job.employer.company_name}
                </h2>
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 shrink-0 ${
                    isGovernmentJob ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' : 'bg-primary/5 border-primary/10'
                  }`}>
                    {job.employer.avatar_url ? (
                      <Avatar className="w-12 h-12 rounded-xl">
                        <AvatarImage src={job.employer.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-transparent text-primary"><Building2 className="w-6 h-6" /></AvatarFallback>
                      </Avatar>
                    ) : (
                      <Building2 className={`w-6 h-6 ${isGovernmentJob ? 'text-emerald-600' : 'text-primary'}`} />
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className="font-bold text-lg">{job.employer.company_name}</h4>
                      <p className="text-sm text-muted-foreground">{job.employer.industry || 'Multiple Industries'}</p>
                    </div>
                    {job.employer.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{job.employer.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4">
                      {job.organization_size && (
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" /> {job.organization_size}
                        </span>
                      )}
                      {job.employer.website_url && (
                        <a href={job.employer.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                          <Globe className="w-4 h-4" /> Website <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <Link to={`/employers/${job.employer.id}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                      View Company Profile <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Related Jobs */}
          {relatedJobs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="border-border/50 shadow-sm">
                <CardContent className="p-5 md:p-6">
                  <h2 className="flex items-center gap-2.5 text-lg font-bold mb-4">
                    <TrendingUp className="w-5 h-5 text-primary" /> More from {job.employer.company_name}
                  </h2>
                  <div className="space-y-2">
                    {relatedJobs.map((relJob) => (
                      <Link
                        key={relJob.id}
                        to={`/jobs/${relJob.id}`}
                        className="group flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold group-hover:text-primary transition-colors">{relJob.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{relJob.job_type || 'Full-time'}</span>
                              {relJob.salary_range && <span className="text-success font-medium">{relJob.salary_range}</span>}
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
      </div>

      {/* ===== MOBILE BOTTOM BAR ===== */}
      <AnimatePresence>
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 lg:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 p-3 z-50"
        >
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleSave} className={`w-11 h-11 rounded-xl shrink-0 ${isSaved ? 'bg-destructive/10 border-destructive text-destructive' : ''}`}>
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
            <Button variant="outline" size="icon" onClick={handleShare} className="w-11 h-11 rounded-xl shrink-0">
              <Share2 className="w-5 h-5" />
            </Button>
            {job.employer.whatsapp_number && (
              <WhatsAppButton phoneNumber={job.employer.whatsapp_number} variant="icon" className="shrink-0 w-11 h-11 rounded-xl" />
            )}
            {hasApplied ? (
              <Button disabled className="flex-1 h-11 rounded-xl">
                <CheckCircle className="w-5 h-5 mr-2" /> Applied
              </Button>
            ) : (
              <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
                <DialogTrigger asChild>
                  <Button className={`flex-1 h-11 rounded-xl font-semibold gap-2 ${isGovernmentJob ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>
                    <Send className="w-4 h-4" /> Apply Now
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-primary" />Apply for {job.title}</DialogTitle>
                    <DialogDescription>Submit your application to {job.employer.company_name}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="coverLetterMobile">Cover Letter (Optional)</Label>
                      <Textarea id="coverLetterMobile" placeholder="Tell the employer why you're a great fit..." rows={6} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} className="resize-none rounded-xl" />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setApplyDialogOpen(false)} disabled={applying} className="rounded-xl">Cancel</Button>
                    <Button onClick={handleApply} disabled={applying} className="rounded-xl">
                      {applying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : 'Submit Application'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ===== Reusable Requirement Item =====
const RequirementItem = ({ icon: Icon, label, value, fullWidth }: { icon: any; label: string; value: string; fullWidth?: boolean }) => (
  <div className={`flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50 ${fullWidth ? 'sm:col-span-2' : ''}`}>
    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  </div>
);

export default JobDetail;
