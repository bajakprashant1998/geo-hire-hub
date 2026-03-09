import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ReportDialog } from '@/components/ReportDialog';
import { VerificationBadge } from '@/components/employer/VerificationBadge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft, MapPin, Briefcase, Building2, Calendar, Clock, IndianRupee, Users, Eye, Share2, Send,
  CheckCircle, Globe, Target, TrendingUp, FileText, Zap, Heart, MessageSquare, GraduationCap,
  Languages, Phone, Mail, User, Gift, UserCheck, Sunrise, Sunset, CalendarDays, BadgeCheck,
  AlertCircle, Loader2, Sparkles, ChevronRight, Timer, Flame, ExternalLink, Trophy, Copy, Check,
  Bookmark, ArrowUpRight, Info,
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
import { DeadlineCountdown } from '@/components/DeadlineCountdown';
import { ResponseRateBadge } from '@/components/employer/ResponseRateBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  referral_bounty: number | null;
  expires_at: string | null;
  translations: Record<string, { title: string; description: string }> | null;
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
  const [generatingCL, setGeneratingCL] = useState(false);
  const [relatedJobs, setRelatedJobs] = useState<any[]>([]);
  const [applicantCount, setApplicantCount] = useState(0);
  const [contacting, setContacting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [activeSection, setActiveSection] = useState('about');
  const [viewLang, setViewLang] = useState('en');
  const [candidateData, setCandidateData] = useState<{ resume_url: string | null; skills: string[] | null } | null>(null);
  const [employerResponseRate, setEmployerResponseRate] = useState<number | null>(null);
  const [employerAvgResponseHours, setEmployerAvgResponseHours] = useState<number | null>(null);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );
    Object.values(sectionRefs.current).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [job]);

  const handleGenerateCoverLetter = async () => {
    if (!resolvedId) return;
    setGeneratingCL(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Please log in first'); return; }
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cover-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ jobId: resolvedId }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to generate');
      setCoverLetter(data.coverLetter);
      toast.success('Cover letter generated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate cover letter');
    } finally {
      setGeneratingCL(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('action') === 'apply' && !loading && job && !hasApplied && user) {
      setApplyDialogOpen(true);
    }
  }, [searchParams, loading, job, hasApplied, user]);

  useEffect(() => {
    if (!identifier) return;
    if (UUID_REGEX.test(identifier)) {
      supabase.from('jobs').select('id, slug, location_country, location_state, location_city').eq('id', identifier).maybeSingle().then(({ data }) => {
        if (data) {
          setResolvedId(data.id);
          if (data.slug) {
            const parts = ['/jobs'];
            if (data.location_country) parts.push(encodeURIComponent(data.location_country.toLowerCase().replace(/\s+/g, '-')));
            if (data.location_state) parts.push(encodeURIComponent(data.location_state.toLowerCase().replace(/\s+/g, '-')));
            if (data.location_city) parts.push(encodeURIComponent(data.location_city.toLowerCase().replace(/\s+/g, '-')));
            parts.push(data.slug);
            const seoPath = parts.join('/');
            if (window.location.pathname !== seoPath) navigate(seoPath + window.location.search, { replace: true });
          }
        } else setLoading(false);
      });
    } else {
      supabase.from('jobs').select('id').eq('slug', identifier).maybeSingle().then(({ data }) => {
        if (data) setResolvedId(data.id);
        else setLoading(false);
      });
    }
  }, [identifier]);

  useEffect(() => {
    if (resolvedId) { fetchJob(); checkIfApplied(); fetchApplicantCount(); checkIfSaved(); fetchCandidateData(); }
  }, [resolvedId]);

  const fetchCandidateData = async () => {
    if (!user || !profile || profile.user_type !== 'candidate') return;
    const { data: cand } = await supabase.from('candidates').select('resume_url, skills').eq('profile_id', profile.id).maybeSingle();
    if (cand) setCandidateData(cand);
  };

  const baseUrl = 'https://www.hireforjob.com';
  const jobSeoTitle = job ? `${job.title} at ${job.employer.company_name} | HireForJob` : 'Job Details | HireForJob';
  const jobSeoDesc = job ? `Apply for ${job.title} at ${job.employer.company_name}. ${job.job_type || 'Full-time'}${job.salary_range ? ` | ${job.salary_range}` : ''}${job.job_address ? ` | ${job.job_address}` : ''}` : '';
  const jobCanonical = job ? `${baseUrl}${window.location.pathname}` : undefined;

  const jobJsonLd = job ? (() => {
    const created = job.created_at ? new Date(job.created_at) : new Date();
    const validThrough = new Date(created);
    validThrough.setDate(validThrough.getDate() + 30);
    const addressParts = job.job_address?.split(',').map(s => s.trim()) || [];
    return {
      '@context': 'https://schema.org', '@type': 'JobPosting', title: job.title, description: job.description || '',
      identifier: { '@type': 'PropertyValue', name: job.employer.company_name, value: job.id },
      hiringOrganization: { '@type': 'Organization', name: job.employer.company_name, ...(job.employer.avatar_url && { logo: job.employer.avatar_url }), ...(job.employer.website_url && { sameAs: job.employer.website_url }) },
      employmentType: job.job_type?.toUpperCase().replace(/\s+/g, '_') || 'FULL_TIME',
      datePosted: created.toISOString(), validThrough: validThrough.toISOString(), directApply: true,
      jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', ...(addressParts[0] && { addressLocality: addressParts[0] }), ...(addressParts[1] && { addressRegion: addressParts[1] }), ...(addressParts[2] && { addressCountry: addressParts[2] }), ...(job.job_address && { streetAddress: job.job_address }) } },
      ...(job.salary_range && { baseSalary: { '@type': 'MonetaryAmount', currency: 'INR', value: { '@type': 'QuantitativeValue', value: job.salary_range, unitText: 'MONTH' } } }),
    };
  })() : undefined;

  const breadcrumbItems: BreadcrumbItem[] = job ? [
    { label: 'Jobs', href: '/browse-jobs' },
    ...(job.job_address ? [{ label: job.job_address }] : []),
    { label: job.title },
  ] : [];
  const breadcrumbJsonLd = job ? buildBreadcrumbJsonLd(breadcrumbItems) : undefined;

  const id = resolvedId;

  const fetchJob = async () => {
    try {
      const { data, error } = await supabase.from('jobs').select(`*, employers!inner ( id, company_name, industry, website_url, description, is_government, verification_status, verification_method, google_business_verified, profiles!inner ( avatar_url, user_id, whatsapp_number ) )`).eq('id', resolvedId).maybeSingle();
      if (error) throw error;
      if (!data) { setLoading(false); return; }
      setJob({
        ...data,
        translations: data.translations as Record<string, { title: string; description: string }> | null,
        employer: {
          id: data.employers.id, company_name: data.employers.company_name, industry: data.employers.industry,
          website_url: data.employers.website_url, avatar_url: data.employers.profiles?.avatar_url,
          description: data.employers.description, user_id: data.employers.profiles?.user_id,
          whatsapp_number: data.employers.profiles?.whatsapp_number,
          verification_status: (data.employers.verification_status as any) || 'pending',
          verification_method: data.employers.verification_method || null,
          google_business_verified: data.employers.google_business_verified || null,
          is_government: data.employers.is_government,
        },
      });
      const { data: related } = await supabase.from('jobs').select('id, title, job_type, salary_range, created_at, slug').eq('employer_id', data.employers.id).neq('id', id).eq('status', 'open').limit(3);
      setRelatedJobs(related || []);

      // Fetch employer response rate
      const { data: empData } = await supabase.from('employers').select('response_rate, avg_response_hours').eq('id', data.employers.id).maybeSingle();
      if (empData) {
        setEmployerResponseRate(empData.response_rate);
        setEmployerAvgResponseHours(empData.avg_response_hours);
      }

      // Record job view (only for authenticated users to avoid wasted rows)
      if (user) {
        supabase.from('job_views').insert({
          job_id: resolvedId!,
          viewer_id: user.id,
        }).then(({ error: viewErr }) => {
          if (viewErr) console.warn('Failed to record job view:', viewErr.message);
        });
      }
    } catch (error: any) {
      console.error('Error fetching job:', error);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicantCount = async () => {
    const { count } = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('job_id', id);
    setApplicantCount(count || 0);
  };

  const checkIfApplied = async () => {
    if (!user) return;
    const { data: candidate } = await supabase.from('candidates').select('id').eq('profile_id', profile?.id).maybeSingle();
    if (!candidate) return;
    const { data: application } = await supabase.from('applications').select('id').eq('job_id', id).eq('candidate_id', candidate.id).maybeSingle();
    setHasApplied(!!application);
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
      // Auto-save the job on apply
      if (!isSaved) {
        supabase.from('saved_jobs').insert({ candidate_id: candidate.id, job_id: resolvedId }).then(() => {});
        setIsSaved(true);
      }
      setHasApplied(true);
      setApplyDialogOpen(false);
      toast.success('Application submitted successfully! 🎉');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const checkIfSaved = async () => {
    if (!user || !profile) return;
    const { data: candidate } = await supabase.from('candidates').select('id').eq('profile_id', profile.id).maybeSingle();
    if (!candidate) return;
    const { data } = await supabase.from('saved_jobs').select('id').eq('job_id', resolvedId).eq('candidate_id', candidate.id).maybeSingle();
    setIsSaved(!!data);
  };

  const handleSave = async () => {
    if (!user || !profile) { toast.error('Please login to save jobs'); navigate('/login'); return; }
    if (profile.user_type !== 'candidate') { toast.error('Only candidates can save jobs'); return; }
    try {
      const { data: candidate } = await supabase.from('candidates').select('id').eq('profile_id', profile.id).maybeSingle();
      if (!candidate) { toast.error('Please complete your profile first'); return; }
      if (isSaved) {
        const { error } = await supabase.from('saved_jobs').delete().eq('candidate_id', candidate.id).eq('job_id', resolvedId);
        if (error) throw error;
        setIsSaved(false);
        toast.success('Job removed from saved');
      } else {
        const { error } = await supabase.from('saved_jobs').insert({ candidate_id: candidate.id, job_id: resolvedId });
        if (error) throw error;
        setIsSaved(true);
        toast.success('Job saved!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save job');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: job?.title, text: `Check out this job at ${job?.employer.company_name}`, url: window.location.href });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleReferFriend = async () => {
    if (!user || !profile) { toast.error('Please log in to refer a friend'); return; }
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = 'HFJ-';
      for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      const { error } = await supabase.from('referrals').insert({ referrer_id: profile.id, referral_code: code, job_id: resolvedId });
      if (error) throw error;
      const link = `${window.location.origin}/signup?ref=${code}`;
      try {
        await navigator.share({ title: `Referral: ${job?.title} at ${job?.employer.company_name}`, text: `I think you'd be great for this role!${(job?.referral_bounty ?? 0) > 0 ? ` 🏆 ${job?.referral_bounty} points bounty!` : ''}`, url: link });
      } catch {
        await navigator.clipboard.writeText(link);
        toast.success('Referral link copied!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create referral');
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
    const diffDays = Math.ceil(Math.abs(Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (time: string | null) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    return `${h % 12 || 12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const isNew = job?.created_at && new Date(job.created_at) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const isGovernmentJob = job?.job_category === 'government';

  // Build quick-nav sections
  const sections = job ? [
    { id: 'about', label: 'About', icon: FileText, show: !!job.description },
    { id: 'skills', label: 'Skills', icon: Zap, show: !!(job.skills && job.skills.length > 0) },
    { id: 'requirements', label: 'Requirements', icon: Target, show: true },
    { id: 'schedule', label: 'Schedule', icon: Clock, show: !!(job.shift_type || job.start_time || job.work_days?.length) },
    { id: 'contact', label: 'Contact', icon: Phone, show: !!(job.contact_person || job.contact_phone || job.contact_email) },
    { id: 'company', label: 'Company', icon: Building2, show: true },
  ].filter(s => s.show) : [];

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          <Skeleton className="h-5 w-48 mb-4" />
          <Skeleton className="h-10 w-24 mb-8" />
          <div className="grid lg:grid-cols-[1fr_340px] gap-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <div className="flex gap-2"><Skeleton className="h-8 w-24 rounded-full" /><Skeleton className="h-8 w-32 rounded-full" /><Skeleton className="h-8 w-28 rounded-full" /></div>
              </div>
              <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
            <div className="hidden lg:block space-y-4">
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not Found
  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted flex items-center justify-center">
            <Briefcase className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Job Not Found</h2>
          <p className="text-muted-foreground mb-6">This job listing may have been removed or is no longer available.</p>
          <Button onClick={() => navigate('/browse-jobs')} className="rounded-full px-8"><ArrowLeft className="w-4 h-4 mr-2" /> Browse Jobs</Button>
        </motion.div>
      </div>
    );
  }

  // Apply Dialog content (reusable)
  const applyDialogContent = (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-primary" />Apply for {job.title}</DialogTitle>
        <DialogDescription>Submit your application to {job.employer.company_name}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {/* Profile completeness warnings */}
        {candidateData && (!candidateData.resume_url || !candidateData.skills?.length || !profile?.avatar_url) && (
          <Alert className="border-warning/30 bg-warning/5">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm">
              <p className="font-medium text-foreground mb-1">Improve your chances:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5 text-xs">
                {!candidateData.resume_url && <li>Upload your resume for better visibility</li>}
                {!candidateData.skills?.length && <li>Add skills to match with this job</li>}
                {!profile?.avatar_url && <li>Add a profile photo to build trust</li>}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
            <Button type="button" variant="ghost" size="sm" onClick={handleGenerateCoverLetter} disabled={generatingCL} className="h-7 text-xs gap-1.5 text-primary hover:text-primary">
              {generatingCL ? <><Loader2 className="w-3 h-3 animate-spin" />Generating...</> : <><Sparkles className="w-3 h-3" />AI Generate</>}
            </Button>
          </div>
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
  );

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8">
      <SEOHead title={jobSeoTitle} description={jobSeoDesc} canonicalUrl={jobCanonical} ogType="article" ogImage={job?.employer.avatar_url || undefined} jsonLd={jobJsonLd} breadcrumbJsonLd={breadcrumbJsonLd} publishedTime={job?.created_at || undefined} />

      {/* ===== TOP NAV BAR ===== */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex items-center gap-1">
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleSave} className={`rounded-full ${isSaved ? 'text-destructive' : 'text-muted-foreground'}`}>
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
              </Button>
            </TooltipTrigger><TooltipContent>{isSaved ? 'Unsave' : 'Save job'}</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleShare} className="rounded-full text-muted-foreground">
                {linkCopied ? <Check className="w-5 h-5 text-success" /> : <Share2 className="w-5 h-5" />}
              </Button>
            </TooltipTrigger><TooltipContent>{linkCopied ? 'Copied!' : 'Share'}</TooltipContent></Tooltip>
            {user && profile?.user_type === 'candidate' && (
              <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleReferFriend} className="rounded-full text-muted-foreground hover:text-primary">
                  <Trophy className="w-5 h-5" />
                </Button>
              </TooltipTrigger><TooltipContent>Refer a Friend{(job?.referral_bounty ?? 0) > 0 ? ` (+${job?.referral_bounty} pts)` : ''}</TooltipContent></Tooltip>
            )}
            <ReportDialog targetId={id || ''} targetType="job" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl pt-2">
        <BreadcrumbNav items={breadcrumbItems} />
      </div>

      <div className="container mx-auto px-4 max-w-5xl py-6">
        {/* ===== 2-COLUMN LAYOUT ===== */}
        <div className="grid lg:grid-cols-[1fr_340px] gap-8">

          {/* ===== LEFT COLUMN: MAIN CONTENT ===== */}
          <div className="min-w-0">
            {/* HERO */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {isGovernmentJob && <GovernmentJobBadge variant="large" />}
                {isNew && <Badge className="bg-warning/15 text-warning border-warning/30 gap-1"><Sparkles className="w-3 h-3" /> New</Badge>}
                {job.hiring_urgency === 'Immediately' && <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1 animate-pulse"><Flame className="w-3 h-3" /> Urgent Hiring</Badge>}
                {job.expires_at && <DeadlineCountdown expiresAt={job.expires_at} />}
              </div>

              {/* Language Switcher */}
              {job.translations && Object.keys(job.translations).length > 0 && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Languages className="w-4 h-4 text-muted-foreground" />
                  <button
                    onClick={() => setViewLang('en')}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${viewLang === 'en' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    🇬🇧 EN
                  </button>
                  {Object.keys(job.translations).map(code => {
                    const flags: Record<string, string> = { es: '🇪🇸', fr: '🇫🇷', hi: '🇮🇳', ar: '🇸🇦', pt: '🇧🇷', zh: '🇨🇳', ja: '🇯🇵' };
                    return (
                      <button
                        key={code}
                        onClick={() => setViewLang(code)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${viewLang === code ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {flags[code] || ''} {code.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 tracking-tight leading-tight">
                {viewLang !== 'en' && job.translations?.[viewLang]?.title ? job.translations[viewLang].title : job.title}
              </h1>

              {/* Company link */}
              <Link to={`/employers/${job.employer.id}`} className="inline-flex items-center gap-3 mb-4 group">
                <Avatar className="w-10 h-10 border-2 border-border">
                  <AvatarImage src={job.employer.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{job.employer.company_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{job.employer.company_name}</span>
                    <VerificationBadge status={job.employer.verification_status} size="sm" showLabel={false} verificationMethod={job.employer.verification_method} googleBusinessVerified={job.employer.google_business_verified || false} />
                    {job.employer.is_government && <GovernmentEmployerBadge variant="compact" />}
                  </div>
                  {job.employer.industry && <span className="text-sm text-muted-foreground">{job.employer.industry}</span>}
                </div>
              </Link>
              {employerResponseRate !== null && (
                <div className="mb-4 -mt-2">
                  <ResponseRateBadge responseRate={employerResponseRate} avgResponseHours={employerAvgResponseHours} />
                </div>
              )}

              {/* Key info pills */}
              <div className="flex flex-wrap gap-2">
                {job.job_address && (
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm font-normal rounded-lg">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="truncate max-w-[200px]">{job.job_address}</span>
                  </Badge>
                )}
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm font-normal rounded-lg">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" /> {job.job_type || 'Full-time'}
                </Badge>
                {job.salary_range && (
                  <Badge className="gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-success/10 text-success border-success/20 hover:bg-success/15">
                    <IndianRupee className="w-3.5 h-3.5" /> {job.salary_range}
                  </Badge>
                )}
                {job.salary_range && <SalaryBadge salaryRange={job.salary_range} />}
                {job.has_bonus && <Badge className="gap-1 px-3 py-1.5 text-sm font-semibold rounded-lg bg-warning/10 text-warning border-warning/20"><Gift className="w-3.5 h-3.5" /> +Bonus</Badge>}
                {(job.referral_bounty ?? 0) > 0 && <Badge className="gap-1 px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary/10 text-primary border-primary/20"><Trophy className="w-3.5 h-3.5" /> {job.referral_bounty} pts Bounty</Badge>}
              </div>
            </motion.div>

            {/* STATS ROW */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { icon: Timer, label: 'Posted', value: job.created_at ? formatDate(job.created_at) : 'Recently', color: 'text-primary' },
                { icon: Eye, label: 'Views', value: String(job.view_count || 0), color: 'text-primary' },
                { icon: Users, label: 'Applicants', value: String(applicantCount), color: 'text-primary' },
                { icon: UserCheck, label: 'Openings', value: String(job.openings || 1), color: 'text-primary' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl bg-muted/50 border border-border/50">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="font-bold text-sm text-foreground truncate">{stat.value}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* QUICK NAV (horizontal scroll on mobile) */}
            {sections.length > 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="mb-6 -mx-4 px-4 lg:mx-0 lg:px-0">
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {sections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => sectionRefs.current[s.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                        activeSection === s.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <s.icon className="w-3.5 h-3.5" /> {s.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* MOBILE APPLY CTA */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="lg:hidden mb-6">
              {hasApplied ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-success/5 border border-success/20">
                  <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-success" /></div>
                  <div>
                    <p className="font-semibold text-success">Application Submitted</p>
                    <p className="text-xs text-muted-foreground">We'll notify you on updates</p>
                  </div>
                </div>
              ) : (
                <div className={`p-4 rounded-2xl border ${isGovernmentJob ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-primary/5 border-primary/20'}`}>
                  {job.expires_at && <DeadlineCountdown expiresAt={job.expires_at} variant="card" className="mb-3" />}
                  <p className="font-semibold mb-1">Interested in this role?</p>
                  <p className="text-sm text-muted-foreground mb-3">Apply now and take the next step</p>
                  <div className="flex gap-2">
                    <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className={`flex-1 rounded-xl gap-2 ${isGovernmentJob ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}><Send className="w-4 h-4" /> Apply Now</Button>
                      </DialogTrigger>
                      {applyDialogContent}
                    </Dialog>
                    <Button variant="outline" onClick={handleContactEmployer} disabled={contacting} className="rounded-xl gap-2">
                      {contacting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />} Message
                    </Button>
                    {job.employer.whatsapp_number && <WhatsAppButton phoneNumber={job.employer.whatsapp_number} className="rounded-xl" />}
                  </div>
                </div>
              )}
            </motion.div>

            {/* ===== CONTENT SECTIONS ===== */}
            <div className="space-y-5">
              {/* About */}
              {job.description && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} id="about" ref={(el) => { sectionRefs.current['about'] = el; }}>
                  <Card className="border-border/50 shadow-sm overflow-hidden">
                    <CardContent className="p-5 md:p-6">
                      <h2 className="flex items-center gap-2.5 text-lg font-bold mb-4"><FileText className="w-5 h-5 text-primary" /> About This Role</h2>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-[15px]">
                        {viewLang !== 'en' && job.translations?.[viewLang]?.description ? job.translations[viewLang].description : job.description}
                      </p>
                      {job.has_bonus && (
                        <Badge variant="outline" className="mt-4 gap-1 border-success/30 text-success bg-success/5"><CheckCircle className="w-3 h-3" /> Bonus / Incentive Available</Badge>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Skills */}
              {job.skills && job.skills.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} id="skills" ref={(el) => { sectionRefs.current['skills'] = el; }}>
                  <Card className="border-border/50 shadow-sm">
                    <CardContent className="p-5 md:p-6">
                      <h2 className="flex items-center gap-2.5 text-lg font-bold mb-4"><Zap className="w-5 h-5 text-warning" /> Skills Required</h2>
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map((skill, i) => (
                          <Badge key={i} variant="secondary" className="px-3.5 py-1.5 text-sm rounded-lg font-medium hover:bg-secondary/80 transition-colors">{skill}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Requirements */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} id="requirements" ref={(el) => { sectionRefs.current['requirements'] = el; }}>
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="p-5 md:p-6">
                    <h2 className="flex items-center gap-2.5 text-lg font-bold mb-4"><Target className="w-5 h-5 text-success" /> Requirements</h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <RequirementItem icon={TrendingUp} label="Experience" value={
                        job.experience_type === 'Any' ? 'Any Level' :
                        job.experience_type === 'Fresher Only' ? 'Freshers Welcome' :
                        job.min_experience || job.max_experience ? `${job.min_experience || 0} - ${job.max_experience || '10+'} years` : job.experience_type || 'Not specified'
                      } />
                      {job.education && <RequirementItem icon={GraduationCap} label="Education" value={job.education} />}
                      {job.languages && job.languages.length > 0 && <RequirementItem icon={Languages} label="Languages" value={job.languages.join(', ')} />}
                      {(job.min_age || job.max_age) && <RequirementItem icon={User} label="Age" value={job.min_age && job.max_age ? `${job.min_age} - ${job.max_age} years` : job.min_age ? `Min ${job.min_age} years` : `Max ${job.max_age} years`} />}
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
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} id="schedule" ref={(el) => { sectionRefs.current['schedule'] = el; }}>
                  <Card className="border-border/50 shadow-sm">
                    <CardContent className="p-5 md:p-6">
                      <h2 className="flex items-center gap-2.5 text-lg font-bold mb-4"><Clock className="w-5 h-5 text-primary" /> Work Schedule</h2>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {job.shift_type && <RequirementItem icon={job.shift_type.toLowerCase().includes('night') ? Sunset : Sunrise} label="Shift" value={job.shift_type} />}
                        {(job.start_time || job.end_time) && <RequirementItem icon={Clock} label="Hours" value={`${formatTime(job.start_time)} - ${formatTime(job.end_time)}`} />}
                      </div>
                      {job.work_days && job.work_days.length > 0 && (
                        <div className="mt-3 p-4 rounded-xl bg-muted/50 border border-border/50">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">Working Days</p>
                          <div className="flex flex-wrap gap-2">
                            {job.work_days.map((day, i) => <Badge key={i} variant="outline" className="rounded-lg px-3 py-1">{day}</Badge>)}
                          </div>
                        </div>
                      )}
                      {(job.interview_time || (job.interview_days && job.interview_days.length > 0)) && (
                        <div className="mt-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
                          <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-2"><Calendar className="w-4 h-4" /> Interview Schedule</p>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {job.interview_time && <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{job.interview_time}</span>}
                            {job.interview_days && job.interview_days.length > 0 && <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />{job.interview_days.join(', ')}</span>}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Contact */}
              {(job.contact_person || job.contact_phone || job.contact_email) && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} id="contact" ref={(el) => { sectionRefs.current['contact'] = el; }}>
                  <Card className="border-border/50 shadow-sm">
                    <CardContent className="p-5 md:p-6">
                      <h2 className="flex items-center gap-2.5 text-lg font-bold mb-4"><Phone className="w-5 h-5 text-destructive" /> Contact Information</h2>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {job.contact_person && (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
                            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0"><User className="w-5 h-5 text-destructive" /></div>
                            <div>
                              <p className="text-xs text-muted-foreground">Contact Person</p>
                              <p className="font-semibold">{job.contact_person}</p>
                              {job.contact_role && <p className="text-xs text-muted-foreground">{job.contact_role}</p>}
                            </div>
                          </div>
                        )}
                        {job.contact_phone && (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
                            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0"><Phone className="w-5 h-5 text-destructive" /></div>
                            <div>
                              <p className="text-xs text-muted-foreground">Phone</p>
                              <a href={`tel:${job.contact_phone}`} className="font-semibold text-primary hover:underline">{job.contact_phone}</a>
                            </div>
                          </div>
                        )}
                        {job.contact_email && (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50 sm:col-span-2">
                            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0"><Mail className="w-5 h-5 text-destructive" /></div>
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

              {/* Company */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} id="company" ref={(el) => { sectionRefs.current['company'] = el; }}>
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="p-5 md:p-6">
                    <h2 className="flex items-center gap-2.5 text-lg font-bold mb-4"><Building2 className="w-5 h-5 text-primary" /> About {job.employer.company_name}</h2>
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 shrink-0 ${isGovernmentJob ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' : 'bg-primary/5 border-primary/10'}`}>
                        {job.employer.avatar_url ? (
                          <Avatar className="w-12 h-12 rounded-xl"><AvatarImage src={job.employer.avatar_url} className="object-cover" /><AvatarFallback className="bg-transparent text-primary"><Building2 className="w-6 h-6" /></AvatarFallback></Avatar>
                        ) : (
                          <Building2 className={`w-6 h-6 ${isGovernmentJob ? 'text-emerald-600' : 'text-primary'}`} />
                        )}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <h4 className="font-bold text-lg">{job.employer.company_name}</h4>
                          <p className="text-sm text-muted-foreground">{job.employer.industry || 'Multiple Industries'}</p>
                        </div>
                        {job.employer.description && <p className="text-sm text-muted-foreground leading-relaxed">{job.employer.description}</p>}
                        <div className="flex flex-wrap items-center gap-4">
                          {job.organization_size && <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="w-4 h-4" /> {job.organization_size}</span>}
                          {job.employer.website_url && <a href={job.employer.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"><Globe className="w-4 h-4" /> Website <ExternalLink className="w-3 h-3" /></a>}
                          {employerResponseRate !== null && <ResponseRateBadge responseRate={employerResponseRate} avgResponseHours={employerAvgResponseHours} size="md" />}
                        </div>
                        <Link to={`/employers/${job.employer.id}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">View Company Profile <ChevronRight className="w-4 h-4" /></Link>
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
                      <h2 className="flex items-center gap-2.5 text-lg font-bold mb-4"><TrendingUp className="w-5 h-5 text-primary" /> More from {job.employer.company_name}</h2>
                      <div className="space-y-2">
                        {relatedJobs.map((relJob) => (
                          <Link key={relJob.id} to={relJob.slug ? `/jobs/${relJob.slug}` : `/jobs/${relJob.id}`} className="group flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Briefcase className="w-5 h-5 text-primary" /></div>
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

          {/* ===== RIGHT COLUMN: STICKY SIDEBAR (Desktop) ===== */}
          <div className="hidden lg:block">
            <div className="sticky top-[72px] space-y-4">
              {/* Apply Card */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <Card className={`shadow-md border-2 ${hasApplied ? 'border-success/30' : isGovernmentJob ? 'border-emerald-300 dark:border-emerald-700' : 'border-primary/30'}`}>
                  <CardContent className="p-5 space-y-4">
                    {hasApplied ? (
                      <div className="text-center py-3">
                        <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-3"><CheckCircle className="w-7 h-7 text-success" /></div>
                        <p className="font-bold text-lg text-success">Applied!</p>
                        <p className="text-sm text-muted-foreground mt-1">We'll notify you on updates</p>
                      </div>
                    ) : (
                      <>
                        {job.expires_at && <DeadlineCountdown expiresAt={job.expires_at} variant="card" />}
                        <div>
                          <p className="font-bold text-lg mb-1">Interested in this role?</p>
                          <p className="text-sm text-muted-foreground">Apply now and take the next step in your career</p>
                        </div>
                        <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="lg" className={`w-full rounded-xl gap-2 text-base ${isGovernmentJob ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>
                              <Send className="w-4 h-4" /> Apply Now
                            </Button>
                          </DialogTrigger>
                          {applyDialogContent}
                        </Dialog>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={handleContactEmployer} disabled={contacting} className="flex-1 rounded-xl gap-2">
                            {contacting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />} Message
                          </Button>
                          {job.employer.whatsapp_number && <WhatsAppButton phoneNumber={job.employer.whatsapp_number} className="rounded-xl flex-1" />}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Summary Card */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="p-5">
                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Info className="w-4 h-4 text-muted-foreground" /> Job Summary</h3>
                    <div className="space-y-3">
                      {[
                        { icon: MapPin, label: 'Location', value: job.job_address || 'Not specified' },
                        { icon: Briefcase, label: 'Type', value: job.job_type || 'Full-time' },
                        { icon: IndianRupee, label: 'Salary', value: job.salary_range || 'Not disclosed' },
                        { icon: TrendingUp, label: 'Experience', value: job.experience_type === 'Any' ? 'Any Level' : job.experience_type === 'Fresher Only' ? 'Freshers Welcome' : job.min_experience || job.max_experience ? `${job.min_experience || 0}-${job.max_experience || '10+'}y` : 'Not specified' },
                        { icon: GraduationCap, label: 'Education', value: job.education || 'Not specified' },
                        { icon: UserCheck, label: 'Openings', value: String(job.openings || 1) },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground"><item.icon className="w-3.5 h-3.5" /> {item.label}</span>
                          <span className="font-medium text-foreground text-right max-w-[160px] truncate">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Actions */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
                <div className="space-y-2">
                  <Button variant="outline" onClick={handleSave} className={`w-full rounded-xl justify-start gap-2 ${isSaved ? 'border-destructive/30 text-destructive bg-destructive/5' : ''}`}>
                    <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} /> {isSaved ? 'Saved' : 'Save Job'}
                  </Button>
                  <Button variant="outline" onClick={handleShare} className="w-full rounded-xl justify-start gap-2">
                    {linkCopied ? <Check className="w-4 h-4 text-success" /> : <Share2 className="w-4 h-4" />} {linkCopied ? 'Link Copied!' : 'Share Job'}
                  </Button>
                  {user && profile?.user_type === 'candidate' && (
                    <Button variant="outline" onClick={handleReferFriend} className="w-full rounded-xl justify-start gap-2 text-primary border-primary/20 hover:bg-primary/5">
                      <Trophy className="w-4 h-4" /> Refer a Friend {(job?.referral_bounty ?? 0) > 0 && <Badge variant="secondary" className="ml-auto text-xs">+{job.referral_bounty} pts</Badge>}
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MOBILE BOTTOM BAR ===== */}
      <AnimatePresence>
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-0 left-0 right-0 lg:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 p-3 z-50 safe-area-pb">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleSave} className={`w-11 h-11 rounded-xl shrink-0 ${isSaved ? 'bg-destructive/10 border-destructive text-destructive' : ''}`}>
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
            <Button variant="outline" size="icon" onClick={handleShare} className="w-11 h-11 rounded-xl shrink-0">
              {linkCopied ? <Check className="w-5 h-5 text-success" /> : <Share2 className="w-5 h-5" />}
            </Button>
            {job.employer.whatsapp_number && <WhatsAppButton phoneNumber={job.employer.whatsapp_number} variant="icon" className="shrink-0 w-11 h-11 rounded-xl" />}
            {hasApplied ? (
              <Button disabled className="flex-1 h-11 rounded-xl"><CheckCircle className="w-5 h-5 mr-2" /> Applied</Button>
            ) : (
              <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
                <DialogTrigger asChild>
                  <Button className={`flex-1 h-11 rounded-xl font-semibold gap-2 ${isGovernmentJob ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>
                    <Send className="w-4 h-4" /> Apply Now
                  </Button>
                </DialogTrigger>
                {applyDialogContent}
              </Dialog>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Reusable Requirement Item
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
