import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
  FileText,
  TrendingUp,
  User,
  Sparkles,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

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
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
}

const CandidateDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  // Validate UUID format
  const isValidUUID = (uuid: string | undefined): boolean => {
    if (!uuid) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  useEffect(() => {
    if (id && isValidUUID(id)) {
      fetchCandidate();
    } else if (id) {
      // Invalid ID format
      setLoading(false);
    }
  }, [id]);

  const fetchCandidate = async () => {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select(`
          *,
          profiles!inner (
            full_name,
            avatar_url,
            latitude,
            longitude,
            created_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setCandidate({
        ...data,
        full_name: data.profiles.full_name,
        avatar_url: data.profiles.avatar_url,
        latitude: data.profiles.latitude,
        longitude: data.profiles.longitude,
        created_at: data.profiles.created_at,
      });
    } catch (error: any) {
      console.error('Error fetching candidate:', error);
      toast.error('Failed to load candidate profile');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = () => {
    toast.info('Contact feature coming soon!');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-secondary/50 to-background">
        <div className="relative h-64 md:h-80 bg-gradient-to-r from-primary/30 to-primary/10">
          <div className="absolute inset-0 bg-black/10" />
        </div>
        <div className="container mx-auto px-4 -mt-28">
          <Card className="shadow-xl border-0 mb-6">
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
      <div className="min-h-screen bg-gradient-to-b from-secondary/50 to-background flex items-center justify-center">
        <Card className="max-w-md mx-4 text-center shadow-xl border-0">
          <CardContent className="p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Candidate Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The candidate you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/')} size="lg" className="px-8">
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 to-background">
      {/* Hero Banner */}
      <div
        className="relative h-64 md:h-80 bg-cover bg-center"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&h=600&fit=crop")',
        }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/70 to-primary/50" />
        
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

      <div className="container mx-auto px-4 -mt-28 md:-mt-32 pb-12 relative z-10">
        {/* Main Profile Card */}
        <Card className="shadow-2xl border-0 mb-8 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Avatar with Status */}
                <div className="relative flex-shrink-0 mx-auto md:mx-0">
                  <div className="relative">
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:-right-2 bg-success text-success-foreground z-10 shadow-lg px-3 py-1 text-xs font-semibold">
                      Available
                    </Badge>
                    <Avatar className="w-28 h-28 md:w-32 md:h-32 border-4 border-background shadow-xl">
                      <AvatarImage src={candidate.avatar_url || ''} alt={candidate.full_name} className="object-cover" />
                      <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
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
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                          {candidate.full_name}
                        </h1>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${star <= 4 ? 'text-warning fill-warning' : 'text-muted'}`}
                            />
                          ))}
                          <span className="text-sm font-medium ml-1">4.0</span>
                        </div>
                      </div>
                      
                      <p className="text-lg text-primary font-semibold flex items-center justify-center md:justify-start gap-2">
                        <Briefcase className="w-5 h-5" />
                        {candidate.job_title}
                      </p>

                      {/* Info Pills */}
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                        {candidate.experience_years && (
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-medium">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {candidate.experience_years} years exp.
                          </div>
                        )}
                        {candidate.latitude && candidate.longitude && (
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-medium">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            Location on map
                          </div>
                        )}
                        {candidate.expected_salary && (
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-bold">
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
                        className="rounded-full w-11 h-11 hover:bg-primary/10 hover:text-primary hover:border-primary transition-all"
                      >
                        <Share2 className="w-5 h-5" />
                      </Button>
                      <Button
                        variant={isSaved ? 'default' : 'outline'}
                        size="icon"
                        onClick={handleSave}
                        className={`rounded-full w-11 h-11 transition-all ${isSaved ? '' : 'hover:bg-primary/10 hover:text-primary hover:border-primary'}`}
                      >
                        <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="bg-secondary/50 border-t">
              <div className="flex flex-wrap items-center divide-x divide-border">
                <div className="flex items-center gap-2 px-6 py-4 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Member since</span>
                  <span className="font-semibold">{memberSince}</span>
                </div>
                <div className="flex items-center gap-2 px-6 py-4 text-sm">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">{Math.floor(Math.random() * 5000) + 500}</span>
                  <span className="text-muted-foreground">views</span>
                </div>
                <div className="flex items-center gap-2 px-6 py-4 text-sm">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">{Math.floor(Math.random() * 20) + 5}</span>
                  <span className="text-muted-foreground">messages</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="border-b bg-secondary/30">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  About {candidate.full_name.split(' ')[0]}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <div className="prose prose-gray max-w-none">
                  <p className="text-muted-foreground leading-relaxed text-base">
                    {candidate.bio ||
                      `Hello! I'm ${candidate.full_name}, a passionate ${candidate.job_title} with ${candidate.experience_years || 0} years of experience in the industry. I'm actively looking for new opportunities where I can contribute my skills and grow professionally. I believe in continuous learning and bringing value to every team I work with.`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Experience Highlights */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="border-b bg-secondary/30">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-success" />
                  </div>
                  Professional Highlights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Experience */}
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Experience</p>
                      <p className="font-semibold text-lg">{candidate.experience_years || 0} Years</p>
                    </div>
                  </div>

                  {/* Salary */}
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-success/5 to-success/10 border border-success/10">
                    <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Expected Salary</p>
                      <p className="font-semibold text-lg text-success">{candidate.expected_salary || 'Negotiable'}</p>
                    </div>
                  </div>

                  {/* Profile Views */}
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-warning/5 to-warning/10 border border-warning/10">
                    <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center flex-shrink-0">
                      <Eye className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Profile Views</p>
                      <p className="font-semibold text-lg">{Math.floor(Math.random() * 5000) + 500}</p>
                    </div>
                  </div>

                  {/* Response Rate */}
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-destructive/5 to-destructive/10 border border-destructive/10">
                    <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Response Rate</p>
                      <p className="font-semibold text-lg">95%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills Section */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="border-b bg-secondary/30">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  Skills & Expertise
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-wrap gap-3">
                  {(candidate.skills || ['Communication', 'Problem Solving', 'Team Work', 'Leadership', 'Time Management']).map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="px-4 py-2 text-sm bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Portfolio Section */}
            {candidate.portfolio_urls && candidate.portfolio_urls.length > 0 && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="border-b bg-secondary/30">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <LinkIcon className="w-5 h-5 text-primary" />
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
                        className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Globe className="w-5 h-5 text-primary" />
                        </div>
                        <span className="flex-1 text-foreground group-hover:text-primary transition-colors truncate">
                          {url}
                        </span>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Education Section */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="border-b bg-secondary/30">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <div className="relative pl-8">
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />
                  <div className="relative mb-6">
                    <div className="absolute -left-[33px] w-4 h-4 bg-primary rounded-full border-4 border-background shadow" />
                    <div className="p-4 rounded-xl bg-secondary/50 border">
                      <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary">
                        University Degree
                      </Badge>
                      <h4 className="font-bold text-lg">Bachelor's in {candidate.job_title.split(' ').pop()}</h4>
                      <p className="text-muted-foreground mt-2">
                        Completed professional education with focus on practical skills and industry knowledge.
                        Developed strong foundation in core concepts and modern practices.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Contact Card */}
              <Card className="shadow-xl border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                  <CardTitle className="flex items-center gap-3">
                    <Award className="w-6 h-6" />
                    Connect with {candidate.full_name.split(' ')[0]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Interested in this candidate? Send a message to start a conversation and explore opportunities together.
                  </p>

                  <Button onClick={handleContact} className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all" size="lg">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Contact Candidate
                  </Button>

                  <Separator />

                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full h-11 justify-center gap-2 hover:bg-secondary transition-colors"
                      onClick={handleSave}
                    >
                      <Heart className={`w-5 h-5 ${isSaved ? 'fill-primary text-primary' : ''}`} />
                      {isSaved ? 'Saved' : 'Save Candidate'}
                    </Button>

                    <Button 
                      variant="outline" 
                      className="w-full h-11 justify-center gap-2 hover:bg-secondary transition-colors" 
                      onClick={handleShare}
                    >
                      <Share2 className="w-5 h-5" />
                      Share Profile
                    </Button>

                    <Button variant="secondary" className="w-full h-11 justify-center gap-2">
                      <Download className="w-5 h-5" />
                      Download CV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats Card */}
              <Card className="shadow-lg border-0">
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Quick Stats
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Availability</span>
                      <Badge variant="secondary" className="bg-success/10 text-success border-0">
                        Open to work
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Response Rate</span>
                      <span className="font-semibold text-success">95%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Avg. Response Time</span>
                      <span className="font-semibold">Within 24h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Profile Strength</span>
                      <span className="font-semibold text-primary">Excellent</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Verification Card */}
              <Card className="shadow-lg border-0">
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    Verified Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      </div>
                      <span>Email verified</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      </div>
                      <span>Phone verified</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      </div>
                      <span>Identity confirmed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background/95 backdrop-blur-lg border-t shadow-lg p-4 z-50">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSave}
            className={`w-12 h-12 rounded-xl flex-shrink-0 ${isSaved ? 'bg-primary/10 border-primary text-primary' : ''}`}
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
          <Button 
            onClick={handleContact} 
            className="flex-1 h-12 rounded-xl text-base font-semibold"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Contact
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CandidateDetail;
