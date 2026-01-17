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
  ArrowLeft,
  MapPin,
  Briefcase,
  GraduationCap,
  Clock,
  Mail,
  Phone,
  Globe,
  Star,
  Download,
  MessageCircle,
  Bookmark,
  Share2,
  Eye,
  DollarSign,
  Calendar,
  CheckCircle2,
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

  useEffect(() => {
    if (id) {
      fetchCandidate();
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
        text: `Check out ${candidate?.full_name}'s profile on GeoJobs`,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 h-48" />
        <div className="container mx-auto px-4 -mt-24">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card className="shadow-lg">
                <CardContent className="pt-6 text-center">
                  <Skeleton className="w-32 h-32 rounded-full mx-auto" />
                  <Skeleton className="h-6 w-40 mx-auto mt-4" />
                  <Skeleton className="h-4 w-32 mx-auto mt-2" />
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-48 mb-4" />
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Candidate Not Found</h2>
          <p className="text-muted-foreground mb-4">The candidate you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/')}>Back to Map</Button>
        </div>
      </div>
    );
  }

  const memberSince = candidate.created_at
    ? new Date(candidate.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently joined';

  return (
    <div className="min-h-screen bg-secondary">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary/30 via-primary/20 to-primary/10 h-48 relative">
        <div className="container mx-auto px-4 pt-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-foreground hover:bg-background/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-24 pb-12">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-lg overflow-hidden">
              <CardContent className="pt-6 text-center">
                <Avatar className="w-32 h-32 mx-auto border-4 border-background shadow-lg">
                  <AvatarImage src={candidate.avatar_url || ''} alt={candidate.full_name} />
                  <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                    {candidate.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex items-center justify-center gap-1 mt-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= 4 ? 'text-warning fill-warning' : 'text-muted'}`}
                    />
                  ))}
                  <span className="text-sm text-muted-foreground ml-1">4.0</span>
                </div>

                <h1 className="text-xl font-bold mt-3">{candidate.full_name}</h1>
                <p className="text-primary font-medium">{candidate.job_title}</p>

                {candidate.expected_salary && (
                  <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {candidate.expected_salary}
                  </p>
                )}

                {candidate.experience_years && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                    <Clock className="w-4 h-4" />
                    {candidate.experience_years} years experience
                  </p>
                )}

                {candidate.latitude && candidate.longitude && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Location available
                  </p>
                )}

                <p className="text-sm text-primary mt-3">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Member Since {memberSince}
                </p>

                <Separator className="my-4" />

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button onClick={handleContact} className="w-full">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact Candidate
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleSave}
                      className={`flex-1 ${isSaved ? 'bg-primary/10 text-primary' : ''}`}
                    >
                      <Bookmark className={`w-4 h-4 mr-2 ${isSaved ? 'fill-primary' : ''}`} />
                      {isSaved ? 'Saved' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={handleShare} className="flex-1">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>

                  <Button variant="secondary" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download CV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  About {candidate.full_name.split(' ')[0]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Experience</p>
                      <p className="font-medium">{candidate.experience_years || 0} Years</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Expected Salary</p>
                      <p className="font-medium">{candidate.expected_salary || 'Negotiable'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Eye className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Profile Views</p>
                      <p className="font-medium">{Math.floor(Math.random() * 5000) + 500}</p>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div>
                  <h3 className="font-semibold mb-3">About Me</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {candidate.bio ||
                      `Hello! I'm ${candidate.full_name}, a passionate ${candidate.job_title} with ${candidate.experience_years || 0} years of experience in the industry. I'm actively looking for new opportunities where I can contribute my skills and grow professionally.`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Skills Section */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Skills & Expertise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(candidate.skills || ['Communication', 'Problem Solving', 'Team Work']).map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="px-3 py-1 text-sm bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Portfolio Section */}
            {candidate.portfolio_urls && candidate.portfolio_urls.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    Portfolio & Links
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {candidate.portfolio_urls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Globe className="w-4 h-4" />
                        {url}
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Education Section - Placeholder */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6 border-l-2 border-primary/20">
                  <div className="mb-6">
                    <div className="absolute -left-2 w-4 h-4 bg-primary rounded-full" />
                    <p className="text-sm text-primary font-medium">University Degree</p>
                    <h4 className="font-semibold">Bachelor's in {candidate.job_title.split(' ').pop()}</h4>
                    <p className="text-sm text-muted-foreground">
                      Completed professional education with focus on practical skills and industry knowledge.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDetail;
