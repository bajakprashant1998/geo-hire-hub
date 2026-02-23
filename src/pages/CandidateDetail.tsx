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
  Download, MessageCircle, Heart, Share2, DollarSign, Calendar,
  Award, User, Link as LinkIcon, ExternalLink,
  Loader2, Languages, BadgeCheck, Building2, Github, Linkedin, Twitter,
  Instagram, Youtube, Lock, LogIn, ChevronRight, Sparkles,
  Star, TrendingUp, Zap, FileText, CheckCircle2, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { useStartConversation } from '@/hooks/useStartConversation';
import { useAuth } from '@/hooks/useAuth';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { ProfilePDFExport } from '@/components/candidate/ProfilePDFExport';
import { ReportDialog } from '@/components/ReportDialog';
import { SEOHead } from '@/components/SEOHead';
import { motion } from 'framer-motion';

interface Education { institution: string; degree: string; field: string; startYear: string; endYear: string; }
interface WorkExperience { company: string; title: string; startDate: string; endDate: string; isCurrent: boolean; description: string; }
interface Language { language: string; proficiency: string; }
interface SocialLinks { linkedin?: string; github?: string; twitter?: string; instagram?: string; youtube?: string; website?: string; }

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
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

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
            const p = data.profiles as any;
            if (p?.slug) {
              const parts = ['/candidates'];
              if (p.location_country) parts.push(encodeURIComponent(p.location_country.toLowerCase().replace(/\s+/g, '-')));
              if (p.location_state) parts.push(encodeURIComponent(p.location_state.toLowerCase().replace(/\s+/g, '-')));
              if (p.location_city) parts.push(encodeURIComponent(p.location_city.toLowerCase().replace(/\s+/g, '-')));
              parts.push(p.slug);
              const seoPath = parts.join('/');
              if (window.location.pathname !== seoPath) {
                navigate(seoPath + window.location.search, { replace: true });
              }
            }
          } else setLoading(false);
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
        .select(`id, profile_id, job_title, bio, experience_years, expected_salary, skills, portfolio_urls, education, resume_url, headline, work_experience, certifications, languages, social_links, availability_status, profiles!inner(full_name, avatar_url, latitude, longitude, created_at, user_id, whatsapp_number, location_city, location_country)`)
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
        availability_status: data.availability_status,
        full_name: data.profiles.full_name, avatar_url: data.profiles.avatar_url,
        latitude: data.profiles.latitude, longitude: data.profiles.longitude,
        created_at: data.profiles.created_at, whatsapp_number: data.profiles.whatsapp_number,
        location_city: (data.profiles as any).location_city,
        location_country: (data.profiles as any).location_country,
      });
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
  const getSocialIcon = (p: string) => {
    const icons: Record<string, React.ReactNode> = { linkedin: <Linkedin className="w-4 h-4" />, github: <Github className="w-4 h-4" />, twitter: <Twitter className="w-4 h-4" />, instagram: <Instagram className="w-4 h-4" />, youtube: <Youtube className="w-4 h-4" />, website: <Globe className="w-4 h-4" /> };
    return icons[p] || <LinkIcon className="w-4 h-4" />;
  };

  // Calculate profile completeness
  const getProfileCompleteness = () => {
    if (!candidate) return 0;
    let score = 0;
    const checks = [
      candidate.bio, candidate.skills?.length, candidate.work_experience?.length,
      candidate.education?.length, candidate.certifications?.length,
      candidate.avatar_url, candidate.headline, candidate.expected_salary,
      candidate.languages?.length, candidate.social_links && Object.values(candidate.social_links).some(v => v),
    ];
    checks.forEach(c => { if (c) score += 10; });
    return Math.min(score, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="bg-background border-b">
          <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="flex gap-6 items-start">
              <Skeleton className="w-24 h-24 rounded-2xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-72" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 w-20 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
            <div className="space-y-4">
              {[1, 2].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
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
  const initials = candidate.full_name.split(' ').map(n => n[0]).join('').slice(0, 2);
  const completeness = getProfileCompleteness();
  const locationStr = [candidate.location_city, candidate.location_country].filter(Boolean).join(', ');

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

      {/* Profile Header — Enhanced */}
      <div className="bg-gradient-to-b from-primary/[0.04] to-background border-b">
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
          <motion.div {...fadeUp} className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-center sm:items-start">
            {/* Avatar with status ring */}
            <div className="relative shrink-0">
              <Avatar className="w-24 h-24 sm:w-28 sm:h-28 ring-[3px] ring-background shadow-lg">
                <AvatarImage src={candidate.avatar_url || ''} alt={candidate.full_name} className="object-cover" />
                <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-primary/5 text-primary">{initials}</AvatarFallback>
              </Avatar>
              {/* Availability dot */}
              <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-[3px] border-background ${getAvailabilityDot(candidate.availability_status)}`} />
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
              {candidate.headline && <p className="text-muted-foreground text-sm mt-1.5 italic max-w-xl">"{candidate.headline}"</p>}

              {/* Quick info chips */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                {candidate.experience_years != null && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-background border border-border/60 px-3 py-1.5 rounded-full shadow-sm">
                    <Briefcase className="w-3 h-3 text-primary" />{candidate.experience_years} yrs experience
                  </span>
                )}
                {candidate.expected_salary && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success bg-success/5 border border-success/15 px-3 py-1.5 rounded-full">
                    <DollarSign className="w-3 h-3" />{candidate.expected_salary}
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
              </div>

              {/* Social Links */}
              {candidate.social_links && Object.entries(candidate.social_links).some(([, v]) => v) && (
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-4">
                  {Object.entries(candidate.social_links).map(([platform, url]) =>
                    url ? (
                      <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                        className="w-9 h-9 rounded-xl bg-background border border-border/60 hover:bg-primary/5 hover:border-primary/30 hover:text-primary flex items-center justify-center text-muted-foreground transition-all shadow-sm">
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
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div ref={profileContentRef} className="container mx-auto px-4 py-6 max-w-5xl">
        {(isEmployerUser || isOwnProfile) ? (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-4">
              {/* About */}
              {candidate.bio && (
                <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
                  <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">About</h3>
                      </div>
                      <p className="text-foreground leading-relaxed text-sm">{candidate.bio}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Skills */}
              {candidate.skills && candidate.skills.length > 0 && (
                <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
                  <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">Skills</h3>
                        <Badge variant="secondary" className="ml-auto text-[10px]">{candidate.skills.length} skills</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {candidate.skills.map((skill, i) => (
                          <span key={i} className="px-3 py-1.5 text-xs font-medium bg-primary/5 text-primary rounded-lg border border-primary/10 hover:bg-primary/10 transition-colors">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Work Experience */}
              {candidate.work_experience && candidate.work_experience.length > 0 && (
                <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
                  <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">Experience</h3>
                      </div>
                      <div className="space-y-5">
                        {candidate.work_experience.map((exp, i) => (
                          <div key={i} className="flex gap-3 relative">
                            {/* Timeline line */}
                            {i < candidate.work_experience!.length - 1 && (
                              <div className="absolute left-5 top-12 bottom-0 w-px bg-border" />
                            )}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                              exp.isCurrent ? 'bg-primary/10 border-primary/20' : 'bg-muted border-border/50'
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
                              <p className="text-sm text-muted-foreground font-medium">{exp.company}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{exp.startDate} — {exp.isCurrent ? 'Present' : exp.endDate}</p>
                              {exp.description && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{exp.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Education */}
              {candidate.education && candidate.education.length > 0 && (
                <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
                  <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <GraduationCap className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">Education</h3>
                      </div>
                      <div className="space-y-4">
                        {candidate.education.map((edu, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/15 flex items-center justify-center shrink-0 mt-0.5">
                              <BookOpen className="w-5 h-5 text-warning" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-foreground text-sm">{edu.institution}</h4>
                              <p className="text-sm text-muted-foreground">{edu.degree} — {edu.field}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{String(edu.startYear)} — {edu.endYear ? String(edu.endYear) : 'Present'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Certifications */}
              {candidate.certifications && candidate.certifications.length > 0 && (
                <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
                  <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                          <Award className="w-4 h-4 text-warning" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">Certifications</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {candidate.certifications.map((cert, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-warning/5 text-foreground rounded-xl border border-warning/15 hover:bg-warning/10 transition-colors">
                            <Award className="w-3.5 h-3.5 text-warning" />{cert}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Portfolio */}
              {candidate.portfolio_urls && candidate.portfolio_urls.length > 0 && (
                <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
                  <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Globe className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">Portfolio</h3>
                      </div>
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
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              {/* Contact Card */}
              {!isOwnProfile && isEmployerUser && (
                <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
                  <Card className="overflow-hidden border-border/50 shadow-sm">
                    <div className="bg-gradient-to-r from-primary to-primary/80 p-4">
                      <h3 className="text-primary-foreground font-bold flex items-center gap-2">
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

              {/* Profile Completeness */}
              <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-foreground">Profile Strength</h3>
                      <span className={`text-xs font-bold ${completeness >= 80 ? 'text-success' : completeness >= 50 ? 'text-primary' : 'text-warning'}`}>
                        {completeness}%
                      </span>
                    </div>
                    <Progress value={completeness} className="h-2" />
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {completeness >= 80 ? 'Excellent profile!' : completeness >= 50 ? 'Good profile with room to grow' : 'Profile needs more details'}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Highlights */}
              <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Highlights
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <Briefcase className="w-3.5 h-3.5" /> Experience
                        </span>
                        <span className="text-sm font-bold text-foreground">{candidate.experience_years || 0} years</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <DollarSign className="w-3.5 h-3.5" /> Expected Pay
                        </span>
                        <span className="text-sm font-bold text-success">{candidate.expected_salary || 'Negotiable'}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5" /> Status
                        </span>
                        <Badge variant="outline" className={`text-[10px] font-semibold ${getAvailabilityColor(candidate.availability_status)}`}>
                          {getAvailabilityLabel(candidate.availability_status)}
                        </Badge>
                      </div>
                      {locationStr && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5" /> Location
                            </span>
                            <span className="text-sm font-medium text-foreground">{locationStr}</span>
                          </div>
                        </>
                      )}
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" /> Member since
                        </span>
                        <span className="text-sm text-foreground">{memberSince}</span>
                      </div>
                      {candidate.skills && candidate.skills.length > 0 && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                              <Zap className="w-3.5 h-3.5" /> Skills
                            </span>
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
                <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
                  <Card className="border-border/50 shadow-sm">
                    <CardContent className="p-4">
                      <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
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
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-8 sm:p-10 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-foreground">Full Profile Restricted</h3>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {user ? 'Only employer accounts can view full candidate profiles.' : "Sign in with an employer account to view this candidate's complete profile, including skills, experience, and contact options."}
              </p>
              {!user ? (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => navigate('/login')} className="gap-2"><LogIn className="w-4 h-4" />Sign In</Button>
                  <Button onClick={() => navigate('/signup')} variant="outline">Create Account</Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">You're signed in as a candidate. Switch to an employer account to access full profiles.</p>
              )}
            </CardContent>
          </Card>
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
