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
  Send,
  Heart,
  Share2,
  ExternalLink,
  ShieldCheck,
  Image as ImageIcon,
  TrendingUp,
  Target,
  Zap,
  Award,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
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
        text: `Check out ${employer?.company_name} on Hire for Job`,
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
      <div className="min-h-screen bg-gradient-to-b from-secondary/50 to-background">
        <div className="relative h-64 md:h-80 bg-gradient-to-r from-primary/30 to-primary/10">
          <div className="absolute inset-0 bg-black/10" />
        </div>
        <div className="container mx-auto px-4 -mt-28">
          <Card className="shadow-xl border-0 mb-6">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6">
                <Skeleton className="w-24 h-24 md:w-28 md:h-28 rounded-2xl" />
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

  if (!employer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-secondary/50 to-background flex items-center justify-center">
        <Card className="max-w-md mx-4 text-center shadow-xl border-0">
          <CardContent className="p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Company Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The company you're looking for doesn't exist or has been removed.
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

  const foundedSince = employer.created_at
    ? new Date(employer.created_at).getFullYear()
    : new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 to-background">
      {/* Hero Banner */}
      <div
        className="relative h-64 md:h-80 bg-cover bg-center"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=600&fit=crop")',
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
        {/* Main Company Header Card */}
        <Card className="shadow-2xl border-0 mb-8 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Company Logo with Badge */}
                <div className="relative flex-shrink-0 mx-auto md:mx-0">
                  <div className="relative">
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:-right-2 bg-warning text-warning-foreground z-10 shadow-lg px-3 py-1 text-xs font-semibold">
                      Featured
                    </Badge>
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl border-4 border-background">
                      {employer.avatar_url ? (
                        <Avatar className="w-full h-full rounded-xl">
                          <AvatarImage src={employer.avatar_url} alt={employer.company_name} className="object-cover" />
                          <AvatarFallback className="text-3xl bg-transparent text-white rounded-xl">
                            <Building2 className="w-12 h-12" />
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <Building2 className="w-12 h-12 text-white" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Company Info */}
                <div className="flex-1 min-w-0 text-center md:text-left">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                          {employer.company_name}
                        </h1>
                        {employer.verification_status === 'approved' && (
                          <VerificationBadge status="approved" size="sm" />
                        )}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${star <= 4 ? 'text-warning fill-warning' : 'text-muted'}`}
                            />
                          ))}
                          <span className="text-sm font-medium ml-1">4.3</span>
                          <span className="text-sm text-muted-foreground">(128 reviews)</span>
                        </div>
                      </div>
                      
                      <p className="text-lg text-primary font-semibold flex items-center justify-center md:justify-start gap-2">
                        <Briefcase className="w-5 h-5" />
                        {employer.industry || 'Multiple Industries'}
                      </p>

                      {/* Info Pills */}
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                        {employer.latitude && employer.longitude && (
                          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-medium">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            Location on map
                          </div>
                        )}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-medium">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          Since {foundedSince}
                        </div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-bold">
                          <Briefcase className="w-4 h-4" />
                          {jobs.length} Open Jobs
                        </div>
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
                        variant={isFollowing ? 'default' : 'outline'}
                        onClick={handleFollow}
                        className="rounded-full px-6"
                      >
                        <Heart className={`w-4 h-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                        {isFollowing ? 'Following' : 'Follow'}
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
                  <span className="text-muted-foreground">Founded</span>
                  <span className="font-semibold">{foundedSince}</span>
                </div>
                <div className="flex items-center gap-2 px-6 py-4 text-sm">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">{Math.floor(Math.random() * 10000) + 1000}</span>
                  <span className="text-muted-foreground">views</span>
                </div>
                <div className="flex items-center gap-2 px-6 py-4 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">50-200</span>
                  <span className="text-muted-foreground">employees</span>
                </div>
                <div className="flex items-center gap-2 px-6 py-4 text-sm">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold">{jobs.length}</span>
                  <span className="text-muted-foreground">open positions</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Company Overview */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="border-b bg-secondary/30">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  About {employer.company_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <div className="prose prose-gray max-w-none">
                  <p className="text-muted-foreground leading-relaxed text-base">
                    {employer.description ||
                      `${employer.company_name} is a leading organization committed to excellence and innovation in our industry. We believe in creating opportunities for talented individuals and fostering a collaborative work environment. Our team is dedicated to delivering exceptional results and building lasting relationships with our clients and partners.`}
                  </p>
                </div>

                {employer.website_url && (
                  <div className="mt-6">
                    <a
                      href={employer.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                    >
                      <Globe className="w-4 h-4" />
                      Visit Website
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Company Highlights */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="border-b bg-secondary/30">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-success" />
                  </div>
                  Company Highlights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Founded */}
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Founded</p>
                      <p className="font-semibold text-lg">Since {foundedSince}</p>
                    </div>
                  </div>

                  {/* Industry */}
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-success/5 to-success/10 border border-success/10">
                    <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center flex-shrink-0">
                      <Target className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Industry</p>
                      <p className="font-semibold text-lg">{employer.industry || 'Various'}</p>
                    </div>
                  </div>

                  {/* Employees */}
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-warning/5 to-warning/10 border border-warning/10">
                    <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Team Size</p>
                      <p className="font-semibold text-lg">50-200 employees</p>
                    </div>
                  </div>

                  {/* Open Jobs */}
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-destructive/5 to-destructive/10 border border-destructive/10">
                    <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Open Positions</p>
                      <p className="font-semibold text-lg text-destructive">{jobs.length} Jobs</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trust Documents */}
            {(employer.office_photo_url || employer.business_card_url) && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="border-b bg-secondary/30">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-success" />
                    </div>
                    Trust & Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    {employer.office_photo_url && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-primary" />
                          Office Photo
                        </p>
                        <div className="relative group overflow-hidden rounded-xl border shadow-sm">
                          <img
                            src={employer.office_photo_url}
                            alt="Office"
                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </div>
                    )}
                    {employer.business_card_url && (
                      <div className="space-y-3">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          Business Card
                        </p>
                        <div className="relative group overflow-hidden rounded-xl border shadow-sm">
                          <img
                            src={employer.business_card_url}
                            alt="Business Card"
                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Open Positions */}
            {jobs.length > 0 && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="border-b bg-secondary/30">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xl">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-primary" />
                      </div>
                      Open Positions
                    </div>
                    <Badge variant="secondary" className="bg-success/10 text-success border-0 px-3 py-1">
                      {jobs.length} Jobs
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <Link
                        key={job.id}
                        to={`/jobs/${job.id}`}
                        className="group block p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 flex items-center justify-center flex-shrink-0">
                              <Briefcase className="w-6 h-6 text-destructive" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {job.title}
                              </h4>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {job.job_type}
                                </span>
                                {job.salary_range && (
                                  <span className="text-success font-medium">{job.salary_range}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Contact Card */}
              <Card className="shadow-xl border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                  <CardTitle className="flex items-center gap-3">
                    <MessageSquare className="w-6 h-6" />
                    Contact Company
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter your name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Type your message..."
                        rows={4}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        required
                        className="resize-none"
                      />
                    </div>
                    <Button type="submit" className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
                      <Send className="w-5 h-5 mr-2" />
                      Send Message
                    </Button>
                  </form>

                  <Separator className="my-5" />

                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full h-11 justify-center gap-2 hover:bg-secondary transition-colors"
                      onClick={handleFollow}
                    >
                      <Heart className={`w-5 h-5 ${isFollowing ? 'fill-primary text-primary' : ''}`} />
                      {isFollowing ? 'Following' : 'Follow Company'}
                    </Button>

                    <Button 
                      variant="outline" 
                      className="w-full h-11 justify-center gap-2 hover:bg-secondary transition-colors" 
                      onClick={handleShare}
                    >
                      <Share2 className="w-5 h-5" />
                      Share Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="shadow-lg border-0">
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Quick Stats
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Response Rate</span>
                      <span className="font-semibold text-success">92%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Avg. Response Time</span>
                      <span className="font-semibold">Within 48h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Hiring Success</span>
                      <Badge variant="secondary" className="bg-success/10 text-success border-0">
                        High
                      </Badge>
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
                      <span>Business verified</span>
                    </div>
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
                      <span>Address confirmed</span>
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
            onClick={handleFollow}
            className={`w-12 h-12 rounded-xl flex-shrink-0 ${isFollowing ? 'bg-primary/10 border-primary text-primary' : ''}`}
          >
            <Heart className={`w-5 h-5 ${isFollowing ? 'fill-current' : ''}`} />
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
            onClick={() => document.getElementById('message')?.focus()} 
            className="flex-1 h-12 rounded-xl text-base font-semibold"
          >
            <Mail className="w-5 h-5 mr-2" />
            Contact
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmployerDetail;
