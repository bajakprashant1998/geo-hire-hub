import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, MapPin, Briefcase, GraduationCap, Clock, Globe,
  Download, MessageCircle, Heart, Share2, DollarSign, Calendar,
  Award, User, Link as LinkIcon, ExternalLink,
  Loader2, Languages, BadgeCheck, Building2, Github, Linkedin, Twitter,
  Instagram, Youtube, Lock, LogIn, ChevronRight, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStartConversation } from '@/hooks/useStartConversation';
import { useAuth } from '@/hooks/useAuth';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { ProfilePDFExport } from '@/components/candidate/ProfilePDFExport';
import { useRef } from 'react';

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
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // Resolve slug to ID & redirect UUID URLs to SEO slugs
  useEffect(() => {
    if (!identifier || propId) return;
    if (UUID_REGEX.test(identifier)) {
      // UUID access — check for slug redirect
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

  // SEO meta tags
  useEffect(() => {
    if (candidate) {
      document.title = `${candidate.full_name} - ${candidate.job_title} | HireForJob`;
      const desc = `${candidate.full_name}, ${candidate.job_title}${candidate.experience_years ? ` with ${candidate.experience_years}+ years experience` : ''}. View profile on HireForJob.`;
      let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
      if (!metaDesc) { metaDesc = document.createElement('meta'); metaDesc.name = 'description'; document.head.appendChild(metaDesc); }
      metaDesc.content = desc.slice(0, 160);
    }
  }, [candidate]);

  const fetchCandidate = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select(`id, profile_id, job_title, bio, experience_years, expected_salary, skills, portfolio_urls, education, resume_url, headline, work_experience, certifications, languages, social_links, availability_status, profiles!inner(full_name, avatar_url, latitude, longitude, created_at, user_id, whatsapp_number)`)
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
  const handleDownloadResume = () => { candidate?.resume_url ? window.open(candidate.resume_url, '_blank') : toast.info('Resume not available'); };

  const getAvailabilityLabel = (s: string | null) => {
    const map: Record<string, string> = { available: 'Available Now', open: 'Open to Work', notice: 'On Notice', employed: 'Employed', not_looking: 'Not Looking' };
    return map[s || ''] || 'Available';
  };
  const getAvailabilityColor = (s: string | null) => {
    const map: Record<string, string> = {
      available: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
      open: 'bg-blue-500/10 text-blue-600 border-blue-200',
      notice: 'bg-amber-500/10 text-amber-600 border-amber-200',
      employed: 'bg-muted text-foreground border-border',
      not_looking: 'bg-muted text-muted-foreground border-border',
    };
    return map[s || ''] || 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
  };
  const getSocialIcon = (p: string) => {
    const icons: Record<string, React.ReactNode> = { linkedin: <Linkedin className="w-4 h-4" />, github: <Github className="w-4 h-4" />, twitter: <Twitter className="w-4 h-4" />, instagram: <Instagram className="w-4 h-4" />, youtube: <Youtube className="w-4 h-4" />, website: <Globe className="w-4 h-4" /> };
    return icons[p] || <LinkIcon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="bg-background border-b">
          <div className="container mx-auto px-4 py-6 max-w-5xl">
            <div className="flex gap-5 items-center">
              <Skeleton className="w-20 h-20 rounded-2xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
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

  return (
    <div className="min-h-screen bg-muted/30 pb-24 lg:pb-8">
      {/* Top Navigation */}
      <div className="bg-background border-b sticky top-0 z-30">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-center justify-between h-14">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />Back
            </Button>
            <div className="flex items-center gap-1.5">
              {isOwnProfile && <ProfilePDFExport targetRef={profileContentRef} fileName={candidate?.full_name || 'profile'} />}
              <Button variant="ghost" size="icon" onClick={handleShare} className="rounded-full w-9 h-9"><Share2 className="w-4 h-4" /></Button>
              {isEmployerUser && !isOwnProfile && (
                <Button variant="ghost" size="icon" onClick={handleSave} className={`rounded-full w-9 h-9 ${isSaved ? 'text-destructive' : ''}`}>
                  <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
            <div className="relative shrink-0">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-border shadow-sm">
                <AvatarImage src={candidate.avatar_url || ''} alt={candidate.full_name} className="object-cover" />
                <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{candidate.full_name}</h1>
                <Badge variant="outline" className={`text-xs w-fit mx-auto sm:mx-0 ${getAvailabilityColor(candidate.availability_status)}`}>
                  {getAvailabilityLabel(candidate.availability_status)}
                </Badge>
              </div>
              <p className="text-primary font-medium mt-1">{candidate.job_title}</p>
              {candidate.headline && <p className="text-muted-foreground text-sm mt-1 italic">"{candidate.headline}"</p>}

              {/* Quick info chips */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                {candidate.experience_years != null && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    <Clock className="w-3 h-3" />{candidate.experience_years} yrs
                  </span>
                )}
                {candidate.expected_salary && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/5 px-2.5 py-1 rounded-full">
                    <DollarSign className="w-3 h-3" />{candidate.expected_salary}
                  </span>
                )}
                {candidate.latitude && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    <MapPin className="w-3 h-3" />On map
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  <Calendar className="w-3 h-3" />{memberSince}
                </span>
              </div>

              {/* Social Links */}
              {candidate.social_links && Object.entries(candidate.social_links).some(([, v]) => v) && (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-3">
                  {Object.entries(candidate.social_links).map(([platform, url]) =>
                    url ? (
                      <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                        {getSocialIcon(platform)}
                      </a>
                    ) : null
                  )}
                </div>
              )}
            </div>

            {/* Desktop CTA */}
            {isEmployerUser && (
              <div className="hidden lg:flex flex-col gap-2 shrink-0">
                <Button onClick={handleContact} disabled={contacting} className="gap-2 px-6">
                  {contacting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                  {contacting ? 'Connecting...' : 'Message'}
                </Button>
                <WhatsAppButton phoneNumber={candidate.whatsapp_number} className="w-full" />
                <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadResume}>
                  <Download className="w-3.5 h-3.5" />Download CV
                </Button>
              </div>
            )}
          </div>
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
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">About</h3>
                    <p className="text-foreground leading-relaxed text-sm">{candidate.bio}</p>
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {candidate.skills && candidate.skills.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skills.map((skill, i) => (
                        <span key={i} className="px-2.5 py-1 text-xs font-medium bg-primary/5 text-primary rounded-md border border-primary/10">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Experience */}
              {candidate.work_experience && candidate.work_experience.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Experience</h3>
                    <div className="space-y-4">
                      {candidate.work_experience.map((exp, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-foreground text-sm">{exp.title}</h4>
                              {exp.isCurrent && <Badge className="bg-primary/10 text-primary border-0 text-[10px] px-1.5 py-0">Current</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{exp.company}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{exp.startDate} — {exp.isCurrent ? 'Present' : exp.endDate}</p>
                            {exp.description && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{exp.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Education */}
              {candidate.education && candidate.education.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Education</h3>
                    <div className="space-y-4">
                      {candidate.education.map((edu, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                            <GraduationCap className="w-5 h-5 text-muted-foreground" />
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
              )}

              {/* Certifications */}
              {candidate.certifications && candidate.certifications.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Certifications</h3>
                    <div className="flex flex-wrap gap-2">
                      {candidate.certifications.map((cert, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-warning/10 text-foreground rounded-lg border border-warning/20">
                          <Award className="w-3 h-3" />{cert}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Portfolio */}
              {candidate.portfolio_urls && candidate.portfolio_urls.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Portfolio</h3>
                    <div className="space-y-2">
                      {candidate.portfolio_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group">
                          <Globe className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                          <span className="flex-1 truncate text-sm text-foreground">{url.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              {/* Contact Card - hidden when viewing own profile */}
              {!isOwnProfile && (
              <Card className="overflow-hidden">
                <div className="bg-primary p-4">
                  <h3 className="text-primary-foreground font-semibold flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />Connect
                  </h3>
                </div>
                <CardContent className="p-4 space-y-3">
                  <Button onClick={handleContact} disabled={contacting} className="w-full gap-2">
                    {contacting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                    {contacting ? 'Connecting...' : 'Send Message'}
                  </Button>
                  <WhatsAppButton phoneNumber={candidate.whatsapp_number} className="w-full" />
                  <Separator />
                  <Button variant="outline" className="w-full gap-2 text-sm" onClick={handleDownloadResume}>
                    <Download className="w-3.5 h-3.5" />Download CV
                  </Button>
                  <Button variant="ghost" className="w-full gap-2 text-sm" onClick={handleSave}>
                    <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-primary text-primary' : ''}`} />{isSaved ? 'Saved' : 'Save Candidate'}
                  </Button>
                </CardContent>
              </Card>
              )}

              {/* Highlights */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Highlights</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Experience</span>
                      <span className="text-sm font-semibold text-foreground">{candidate.experience_years || 0} years</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Expected Pay</span>
                      <span className="text-sm font-semibold text-primary">{candidate.expected_salary || 'Negotiable'}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant="outline" className={`text-xs ${getAvailabilityColor(candidate.availability_status)}`}>
                        {getAvailabilityLabel(candidate.availability_status)}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Member since</span>
                      <span className="text-sm text-foreground">{memberSince}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Languages */}
              {candidate.languages && candidate.languages.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Languages</h3>
                    <div className="space-y-2">
                      {candidate.languages.map((lang, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{lang.language}</span>
                          <span className="text-muted-foreground text-xs bg-muted px-2 py-0.5 rounded">{lang.proficiency}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          /* Restricted Access */
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
      {isEmployerUser && (
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
