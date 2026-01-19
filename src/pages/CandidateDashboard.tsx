import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, MessageSquare, User, Briefcase, Bell, Shield, 
  FileText, Sparkles, Edit, Loader2, TrendingUp, Eye, CheckCircle2,
  Star, LayoutDashboard, LogOut, Menu, X, Home
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { motion } from 'framer-motion';

import { ProfileCompletenessCard } from '@/components/candidate/ProfileCompletenessCard';
import { ProfileEditModal } from '@/components/candidate/ProfileEditModal';
import { ResumeUpload } from '@/components/candidate/ResumeUpload';
import { JobActivityTabs } from '@/components/candidate/JobActivityTabs';
import { NotificationCenter } from '@/components/candidate/NotificationCenter';
import { JobAlertsManager } from '@/components/candidate/JobAlertsManager';
import { SecuritySettings } from '@/components/candidate/SecuritySettings';
import { RecommendedJobs } from '@/components/candidate/RecommendedJobs';

// Google-colored Quick Stats Card
const QuickStatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  colorClass,
  iconBg
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  trend?: string; 
  colorClass: string;
  iconBg: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="overflow-hidden group hover:shadow-google-hover transition-all duration-300 border border-border/50 bg-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className={`text-3xl font-bold font-heading tracking-tight ${colorClass}`}>{value}</p>
            {trend && (
              <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{trend}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${iconBg} transition-transform group-hover:scale-110 shadow-google`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// Google-style Welcome Banner
const WelcomeBanner = ({ name, completeness }: { name: string; completeness: number }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-google-lg p-6 sm:p-8 mb-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm font-medium">{greeting}</p>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground">{name} 👋</h1>
          <p className="text-muted-foreground text-sm max-w-md">
            {completeness < 100 
              ? `Your profile is ${completeness}% complete. Complete it to get more visibility!`
              : "Your profile is complete! You're all set to find your dream job."}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Profile Score Circle - Google Blue */}
          <div className="bg-secondary rounded-2xl px-5 py-4 border border-border">
            <div className="flex items-center gap-4">
              <div className="relative">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
                  <circle 
                    cx="32" cy="32" r="26" fill="none" 
                    stroke="hsl(217, 89%, 61%)" strokeWidth="5"
                    strokeDasharray={`${completeness * 1.63} 163`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-primary font-heading">
                  {completeness}%
                </span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground text-sm">Profile Score</p>
                <p className="text-muted-foreground text-xs">Complete your profile</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Google-colored dots */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full" />
      <div className="absolute right-16 top-8 w-8 h-8 bg-google-red/10 rounded-full" />
      <div className="absolute right-8 top-20 w-12 h-12 bg-google-yellow/10 rounded-full" />
      <div className="absolute right-24 -bottom-2 w-16 h-16 bg-google-green/10 rounded-full" />
    </motion.div>
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
      navigate('/candidate-dashboard');
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

    if (data) {
      const [appsRes, savedRes] = await Promise.all([
        supabase.from('applications').select('id, status').eq('candidate_id', data.id),
        supabase.from('saved_jobs').select('id').eq('candidate_id', data.id)
      ]);

      const applications = appsRes.data || [];
      const interviews = applications.filter(a => a.status === 'shortlisted').length;

      setStats({
        applications: applications.length,
        views: Math.floor(Math.random() * 50) + 10,
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 shadow-google-lg border border-border">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold font-heading mb-2">Welcome Back!</h2>
            <p className="text-muted-foreground mb-6">Please sign in to access your dashboard</p>
            <Button onClick={() => navigate('/login')} className="w-full rounded-xl" size="lg">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
    <EmailVerificationGuard fallbackMessage="Please verify your email to access your dashboard.">
      <div className="min-h-screen bg-background">
        {/* Header - Clean Google-style */}
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-google">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Left */}
              <div className="flex items-center gap-3">
                <Link to="/">
                  <Button variant="ghost" size="icon" className="rounded-xl hover:bg-secondary">
                    <Home className="w-5 h-5" />
                  </Button>
                </Link>
                <div className="hidden sm:flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-google">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-lg font-heading">Hire for Job</span>
                </div>
              </div>

              {/* Center - Desktop Nav with Google-style pills */}
              <nav className="hidden lg:flex items-center bg-secondary rounded-full p-1 border border-border">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeTab === item.id 
                        ? 'bg-primary text-primary-foreground shadow-google' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
                  <Button variant="ghost" size="icon" className="rounded-xl relative hover:bg-secondary">
                    <MessageSquare className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-google-red rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                      3
                    </span>
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" className="rounded-xl lg:hidden hover:bg-secondary" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
                <div className="hidden sm:flex items-center gap-3 ml-2 pl-3 border-l border-border">
                  <Avatar className="w-9 h-9 border-2 border-primary/20">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                      {profile.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile Nav */}
            {mobileMenuOpen && (
              <motion.nav 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden pt-3 pb-2 mt-3 border-t border-border"
              >
                <div className="grid grid-cols-5 gap-1">
                  {navItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                      className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl text-xs font-medium transition-all ${
                        activeTab === item.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </motion.nav>
            )}
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Welcome Banner */}
          <WelcomeBanner name={profile.full_name?.split(' ')[0] || 'there'} completeness={completeness} />

          {/* Quick Stats - Google colors */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <QuickStatCard 
              icon={Briefcase} 
              label="Applications" 
              value={stats.applications} 
              trend="+12% this week"
              colorClass="text-google-blue"
              iconBg="bg-google-blue"
            />
            <QuickStatCard 
              icon={Eye} 
              label="Profile Views" 
              value={stats.views}
              trend="+8% this week"
              colorClass="text-google-red"
              iconBg="bg-google-red"
            />
            <QuickStatCard 
              icon={Star} 
              label="Saved Jobs" 
              value={stats.savedJobs}
              colorClass="text-google-yellow"
              iconBg="bg-google-yellow"
            />
            <QuickStatCard 
              icon={CheckCircle2} 
              label="Interviews" 
              value={stats.interviews}
              colorClass="text-google-green"
              iconBg="bg-google-green"
            />
          </div>

          {/* Profile Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Button 
              variant="outline" 
              onClick={() => setEditModalOpen(true)} 
              className="rounded-xl border-border hover:bg-secondary hover:border-primary/30"
            >
              <Edit className="w-4 h-4 mr-2" /> Edit Profile
            </Button>
            <Link to="/ai-resume-builder">
              <Button className="rounded-xl bg-primary hover:bg-primary/90 shadow-google">
                <Sparkles className="w-4 h-4 mr-2" /> AI Resume Builder
              </Button>
            </Link>
            {candidate?.skills?.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                {candidate.skills.slice(0, 3).map((skill: string, i: number) => (
                  <Badge key={i} variant="secondary" className="rounded-full px-3 font-medium">
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
            <TabsContent value="overview" className="mt-0 space-y-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="grid lg:grid-cols-3 gap-6"
              >
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
              </motion.div>
            </TabsContent>

            <TabsContent value="jobs" className="mt-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                {candidate && <JobActivityTabs candidateId={candidate.id} />}
              </motion.div>
            </TabsContent>

            <TabsContent value="resume" className="mt-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                {candidate && <ResumeUpload candidate={candidate} onUpdate={fetchCandidate} />}
              </motion.div>
            </TabsContent>

            <TabsContent value="alerts" className="mt-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                {candidate && <JobAlertsManager candidateId={candidate.id} />}
              </motion.div>
            </TabsContent>

            <TabsContent value="security" className="mt-0">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <SecuritySettings />
              </motion.div>
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
    </EmailVerificationGuard>
  );
};

export default CandidateDashboard;
