import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, MapPin, MessageSquare, User, Briefcase, Bell, Shield, 
  FileText, Sparkles, Edit, Loader2, TrendingUp, Eye, CheckCircle2,
  Clock, Star, Zap, Target, Award, Calendar, ChevronRight, 
  LayoutDashboard, Settings, LogOut, Menu, X, Home
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

import { ProfileCompletenessCard } from '@/components/candidate/ProfileCompletenessCard';
import { ProfileEditModal } from '@/components/candidate/ProfileEditModal';
import { ResumeUpload } from '@/components/candidate/ResumeUpload';
import { JobActivityTabs } from '@/components/candidate/JobActivityTabs';
import { NotificationCenter } from '@/components/candidate/NotificationCenter';
import { JobAlertsManager } from '@/components/candidate/JobAlertsManager';
import { SecuritySettings } from '@/components/candidate/SecuritySettings';
import { RecommendedJobs } from '@/components/candidate/RecommendedJobs';

// Quick Stats Card Component
const QuickStatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  trend?: string; 
  color: string;
}) => (
  <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/80">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 text-xs text-success">
              <TrendingUp className="w-3 h-3" />
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-2xl ${color} transition-transform group-hover:scale-110`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Welcome Banner Component
const WelcomeBanner = ({ name, completeness }: { name: string; completeness: number }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-purple-600 p-6 sm:p-8 text-white mb-8">
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-white/80 text-sm font-medium">{greeting}</p>
          <h1 className="text-2xl sm:text-3xl font-bold">{name} 👋</h1>
          <p className="text-white/70 text-sm max-w-md">
            {completeness < 100 
              ? `Your profile is ${completeness}% complete. Complete it to get more visibility!`
              : "Your profile is complete! You're all set to find your dream job."}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                  <circle 
                    cx="32" cy="32" r="28" fill="none" 
                    stroke="white" strokeWidth="6"
                    strokeDasharray={`${completeness * 1.76} 176`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                  {completeness}%
                </span>
              </div>
              <div className="text-left">
                <p className="text-white font-semibold">Profile Score</p>
                <p className="text-white/70 text-xs">Complete your profile</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute -left-10 -top-10 w-32 h-32 bg-purple-500/30 rounded-full blur-2xl" />
    </div>
  );
};

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    applications: 0,
    views: 0,
    savedJobs: 0,
    interviews: 0
  });

  useEffect(() => {
    if (!user || !profile) return;
    if (profile.user_type !== 'candidate') {
      navigate('/dashboard');
      return;
    }
    fetchCandidate();
  }, [user, profile]);

  const fetchCandidate = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('candidates')
      .select('*')
      .eq('profile_id', profile.id)
      .maybeSingle();
    setCandidate(data);

    // Fetch stats
    if (data) {
      const [appsRes, savedRes] = await Promise.all([
        supabase.from('applications').select('id, status').eq('candidate_id', data.id),
        supabase.from('saved_jobs').select('id').eq('candidate_id', data.id)
      ]);

      const applications = appsRes.data || [];
      const interviews = applications.filter(a => a.status === 'shortlisted').length;

      setStats({
        applications: applications.length,
        views: Math.floor(Math.random() * 50) + 10, // Placeholder
        savedJobs: savedRes.data?.length || 0,
        interviews
      });
    }

    setLoading(false);
  };

  const handleProfileSave = () => {
    fetchCandidate();
    refreshProfile();
  };

  // Calculate profile completeness
  const calculateCompleteness = () => {
    if (!profile || !candidate) return 0;
    const checks = [
      profile.full_name,
      profile.avatar_url,
      candidate.job_title,
      candidate.skills?.length > 0,
      candidate.experience_years > 0,
      candidate.education?.length > 0,
      profile.latitude && profile.longitude,
      candidate.bio?.length > 20,
      candidate.resume_url
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Welcome Back!</h2>
            <p className="text-muted-foreground mb-6">Please sign in to access your dashboard</p>
            <Button onClick={() => navigate('/login')} className="w-full" size="lg">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const completeness = calculateCompleteness();

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'jobs', icon: Briefcase, label: 'Jobs' },
    { id: 'resume', icon: FileText, label: 'Resume' },
    { id: 'alerts', icon: Bell, label: 'Alerts' },
    { id: 'security', icon: Shield, label: 'Security' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/50 via-background to-secondary/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left */}
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <Home className="w-5 h-5" />
                </Button>
              </Link>
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg">GeoJobs</span>
              </div>
            </div>

            {/* Center - Desktop Nav */}
            <nav className="hidden lg:flex items-center bg-secondary/50 rounded-2xl p-1">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === item.id 
                      ? 'bg-primary text-primary-foreground shadow-lg' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Right */}
            <div className="flex items-center gap-2">
              <Link to="/messages">
                <Button variant="ghost" size="icon" className="rounded-xl relative">
                  <MessageSquare className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] text-white flex items-center justify-center">
                    3
                  </span>
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="rounded-xl lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              <div className="hidden sm:flex items-center gap-3 ml-2 pl-3 border-l border-border">
                <Avatar className="w-9 h-9 border-2 border-primary/20">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {profile.full_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <nav className="lg:hidden pt-3 pb-2 mt-3 border-t border-border animate-fade-in">
              <div className="grid grid-cols-5 gap-1">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                    className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl text-xs font-medium transition-all ${
                      activeTab === item.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </div>
            </nav>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Welcome Banner */}
        <WelcomeBanner name={profile.full_name?.split(' ')[0] || 'there'} completeness={completeness} />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <QuickStatCard 
            icon={Briefcase} 
            label="Applications" 
            value={stats.applications} 
            trend="+12% this week"
            color="bg-gradient-to-br from-primary to-blue-600"
          />
          <QuickStatCard 
            icon={Eye} 
            label="Profile Views" 
            value={stats.views}
            trend="+8% this week"
            color="bg-gradient-to-br from-purple-500 to-pink-500"
          />
          <QuickStatCard 
            icon={Star} 
            label="Saved Jobs" 
            value={stats.savedJobs}
            color="bg-gradient-to-br from-amber-500 to-orange-500"
          />
          <QuickStatCard 
            icon={CheckCircle2} 
            label="Interviews" 
            value={stats.interviews}
            color="bg-gradient-to-br from-emerald-500 to-teal-500"
          />
        </div>

        {/* Profile Quick Actions */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <Button variant="outline" onClick={() => setEditModalOpen(true)} className="rounded-xl">
            <Edit className="w-4 h-4 mr-2" /> Edit Profile
          </Button>
          <Link to="/ai-resume-builder">
            <Button className="rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg">
              <Sparkles className="w-4 h-4 mr-2" /> AI Resume Builder
            </Button>
          </Link>
          {candidate?.skills?.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              {candidate.skills.slice(0, 3).map((skill: string, i: number) => (
                <Badge key={i} variant="secondary" className="rounded-full px-3">
                  {skill}
                </Badge>
              ))}
              {candidate.skills.length > 3 && (
                <Badge variant="outline" className="rounded-full px-3">
                  +{candidate.skills.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Tab Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="overview" className="mt-0 space-y-6 animate-fade-in">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <ProfileCompletenessCard profile={profile} candidate={candidate} />
              </div>
              <div className="lg:col-span-2 space-y-6">
                <NotificationCenter />
                {candidate && (
                  <RecommendedJobs 
                    candidateId={candidate.id}
                    skills={candidate.skills || []}
                    latitude={profile.latitude}
                    longitude={profile.longitude}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="jobs" className="mt-0 animate-fade-in">
            {candidate && <JobActivityTabs candidateId={candidate.id} />}
          </TabsContent>

          <TabsContent value="resume" className="mt-0 animate-fade-in">
            {candidate && <ResumeUpload candidate={candidate} onUpdate={fetchCandidate} />}
          </TabsContent>

          <TabsContent value="alerts" className="mt-0 animate-fade-in">
            {candidate && <JobAlertsManager candidateId={candidate.id} />}
          </TabsContent>

          <TabsContent value="security" className="mt-0 animate-fade-in">
            <SecuritySettings />
          </TabsContent>
        </Tabs>
      </main>

      <ProfileEditModal 
        open={editModalOpen} 
        onOpenChange={setEditModalOpen}
        profile={profile}
        candidate={candidate}
        onSave={handleProfileSave}
      />
    </div>
  );
};

export default CandidateDashboard;
