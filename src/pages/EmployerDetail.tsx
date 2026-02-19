import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, MapPin, Briefcase, Building2, Calendar, Globe,
  Users, Mail, Heart, Share2, ExternalLink, ShieldCheck,
  Image as ImageIcon, CheckCircle2,
  Clock, FileText, Lock, LogIn, UserPlus, Award, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { VerificationBadge } from '@/components/employer/VerificationBadge';
import { useAuth } from '@/hooks/useAuth';
import { WhatsAppButton } from '@/components/WhatsAppButton';

interface EmployerProfile {
  id: string;
  profile_id: string;
  company_name: string;
  description: string | null;
  industry: string | null;
  website_url: string | null;
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  office_photo_url: string | null;
  business_card_url: string | null;
  whatsapp_number: string | null;
  team_size: string | null;
  benefits: string[] | null;
  culture_description: string | null;
  founding_year: number | null;
}

interface Job {
  id: string;
  title: string;
  job_type: string;
  salary_range: string | null;
  created_at: string;
  status: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EmployerDetail = ({ id: propId }: { id?: string }) => {
  const params = useParams();
  const identifier = propId || params.slug || params.id || params['*']?.split('/').pop();
  const [resolvedId, setResolvedId] = useState<string | null>(propId || null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const isOwnProfile = !!propId;

  const [employer, setEmployer] = useState<EmployerProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  // Resolve slug to ID & redirect UUID URLs to SEO slugs
  useEffect(() => {
    if (!identifier || propId) return;
    if (UUID_REGEX.test(identifier)) {
      // UUID access — check for slug redirect
      supabase
        .from('employers')
        .select('id, slug, location_country, location_state, location_city')
        .eq('id', identifier)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setResolvedId(data.id);
            if (data.slug) {
              const parts = ['/companies'];
              if (data.location_country) parts.push(encodeURIComponent(data.location_country.toLowerCase().replace(/\s+/g, '-')));
              if (data.location_state) parts.push(encodeURIComponent(data.location_state.toLowerCase().replace(/\s+/g, '-')));
              if (data.location_city) parts.push(encodeURIComponent(data.location_city.toLowerCase().replace(/\s+/g, '-')));
              parts.push(data.slug);
              const seoPath = parts.join('/');
              if (window.location.pathname !== seoPath) {
                navigate(seoPath + window.location.search, { replace: true });
              }
            }
          } else setLoading(false);
        });
    } else {
      supabase
        .from('employers')
        .select('id')
        .eq('slug', identifier)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setResolvedId(data.id);
          else setLoading(false);
        });
    }
  }, [identifier, propId]);

  const id = resolvedId;

  useEffect(() => {
    if (id) {
      fetchEmployer();
      fetchJobs();
    }
  }, [id]);

  // SEO meta tags
  useEffect(() => {
    if (employer) {
      document.title = `${employer.company_name}${employer.industry ? ` - ${employer.industry}` : ''} | HireForJob`;
      const desc = `${employer.company_name}${employer.industry ? `, ${employer.industry}` : ''}. ${jobs.length} open positions. View company profile on HireForJob.`;
      let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
      if (!metaDesc) { metaDesc = document.createElement('meta'); metaDesc.name = 'description'; document.head.appendChild(metaDesc); }
      metaDesc.content = desc.slice(0, 160);
    }
  }, [employer, jobs]);

  const fetchEmployer = async () => {
    try {
      const { data, error } = await supabase
        .from('employers')
        .select(`*, profiles!inner(avatar_url, latitude, longitude, created_at, whatsapp_number)`)
        .eq('id', id)
        .single();

      if (error) throw error;
      setEmployer({
        ...data,
        avatar_url: data.profiles.avatar_url,
        latitude: data.profiles.latitude,
        longitude: data.profiles.longitude,
        created_at: data.profiles.created_at,
        verification_status: (data.verification_status as any) || 'pending',
        whatsapp_number: data.profiles.whatsapp_number,
      });
    } catch (error) {
      console.error('Error fetching employer:', error);
      toast.error('Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, job_type, salary_range, created_at, status')
        .eq('employer_id', id)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const handleFollow = () => {
    if (!isAuthenticated) { toast.error('Please login to follow companies'); navigate('/login'); return; }
    setIsFollowing(!isFollowing);
    toast.success(isFollowing ? 'Unfollowed company' : 'Now following this company!');
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: employer?.company_name, text: `Check out ${employer?.company_name}`, url: window.location.href });
    } catch { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="bg-background border-b">
          <div className="container mx-auto px-4 py-6 max-w-5xl">
            <div className="flex gap-5 items-center">
              <Skeleton className="w-16 h-16 rounded-2xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!employer) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="p-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center"><Building2 className="w-7 h-7 text-muted-foreground" /></div>
            <h2 className="text-lg font-bold mb-2 text-foreground">Company Not Found</h2>
            <p className="text-muted-foreground mb-6 text-sm">This company doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/')} variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Back to Map</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const foundedYear = employer.founding_year || (employer.created_at ? new Date(employer.created_at).getFullYear() : null);

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
              <Button variant="ghost" size="icon" onClick={handleShare} className="rounded-full w-9 h-9"><Share2 className="w-4 h-4" /></Button>
              {!isOwnProfile && (
              <Button variant="ghost" size="icon" onClick={handleFollow} className={`rounded-full w-9 h-9 ${isFollowing ? 'text-primary' : ''}`}>
                <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
              </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Company Header */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center border border-border shadow-sm overflow-hidden">
                {employer.avatar_url ? (
                  <Avatar className="w-full h-full rounded-xl">
                    <AvatarImage src={employer.avatar_url} alt={employer.company_name} className="object-cover" />
                    <AvatarFallback className="text-xl bg-transparent text-primary rounded-xl"><Building2 className="w-8 h-8" /></AvatarFallback>
                  </Avatar>
                ) : (
                  <Building2 className="w-8 h-8 text-primary" />
                )}
              </div>
              {employer.verification_status === 'approved' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                  <ShieldCheck className="w-3 h-3" />Verified
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{employer.company_name}</h1>
              {employer.industry && <p className="text-primary font-medium mt-0.5">{employer.industry}</p>}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                {foundedYear && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    <Calendar className="w-3 h-3" />Since {foundedYear}
                  </span>
                )}
                {employer.team_size && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    <Users className="w-3 h-3" />{employer.team_size}
                  </span>
                )}
                {employer.latitude && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    <MapPin className="w-3 h-3" />On map
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/5 px-2.5 py-1 rounded-full">
                  <Briefcase className="w-3 h-3" />{jobs.length} open {jobs.length === 1 ? 'job' : 'jobs'}
                </span>
              </div>

              {employer.website_url && (
                <a href={employer.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2">
                  <Globe className="w-3.5 h-3.5" />{employer.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Desktop CTA */}
            {!isOwnProfile && (
            <div className="hidden lg:flex flex-col gap-2 shrink-0">
              {isAuthenticated ? (
                <>
                  {employer.whatsapp_number && <WhatsAppButton phoneNumber={employer.whatsapp_number} className="w-full" />}
                  <Button variant="outline" onClick={handleFollow} className="gap-2">
                    <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current text-primary' : ''}`} />
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => navigate('/signup')} className="gap-2"><UserPlus className="w-4 h-4" />Sign Up</Button>
                  <Button variant="outline" onClick={() => navigate('/login')} className="gap-2"><LogIn className="w-4 h-4" />Sign In</Button>
                </>
              )}
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* About */}
            {employer.description && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">About</h3>
                  <p className="text-foreground leading-relaxed text-sm">{employer.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            {employer.benefits && employer.benefits.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Why Work Here</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {employer.benefits.map((b, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-success/5 border border-success/10">
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                        <span className="text-sm text-foreground">{b}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Culture */}
            {employer.culture_description && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Our Culture</h3>
                  <p className="text-foreground leading-relaxed text-sm">{employer.culture_description}</p>
                </CardContent>
              </Card>
            )}

            {/* Trust Documents */}
            {(employer.office_photo_url || employer.business_card_url) && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Verification</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {employer.office_photo_url && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><ImageIcon className="w-3 h-3" />Office Photo</p>
                        <div className="overflow-hidden rounded-xl border"><img src={employer.office_photo_url} alt="Office" className="w-full h-36 object-cover" /></div>
                      </div>
                    )}
                    {employer.business_card_url && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><FileText className="w-3 h-3" />Business Card</p>
                        <div className="overflow-hidden rounded-xl border"><img src={employer.business_card_url} alt="Business Card" className="w-full h-36 object-cover" /></div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Open Positions */}
            {jobs.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Open Positions</h3>
                    <Badge variant="secondary" className="text-xs">{jobs.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {jobs.map(job => (
                      <Link key={job.id} to={`/jobs/${job.id}`} className="group flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Briefcase className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">{job.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{job.job_type}</span>
                            {job.salary_range && <><span>·</span><span className="text-primary font-medium">{job.salary_range}</span></>}
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Contact/Auth Card - hidden when viewing own profile */}
            {!isOwnProfile && (
            <Card className="overflow-hidden">
              <div className="bg-primary p-4">
                <h3 className="text-primary-foreground font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4" />Get in Touch
                </h3>
              </div>
              <CardContent className="p-4">
                {isAuthenticated ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Interested in working here? Reach out directly.</p>
                    {employer.whatsapp_number && <WhatsAppButton phoneNumber={employer.whatsapp_number} className="w-full" />}
                    <Separator />
                    <Button variant="outline" className="w-full gap-2 text-sm" onClick={handleFollow}>
                      <Heart className={`w-3.5 h-3.5 ${isFollowing ? 'fill-primary text-primary' : ''}`} />{isFollowing ? 'Following' : 'Follow Company'}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-muted flex items-center justify-center"><Lock className="w-6 h-6 text-muted-foreground" /></div>
                    <p className="text-sm text-muted-foreground">Sign in to contact this company</p>
                    <Button className="w-full gap-2" onClick={() => navigate('/signup')}><UserPlus className="w-4 h-4" />Create Account</Button>
                    <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/login')}><LogIn className="w-4 h-4" />Sign In</Button>
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Company Info */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Company Info</h3>
                <div className="space-y-3">
                  {foundedYear && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Founded</span>
                        <span className="font-medium text-foreground">{foundedYear}</span>
                      </div>
                      <Separator />
                    </>
                  )}
                  {employer.team_size && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Team Size</span>
                        <span className="font-medium text-foreground">{employer.team_size}</span>
                      </div>
                      <Separator />
                    </>
                  )}
                  {employer.industry && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Industry</span>
                        <span className="font-medium text-foreground">{employer.industry}</span>
                      </div>
                      <Separator />
                    </>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Open Jobs</span>
                    <Badge className="bg-primary/10 text-primary border-0 text-xs">{jobs.length}</Badge>
                  </div>
                  {employer.verification_status === 'approved' && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2 text-sm text-success">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="font-medium">Verified Company</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      {!isOwnProfile && (
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background/95 backdrop-blur-lg border-t p-3 z-50">
        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleFollow} className={`w-11 h-11 rounded-xl shrink-0 ${isFollowing ? 'text-primary border-primary/30' : ''}`}>
              <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
            </Button>
            <Button variant="outline" size="icon" onClick={handleShare} className="w-11 h-11 rounded-xl shrink-0"><Share2 className="w-4 h-4" /></Button>
            {employer.whatsapp_number && <WhatsAppButton phoneNumber={employer.whatsapp_number} variant="icon" className="shrink-0" />}
            <Button className="flex-1 h-11 rounded-xl font-medium gap-2"><Mail className="w-4 h-4" />Contact</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/login')} className="flex-1 h-11 rounded-xl gap-2"><LogIn className="w-4 h-4" />Sign In</Button>
            <Button onClick={() => navigate('/signup')} className="flex-1 h-11 rounded-xl font-medium gap-2"><UserPlus className="w-4 h-4" />Sign Up</Button>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default EmployerDetail;
