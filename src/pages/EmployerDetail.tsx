import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  Code, GraduationCap, TrendingUp, Banknote, Laptop,
  Star, BookOpen, Shield, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { ReportDialog } from '@/components/ReportDialog';
import { SEOHead } from '@/components/SEOHead';
import { motion } from 'framer-motion';
import { VerificationBadge } from '@/components/employer/VerificationBadge';
import { TrustScoreDisplay } from '@/components/employer/TrustScoreDisplay';
import { ResponseRateBadge } from '@/components/employer/ResponseRateBadge';
import { BreadcrumbNav, buildBreadcrumbJsonLd } from '@/components/BreadcrumbNav';
import { CompanyReviews } from '@/components/employer/CompanyReviews';
import { CompanyQAForum } from '@/components/employer/CompanyQAForum';
import { SpotlightStories } from '@/components/employer/SpotlightStories';
import type { BreadcrumbItem } from '@/components/BreadcrumbNav';

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
  work_environment: string | null;
  office_locations: string[] | null;
  relocation_support: boolean | null;
  fresher_hiring: boolean | null;
  internship_available: boolean | null;
  hiring_process: string | null;
  avg_salary_range: string | null;
  bonus_structure: string | null;
  paid_leaves_policy: string | null;
  learning_budget: string | null;
  promotion_frequency: string | null;
  career_growth_paths: string | null;
  employee_retention_rate: string | null;
  key_skills_hiring: string[] | null;
  preferred_certifications: string[] | null;
  tech_stack: string[] | null;
  education_preference: string | null;
  work_culture_type: string | null;
  work_life_balance_rating: number | null;
  diversity_policies: string | null;
  company_values: string[] | null;
  awards_recognition: string[] | null;
  interview_rounds_count: number | null;
  assessment_types: string[] | null;
  hiring_timeline: string | null;
  hr_contact_email: string | null;
  careers_page_url: string | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  social_links: any | null;
  specializations: string[] | null;
  verification_method: string | null;
  google_business_verified: boolean | null;
  trust_score: number | null;
  response_rate: number | null;
  avg_response_hours: number | null;
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

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const } }),
};

const SectionCard = ({ children, title, icon: Icon, delay = 0 }: { children: React.ReactNode; title: string; icon: any; delay?: number }) => (
  <motion.div custom={delay} variants={fadeUp} initial="hidden" animate="visible">
    <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  </motion.div>
);

const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
    <span className="text-sm text-muted-foreground flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </span>
    <span className="text-sm font-semibold text-foreground text-right max-w-[55%]">{value}</span>
  </div>
);

