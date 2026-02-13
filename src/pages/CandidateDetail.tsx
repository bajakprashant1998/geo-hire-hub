import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, MapPin, Briefcase, GraduationCap, Clock, Globe,
  Download, MessageCircle, Heart, Share2, Eye, DollarSign, Calendar,
  CheckCircle2, Award, User, Sparkles, Link as LinkIcon, ExternalLink,
  Loader2, Languages, BadgeCheck, Building2, Github, Linkedin, Twitter,
  Instagram, Youtube, Lock, LogIn,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStartConversation } from '@/hooks/useStartConversation';
import { useAuth } from '@/hooks/useAuth';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { TooltipProvider } from '@/components/ui/tooltip';

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

const CandidateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startConversation } = useStartConversation();
  const { user, profile } = useAuth();
  const isEmployerUser = user && profile?.user_type === 'employer';
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

  const isValidUUID = (uuid: string | undefined): boolean => {
    if (!uuid) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
  };

  useEffect(() => {
    if (id && isValidUUID(id)) fetchCandidate();
    else if (id) setLoading(false);
  }, [id]);

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
    const map: Record<string, string> = { available: 'bg-primary text-primary-foreground', open: 'bg-blue-500 text-white', notice: 'bg-amber-500 text-white', employed: 'bg-muted text-foreground', not_looking: 'bg-muted text-muted-foreground' };
    return map[s || ''] || 'bg-primary text-primary-foreground';
  };
  const getSocialIcon = (p: string) => {
    const icons: Record<string, React.ReactNode> = { linkedin: <Linkedin className="w-4 h-4" />, github: <Github className="w-4 h-4" />, twitter: <Twitter className="w-4 h-4" />, instagram: <Instagram className="w-4 h-4" />, youtube: <Youtube className="w-4 h-4" />, website: <Globe className="w-4 h-4" /> };
    return icons[p] || <LinkIcon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-44 md:h-52 bg-gradient-to-r from-primary/20 to-primary/5" />
        <div className="container mx-auto px-4 -mt-16 max-w-4xl">
          <Card className="border-0 shadow-lg"><CardContent className="p-6">
            <div className="flex gap-5"><Skeleton className="w-24 h-24 rounded-full" /><div className="flex-1 space-y-3"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-32" /></div></div>
          </CardContent></Card>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4 text-center border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center"><User className="w-8 h-8 text-muted-foreground" /></div>
            <h2 className="text-xl font-bold mb-2">Candidate Not Found</h2>
            <p className="text-muted-foreground mb-6 text-sm">The candidate you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/')}><ArrowLeft className="w-4 h-4 mr-2" />Back to Map</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const memberSince = candidate.created_at ? new Date(candidate.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently joined';
  const initials = candidate.full_name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background pb-24 lg:pb-12">
        {/* Hero */}
        <div className="relative h-44 md:h-52 bg-gradient-to-br from-primary via-primary/80 to-primary/60">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
          <div className="absolute top-0 left-0 right-0 z-10">
            <div className="container mx-auto px-4 pt-4 max-w-4xl">
              <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-white/20 rounded-full px-4">
                <ArrowLeft className="w-4 h-4 mr-2" />Back
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-16 md:-mt-20 max-w-4xl relative z-10 space-y-6">
          {/* Header Card */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardContent className="p-5 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="relative mx-auto sm:mx-0 shrink-0">
                  <Badge className={`absolute -top-2 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:-right-2 z-10 shadow-lg px-2.5 py-1 text-xs font-semibold ${getAvailabilityColor(candidate.availability_status)}`}>
                    {getAvailabilityLabel(candidate.availability_status)}
                  </Badge>
                  <Avatar className="w-24 h-24 sm:w-28 sm:h-28 border-4 border-background shadow-lg">
                    <AvatarImage src={candidate.avatar_url || ''} alt={candidate.full_name} className="object-cover" />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">{candidate.full_name}</h1>
                  <p className="text-primary font-semibold flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                    <Briefcase className="w-4 h-4" />{candidate.job_title}
                  </p>
                  {candidate.headline && <p className="text-muted-foreground italic text-sm mt-1">"{candidate.headline}"</p>}

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                    {candidate.experience_years && (
                      <Badge variant="secondary" className="gap-1 font-normal"><Clock className="w-3 h-3" />{candidate.experience_years} yrs exp.</Badge>
                    )}
                    {candidate.latitude && <Badge variant="secondary" className="gap-1 font-normal"><MapPin className="w-3 h-3" />Location on map</Badge>}
                    {candidate.expected_salary && <Badge className="bg-primary/10 text-primary border-0 gap-1 font-semibold"><DollarSign className="w-3 h-3" />{candidate.expected_salary}</Badge>}
                  </div>

                  {/* Social Links inline */}
                  {candidate.social_links && Object.entries(candidate.social_links).some(([, v]) => v) && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                      {Object.entries(candidate.social_links).map(([platform, url]) =>
                        url ? (
                          <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-muted hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                            {getSocialIcon(platform)}
                          </a>
                        ) : null
                      )}
                    </div>
                  )}
                </div>

                {/* Desktop Actions */}
                <div className="hidden lg:flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handleShare} className="rounded-full"><Share2 className="w-4 h-4" /></Button>
                  <Button variant={isSaved ? 'default' : 'outline'} size="icon" onClick={handleSave} className={`rounded-full ${isSaved ? 'bg-destructive hover:bg-destructive/90' : ''}`}>
                    <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardContent>

            {/* Stats Bar */}
            <div className="border-t bg-muted/30">
              <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-border">
                <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs sm:text-sm truncate">{memberSince}</span>
                </div>
                <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm">
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-semibold">—</span>
                  <span className="text-muted-foreground text-xs">views</span>
                </div>
                <div className="hidden sm:flex items-center justify-center gap-2 px-4 py-3 text-sm">
                  <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-semibold">—</span>
                  <span className="text-muted-foreground text-xs">messages</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Auth Gate */}
          {isEmployerUser ? (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* About */}
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg"><User className="w-5 h-5 text-primary" />About {candidate.full_name.split(' ')[0]}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {candidate.bio || `Hello! I'm ${candidate.full_name}, a passionate ${candidate.job_title} with ${candidate.experience_years || 0} years of experience.`}
                    </p>
                  </CardContent>
                </Card>

                {/* Professional Highlights */}
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="w-5 h-5 text-primary" />Professional Highlights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-xs text-muted-foreground">Experience</p>
                        <p className="font-bold text-lg">{candidate.experience_years || 0} Years</p>
                      </div>
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-xs text-muted-foreground">Expected Salary</p>
                        <p className="font-bold text-lg text-primary">{candidate.expected_salary || 'Negotiable'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Skills */}
                {candidate.skills && candidate.skills.length > 0 && (
                  <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="w-5 h-5 text-primary" />Skills & Expertise</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {candidate.skills.map((skill, i) => (
                          <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm">{skill}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Work Experience */}
                {candidate.work_experience && candidate.work_experience.length > 0 && (
                  <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="w-5 h-5 text-primary" />Work Experience</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative pl-6 space-y-4">
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />
                        {candidate.work_experience.map((exp, i) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[25px] w-3 h-3 bg-primary rounded-full border-2 border-background shadow" />
                            <div className="p-3 rounded-lg bg-muted/50 border">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-bold">{exp.title}</span>
                                {exp.isCurrent && <Badge className="bg-primary text-primary-foreground text-xs">Current</Badge>}
                              </div>
                              <p className="text-sm font-medium text-foreground">{exp.company}</p>
                              <p className="text-xs text-muted-foreground">{exp.startDate} — {exp.isCurrent ? 'Present' : exp.endDate}</p>
                              {exp.description && <p className="text-sm text-muted-foreground mt-1.5">{exp.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Certifications */}
                {candidate.certifications && candidate.certifications.length > 0 && (
                  <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg"><BadgeCheck className="w-5 h-5 text-primary" />Certifications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {candidate.certifications.map((cert, i) => (
                          <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm gap-1"><Award className="w-3 h-3" />{cert}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Languages */}
                {candidate.languages && candidate.languages.length > 0 && (
                  <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg"><Languages className="w-5 h-5 text-primary" />Languages</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {candidate.languages.map((lang, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border text-sm">
                            <span className="font-medium">{lang.language}</span>
                            <Badge variant="outline" className="text-xs">{lang.proficiency}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Portfolio */}
                {candidate.portfolio_urls && candidate.portfolio_urls.length > 0 && (
                  <Card className="border-0 shadow-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg"><LinkIcon className="w-5 h-5 text-primary" />Portfolio & Links</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {candidate.portfolio_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/30 hover:shadow-sm transition-all group">
                            <Globe className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                            <span className="flex-1 truncate text-sm">{url}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Education */}
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg"><GraduationCap className="w-5 h-5 text-primary" />Education</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {candidate.education && candidate.education.length > 0 ? (
                      <div className="relative pl-6 space-y-4">
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />
                        {candidate.education.map((edu, i) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[25px] w-3 h-3 bg-primary rounded-full border-2 border-background shadow" />
                            <div className="p-3 rounded-lg bg-muted/50 border">
                              <Badge variant="secondary" className="mb-1.5 text-xs">{edu.degree}</Badge>
                              <h4 className="font-bold">{edu.institution}</h4>
                              <p className="text-sm text-muted-foreground">{edu.field}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{edu.startYear} — {edu.endYear || 'Present'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Education details not provided yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-6 space-y-6">
                  <Card className="border-0 shadow-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-5">
                      <CardTitle className="flex items-center gap-2 text-lg"><Award className="w-5 h-5" />Connect with {candidate.full_name.split(' ')[0]}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      <p className="text-sm text-muted-foreground">Interested? Send a message to start a conversation.</p>
                      <Button onClick={handleContact} disabled={contacting} className="w-full h-11 font-semibold" size="lg">
                        {contacting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
                        {contacting ? 'Starting Chat...' : 'Contact Candidate'}
                      </Button>
                      <WhatsAppButton phoneNumber={candidate.whatsapp_number} className="w-full h-10" />
                      <Separator />
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full gap-2" onClick={handleSave}>
                          <Heart className={`w-4 h-4 ${isSaved ? 'fill-primary text-primary' : ''}`} />{isSaved ? 'Saved' : 'Save Candidate'}
                        </Button>
                        <Button variant="outline" className="w-full gap-2" onClick={handleShare}><Share2 className="w-4 h-4" />Share Profile</Button>
                        <Button variant="secondary" className="w-full gap-2" onClick={handleDownloadResume}><Download className="w-4 h-4" />Download CV</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md">
                    <CardContent className="p-5">
                      <h4 className="font-semibold mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" />Quick Info</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Availability</span>
                          <Badge variant="secondary" className="border-0">{getAvailabilityLabel(candidate.availability_status)}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Member since</span>
                          <span className="font-medium">{memberSince}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <Card className="border-0 shadow-md mt-6">
              <CardContent className="p-8 md:p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">Full Profile Restricted</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
                  {user ? 'Only employer accounts can view full candidate profiles.' : "Sign in with an employer account to view this candidate's full profile."}
                </p>
                {!user ? (
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => navigate('/login')}><LogIn className="w-4 h-4 mr-2" />Sign In</Button>
                    <Button onClick={() => navigate('/signup')} variant="outline">Create Account</Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">You're signed in as a candidate. Switch to an employer account to access full profiles.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mobile Bottom Bar */}
        {isEmployerUser && (
          <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background/95 backdrop-blur-lg border-t shadow-lg p-4 z-50">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={handleSave} className={`w-12 h-12 rounded-xl shrink-0 ${isSaved ? 'bg-destructive/10 border-destructive text-destructive' : ''}`}>
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
              </Button>
              <Button variant="outline" size="icon" onClick={handleShare} className="w-12 h-12 rounded-xl shrink-0"><Share2 className="w-5 h-5" /></Button>
              <WhatsAppButton phoneNumber={candidate.whatsapp_number} variant="icon" className="shrink-0" />
              <Button onClick={handleContact} disabled={contacting} className="flex-1 h-12 rounded-xl font-semibold">
                {contacting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <MessageCircle className="w-5 h-5 mr-2" />}
                {contacting ? 'Starting...' : 'Contact'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default CandidateDetail;
