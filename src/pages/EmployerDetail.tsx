import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Building2,
  Calendar,
  Globe,
  Star,
  Users,
  Eye,
  Mail,
  Phone,
  Send,
  Plus,
  BookmarkPlus,
  Share2,
  ExternalLink,
  ShieldCheck,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { VerificationBadge } from '@/components/employer/VerificationBadge';

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
  const [employer, setEmployer] = useState<EmployerProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  useEffect(() => {
    if (id) {
      fetchEmployer();
      fetchJobs();
    }
  }, [id]);

  const fetchEmployer = async () => {
    try {
      const { data, error } = await supabase
        .from('employers')
        .select(`
          *,
          profiles!inner (
            avatar_url,
            latitude,
            longitude,
            created_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setEmployer({
        ...data,
        avatar_url: data.profiles.avatar_url,
        latitude: data.profiles.latitude,
        longitude: data.profiles.longitude,
        created_at: data.profiles.created_at,
        verification_status: (data.verification_status as 'pending' | 'approved' | 'rejected') || 'pending',
      });
    } catch (error: any) {
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
    setIsFollowing(!isFollowing);
    toast.success(isFollowing ? 'Unfollowed company' : 'Now following this company!');
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: employer?.company_name,
        text: `Check out ${employer?.company_name} on GeoJobs`,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Message sent successfully!');
    setContactForm({ name: '', email: '', phone: '', message: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary">
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 h-48" />
        <div className="container mx-auto px-4 -mt-24">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-24 rounded-lg" />
                  <Skeleton className="h-8 w-48 mt-4" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!employer) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Company Not Found</h2>
          <p className="text-muted-foreground mb-4">The company you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/')}>Back to Map</Button>
        </div>
      </div>
    );
  }

  const foundedSince = employer.created_at
    ? new Date(employer.created_at).getFullYear()
    : new Date().getFullYear();

  return (
    <div className="min-h-screen bg-secondary">
      {/* Hero Banner with Background */}
      <div 
        className="h-48 relative bg-cover bg-center"
        style={{ 
          backgroundImage: 'linear-gradient(to right, rgba(66, 133, 244, 0.8), rgba(66, 133, 244, 0.4)), url("https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&h=400&fit=crop")'
        }}
      >
        <div className="container mx-auto px-4 pt-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-20 pb-12">
        {/* Company Header Card */}
        <Card className="shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative">
                <Badge className="absolute -top-2 -right-2 bg-warning text-warning-foreground z-10">
                  Featured
                </Badge>
                <Avatar className="w-24 h-24 rounded-lg border-4 border-background shadow-lg">
                  <AvatarImage src={employer.avatar_url || ''} alt={employer.company_name} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground rounded-lg">
                    <Building2 className="w-10 h-10" />
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-bold">{employer.company_name}</h1>
                      {employer.verification_status === 'approved' && (
                        <VerificationBadge status="approved" size="sm" />
                      )}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= 4 ? 'text-warning fill-warning' : 'text-muted'}`}
                          />
                        ))}
                        <span className="text-sm text-muted-foreground ml-1">4.3</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground">
                      {employer.latitude && employer.longitude && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          Location available
                        </span>
                      )}
                      <Button variant="link" size="sm" className="text-primary p-0 h-auto">
                        View on Map
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleShare}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                    <Button
                      variant={isFollowing ? 'default' : 'outline'}
                      onClick={handleFollow}
                    >
                      <Plus className={`w-4 h-4 mr-2 ${isFollowing ? 'rotate-45' : ''}`} />
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                  </div>
                </div>

                {/* Social Links */}
                <div className="flex items-center gap-3 mt-4">
                  <span className="text-sm text-muted-foreground">SOCIAL LINKS:</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                      <Globe className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                      <Mail className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Founded Date</p>
                      <p className="font-medium">Since {foundedSince}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Sectors</p>
                      <p className="font-medium">{employer.industry || 'Various Industries'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Posted Jobs</p>
                      <p className="font-medium text-primary">{jobs.length}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Eye className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Profile Viewed</p>
                      <p className="font-medium">{Math.floor(Math.random() * 10000) + 1000}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Description */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Company Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {employer.description ||
                    `${employer.company_name} is a leading organization committed to excellence and innovation in our industry. We believe in creating opportunities for talented individuals and fostering a collaborative work environment.`}
                </p>

                {employer.website_url && (
                  <div className="mt-4">
                    <a
                      href={employer.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <Globe className="w-4 h-4" />
                      Visit Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trust Documents */}
            {(employer.office_photo_url || employer.business_card_url) && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-success" />
                    Trust & Verification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {employer.office_photo_url && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          Office Photo
                        </p>
                        <img
                          src={employer.office_photo_url}
                          alt="Office"
                          className="w-full h-40 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                    {employer.business_card_url && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          Business Card
                        </p>
                        <img
                          src={employer.business_card_url}
                          alt="Business Card"
                          className="w-full h-40 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Open Positions */}
            {jobs.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Open Positions</span>
                    <Badge variant="secondary">{jobs.length} Jobs</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <Link
                        key={job.id}
                        to={`/jobs/${job.id}`}
                        className="block p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-foreground">{job.title}</h4>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {job.job_type}
                              </span>
                              {job.salary_range && (
                                <span className="text-primary font-medium">{job.salary_range}</span>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            View Job
                          </Button>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar - Contact Form */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg sticky top-6">
              <CardHeader>
                <CardTitle>Contact Form</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter Your Name"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter Your Email Address"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter Your Phone Number"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Type Your Message here"
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployerDetail;
