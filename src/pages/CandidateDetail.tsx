import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  GraduationCap,
  Clock,
  Globe,
  Star,
  Download,
  MessageCircle,
  Heart,
  Share2,
  Eye,
  DollarSign,
  Calendar,
  CheckCircle2,
  Award,
  Target,
  Zap,
  TrendingUp,
  User,
  Sparkles,
  Link as LinkIcon,
  ExternalLink,
  Loader2,
  Languages,
  BadgeCheck,
  Building2,
  Github,
  Linkedin,
  Twitter,
  Instagram,
  Youtube,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStartConversation } from '@/hooks/useStartConversation';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { TooltipProvider } from '@/components/ui/tooltip';

interface Education {
  institution: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
}

interface WorkExperience {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
}

interface Language {
  language: string;
  proficiency: string;
}

interface SocialLinks {
  linkedin?: string;
  github?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  website?: string;
}

interface CandidateProfile {
  id: string;
  profile_id: string;
  full_name: string;
  avatar_url: string | null;
  job_title: string;
  bio: string | null;
  experience_years: number | null;
  expected_salary: string | null;
  skills: string[] | null;
  portfolio_urls: string[] | null;
  education: Education[] | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
  resume_url: string | null;
  whatsapp_number: string | null;
  // Enhanced fields
  headline: string | null;
  work_experience: WorkExperience[] | null;
  certifications: string[] | null;
  languages: Language[] | null;
  social_links: SocialLinks | null;
  availability_status: string | null;
}

const CandidateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { startConversation } = useStartConversation();
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [candidateUserId, setCandidateUserId] = useState<string | null>(null);

  const isValidUUID = (uuid: string | undefined): boolean => {
    if (!uuid) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  useEffect(() => {
    if (id && isValidUUID(id)) {
      fetchCandidate();
    } else if (id) {
      setLoading(false);
    }
  }, [id]);

  const fetchCandidate = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select(`
          id,
          profile_id,
          job_title,
          bio,
          experience_years,
          expected_salary,
          skills,
          portfolio_urls,
          education,
          resume_url,
          headline,
          work_experience,
          certifications,
          languages,
          social_links,
          availability_status,
          profiles!inner (
            full_name,
            avatar_url,
            latitude,
            longitude,
            created_at,
            user_id,
            whatsapp_number
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Parse education JSON if it's a string
      let parsedEducation: Education[] | null = null;
      if (data.education) {
        if (typeof data.education === 'string') {
          try {
            parsedEducation = JSON.parse(data.education);
          } catch {
            parsedEducation = null;
          }
        } else if (Array.isArray(data.education)) {
          parsedEducation = data.education as unknown as Education[];
        }
      }

      // Parse work_experience
      let parsedWorkExperience: WorkExperience[] | null = null;
      if (data.work_experience) {
        if (typeof data.work_experience === 'string') {
          try {
            parsedWorkExperience = JSON.parse(data.work_experience);
          } catch {
            parsedWorkExperience = null;
          }
        } else if (Array.isArray(data.work_experience)) {
          parsedWorkExperience = data.work_experience as unknown as WorkExperience[];
        }
      }

      // Parse languages
      let parsedLanguages: Language[] | null = null;
      if (data.languages) {
        if (typeof data.languages === 'string') {
          try {
            parsedLanguages = JSON.parse(data.languages);
          } catch {
            parsedLanguages = null;
          }
        } else if (Array.isArray(data.languages)) {
          parsedLanguages = data.languages as unknown as Language[];
        }
      }

      // Parse social_links
      let parsedSocialLinks: SocialLinks | null = null;
      if (data.social_links) {
        if (typeof data.social_links === 'string') {
          try {
            parsedSocialLinks = JSON.parse(data.social_links);
          } catch {
            parsedSocialLinks = null;
          }
        } else if (typeof data.social_links === 'object') {
          parsedSocialLinks = data.social_links as unknown as SocialLinks;
        }
      }

      setCandidateUserId(data.profiles.user_id);
      setCandidate({
        id: data.id,
        profile_id: data.profile_id,
        job_title: data.job_title,
        bio: data.bio,
        experience_years: data.experience_years,
        expected_salary: data.expected_salary,
        skills: data.skills,
        portfolio_urls: data.portfolio_urls,
        education: parsedEducation,
        resume_url: data.resume_url,
        full_name: data.profiles.full_name,
        avatar_url: data.profiles.avatar_url,
        latitude: data.profiles.latitude,
        longitude: data.profiles.longitude,
        created_at: data.profiles.created_at,
        whatsapp_number: data.profiles.whatsapp_number,
        headline: data.headline,
        work_experience: parsedWorkExperience,
        certifications: data.certifications,
        languages: parsedLanguages,
        social_links: parsedSocialLinks,
        availability_status: data.availability_status,
      });
    } catch (error: any) {
      console.error('Error fetching candidate:', error);
      toast.error('Failed to load candidate profile');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async () => {
    if (!candidateUserId) {
      toast.error('Unable to contact this candidate');
      return;
    }
    setContacting(true);
    await startConversation(candidateUserId);
    setContacting(false);
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast.success(isSaved ? 'Removed from saved' : 'Candidate saved!');
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: candidate?.full_name,
        text: `Check out ${candidate?.full_name}'s profile on Hire for Job`,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleDownloadResume = () => {
    if (candidate?.resume_url) {
      window.open(candidate.resume_url, '_blank');
    } else {
      toast.info('Resume not available');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative h-48 md:h-56 bg-gradient-to-r from-google-blue to-google-blue/80" />
        <div className="container mx-auto px-4 -mt-20">
          <Card className="shadow-google-card border-0 mb-6">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6">
                <Skeleton className="w-28 h-28 md:w-32 md:h-32 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-5 w-48" />
                  <div className="flex gap-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4 text-center shadow-google-card border-0">
          <CardContent className="p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-google-red/10 flex items-center justify-center">
              <User className="w-10 h-10 text-google-red" />
            </div>
            <h2 className="text-2xl font-heading font-bold mb-3">Candidate Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The candidate you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/')} size="lg" className="px-8 bg-google-blue hover:bg-google-blue/90">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Map
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const memberSince = candidate.created_at
    ? new Date(candidate.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recently joined';

  const initials = candidate.full_name.split(' ').map(n => n[0]).join('').slice(0, 2);

  const getAvailabilityLabel = (status: string | null) => {
    switch (status) {
      case 'available': return 'Available Now';
      case 'open': return 'Open to Work';
      case 'notice': return 'On Notice';
      case 'employed': return 'Employed';
      case 'not_looking': return 'Not Looking';
      default: return 'Available';
    }
  };

  const getAvailabilityColor = (status: string | null) => {
    switch (status) {
      case 'available': return 'bg-google-green text-white';
      case 'open': return 'bg-google-blue text-white';
      case 'notice': return 'bg-google-yellow text-black';
      case 'employed': return 'bg-muted text-foreground';
      case 'not_looking': return 'bg-muted text-muted-foreground';
      default: return 'bg-google-green text-white';
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'linkedin': return <Linkedin className="w-5 h-5" />;
      case 'github': return <Github className="w-5 h-5" />;
      case 'twitter': return <Twitter className="w-5 h-5" />;
      case 'instagram': return <Instagram className="w-5 h-5" />;
      case 'youtube': return <Youtube className="w-5 h-5" />;
      case 'website': return <Globe className="w-5 h-5" />;
      default: return <LinkIcon className="w-5 h-5" />;
    }
  };

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-background pb-24 lg:pb-12">
      {/* Hero Banner with Google Blue */}
      <div className="relative h-48 md:h-56 bg-gradient-to-r from-google-blue via-google-blue to-google-blue/90">
        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />
        
        {/* Back Button */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="container mx-auto px-4 pt-4 md:pt-6">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20 backdrop-blur-sm bg-white/10 rounded-full px-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-20 md:-mt-24 relative z-10">
        {/* Main Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="shadow-google-card border-0 mb-8 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Avatar with Status */}
                  <div className="relative flex-shrink-0 mx-auto md:mx-0">
                    <div className="relative">
                      <Badge className={`absolute -top-2 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:-right-2 z-10 shadow-lg px-3 py-1 text-xs font-semibold ${getAvailabilityColor(candidate.availability_status)}`}>
                        {getAvailabilityLabel(candidate.availability_status)}
                      </Badge>
                      <Avatar className="w-28 h-28 md:w-32 md:h-32 border-4 border-background shadow-google-hover">
                        <AvatarImage src={candidate.avatar_url || ''} alt={candidate.full_name} className="object-cover" />
                        <AvatarFallback className="text-3xl bg-gradient-to-br from-google-blue to-google-blue/80 text-white font-heading">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1 min-w-0 text-center md:text-left">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                            {candidate.full_name}
                          </h1>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${star <= 4 ? 'text-google-yellow fill-google-yellow' : 'text-muted'}`}
                              />
                            ))}
                            <span className="text-sm font-medium ml-1">4.0</span>
                          </div>
                        </div>
                        
                        <p className="text-lg text-google-blue font-semibold flex items-center justify-center md:justify-start gap-2">
                          <Briefcase className="w-5 h-5" />
                          {candidate.job_title}
                        </p>

                        {/* Professional Headline */}
                        {candidate.headline && (
                          <p className="text-muted-foreground italic text-sm">
                            "{candidate.headline}"
                          </p>
                        )}

                        {/* Info Pills with Google Colors */}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                          {candidate.experience_years && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-google-blue/10 text-google-blue text-sm font-medium">
                              <Clock className="w-4 h-4" />
                              {candidate.experience_years} years exp.
                            </div>
                          )}
                          {candidate.latitude && candidate.longitude && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-google-red/10 text-google-red text-sm font-medium">
                              <MapPin className="w-4 h-4" />
                              Location on map
                            </div>
                          )}
                          {candidate.expected_salary && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-google-green/10 text-google-green text-sm font-bold">
                              <DollarSign className="w-4 h-4" />
                              {candidate.expected_salary}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Desktop Action Buttons */}
                      <div className="hidden lg:flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleShare}
                          className="rounded-full w-11 h-11 hover:bg-google-blue/10 hover:text-google-blue hover:border-google-blue transition-all"
                        >
                          <Share2 className="w-5 h-5" />
                        </Button>
                        <Button
                          variant={isSaved ? 'default' : 'outline'}
                          size="icon"
                          onClick={handleSave}
                          className={`rounded-full w-11 h-11 transition-all ${isSaved ? 'bg-google-red hover:bg-google-red/90' : 'hover:bg-google-red/10 hover:text-google-red hover:border-google-red'}`}
                        >
                          <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Bar with Google Colors */}
              <div className="bg-muted/50 border-t">
                <div className="flex flex-wrap items-center divide-x divide-border">
                  <div className="flex items-center gap-2 px-6 py-4 text-sm">
                    <Calendar className="w-4 h-4 text-google-blue" />
                    <span className="text-muted-foreground">Member since</span>
                    <span className="font-semibold">{memberSince}</span>
                  </div>
                  <div className="flex items-center gap-2 px-6 py-4 text-sm">
                    <Eye className="w-4 h-4 text-google-green" />
                    <span className="font-semibold">—</span>
                    <span className="text-muted-foreground">views</span>
                  </div>
                  <div className="flex items-center gap-2 px-6 py-4 text-sm">
                    <MessageCircle className="w-4 h-4 text-google-yellow" />
                    <span className="font-semibold">—</span>
                    <span className="text-muted-foreground">messages</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card className="shadow-google-card border-0 overflow-hidden">
                <CardHeader className="border-b bg-google-blue/5">
                  <CardTitle className="flex items-center gap-3 text-xl font-heading">
                    <div className="w-10 h-10 rounded-xl bg-google-blue/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-google-blue" />
                    </div>
                    About {candidate.full_name.split(' ')[0]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                  <p className="text-muted-foreground leading-relaxed text-base">
                    {candidate.bio ||
                      `Hello! I'm ${candidate.full_name}, a passionate ${candidate.job_title} with ${candidate.experience_years || 0} years of experience in the industry. I'm actively looking for new opportunities where I can contribute my skills and grow professionally.`}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Professional Highlights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card className="shadow-google-card border-0 overflow-hidden">
                <CardHeader className="border-b bg-google-green/5">
                  <CardTitle className="flex items-center gap-3 text-xl font-heading">
                    <div className="w-10 h-10 rounded-xl bg-google-green/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-google-green" />
                    </div>
                    Professional Highlights
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Experience */}
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-google-blue/5 border border-google-blue/10">
                      <div className="w-12 h-12 rounded-xl bg-google-blue/10 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="w-6 h-6 text-google-blue" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Experience</p>
                        <p className="font-semibold text-lg">{candidate.experience_years || 0} Years</p>
                      </div>
                    </div>

                    {/* Salary */}
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-google-green/5 border border-google-green/10">
                      <div className="w-12 h-12 rounded-xl bg-google-green/10 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-6 h-6 text-google-green" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Expected Salary</p>
                        <p className="font-semibold text-lg text-google-green">{candidate.expected_salary || 'Negotiable'}</p>
                      </div>
                    </div>

                    {/* Profile Views */}
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-google-yellow/5 border border-google-yellow/10">
                      <div className="w-12 h-12 rounded-xl bg-google-yellow/10 flex items-center justify-center flex-shrink-0">
                        <Eye className="w-6 h-6 text-google-yellow" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Profile Views</p>
                        <p className="font-semibold text-lg">—</p>
                      </div>
                    </div>

                    {/* Response Rate */}
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-google-red/5 border border-google-red/10">
                      <div className="w-12 h-12 rounded-xl bg-google-red/10 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-6 h-6 text-google-red" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Response Rate</p>
                        <p className="font-semibold text-lg">95%</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Skills Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="shadow-google-card border-0 overflow-hidden">
                <CardHeader className="border-b bg-google-yellow/5">
                  <CardTitle className="flex items-center gap-3 text-xl font-heading">
                    <div className="w-10 h-10 rounded-xl bg-google-yellow/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-google-yellow" />
                    </div>
                    Skills & Expertise
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-wrap gap-3">
                    {(candidate.skills && candidate.skills.length > 0 
                      ? candidate.skills 
                      : ['Communication', 'Problem Solving', 'Team Work', 'Leadership', 'Time Management']
                    ).map((skill, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="px-4 py-2 text-sm bg-google-blue/10 text-google-blue border border-google-blue/20 hover:bg-google-blue/20 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Work Experience Section */}
            {candidate.work_experience && candidate.work_experience.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
              >
                <Card className="shadow-google-card border-0 overflow-hidden">
                  <CardHeader className="border-b bg-purple-500/5">
                    <CardTitle className="flex items-center gap-3 text-xl font-heading">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-purple-500" />
                      </div>
                      Work Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8">
                    <div className="relative pl-8 space-y-6">
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-purple-500/50 to-transparent" />
                      {candidate.work_experience.map((exp, index) => (
                        <div key={index} className="relative">
                          <div className="absolute -left-[33px] w-4 h-4 bg-purple-500 rounded-full border-4 border-background shadow" />
                          <div className="p-4 rounded-xl bg-muted/50 border">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">
                                {exp.title}
                              </Badge>
                              {exp.isCurrent && (
                                <Badge className="bg-google-green text-white text-xs">
                                  Current
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-bold text-lg">{exp.company}</h4>
                            <p className="text-sm text-muted-foreground">
                              {exp.startDate} - {exp.isCurrent ? 'Present' : exp.endDate}
                            </p>
                            {exp.description && (
                              <p className="text-muted-foreground text-sm mt-2">
                                {exp.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Certifications Section */}
            {candidate.certifications && candidate.certifications.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.38 }}
              >
                <Card className="shadow-google-card border-0 overflow-hidden">
                  <CardHeader className="border-b bg-amber-500/5">
                    <CardTitle className="flex items-center gap-3 text-xl font-heading">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <BadgeCheck className="w-5 h-5 text-amber-500" />
                      </div>
                      Certifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8">
                    <div className="flex flex-wrap gap-3">
                      {candidate.certifications.map((cert, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-4 py-2 text-sm bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        >
                          <Award className="w-3.5 h-3.5 mr-2" />
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Languages Section */}
            {candidate.languages && candidate.languages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <Card className="shadow-google-card border-0 overflow-hidden">
                  <CardHeader className="border-b bg-cyan-500/5">
                    <CardTitle className="flex items-center gap-3 text-xl font-heading">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                        <Languages className="w-5 h-5 text-cyan-500" />
                      </div>
                      Languages
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {candidate.languages.map((lang, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                        >
                          <span className="font-medium">{lang.language}</span>
                          <Badge variant="outline" className="text-xs">
                            {lang.proficiency}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Social Links Section */}
            {candidate.social_links && Object.values(candidate.social_links).some(v => v) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.42 }}
              >
                <Card className="shadow-google-card border-0 overflow-hidden">
                  <CardHeader className="border-b bg-pink-500/5">
                    <CardTitle className="flex items-center gap-3 text-xl font-heading">
                      <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                        <LinkIcon className="w-5 h-5 text-pink-500" />
                      </div>
                      Social Links
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8">
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(candidate.social_links).map(([platform, url]) => 
                        url ? (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-card hover:bg-muted transition-colors group"
                          >
                            <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                              {getSocialIcon(platform)}
                            </span>
                            <span className="capitalize font-medium">{platform}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                          </a>
                        ) : null
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {candidate.portfolio_urls && candidate.portfolio_urls.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <Card className="shadow-google-card border-0 overflow-hidden">
                  <CardHeader className="border-b bg-google-red/5">
                    <CardTitle className="flex items-center gap-3 text-xl font-heading">
                      <div className="w-10 h-10 rounded-xl bg-google-red/10 flex items-center justify-center">
                        <LinkIcon className="w-5 h-5 text-google-red" />
                      </div>
                      Portfolio & Links
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8">
                    <div className="space-y-3">
                      {candidate.portfolio_urls.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-google-blue/30 hover:shadow-google transition-all group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-google-blue/10 flex items-center justify-center flex-shrink-0">
                            <Globe className="w-5 h-5 text-google-blue" />
                          </div>
                          <span className="flex-1 text-foreground group-hover:text-google-blue transition-colors truncate">
                            {url}
                          </span>
                          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-google-blue transition-colors" />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Education Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <Card className="shadow-google-card border-0 overflow-hidden">
                <CardHeader className="border-b bg-google-green/5">
                  <CardTitle className="flex items-center gap-3 text-xl font-heading">
                    <div className="w-10 h-10 rounded-xl bg-google-green/10 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-google-green" />
                    </div>
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                  {candidate.education && candidate.education.length > 0 ? (
                    <div className="relative pl-8 space-y-6">
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-google-green via-google-green/50 to-transparent" />
                      {candidate.education.map((edu, index) => (
                        <div key={index} className="relative">
                          <div className="absolute -left-[33px] w-4 h-4 bg-google-green rounded-full border-4 border-background shadow" />
                          <div className="p-4 rounded-xl bg-muted/50 border">
                            <Badge variant="secondary" className="mb-2 bg-google-green/10 text-google-green">
                              {edu.degree}
                            </Badge>
                            <h4 className="font-bold text-lg">{edu.institution}</h4>
                            <p className="text-muted-foreground text-sm">{edu.field}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {edu.startYear} - {edu.endYear || 'Present'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="relative pl-8">
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-google-green via-google-green/50 to-transparent" />
                      <div className="relative">
                        <div className="absolute -left-[33px] w-4 h-4 bg-google-green rounded-full border-4 border-background shadow" />
                        <div className="p-4 rounded-xl bg-muted/50 border">
                          <Badge variant="secondary" className="mb-2 bg-google-green/10 text-google-green">
                            University Degree
                          </Badge>
                          <h4 className="font-bold text-lg">Bachelor's Degree</h4>
                          <p className="text-muted-foreground mt-2">
                            Completed professional education with focus on practical skills and industry knowledge.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Contact Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <Card className="shadow-google-card border-0 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-google-blue to-google-blue/90 text-white">
                    <CardTitle className="flex items-center gap-3 font-heading">
                      <Award className="w-6 h-6" />
                      Connect with {candidate.full_name.split(' ')[0]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Interested in this candidate? Send a message to start a conversation and explore opportunities together.
                    </p>

                    <Button 
                      onClick={handleContact} 
                      disabled={contacting}
                      className="w-full h-12 text-base font-semibold shadow-google hover:shadow-google-hover transition-all bg-google-blue hover:bg-google-blue/90" 
                      size="lg"
                    >
                      {contacting ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <MessageCircle className="w-5 h-5 mr-2" />
                      )}
                      {contacting ? 'Starting Chat...' : 'Contact Candidate'}
                    </Button>

                    <WhatsAppButton 
                      phoneNumber={candidate.whatsapp_number}
                      className="w-full h-11"
                    />

                    <Separator />

                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full h-11 justify-center gap-2 hover:bg-google-red/10 hover:text-google-red hover:border-google-red transition-colors"
                        onClick={handleSave}
                      >
                        <Heart className={`w-5 h-5 ${isSaved ? 'fill-google-red text-google-red' : ''}`} />
                        {isSaved ? 'Saved' : 'Save Candidate'}
                      </Button>

                      <Button 
                        variant="outline" 
                        className="w-full h-11 justify-center gap-2 hover:bg-google-blue/10 hover:text-google-blue hover:border-google-blue transition-colors" 
                        onClick={handleShare}
                      >
                        <Share2 className="w-5 h-5" />
                        Share Profile
                      </Button>

                      <Button 
                        variant="secondary" 
                        className="w-full h-11 justify-center gap-2 hover:bg-google-green/10 hover:text-google-green transition-colors"
                        onClick={handleDownloadResume}
                      >
                        <Download className="w-5 h-5" />
                        Download CV
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Stats Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <Card className="shadow-google-card border-0">
                  <CardContent className="p-6">
                    <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-google-blue" />
                      Quick Stats
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">Availability</span>
                        <Badge variant="secondary" className={`border-0 ${
                          candidate.availability_status === 'available' ? 'bg-google-green/10 text-google-green' :
                          candidate.availability_status === 'open' ? 'bg-google-blue/10 text-google-blue' :
                          candidate.availability_status === 'notice' ? 'bg-google-yellow/10 text-google-yellow' :
                          'bg-google-green/10 text-google-green'
                        }`}>
                          {getAvailabilityLabel(candidate.availability_status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">Response Rate</span>
                        <span className="font-semibold text-google-green">95%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">Avg. Response Time</span>
                        <span className="font-semibold">Within 24h</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">Profile Strength</span>
                        <span className="font-semibold text-google-blue">Excellent</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Verification Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <Card className="shadow-google-card border-0">
                  <CardContent className="p-6">
                    <h4 className="font-heading font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-google-green" />
                      Verified Information
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-google-green/10 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-google-green" />
                        </div>
                        <span>Email verified</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-google-green/10 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-google-green" />
                        </div>
                        <span>Phone verified</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-google-green/10 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-google-green" />
                        </div>
                        <span>Identity confirmed</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background/95 backdrop-blur-lg border-t shadow-google-hover p-4 z-50">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSave}
            className={`w-12 h-12 rounded-xl flex-shrink-0 ${isSaved ? 'bg-google-red/10 border-google-red text-google-red' : ''}`}
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
          <WhatsAppButton 
            phoneNumber={candidate.whatsapp_number}
            variant="icon"
            className="flex-shrink-0"
          />
          <Button 
            onClick={handleContact}
            disabled={contacting}
            className="flex-1 h-12 rounded-xl text-base font-semibold bg-google-blue hover:bg-google-blue/90"
          >
            {contacting ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <MessageCircle className="w-5 h-5 mr-2" />
            )}
            {contacting ? 'Starting...' : 'Contact'}
          </Button>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default CandidateDetail;