const EmployerDetail = ({ id: propId }: { id?: string }) => {
  const params = useParams();
  const identifier = propId || params.slug || params.id || params['*']?.split('/').pop();
  const [resolvedId, setResolvedId] = useState<string | null>(propId || null);
  const navigate = useNavigate();
  const { user, profile: authProfile } = useAuth();
  const { isAdmin } = useAdminAuth();
  const isAuthenticated = !!user;
  const isOwnProfile = !!propId;

  const [employer, setEmployer] = useState<EmployerProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  const redirectEmployerToSeoPath = (data: any) => {
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
  };

  useEffect(() => {
    if (!identifier || propId) return;
    if (UUID_REGEX.test(identifier)) {
      supabase
        .from('employers')
        .select('id, slug, location_country, location_state, location_city')
        .eq('id', identifier)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setResolvedId(data.id);
            redirectEmployerToSeoPath(data);
          } else {
            // Fallback: try by profile_id (e.g. when navigating from messages)
            supabase
              .from('employers')
              .select('id, slug, location_country, location_state, location_city')
              .eq('profile_id', identifier)
              .maybeSingle()
              .then(({ data: empByProfile }) => {
                if (empByProfile) {
                  setResolvedId(empByProfile.id);
                  redirectEmployerToSeoPath(empByProfile);
                } else {
                  setLoading(false);
                }
              });
          }
        });
    } else {
      supabase.from('employers').select('id').eq('slug', identifier).maybeSingle()
        .then(({ data }) => { if (data) setResolvedId(data.id); else setLoading(false); });
    }
  }, [identifier, propId]);

  const id = resolvedId;

  useEffect(() => {
    if (id) { fetchEmployer(); fetchJobs(); }
  }, [id]);

  const baseUrl = 'https://www.hireforjob.com';
  const empSeoTitle = employer ? `${employer.company_name}${employer.industry ? ` - ${employer.industry}` : ''} | HireForJob` : 'Company Profile | HireForJob';
  const empSeoDesc = employer ? `${employer.company_name}${employer.industry ? `, ${employer.industry}` : ''}. ${jobs.length} open positions.` : '';
  const empCanonical = employer ? `${baseUrl}${window.location.pathname}` : undefined;
  const empJsonLd = employer ? {
    '@context': 'https://schema.org', '@type': 'Organization',
    name: employer.company_name, description: employer.description || '',
    ...(employer.website_url && { url: employer.website_url }),
    ...(employer.avatar_url && { logo: employer.avatar_url }),
    ...(employer.team_size && { numberOfEmployees: { '@type': 'QuantitativeValue', value: employer.team_size } }),
    ...(employer.location_city && { address: { '@type': 'PostalAddress', ...(employer.location_city && { addressLocality: employer.location_city }), ...(employer.location_state && { addressRegion: employer.location_state }), ...(employer.location_country && { addressCountry: employer.location_country }) } }),
  } : undefined;
  const empBreadcrumbItems: BreadcrumbItem[] = employer ? [
    { label: 'Companies', href: '/browse-jobs' },
    ...(employer.location_country ? [{ label: employer.location_country }] : []),
    { label: employer.company_name },
  ] : [];
  const empBreadcrumbJsonLd = employer ? buildBreadcrumbJsonLd(empBreadcrumbItems) : undefined;

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
        verification_method: data.verification_method || null,
        google_business_verified: data.google_business_verified || null,
        trust_score: data.trust_score || null,
        response_rate: data.response_rate ?? null,
        avg_response_hours: data.avg_response_hours ?? null,
        whatsapp_number: data.profiles.whatsapp_number,
      });

      // Calculate response rate in background (refreshes cached value)
      supabase.rpc('calculate_employer_response_rate', { p_employer_id: id }).then(() => {});

      // Track profile view (authenticated, non-own-profile only)
      if (user && data.profile_id !== authProfile?.id) {
        supabase.from('profile_views').insert({ profile_id: data.profile_id }).then(({ error: viewErr }) => {
          if (viewErr) console.warn('Failed to record profile view:', viewErr.message);
        });
      }
    } catch (error) {
      console.error('Error fetching employer:', error);
      toast.error('Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase.from('jobs')
        .select('id, title, job_type, salary_range, created_at, status')
        .eq('employer_id', id).eq('status', 'open').order('created_at', { ascending: false });
      if (error) throw error;
      setJobs(data || []);
    } catch (error) { console.error('Error fetching jobs:', error); }
  };

  const handleFollow = () => {
    if (!isAuthenticated) { toast.error('Please login to follow companies'); navigate('/login'); return; }
    setIsFollowing(!isFollowing);
    toast.success(isFollowing ? 'Unfollowed company' : 'Now following this company!');
  };

  const handleShare = async () => {
    try { await navigator.share({ title: employer?.company_name, text: `Check out ${employer?.company_name}`, url: window.location.href }); }
    catch { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-background h-44" />
        <div className="container mx-auto px-4 max-w-5xl -mt-16">
          <div className="flex gap-5 items-end">
            <Skeleton className="w-24 h-24 rounded-2xl border-4 border-background" />
            <div className="flex-1 space-y-3 pb-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-6 mt-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-52 rounded-xl" />
              <Skeleton className="h-36 rounded-xl" />
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
  const locationStr = [employer.location_city, employer.location_state, employer.location_country].filter(Boolean).join(', ');

  const quickFacts = [
    employer.fresher_hiring && { label: 'Hires Freshers', icon: UserPlus },
    employer.internship_available && { label: 'Internships Available', icon: GraduationCap },
    employer.relocation_support && { label: 'Relocation Support', icon: MapPin },
  ].filter(Boolean) as { label: string; icon: any }[];

  return (
    <div className="min-h-screen bg-muted/30 pb-24 lg:pb-8">
      <SEOHead title={empSeoTitle} description={empSeoDesc} canonicalUrl={empCanonical} ogType="profile" ogImage={employer.avatar_url || undefined} jsonLd={empJsonLd} breadcrumbJsonLd={empBreadcrumbJsonLd} />
      {/* Breadcrumb */}
      {!isOwnProfile && (
        <div className="container mx-auto px-4 max-w-5xl pt-2">
          <BreadcrumbNav items={empBreadcrumbItems} />
        </div>
      )}

      {/* Sticky Nav */}
      <div className="bg-background/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-30">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-center justify-between h-12">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />Back
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handleShare} className="rounded-full w-8 h-8"><Share2 className="w-3.5 h-3.5" /></Button>
              {!isOwnProfile && (
                <>
                  <Button variant="ghost" size="icon" onClick={handleFollow} className={`rounded-full w-8 h-8 ${isFollowing ? 'text-primary' : ''}`}>
                    <Heart className={`w-3.5 h-3.5 ${isFollowing ? 'fill-current' : ''}`} />
                  </Button>
                  <ReportDialog targetId={employer.id} targetType="employer" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Banner with Gradient */}
      <div className="relative">
        <div className="h-32 sm:h-40 bg-gradient-to-br from-primary/25 via-primary/10 to-accent/10" />
        
        {/* Profile Card overlapping banner */}
        <div className="container mx-auto px-4 max-w-5xl -mt-16 sm:-mt-20 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card className="border-border/60 shadow-lg">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-center sm:items-start">
                  {/* Avatar */}
                  <div className="flex flex-col items-center gap-2 shrink-0 -mt-12 sm:-mt-14">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-card flex items-center justify-center border-4 border-background shadow-lg overflow-hidden">
                      {employer.avatar_url ? (
                        <Avatar className="w-full h-full rounded-xl">
                          <AvatarImage src={employer.avatar_url} alt={employer.company_name} className="object-cover" />
                          <AvatarFallback className="text-2xl bg-primary/10 text-primary rounded-xl"><Building2 className="w-10 h-10" /></AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-10 h-10 text-primary" />
                        </div>
                      )}
                    </div>
                    {employer.verification_status && (
                      <VerificationBadge
                        status={employer.verification_status}
                        size="sm"
                        verificationMethod={employer.verification_method}
                        googleBusinessVerified={employer.google_business_verified || false}
                      />
                    )}
                    {employer.trust_score !== null && employer.trust_score !== undefined && employer.trust_score > 0 && (
                      <TrustScoreDisplay score={employer.trust_score} size="sm" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 text-center sm:text-left pt-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{employer.company_name}</h1>
                    {employer.industry && (
                      <p className="text-primary font-medium mt-0.5 text-sm">{employer.industry}</p>
                    )}

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-3">
                      {foundedYear && (
                        <Badge variant="secondary" className="gap-1 text-xs font-normal"><Calendar className="w-3 h-3" />Since {foundedYear}</Badge>
                      )}
                      {employer.team_size && (
                        <Badge variant="secondary" className="gap-1 text-xs font-normal"><Users className="w-3 h-3" />{employer.team_size}</Badge>
                      )}
                      {employer.latitude && (
                        <Badge variant="secondary" className="gap-1 text-xs font-normal"><MapPin className="w-3 h-3" />On map</Badge>
                      )}
                      {employer.work_environment && (
                        <Badge variant="secondary" className="gap-1 text-xs font-normal"><Laptop className="w-3 h-3" />{employer.work_environment}</Badge>
                      )}
                      <Badge className="gap-1 text-xs bg-primary/10 text-primary border-0 hover:bg-primary/15">
                        <Briefcase className="w-3 h-3" />{jobs.length} open {jobs.length === 1 ? 'job' : 'jobs'}
                      </Badge>
                    </div>

                    {employer.website_url && (
                      <a href={employer.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2.5">
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
                          <Button variant="outline" size="sm" onClick={handleFollow} className="gap-2">
                            <Heart className={`w-3.5 h-3.5 ${isFollowing ? 'fill-current text-primary' : ''}`} />
                            {isFollowing ? 'Following' : 'Follow'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => navigate('/signup')} className="gap-2"><UserPlus className="w-3.5 h-3.5" />Sign Up</Button>
                          <Button variant="outline" size="sm" onClick={() => navigate('/login')} className="gap-2"><LogIn className="w-3.5 h-3.5" />Sign In</Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-5">
            {/* About */}
            {employer.description && (
              <SectionCard title="About" icon={Building2} delay={0}>
                <p className="text-foreground leading-relaxed text-sm">{employer.description}</p>
              </SectionCard>
            )}

            {/* Benefits */}
            {employer.benefits && employer.benefits.length > 0 && (
              <SectionCard title="Why Work Here" icon={Heart} delay={1}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {employer.benefits.map((b, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04 }}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 dark:bg-emerald-950/30"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-sm text-foreground">{b}</span>
                    </motion.div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Compensation */}
            {(employer.avg_salary_range || employer.bonus_structure || employer.paid_leaves_policy || employer.learning_budget) && (
              <SectionCard title="Compensation & Benefits" icon={Banknote} delay={2}>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    employer.avg_salary_range && { icon: Banknote, label: 'Avg Salary Range', value: employer.avg_salary_range },
                    employer.bonus_structure && { icon: Zap, label: 'Bonus Structure', value: employer.bonus_structure },
                    employer.paid_leaves_policy && { icon: Calendar, label: 'Paid Leaves', value: employer.paid_leaves_policy },
                    employer.learning_budget && { icon: BookOpen, label: 'Learning Budget', value: employer.learning_budget },
                  ].filter(Boolean).map((item: any, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/60 border border-border/40">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{item.label}</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Growth & Career */}
            {(employer.promotion_frequency || employer.career_growth_paths || employer.employee_retention_rate) && (
              <SectionCard title="Growth & Career" icon={TrendingUp} delay={3}>
                <div className="space-y-3">
                  {[
                    employer.career_growth_paths && { icon: TrendingUp, label: 'Career Growth Paths', value: employer.career_growth_paths },
                    employer.promotion_frequency && { icon: Star, label: 'Promotion Frequency', value: employer.promotion_frequency },
                    employer.employee_retention_rate && { icon: Shield, label: 'Employee Retention', value: employer.employee_retention_rate },
                  ].filter(Boolean).map((item: any, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{item.label}</p>
                        <p className="text-sm text-foreground mt-0.5">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Skills & Technology */}
            {((employer.key_skills_hiring?.length ?? 0) > 0 || (employer.tech_stack?.length ?? 0) > 0 || (employer.preferred_certifications?.length ?? 0) > 0 || employer.education_preference) && (
              <SectionCard title="Skills & Technology" icon={Code} delay={4}>
                <div className="space-y-5">
                  {employer.key_skills_hiring && employer.key_skills_hiring.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 font-medium"><Zap className="w-3.5 h-3.5 text-primary" />Key Skills Hiring For</p>
                      <div className="flex flex-wrap gap-1.5">
                        {employer.key_skills_hiring.map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs font-medium">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {employer.tech_stack && employer.tech_stack.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 font-medium"><Code className="w-3.5 h-3.5 text-primary" />Tech Stack</p>
                      <div className="flex flex-wrap gap-1.5">
                        {employer.tech_stack.map((t, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-primary/5 border-primary/20">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {employer.preferred_certifications && employer.preferred_certifications.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 font-medium"><GraduationCap className="w-3.5 h-3.5 text-primary" />Preferred Certifications</p>
                      <div className="flex flex-wrap gap-1.5">
                        {employer.preferred_certifications.map((c, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {employer.education_preference && (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40">
                      <GraduationCap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div><p className="text-[11px] text-muted-foreground uppercase font-medium">Education Preference</p><p className="text-sm text-foreground mt-0.5">{employer.education_preference}</p></div>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Culture */}
            {(employer.culture_description || employer.work_culture_type || employer.diversity_policies || (employer.company_values?.length ?? 0) > 0) && (
              <SectionCard title="Our Culture" icon={Heart} delay={5}>
                <div className="space-y-4">
                  {employer.culture_description && (
                    <p className="text-foreground leading-relaxed text-sm">{employer.culture_description}</p>
                  )}
                  {(employer.work_culture_type || employer.work_life_balance_rating) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {employer.work_culture_type && <Badge variant="secondary" className="capitalize">{employer.work_culture_type}</Badge>}
                      {employer.work_life_balance_rating && (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < employer.work_life_balance_rating! ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`} />
                          ))}
                          <span className="text-xs text-muted-foreground ml-1">Work-Life Balance</span>
                        </div>
                      )}
                    </div>
                  )}
                  {employer.company_values && employer.company_values.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Company Values</p>
                      <div className="flex flex-wrap gap-1.5">
                        {employer.company_values.map((v, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">{v}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {employer.diversity_policies && (
                    <div className="p-3 rounded-lg bg-muted/40">
                      <p className="text-[11px] text-muted-foreground uppercase font-medium mb-1">Diversity & Inclusion</p>
                      <p className="text-sm text-foreground">{employer.diversity_policies}</p>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Hiring Process */}
            {(employer.hiring_process || employer.interview_rounds_count || employer.hiring_timeline || (employer.assessment_types?.length ?? 0) > 0) && (
              <SectionCard title="Hiring Process" icon={FileText} delay={6}>
                <div className="space-y-4">
                  {employer.hiring_process && (
                    <p className="text-sm text-foreground leading-relaxed">{employer.hiring_process}</p>
                  )}
                  {(employer.interview_rounds_count || employer.hiring_timeline) && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {employer.interview_rounds_count && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/60 border border-border/40">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div><p className="text-[11px] text-muted-foreground uppercase font-medium">Interview Rounds</p><p className="text-lg font-bold text-foreground">{employer.interview_rounds_count}</p></div>
                        </div>
                      )}
                      {employer.hiring_timeline && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/60 border border-border/40">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-primary" />
                          </div>
                          <div><p className="text-[11px] text-muted-foreground uppercase font-medium">Hiring Timeline</p><p className="text-sm font-semibold text-foreground">{employer.hiring_timeline}</p></div>
                        </div>
                      )}
                    </div>
                  )}
                  {employer.assessment_types && employer.assessment_types.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Assessment Types</p>
                      <div className="flex flex-wrap gap-1.5">
                        {employer.assessment_types.map((a, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Awards */}
            {employer.awards_recognition && employer.awards_recognition.length > 0 && (
              <SectionCard title="Awards & Recognition" icon={Award} delay={7}>
                <div className="space-y-2">
                  {employer.awards_recognition.map((a, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 dark:bg-amber-950/20">
                      <Award className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-sm text-foreground font-medium">{a}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Verification Documents */}
            {(employer.office_photo_url || employer.business_card_url) && (
              <SectionCard title="Verification" icon={ShieldCheck} delay={8}>
                <div className="grid sm:grid-cols-2 gap-4">
                  {employer.office_photo_url && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1 font-medium"><ImageIcon className="w-3 h-3" />Office Photo</p>
                      <div className="overflow-hidden rounded-xl border border-border/60 group">
                        <img src={employer.office_photo_url} alt="Office" className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    </div>
                  )}
                  {employer.business_card_url && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1 font-medium"><FileText className="w-3 h-3" />Business Card</p>
                      <div className="overflow-hidden rounded-xl border border-border/60 group">
                        <img src={employer.business_card_url} alt="Business Card" className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Open Positions */}
            {jobs.length > 0 && (
              <SectionCard title="Open Positions" icon={Briefcase} delay={9}>
                <div className="space-y-2">
                  {jobs.map((job, i) => (
                    <motion.div key={job.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                      <Link to={`/jobs/${job.id}`} className="group flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-all border border-transparent hover:border-border/60">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                          <Briefcase className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{job.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{job.job_type}</span>
                            {job.salary_range && <><span>·</span><span className="text-primary font-medium">{job.salary_range}</span></>}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-5">
            {/* Contact CTA */}
            {!isOwnProfile && (
              <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                <Card className="overflow-hidden border-border/60 shadow-sm">
                  <div className="bg-gradient-to-r from-primary to-primary/80 p-4">
                    <h3 className="text-primary-foreground font-bold flex items-center gap-2 text-sm">
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
              </motion.div>
            )}

            {/* Company Info */}
            <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Company Info</h3>
                  </div>
                  <div>
                    {foundedYear && <InfoRow label="Founded" value={String(foundedYear)} icon={Calendar} />}
                    {employer.team_size && <InfoRow label="Team Size" value={employer.team_size} icon={Users} />}
                    {employer.industry && <InfoRow label="Industry" value={employer.industry} icon={Briefcase} />}
                    {locationStr && <InfoRow label="Location" value={locationStr} icon={MapPin} />}
                    {employer.work_environment && <InfoRow label="Work Setup" value={employer.work_environment} icon={Laptop} />}
                    <div className="flex items-center justify-between py-2.5 border-b border-border/40">
                      <span className="text-sm text-muted-foreground flex items-center gap-2"><Briefcase className="w-3.5 h-3.5" />Open Jobs</span>
                      <Badge className="bg-primary/10 text-primary border-0 text-xs font-bold">{jobs.length}</Badge>
                    </div>
                    {employer.verification_status === 'approved' && (
                      <div className="flex items-center gap-2 text-sm pt-2.5 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="font-semibold">Verified Company</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Facts */}
            {quickFacts.length > 0 && (
              <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
                <Card className="border-border/60 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Quick Facts</h3>
                    </div>
                    <div className="space-y-2">
                      {quickFacts.map((fact, i) => (
                        <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-emerald-500/5 dark:bg-emerald-950/20">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-sm text-foreground font-medium">{fact.label}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Office Locations */}
            {employer.office_locations && employer.office_locations.length > 0 && (
              <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
                <Card className="border-border/60 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Office Locations</h3>
                    </div>
                    <div className="space-y-2">
                      {employer.office_locations.map((loc, i) => (
                        <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/50">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm text-foreground">{loc}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Specializations */}
            {employer.specializations && employer.specializations.length > 0 && (
              <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible">
                <Card className="border-border/60 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                        <Star className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Specializations</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {employer.specializations.map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Links */}
            {(employer.careers_page_url || employer.hr_contact_email) && (
              <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible">
                <Card className="border-border/60 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                        <Globe className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Links</h3>
                    </div>
                    <div className="space-y-2.5">
                      {employer.careers_page_url && (
                        <a href={employer.careers_page_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2.5 text-sm text-primary hover:underline p-2 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <Globe className="w-4 h-4" />Careers Page <ExternalLink className="w-3 h-3 ml-auto" />
                        </a>
                      )}
                      {employer.hr_contact_email && (
                        <a href={`mailto:${employer.hr_contact_email}`}
                          className="flex items-center gap-2.5 text-sm text-primary hover:underline p-2 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <Mail className="w-4 h-4" />{employer.hr_contact_email}
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      {!isOwnProfile && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 p-3 z-50">
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

      {/* Spotlight Stories */}
      {employer && (
        <div className="max-w-5xl mx-auto px-4 pb-4">
          <SpotlightStories employerId={employer.id} companyName={employer.company_name} />
        </div>
      )}

      {/* Company Reviews */}
      {employer && (
        <div className="max-w-5xl mx-auto px-4 pb-4">
          <CompanyReviews employerId={employer.id} companyName={employer.company_name} />
        </div>
      )}

      {/* Company Q&A Forum */}
      {employer && (
        <div className="max-w-5xl mx-auto px-4 pb-8">
          <CompanyQAForum employerId={employer.id} companyName={employer.company_name} />
        </div>
      )}
    </div>
  );
};

export default EmployerDetail;
