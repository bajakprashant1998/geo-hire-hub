import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, MapPin, Briefcase, GraduationCap, Clock, Globe,
  Download, MessageCircle, Heart, Share2, Banknote, Calendar,
  Award, User, Link as LinkIcon, ExternalLink,
  Loader2, Languages, BadgeCheck, Building2, Github, Linkedin, Twitter,
  Instagram, Youtube, Lock, LogIn, ChevronRight, Sparkles,
  Star, TrendingUp, Zap, FileText, CheckCircle2, BookOpen,
  Target, Shield, Lightbulb, FolderOpen, Coffee, Bell,
  Home, Timer, Plane, Code, Gamepad2, Music, Palette, Camera
} from 'lucide-react';
import { toast } from 'sonner';
import { useStartConversation } from '@/hooks/useStartConversation';
import { useAuth } from '@/hooks/useAuth';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { ProfilePDFExport } from '@/components/candidate/ProfilePDFExport';
import { ReportDialog } from '@/components/ReportDialog';
import { SEOHead } from '@/components/SEOHead';
import { SkillEndorsements } from '@/components/candidate/SkillEndorsements';
import { motion } from 'framer-motion';

interface Education { institution: string; degree: string; field: string; startYear: string; endYear: string; }
interface WorkExperience { company: string; title: string; startDate: string; endDate: string; isCurrent: boolean; description: string; }
interface Language { language: string; proficiency: string; }
interface SocialLinks { linkedin?: string; github?: string; twitter?: string; instagram?: string; youtube?: string; website?: string; }
interface Project { name: string; description?: string; url?: string; technologies?: string[]; }

interface CandidateProfile {
  id: string; profile_id: string; full_name: string; avatar_url: string | null;
  job_title: string; bio: string | null; experience_years: number | null;
  expected_salary: string | null; skills: string[] | null; portfolio_urls: string[] | null;
  education: Education[] | null; latitude: number | null; longitude: number | null;
  created_at: string | null; resume_url: string | null; whatsapp_number: string | null;
  headline: string | null; work_experience: WorkExperience[] | null;
  certifications: string[] | null; languages: Language[] | null;
  social_links: SocialLinks | null; availability_status: string | null;
  location_city: string | null; location_country: string | null;
  career_objective: string | null; achievements: string[] | null;
  strengths: string[] | null; hobbies: string[] | null;
  projects: Project[] | null; notice_period: string | null;
  work_authorization: string | null; remote_preference: string | null;
  current_company: string | null; current_salary: string | null;
  willing_to_relocate: boolean | null; salary_currency: string | null;
  gender: string | null; nationality: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const easeOut: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: easeOut },
};

const stagger = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: easeOut },
});

const SectionCard = ({ children, title, icon: Icon, badge, delay = 0 }: {
  children: React.ReactNode; title: string; icon: any; badge?: React.ReactNode; delay?: number;
}) => (
  <motion.div {...stagger(delay)}>
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4.5 h-4.5 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h3>
          {badge && <div className="ml-auto">{badge}</div>}
        </div>
        {children}
      </CardContent>
    </Card>
  </motion.div>
);

