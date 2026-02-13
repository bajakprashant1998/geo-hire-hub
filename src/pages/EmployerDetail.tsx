import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, MapPin, Briefcase, Building2, Calendar, Globe,
  Users, Mail, Heart, Share2, ExternalLink, ShieldCheck,
  Image as ImageIcon, TrendingUp, Target, Zap, CheckCircle2,
  Clock, FileText, MessageSquare, Lock, LogIn, UserPlus, Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { VerificationBadge } from '@/components/employer/VerificationBadge';
import { useAuth } from '@/hooks/useAuth';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { TooltipProvider } from '@/components/ui/tooltip';

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

const EmployerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const [employer, setEmployer] = useState<EmployerProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  const isValidUUID = (uuid: string | undefined): boolean => {
    if (!uuid) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
  };

  useEffect(() => {
    if (id && isValidUUID(id)) {
      fetchEmployer();
      fetchJobs();
    } else if (id) {
      setLoading(false);
    }
  }, [id]);

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
      await navigator.share({ title: employer?.company_name, text: `Check out ${employer?.company_name} on Hire for Job`, url: window.location.href });
    } catch { navigator.clipboard.writeText(window.location.href); toast.success('Link copied to clipboard!'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-48 md:h-56 bg-gradient-to-r from-primary/20 to-primary/5" />
        <div className="container mx-auto px-4 -mt-16 max-w-4xl">
          <Card className="border-0 shadow-lg"><CardContent className="p-6">
            <div className="flex gap-5"><Skeleton className="w-20 h-20 rounded-2xl" /><div className="flex-1 space-y-3"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-32" /></div></div>
          </CardContent></Card>
        </div>
      </div>
    );
  }

  if (!employer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4 text-center border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">Company Not Found</h2>
            <p className="text-muted-foreground mb-6 text-sm">The company you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/')}><ArrowLeft className="w-4 h-4 mr-2" />Back to Map</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const foundedYear = employer.founding_year || (employer.created_at ? new Date(employer.created_at).getFullYear() : new Date().getFullYear());

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background pb-24 lg:pb-12">
        {/* Gradient Hero */}
        <div className="relative h-48 md:h-56 bg-gradient-to-br from-primary via-primary/80 to-primary/60">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
          <div className="absolute top-0 left-0 right-0 z-10">
            <div className="container mx-auto px-4 pt-4 max-w-4xl">
              <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-white/20 rounded-full px-4">
                <ArrowLeft className="w-4 h-4 mr-2" />Back
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-20 max-w-4xl relative z-10 space-y-6">
          {/* Header Card */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardContent className="p-5 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {/* Logo */}
                <div className="relative mx-auto sm:mx-0 shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg border-4 border-background">
                    {employer.avatar_url ? (
                      <Avatar className="w-full h-full rounded-xl">
                        <AvatarImage src={employer.avatar_url} alt={employer.company_name} className="object-cover" />
                        <AvatarFallback className="text-2xl bg-transparent text-white rounded-xl"><Building2 className="w-10 h-10" /></AvatarFallback>
                      </Avatar>
                    ) : (
                      <Building2 className="w-10 h-10 text-white" />
                    )}
                  </div>
                  {employer.verification_status === 'approved' && (
                    <div className="absolute -bottom-1 -right-1"><VerificationBadge status="approved" size="sm" /></div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">{employer.company_name}</h1>
                  <p className="text-primary font-semibold flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                    <Briefcase className="w-4 h-4" />
                    {employer.industry || 'Multiple Industries'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                    {employer.latitude && (
                      <Badge variant="secondary" className="gap-1 font-normal"><MapPin className="w-3 h-3" />Location on map</Badge>
                    )}
                    <Badge variant="secondary" className="gap-1 font-normal"><Calendar className="w-3 h-3" />Since {foundedYear}</Badge>
                    <Badge className="bg-primary/10 text-primary border-0 gap-1 font-semibold"><Briefcase className="w-3 h-3" />{jobs.length} Open Jobs</Badge>
                  </div>
                </div>

                {/* Desktop Actions */}
                <div className="hidden lg:flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handleShare} className="rounded-full"><Share2 className="w-4 h-4" /></Button>
                  <Button variant={isFollowing ? 'default' : 'outline'} onClick={handleFollow} className="rounded-full px-5">
                    <Heart className={`w-4 h-4 mr-1.5 ${isFollowing ? 'fill-current' : ''}`} />{isFollowing ? 'Following' : 'Follow'}
                  </Button>
                </div>
              </div>
            </CardContent>

            {/* Stats Bar */}
            <div className="border-t bg-muted/30">
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-semibold">{foundedYear}</span>
                </div>
                <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-semibold">{employer.team_size || '—'}</span>
                </div>
                <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-semibold">{jobs.length} jobs</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* About */}
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="w-5 h-5 text-primary" />About {employer.company_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {employer.description || `${employer.company_name} is a leading organization committed to excellence and innovation.`}
                  </p>
                  {employer.website_url && (
                    <a href={employer.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium">
                      <Globe className="w-4 h-4" />Visit Website<ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </CardContent>
              </Card>

              {/* Benefits */}
              {employer.benefits && employer.benefits.length > 0 && (
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Award className="w-5 h-5 text-primary" />Why Work Here
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {employer.benefits.map((b, i) => (
                        <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-primary" />{b}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Culture */}
              {employer.culture_description && (
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Zap className="w-5 h-5 text-primary" />Our Culture
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{employer.culture_description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Trust Documents */}
              {(employer.office_photo_url || employer.business_card_url) && (
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="w-5 h-5 text-primary" />Trust & Verification</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {employer.office_photo_url && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />Office Photo</p>
                          <div className="overflow-hidden rounded-xl border"><img src={employer.office_photo_url} alt="Office" className="w-full h-40 object-cover" /></div>
                        </div>
                      )}
                      {employer.business_card_url && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-muted-foreground" />Business Card</p>
                          <div className="overflow-hidden rounded-xl border"><img src={employer.business_card_url} alt="Business Card" className="w-full h-40 object-cover" /></div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Open Positions */}
              {jobs.length > 0 && (
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="w-5 h-5 text-primary" />Open Positions</CardTitle>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-0">{jobs.length} Jobs</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {jobs.map(job => (
                        <Link key={job.id} to={`/jobs/${job.id}`} className="group block p-4 rounded-xl border hover:border-primary/30 hover:shadow-sm transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Briefcase className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{job.title}</h4>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.job_type}</span>
                                  {job.salary_range && <span className="text-primary font-medium">{job.salary_range}</span>}
                                </div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">View Job</Button>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-6">
                {/* Contact / CTA Card */}
                <Card className="border-0 shadow-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-5">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MessageSquare className="w-5 h-5" />Get in Touch
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    {isAuthenticated ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Interested in working here? Reach out to learn about open opportunities.</p>
                        {employer.whatsapp_number && <WhatsAppButton phoneNumber={employer.whatsapp_number} className="w-full h-11" />}
                        <Separator />
                        <Button variant="outline" className="w-full gap-2" onClick={handleFollow}>
                          <Heart className={`w-4 h-4 ${isFollowing ? 'fill-primary text-primary' : ''}`} />{isFollowing ? 'Following' : 'Follow Company'}
                        </Button>
                        <Button variant="outline" className="w-full gap-2" onClick={handleShare}><Share2 className="w-4 h-4" />Share Profile</Button>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center"><Lock className="w-7 h-7 text-muted-foreground" /></div>
                        <div>
                          <h4 className="font-semibold">Sign in to Contact</h4>
                          <p className="text-muted-foreground text-sm mt-1">Create an account or login to message this company</p>
                        </div>
                        <Button className="w-full" onClick={() => navigate('/signup')}><UserPlus className="w-4 h-4 mr-2" />Create Account</Button>
                        <Button variant="outline" className="w-full" onClick={() => navigate('/login')}><LogIn className="w-4 h-4 mr-2" />Sign In</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Verified Info */}
                <Card className="border-0 shadow-md">
                  <CardContent className="p-5">
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" />Verified Information</h4>
                    <div className="space-y-2.5">
                      {['Business verified', 'Email verified', 'Address confirmed'].map(item => (
                        <div key={item} className="flex items-center gap-2.5 text-sm">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /></div>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background/95 backdrop-blur-lg border-t shadow-lg p-4 z-50">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={handleFollow} className={`w-12 h-12 rounded-xl shrink-0 ${isFollowing ? 'bg-primary/10 border-primary text-primary' : ''}`}>
                <Heart className={`w-5 h-5 ${isFollowing ? 'fill-current' : ''}`} />
              </Button>
              <Button variant="outline" size="icon" onClick={handleShare} className="w-12 h-12 rounded-xl shrink-0"><Share2 className="w-5 h-5" /></Button>
              {employer.whatsapp_number && <WhatsAppButton phoneNumber={employer.whatsapp_number} variant="icon" className="shrink-0" />}
              <Button className="flex-1 h-12 rounded-xl font-semibold"><Mail className="w-5 h-5 mr-2" />Contact</Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={handleShare} className="w-12 h-12 rounded-xl shrink-0"><Share2 className="w-5 h-5" /></Button>
              <Button variant="outline" onClick={() => navigate('/login')} className="flex-1 h-12 rounded-xl"><LogIn className="w-5 h-5 mr-2" />Sign In</Button>
              <Button onClick={() => navigate('/signup')} className="flex-1 h-12 rounded-xl font-semibold"><UserPlus className="w-5 h-5 mr-2" />Sign Up</Button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default EmployerDetail;