const CandidateDetail = ({ id: propId }: { id?: string }) => {
  const params = useParams();
  const identifier = propId || params.slug || params.id || params['*']?.split('/').pop();
  const [resolvedId, setResolvedId] = useState<string | null>(propId || null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startConversation } = useStartConversation();
  const { user, profile } = useAuth();
  const isEmployerUser = user && profile?.user_type === 'employer';
  const isOwnProfile = !!propId;
  const profileContentRef = useRef<HTMLDivElement>(null);
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [candidateUserId, setCandidateUserId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('action') === 'contact' && !loading && candidate && candidateUserId && isEmployerUser) {
      handleContact();
    }
  }, [searchParams, loading, candidate, candidateUserId, isEmployerUser]);

  const redirectToSeoPath = (candidateId: string, profileData: any) => {
    if (profileData?.slug) {
      const parts = ['/candidates'];
      if (profileData.location_country) parts.push(encodeURIComponent(profileData.location_country.toLowerCase().replace(/\s+/g, '-')));
      if (profileData.location_state) parts.push(encodeURIComponent(profileData.location_state.toLowerCase().replace(/\s+/g, '-')));
      if (profileData.location_city) parts.push(encodeURIComponent(profileData.location_city.toLowerCase().replace(/\s+/g, '-')));
      parts.push(profileData.slug);
      const seoPath = parts.join('/');
      if (window.location.pathname !== seoPath) {
        navigate(seoPath + window.location.search, { replace: true });
      }
    }
  };

  useEffect(() => {
    if (!identifier || propId) return;
    if (UUID_REGEX.test(identifier)) {
      supabase
        .from('candidates')
        .select('id, profiles!inner(slug, location_country, location_state, location_city)')
        .eq('id', identifier)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setResolvedId(data.id);
            redirectToSeoPath(data.id, data.profiles as any);
          } else {
            supabase
              .from('candidates')
              .select('id, profiles!inner(slug, location_country, location_state, location_city)')
              .eq('profile_id', identifier)
              .maybeSingle()
              .then(({ data: candByProfile }) => {
                if (candByProfile) {
                  setResolvedId(candByProfile.id);
                  redirectToSeoPath(candByProfile.id, candByProfile.profiles as any);
                } else {
                  setLoading(false);
                }
              });
          }
        });
    } else {
      supabase
        .from('profiles')
        .select('id')
        .eq('slug', identifier)
        .maybeSingle()
        .then(({ data: profileData }) => {
          if (profileData) {
            supabase
              .from('candidates')
              .select('id')
              .eq('profile_id', profileData.id)
              .maybeSingle()
              .then(({ data: candData }) => {
                if (candData) setResolvedId(candData.id);
                else setLoading(false);
              });
          } else setLoading(false);
        });
    }
  }, [identifier, propId]);

  const id = resolvedId;

  useEffect(() => {
    if (id) fetchCandidate();
  }, [id]);

  const baseUrl = 'https://www.hireforjob.com';
  const candSeoTitle = candidate ? `${candidate.full_name} - ${candidate.job_title} | HireForJob` : 'Candidate Profile | HireForJob';
  const candSeoDesc = candidate ? `${candidate.full_name}, ${candidate.job_title}${candidate.experience_years ? ` with ${candidate.experience_years}+ years experience` : ''}. View profile on HireForJob.` : '';
  const candCanonical = candidate ? `${baseUrl}${window.location.pathname}` : undefined;
  const candJsonLd = candidate ? {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: candidate.full_name,
    jobTitle: candidate.job_title,
    ...(candidate.bio && { description: candidate.bio }),
  } : undefined;

  const fetchCandidate = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select(`id, profile_id, job_title, bio, experience_years, expected_salary, skills, portfolio_urls, education, resume_url, headline, work_experience, certifications, languages, social_links, availability_status, career_objective, achievements, strengths, hobbies, projects, notice_period, work_authorization, remote_preference, current_company, current_salary, willing_to_relocate, salary_currency, gender, nationality, profiles!inner(full_name, avatar_url, latitude, longitude, created_at, user_id, whatsapp_number, location_city, location_country)`)
        .eq('id', id)
        .single();
      if (error) throw error;

      const parse = (val: any, isArray = true) => {
        if (!val) return null;
        if (typeof val === 'string') { try { return JSON.parse(val); } catch { return null; } }
        return isArray ? (Array.isArray(val) ? val : null) : (typeof val === 'object' ? val : null);
      };

      setCandidateUserId(data.profiles.user_id);
      setCandidate({
        id: data.id, profile_id: data.profile_id, job_title: data.job_title,
        bio: data.bio, experience_years: data.experience_years, expected_salary: data.expected_salary,
        skills: data.skills, portfolio_urls: data.portfolio_urls, resume_url: data.resume_url,
        headline: data.headline, certifications: data.certifications,
        education: parse(data.education) as Education[] | null,
        work_experience: parse(data.work_experience) as WorkExperience[] | null,
        languages: parse(data.languages) as Language[] | null,
        social_links: parse(data.social_links, false) as SocialLinks | null,
        projects: parse(data.projects) as Project[] | null,
        availability_status: data.availability_status,
        career_objective: data.career_objective,
        achievements: data.achievements, strengths: data.strengths,
        hobbies: data.hobbies, notice_period: data.notice_period,
        work_authorization: data.work_authorization,
        remote_preference: data.remote_preference,
        current_company: data.current_company, current_salary: data.current_salary,
        willing_to_relocate: data.willing_to_relocate,
        salary_currency: data.salary_currency, gender: data.gender, nationality: data.nationality,
        full_name: data.profiles.full_name, avatar_url: data.profiles.avatar_url,
        latitude: data.profiles.latitude, longitude: data.profiles.longitude,
        created_at: data.profiles.created_at, whatsapp_number: data.profiles.whatsapp_number,
        location_city: (data.profiles as any).location_city,
        location_country: (data.profiles as any).location_country,
      });

      // Track profile view (authenticated, non-own-profile only)
      if (user && data.profile_id !== profile?.id) {
        supabase.from('profile_views').insert({ profile_id: data.profile_id }).then(({ error: viewErr }) => {
          if (viewErr) console.warn('Failed to record profile view:', viewErr.message);
        });
      }
    } catch (error) {
      console.error('Error fetching candidate:', error);
      toast.error('Failed to load candidate profile');
    } finally { setLoading(false); }
  };

  const handleContact = async () => {
    if (!candidateUserId) { toast.error('Unable to contact this candidate'); return; }
    setContacting(true);
    await startConversation(candidateUserId);
    setContacting(false);
  };

  const handleSave = () => { setIsSaved(!isSaved); toast.success(isSaved ? 'Removed from saved' : 'Candidate saved!'); };
  const handleShare = async () => {
    try { await navigator.share({ title: candidate?.full_name, url: window.location.href }); }
    catch { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }
  };
  const handleDownloadResume = () => {
    if (!candidate?.resume_url) { toast.info('Resume not available'); return; }
    window.open(`/candidates/${candidate.id}/resume.pdf`, '_blank', 'noopener,noreferrer');
  };

  const getAvailabilityLabel = (s: string | null) => {
    const map: Record<string, string> = { available: 'Available Now', open: 'Open to Work', notice: 'On Notice', employed: 'Employed', not_looking: 'Not Looking' };
    return map[s || ''] || 'Available';
  };
  const getAvailabilityColor = (s: string | null) => {
    const map: Record<string, string> = {
      available: 'bg-success/10 text-success border-success/20',
      open: 'bg-primary/10 text-primary border-primary/20',
      notice: 'bg-warning/10 text-warning-foreground border-warning/20',
      employed: 'bg-muted text-foreground border-border',
      not_looking: 'bg-muted text-muted-foreground border-border',
    };
    return map[s || ''] || 'bg-success/10 text-success border-success/20';
  };
  const getAvailabilityDot = (s: string | null) => {
    const map: Record<string, string> = {
      available: 'bg-success', open: 'bg-primary', notice: 'bg-warning',
      employed: 'bg-muted-foreground', not_looking: 'bg-muted-foreground',
    };
    return map[s || ''] || 'bg-success';
  };
  const getRemoteLabel = (s: string | null) => {
    const map: Record<string, string> = { remote_only: 'Remote Only', hybrid: 'Hybrid', onsite: 'On-site', no_preference: 'No Preference' };
    return map[s || ''] || s || 'No Preference';
  };
  const getSocialIcon = (p: string) => {
    const icons: Record<string, React.ReactNode> = { linkedin: <Linkedin className="w-4 h-4" />, github: <Github className="w-4 h-4" />, twitter: <Twitter className="w-4 h-4" />, instagram: <Instagram className="w-4 h-4" />, youtube: <Youtube className="w-4 h-4" />, website: <Globe className="w-4 h-4" /> };
    return icons[p] || <LinkIcon className="w-4 h-4" />;
  };

  const getProfileCompleteness = () => {
    if (!candidate) return 0;
    let score = 0;
    const checks = [
      candidate.bio, candidate.skills?.length, candidate.work_experience?.length,
      candidate.education?.length, candidate.certifications?.length,
      candidate.avatar_url, candidate.headline, candidate.expected_salary,
      candidate.languages?.length, candidate.social_links && Object.values(candidate.social_links).some(v => v),
      candidate.career_objective, candidate.projects?.length, candidate.achievements?.length,
    ];
    const perItem = Math.floor(100 / checks.length);
    checks.forEach(c => { if (c) score += perItem; });
    return Math.min(score, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        {/* Hero skeleton */}
        <div className="h-40 bg-gradient-to-r from-primary/10 to-primary/5" />
        <div className="container mx-auto px-4 max-w-5xl -mt-16">
          <div className="bg-background rounded-2xl border shadow-lg p-6">
            <div className="flex gap-5 items-start">
              <Skeleton className="w-28 h-28 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-3 pt-2">
                <Skeleton className="h-7 w-52" />
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-64" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-8 w-28 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-5 mt-6 pb-8">
            <div className="lg:col-span-2 space-y-5">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}
            </div>
            <div className="space-y-5">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="p-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center"><User className="w-7 h-7 text-muted-foreground" /></div>
            <h2 className="text-lg font-bold mb-2 text-foreground">Candidate Not Found</h2>
            <p className="text-muted-foreground mb-6 text-sm">This profile doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/')} variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Back to Map</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const memberSince = candidate.created_at ? new Date(candidate.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently';
  const initials = candidate.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const completeness = getProfileCompleteness();
  const locationStr = [candidate.location_city, candidate.location_country].filter(Boolean).join(', ');
  const canView = isEmployerUser || isOwnProfile;

  // Quick stats for the hero area
  const quickStats = [
    candidate.experience_years != null && { icon: Briefcase, label: 'Experience', value: `${candidate.experience_years} yrs` },
    candidate.skills?.length && { icon: Zap, label: 'Skills', value: `${candidate.skills.length}` },
    candidate.education?.length && { icon: GraduationCap, label: 'Education', value: `${candidate.education.length}` },
    candidate.certifications?.length && { icon: Award, label: 'Certifications', value: `${candidate.certifications.length}` },
    candidate.work_experience?.length && { icon: Building2, label: 'Positions', value: `${candidate.work_experience.length}` },
    candidate.languages?.length && { icon: Languages, label: 'Languages', value: `${candidate.languages.length}` },
  ].filter(Boolean) as { icon: any; label: string; value: string }[];

  return (
    <div className="min-h-screen bg-muted/30 pb-24 lg:pb-8">
      <SEOHead title={candSeoTitle} description={candSeoDesc} canonicalUrl={candCanonical} ogType="profile" ogImage={candidate.avatar_url || undefined} jsonLd={candJsonLd} />
      
      {/* Top Navigation */}
      <div className="bg-background/95 backdrop-blur-md border-b sticky top-0 z-30">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-center justify-between h-14">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />Back
            </Button>
            <div className="flex items-center gap-1.5">
              {isOwnProfile && <ProfilePDFExport targetRef={profileContentRef} fileName={candidate?.full_name || 'profile'} />}
              <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleShare} className="rounded-full w-9 h-9"><Share2 className="w-4 h-4" /></Button>
              </TooltipTrigger><TooltipContent>Share profile</TooltipContent></Tooltip>
              {isEmployerUser && !isOwnProfile && (
                <Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleSave} className={`rounded-full w-9 h-9 ${isSaved ? 'text-destructive' : ''}`}>
                  <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                </Button>
                </TooltipTrigger><TooltipContent>{isSaved ? 'Remove from saved' : 'Save candidate'}</TooltipContent></Tooltip>
              )}
              {isEmployerUser && !isOwnProfile && <ReportDialog targetId={candidate?.id || ''} targetType="employer" />}
            </div>
          </div>
        </div>
      </div>

      {/* Gradient Banner */}
      <div className="relative h-36 sm:h-44 bg-gradient-to-br from-primary/15 via-primary/8 to-accent/10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-muted/30 to-transparent" />
        {/* Decorative elements */}
        <div className="absolute top-6 right-[10%] w-20 h-20 rounded-full bg-primary/5 blur-2xl" />
        <div className="absolute top-12 right-[25%] w-14 h-14 rounded-full bg-accent/10 blur-xl" />
      </div>

      {/* Profile Card - overlapping banner */}
      <div className="container mx-auto px-4 max-w-5xl -mt-20 sm:-mt-24 relative z-10">
        <motion.div {...fadeUp}>
          <Card className="border-border/50 shadow-xl bg-background/95 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-5 sm:p-7">
              <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar className="w-24 h-24 sm:w-28 sm:h-28 ring-4 ring-background shadow-xl">
                    <AvatarImage src={candidate.avatar_url || ''} alt={candidate.full_name} className="object-cover" />
                    <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-primary/5 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-[3px] border-background shadow-sm ${getAvailabilityDot(candidate.availability_status)}`} />
                </div>

                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{candidate.full_name}</h1>
                    <Badge variant="outline" className={`text-xs w-fit mx-auto sm:mx-0 gap-1.5 font-semibold ${getAvailabilityColor(candidate.availability_status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getAvailabilityDot(candidate.availability_status)}`} />
                      {getAvailabilityLabel(candidate.availability_status)}
                    </Badge>
                  </div>
                  
                  <p className="text-primary font-semibold mt-1 text-base">{candidate.job_title}</p>
                  {candidate.current_company && (
                    <p className="text-muted-foreground text-sm mt-0.5 flex items-center gap-1.5 justify-center sm:justify-start">
                      <Building2 className="w-3.5 h-3.5" /> Currently at <span className="font-medium text-foreground">{candidate.current_company}</span>
                    </p>
                  )}
                  {candidate.headline && <p className="text-muted-foreground text-sm mt-2 italic max-w-xl">"{candidate.headline}"</p>}

                  {/* Info chips */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                    {candidate.experience_years != null && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-background border border-border/60 px-3 py-1.5 rounded-full shadow-sm">
                        <Briefcase className="w-3 h-3 text-primary" />{candidate.experience_years} yrs experience
                      </span>
                    )}
                    {candidate.expected_salary && canView && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success bg-success/5 border border-success/15 px-3 py-1.5 rounded-full">
                        <Banknote className="w-3 h-3" />{candidate.salary_currency || ''} {candidate.expected_salary}
                      </span>
                    )}
                    {locationStr && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-background border border-border/60 px-3 py-1.5 rounded-full shadow-sm">
                        <MapPin className="w-3 h-3 text-destructive" />{locationStr}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-background border border-border/60 px-3 py-1.5 rounded-full shadow-sm">
                      <Calendar className="w-3 h-3" />Since {memberSince}
                    </span>
                    {candidate.resume_url && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/5 border border-primary/15 px-3 py-1.5 rounded-full">
                        <FileText className="w-3 h-3" />Resume available
                      </span>
                    )}
                    {candidate.notice_period && canView && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-background border border-border/60 px-3 py-1.5 rounded-full shadow-sm">
                        <Timer className="w-3 h-3" />{candidate.notice_period} notice
                      </span>
                    )}
                  </div>

                  {/* Social Links */}
                  {candidate.social_links && Object.entries(candidate.social_links).some(([, v]) => v) && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-4">
                      {Object.entries(candidate.social_links).map(([platform, url]) =>
                        url ? (
                          <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                            className="w-9 h-9 rounded-xl bg-muted/80 border border-border/60 hover:bg-primary/10 hover:border-primary/30 hover:text-primary flex items-center justify-center text-muted-foreground transition-all">
                            {getSocialIcon(platform)}
                          </a>
                        ) : null
                      )}
                    </div>
                  )}
                </div>

                {/* Desktop CTA */}
                {isEmployerUser && !isOwnProfile && (
                  <div className="hidden lg:flex flex-col gap-2.5 shrink-0">
                    <Button onClick={handleContact} disabled={contacting} size="lg" className="gap-2 px-8 rounded-xl shadow-md">
                      {contacting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                      {contacting ? 'Connecting...' : 'Message'}
                    </Button>
                    <WhatsAppButton phoneNumber={candidate.whatsapp_number} className="w-full rounded-xl" />
                    <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={handleDownloadResume}>
                      <Download className="w-3.5 h-3.5" />Download CV
                    </Button>
                  </div>
                )}
              </div>

              {/* Quick Stats Bar */}
              {quickStats.length > 0 && (
                <motion.div {...stagger(0.1)} className="mt-5 pt-5 border-t border-border/50">
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {quickStats.slice(0, 6).map((stat, i) => (
                      <div key={i} className="text-center p-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors">
                        <stat.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                        <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Content */}
      <div ref={profileContentRef} className="container mx-auto px-4 py-6 max-w-5xl">
        {canView ? (
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-5">
              {/* Career Objective */}
              {candidate.career_objective && (
                <SectionCard title="Career Objective" icon={Target} delay={0.05}>
                  <p className="text-foreground leading-relaxed text-sm">{candidate.career_objective}</p>
                </SectionCard>
              )}

              {/* About */}
              {candidate.bio && (
                <SectionCard title="About" icon={User} delay={0.08}>
                  <p className="text-foreground leading-relaxed text-sm whitespace-pre-line">{candidate.bio}</p>
                </SectionCard>
              )}

              {/* Skills & Endorsements */}
              {candidate.skills && candidate.skills.length > 0 && (
                <SectionCard title="Skills & Endorsements" icon={Zap} delay={0.1}
                  badge={<Badge variant="secondary" className="text-[10px]">{candidate.skills.length} skills</Badge>}>
                  <SkillEndorsements
                    candidateId={candidate.id}
                    skills={candidate.skills}
                    isOwnProfile={isOwnProfile}
                  />
                </SectionCard>
              )}

              {/* Work Experience */}
              {candidate.work_experience && candidate.work_experience.length > 0 && (
                <SectionCard title="Work Experience" icon={Briefcase} delay={0.15}>
                  <div className="relative">
                    {/* Timeline line */}
                    {candidate.work_experience.length > 1 && (
                      <div className="absolute left-[19px] top-12 bottom-4 w-px bg-gradient-to-b from-primary/30 via-border to-transparent" />
                    )}
                    <div className="space-y-6">
                      {candidate.work_experience.map((exp, i) => (
                        <div key={i} className="flex gap-3.5 relative">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border z-10 ${
                            exp.isCurrent ? 'bg-primary/10 border-primary/30 shadow-sm shadow-primary/10' : 'bg-muted border-border/50'
                          }`}>
                            <Building2 className={`w-5 h-5 ${exp.isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-foreground text-sm">{exp.title}</h4>
                              {exp.isCurrent && (
                                <Badge className="bg-success/10 text-success border-success/20 text-[10px] px-1.5 py-0">Current</Badge>
                              )}
                            </div>
                            <p className="text-sm text-primary/80 font-medium">{exp.company}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {exp.startDate} — {exp.isCurrent ? 'Present' : exp.endDate}
                            </p>
                            {exp.description && (
                              <p className="text-sm text-muted-foreground mt-2 leading-relaxed bg-muted/30 rounded-lg p-3 border border-border/30">{exp.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>
              )}

              {/* Projects */}
              {candidate.projects && candidate.projects.length > 0 && (
                <SectionCard title="Projects" icon={FolderOpen} delay={0.18}
                  badge={<Badge variant="secondary" className="text-[10px]">{candidate.projects.length}</Badge>}>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {candidate.projects.map((project, i) => (
                      <div key={i} className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-border transition-all group">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Code className="w-4 h-4 text-accent-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-foreground text-sm truncate">{project.name}</h4>
                              {project.url && (
                                <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors shrink-0">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                            {project.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{project.description}</p>
                            )}
                            {project.technologies && project.technologies.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {project.technologies.map((tech, j) => (
                                  <span key={j} className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/5 text-primary rounded-md border border-primary/10">{tech}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Education */}
              {candidate.education && candidate.education.length > 0 && (
                <SectionCard title="Education" icon={GraduationCap} delay={0.2}>
                  <div className="space-y-4">
                    {candidate.education.map((edu, i) => (
                      <div key={i} className="flex gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/15 flex items-center justify-center shrink-0 mt-0.5">
                          <BookOpen className="w-5 h-5 text-warning" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground text-sm">{edu.institution}</h4>
                          <p className="text-sm text-muted-foreground">{edu.degree}{edu.field ? ` — ${edu.field}` : ''}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {String(edu.startYear)} — {edu.endYear ? String(edu.endYear) : 'Present'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Certifications */}
              {candidate.certifications && candidate.certifications.length > 0 && (
                <SectionCard title="Certifications" icon={Award} delay={0.22}>
                  <div className="flex flex-wrap gap-2">
                    {candidate.certifications.map((cert, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-warning/5 text-foreground rounded-xl border border-warning/15 hover:bg-warning/10 transition-colors">
                        <Award className="w-3.5 h-3.5 text-warning" />{cert}
                      </span>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Achievements & Strengths */}
              {((candidate.achievements && candidate.achievements.length > 0) || (candidate.strengths && candidate.strengths.length > 0)) && (
                <SectionCard title="Achievements & Strengths" icon={Star} delay={0.24}>
                  {candidate.achievements && candidate.achievements.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Star className="w-3 h-3 text-warning" /> Achievements
                      </h4>
                      <div className="space-y-2">
                        {candidate.achievements.map((ach, i) => (
                          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-warning/5 border border-warning/10">
                            <CheckCircle2 className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                            <span className="text-sm text-foreground">{ach}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {candidate.strengths && candidate.strengths.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Lightbulb className="w-3 h-3 text-primary" /> Key Strengths
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {candidate.strengths.map((str, i) => (
                          <span key={i} className="px-3 py-1.5 text-xs font-medium bg-primary/5 text-primary rounded-lg border border-primary/10">
                            {str}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </SectionCard>
              )}

              {/* Portfolio */}
              {candidate.portfolio_urls && candidate.portfolio_urls.length > 0 && (
                <SectionCard title="Portfolio" icon={Globe} delay={0.26}>
                  <div className="space-y-2">
                    {candidate.portfolio_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-primary/5 border border-transparent hover:border-primary/15 transition-all group">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Globe className="w-4 h-4 text-primary" />
                        </div>
                        <span className="flex-1 truncate text-sm text-foreground font-medium">{url.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </a>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* Hobbies & Interests */}
              {candidate.hobbies && candidate.hobbies.length > 0 && (
                <SectionCard title="Hobbies & Interests" icon={Coffee} delay={0.28}>
                  <div className="flex flex-wrap gap-2">
                    {candidate.hobbies.map((hobby, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-accent/10 text-accent-foreground rounded-xl border border-accent/15 hover:bg-accent/20 transition-colors">
                        {hobby}
                      </span>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-5">
              {/* Contact Card */}
              {!isOwnProfile && isEmployerUser && (
                <motion.div {...stagger(0.05)}>
                  <Card className="overflow-hidden border-border/50 shadow-md">
                    <div className="bg-gradient-to-r from-primary to-primary/80 p-4">
                      <h3 className="text-primary-foreground font-bold flex items-center gap-2 text-sm">
                        <MessageCircle className="w-4 h-4" />Connect with {candidate.full_name.split(' ')[0]}
                      </h3>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <Button onClick={handleContact} disabled={contacting} className="w-full gap-2 rounded-xl h-11">
                        {contacting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                        {contacting ? 'Connecting...' : 'Send Message'}
                      </Button>
                      <WhatsAppButton phoneNumber={candidate.whatsapp_number} className="w-full rounded-xl" />
                      <Separator />
                      <Button variant="outline" className="w-full gap-2 text-sm rounded-xl" onClick={handleDownloadResume}>
                        <Download className="w-3.5 h-3.5" />Download CV
                      </Button>
                      <Button variant="ghost" className="w-full gap-2 text-sm rounded-xl" onClick={handleSave}>
                        <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-primary text-primary' : ''}`} />{isSaved ? 'Saved' : 'Save Candidate'}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Profile Strength */}
              <motion.div {...stagger(0.1)}>
                <Card className="border-border/50 shadow-sm overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      {/* Circular progress */}
                      <div className="relative w-16 h-16 shrink-0">
                        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/50" />
                          <circle cx="32" cy="32" r="28" fill="none" strokeWidth="4"
                            strokeDasharray={`${completeness * 1.76} ${176 - completeness * 1.76}`}
                            strokeLinecap="round"
                            className={completeness >= 80 ? 'text-success' : completeness >= 50 ? 'text-primary' : 'text-warning'}
                          />
                        </svg>
                        <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${
                          completeness >= 80 ? 'text-success' : completeness >= 50 ? 'text-primary' : 'text-warning'
                        }`}>{completeness}%</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Profile Strength</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {completeness >= 80 ? 'Excellent profile!' : completeness >= 50 ? 'Good, add more details' : 'Needs more info'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Work Preferences */}
              <motion.div {...stagger(0.13)}>
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Shield className="w-3.5 h-3.5 text-primary" /> Work Preferences
                    </h3>
                    <div className="space-y-3">
                      {candidate.remote_preference && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-2"><Home className="w-3.5 h-3.5" /> Work Mode</span>
                          <Badge variant="secondary" className="text-[10px] font-medium">{getRemoteLabel(candidate.remote_preference)}</Badge>
                        </div>
                      )}
                      {candidate.notice_period && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-2"><Timer className="w-3.5 h-3.5" /> Notice Period</span>
                            <span className="text-sm font-medium text-foreground">{candidate.notice_period}</span>
                          </div>
                        </>
                      )}
                      {candidate.work_authorization && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Work Auth</span>
                            <span className="text-sm font-medium text-foreground capitalize">{candidate.work_authorization}</span>
                          </div>
                        </>
                      )}
                      {candidate.willing_to_relocate !== null && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-2"><Plane className="w-3.5 h-3.5" /> Relocate</span>
                            <Badge variant={candidate.willing_to_relocate ? 'default' : 'secondary'} className="text-[10px]">
                              {candidate.willing_to_relocate ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                        </>
                      )}
                      {candidate.nationality && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Nationality</span>
                            <span className="text-sm font-medium text-foreground">{candidate.nationality}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Highlights */}
              <motion.div {...stagger(0.16)}>
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Highlights
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2"><Briefcase className="w-3.5 h-3.5" /> Experience</span>
                        <span className="text-sm font-bold text-foreground">{candidate.experience_years || 0} years</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2"><Banknote className="w-3.5 h-3.5" /> Expected Pay</span>
                        <span className="text-sm font-bold text-success">{candidate.expected_salary || 'Negotiable'}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" /> Status</span>
                        <Badge variant="outline" className={`text-[10px] font-semibold ${getAvailabilityColor(candidate.availability_status)}`}>
                          {getAvailabilityLabel(candidate.availability_status)}
                        </Badge>
                      </div>
                      {locationStr && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Location</span>
                            <span className="text-sm font-medium text-foreground">{locationStr}</span>
                          </div>
                        </>
                      )}
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Member since</span>
                        <span className="text-sm text-foreground">{memberSince}</span>
                      </div>
                      {candidate.skills && candidate.skills.length > 0 && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> Skills</span>
                            <span className="text-sm font-bold text-primary">{candidate.skills.length}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Languages */}
              {candidate.languages && candidate.languages.length > 0 && (
                <motion.div {...stagger(0.19)}>
                  <Card className="border-border/50 shadow-sm">
                    <CardContent className="p-4">
                      <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
                        <Languages className="w-3.5 h-3.5 text-primary" /> Languages
                      </h3>
                      <div className="space-y-2.5">
                        {candidate.languages.map((lang, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-foreground font-medium">{lang.language}</span>
                            <Badge variant="secondary" className="text-[10px] font-medium">{lang.proficiency}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        ) : (
          /* Restricted View for non-employers */
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Public summary */}
            <motion.div {...stagger(0.05)}>
              <Card className="border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Profile Overview</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {candidate.experience_years != null && (
                      <div className="text-center p-3 bg-muted/40 rounded-xl">
                        <Briefcase className="w-5 h-5 text-primary mx-auto mb-1.5" />
                        <p className="text-lg font-bold text-foreground">{candidate.experience_years}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Years Exp.</p>
                      </div>
                    )}
                    {candidate.skills?.length && (
                      <div className="text-center p-3 bg-muted/40 rounded-xl">
                        <Zap className="w-5 h-5 text-primary mx-auto mb-1.5" />
                        <p className="text-lg font-bold text-foreground">{candidate.skills.length}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Skills</p>
                      </div>
                    )}
                    {candidate.certifications?.length && (
                      <div className="text-center p-3 bg-muted/40 rounded-xl">
                        <Award className="w-5 h-5 text-warning mx-auto mb-1.5" />
                        <p className="text-lg font-bold text-foreground">{candidate.certifications.length}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Certifications</p>
                      </div>
                    )}
                    {candidate.education?.length && (
                      <div className="text-center p-3 bg-muted/40 rounded-xl">
                        <GraduationCap className="w-5 h-5 text-primary mx-auto mb-1.5" />
                        <p className="text-lg font-bold text-foreground">{candidate.education.length}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Education</p>
                      </div>
                    )}
                    {candidate.languages?.length && (
                      <div className="text-center p-3 bg-muted/40 rounded-xl">
                        <Languages className="w-5 h-5 text-primary mx-auto mb-1.5" />
                        <p className="text-lg font-bold text-foreground">{candidate.languages.length}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Languages</p>
                      </div>
                    )}
                    {candidate.work_experience?.length && (
                      <div className="text-center p-3 bg-muted/40 rounded-xl">
                        <Building2 className="w-5 h-5 text-primary mx-auto mb-1.5" />
                        <p className="text-lg font-bold text-foreground">{candidate.work_experience.length}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Positions</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* CTA Card */}
            <motion.div {...stagger(0.1)}>
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-sm">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-foreground">Full Profile Restricted</h3>
                  <p className="text-muted-foreground mb-6 text-sm leading-relaxed max-w-md mx-auto">
                    {user ? 'Only employer accounts can view detailed candidate profiles including skills, experience, projects, and contact options.' : "Sign in with an employer account to view this candidate's complete profile, including skills, experience, and contact options."}
                  </p>
                  {!user ? (
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button onClick={() => navigate('/login')} size="lg" className="gap-2 rounded-xl px-8"><LogIn className="w-4 h-4" />Sign In</Button>
                      <Button onClick={() => navigate('/signup')} variant="outline" size="lg" className="rounded-xl px-8">Create Account</Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">You're signed in as a candidate. Switch to an employer account to access full profiles.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Bar */}
      {isEmployerUser && !isOwnProfile && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background/95 backdrop-blur-lg border-t p-3 z-50">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleSave} className={`w-11 h-11 rounded-xl shrink-0 ${isSaved ? 'text-destructive border-destructive/30' : ''}`}>
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
            <WhatsAppButton phoneNumber={candidate.whatsapp_number} variant="icon" className="shrink-0" />
            <Button onClick={handleContact} disabled={contacting} className="flex-1 h-11 rounded-xl font-medium gap-2">
              {contacting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              {contacting ? 'Connecting...' : 'Message'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateDetail;
