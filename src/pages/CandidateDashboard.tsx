import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  MapPin, MessageSquare, User, Briefcase, Bell, Shield, 
  FileText, Sparkles, Edit, Loader2, TrendingUp, Eye, CheckCircle2,
  Star, LogOut, Menu, X, Home, ChevronRight, Calendar, 
  Award, Target, Zap, ArrowUpRight, Clock, BookOpen
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { motion, AnimatePresence } from 'framer-motion';

import { ProfileEditModal } from '@/components/candidate/ProfileEditModal';
import { ResumeUpload } from '@/components/candidate/ResumeUpload';
import { JobActivityTabs } from '@/components/candidate/JobActivityTabs';
import { NotificationCenter } from '@/components/candidate/NotificationCenter';
import { JobAlertsManager } from '@/components/candidate/JobAlertsManager';
import { SecuritySettings } from '@/components/candidate/SecuritySettings';
import { RecommendedJobs } from '@/components/candidate/RecommendedJobs';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } }
};

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
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
      navigate('/employer-dashboard');
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
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary flex items-center justify-center p-4">
        <motion.div {...fadeInUp}>
          <Card className="w-full max-w-md border-0 shadow-2xl bg-card/80 backdrop-blur-xl">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/25">
                <User className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Welcome to Hire for Job</h2>
              <p className="text-muted-foreground mb-8">Sign in to access your personalized dashboard</p>
              <Button onClick={() => navigate('/login')} className="w-full h-12 rounded-2xl text-base font-semibold" size="lg">
                Sign In to Continue
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground font-medium">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  const completeness = calculateCompleteness();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Render expanded section content
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'jobs':
        return candidate && <JobActivityTabs candidateId={candidate.id} />;
      case 'resume':
        return candidate && <ResumeUpload candidate={candidate} onUpdate={fetchCandidate} />;
      case 'alerts':
        return candidate && <JobAlertsManager candidateId={candidate.id} />;
      case 'security':
        return <SecuritySettings />;
      case 'notifications':
        return <NotificationCenter />;
      case 'recommended':
        return candidate && (
          <RecommendedJobs 
            candidateId={candidate.id}
            skills={candidate.skills || []}
            latitude={profile.latitude}
            longitude={profile.longitude}
          />
        );
      default:
        return null;
    }
  };

  return (
    <EmailVerificationGuard fallbackMessage="Please verify your email to access your dashboard.">
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/30">
        {/* Minimal Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg hidden sm:block">Hire for Job</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/messages">
                <Button variant="ghost" size="icon" className="rounded-xl relative">
                  <MessageSquare className="w-5 h-5" />
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full text-[10px] text-white flex items-center justify-center font-bold">3</span>
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="rounded-xl md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-border/50 ml-2">
                <Link to="/candidate-settings">
                  <Avatar className="w-9 h-9 ring-2 ring-primary/20 hover:ring-primary/40 transition-all cursor-pointer">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white font-semibold">
                      {profile.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <Button variant="ghost" size="icon" onClick={signOut} className="rounded-xl text-muted-foreground hover:text-destructive">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl"
              >
                <div className="container mx-auto px-4 py-4 space-y-2">
                  <Link to="/candidate-settings" className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-white">{profile.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{profile.full_name}</p>
                      <p className="text-sm text-muted-foreground">{candidate?.job_title || 'Job Seeker'}</p>
                    </div>
                  </Link>
                  <Button variant="ghost" onClick={signOut} className="w-full justify-start text-destructive">
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <AnimatePresence mode="wait">
            {activeSection ? (
              // Expanded Section View
              <motion.div
                key="section"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveSection(null)}
                  className="rounded-xl gap-2 mb-4"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Back to Dashboard
                </Button>
                {renderSectionContent()}
              </motion.div>
            ) : (
              // Dashboard Grid View
              <motion.div
                key="dashboard"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-6"
              >
                {/* Hero Welcome Section */}
                <motion.div variants={fadeInUp} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-6 sm:p-8 text-white">
                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-3">
                      <p className="text-white/80 font-medium">{greeting}</p>
                      <h1 className="text-3xl sm:text-4xl font-bold">{profile.full_name?.split(' ')[0]} 👋</h1>
                      <p className="text-white/80 max-w-md">
                        {completeness < 100 
                          ? `Your profile is ${completeness}% complete. Let's make it shine!`
                          : "Your profile is complete. You're ready to land your dream job!"}
                      </p>
                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button 
                          onClick={() => setEditModalOpen(true)}
                          className="bg-white text-primary hover:bg-white/90 rounded-xl shadow-lg"
                        >
                          <Edit className="w-4 h-4 mr-2" /> Edit Profile
                        </Button>
                        <Link to="/ai-resume-builder">
                          <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl">
                            <Sparkles className="w-4 h-4 mr-2" /> AI Resume
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Profile Score */}
                    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                      <div className="relative w-20 h-20">
                        <svg className="w-20 h-20 -rotate-90">
                          <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                          <circle 
                            cx="40" cy="40" r="34" fill="none" 
                            stroke="white" strokeWidth="6"
                            strokeDasharray={`${completeness * 2.14} 214`}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">{completeness}%</span>
                      </div>
                      <div>
                        <p className="font-semibold text-lg">Profile Score</p>
                        <p className="text-white/70 text-sm">
                          {completeness === 100 ? 'Excellent!' : 'Keep improving'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                  <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
                </motion.div>

                {/* Bento Grid Stats */}
                <motion.div variants={fadeInUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { icon: Briefcase, label: 'Applications', value: stats.applications, color: 'from-blue-500 to-blue-600', trend: '+12%' },
                    { icon: Eye, label: 'Profile Views', value: stats.views, color: 'from-rose-500 to-rose-600', trend: '+8%' },
                    { icon: Star, label: 'Saved Jobs', value: stats.savedJobs, color: 'from-amber-500 to-amber-600' },
                    { icon: CheckCircle2, label: 'Interviews', value: stats.interviews, color: 'from-emerald-500 to-emerald-600' }
                  ].map((stat, i) => (
                    <Card key={i} className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer bg-card/80 backdrop-blur-sm">
                      <CardContent className="p-5">
                        <div className={`absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-br ${stat.color} rounded-full opacity-10 group-hover:opacity-20 transition-opacity`} />
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 shadow-lg`}>
                          <stat.icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-3xl font-bold mb-1">{stat.value}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                          {stat.trend && (
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
                              <TrendingUp className="w-3 h-3" /> {stat.trend}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>

                {/* Skills Tags */}
                {candidate?.skills?.length > 0 && (
                  <motion.div variants={fadeInUp} className="flex flex-wrap gap-2">
                    {candidate.skills.slice(0, 6).map((skill: string, i: number) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="px-4 py-1.5 rounded-full text-sm font-medium bg-secondary/80 backdrop-blur-sm"
                      >
                        {skill}
                      </Badge>
                    ))}
                    {candidate.skills.length > 6 && (
                      <Badge variant="outline" className="px-4 py-1.5 rounded-full text-sm">
                        +{candidate.skills.length - 6} more
                      </Badge>
                    )}
                  </motion.div>
                )}

                {/* Bento Action Grid */}
                <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Job Activity */}
                  <Card 
                    className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card/80 backdrop-blur-sm lg:col-span-2"
                    onClick={() => setActiveSection('jobs')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                          <Briefcase className="w-6 h-6 text-white" />
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Job Activity</h3>
                      <p className="text-muted-foreground mb-4">Track your applications, saved jobs, and interview schedule</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-4 h-4" /> {stats.applications} pending
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-4 h-4" /> {stats.interviews} upcoming
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Resume */}
                  <Card 
                    className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card/80 backdrop-blur-sm"
                    onClick={() => setActiveSection('resume')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">My Resume</h3>
                      <p className="text-muted-foreground text-sm">
                        {candidate?.resume_url ? 'Resume uploaded' : 'Upload your resume'}
                      </p>
                      {candidate?.resume_url && (
                        <Badge className="mt-3" variant="secondary">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                        </Badge>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recommended Jobs */}
                  <Card 
                    className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                    onClick={() => setActiveSection('recommended')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Target className="w-6 h-6 text-white" />
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Recommended</h3>
                      <p className="text-white/80 text-sm">Jobs matching your skills and preferences</p>
                    </CardContent>
                  </Card>

                  {/* Notifications */}
                  <Card 
                    className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card/80 backdrop-blur-sm"
                    onClick={() => setActiveSection('notifications')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                          <Bell className="w-6 h-6 text-white" />
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Notifications</h3>
                      <p className="text-muted-foreground text-sm">Stay updated with latest activities</p>
                    </CardContent>
                  </Card>

                  {/* Job Alerts */}
                  <Card 
                    className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card/80 backdrop-blur-sm"
                    onClick={() => setActiveSection('alerts')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                          <Zap className="w-6 h-6 text-white" />
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Job Alerts</h3>
                      <p className="text-muted-foreground text-sm">Get notified for matching jobs</p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Bottom Row */}
                <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Security */}
                  <Card 
                    className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card/80 backdrop-blur-sm"
                    onClick={() => setActiveSection('security')}
                  >
                    <CardContent className="p-6 flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg flex-shrink-0">
                        <Shield className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-1">Security & Privacy</h3>
                        <p className="text-muted-foreground text-sm">Manage your account security settings</p>
                      </div>
                      <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </CardContent>
                  </Card>

                  {/* Settings Link */}
                  <Link to="/candidate-settings">
                    <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card/80 backdrop-blur-sm h-full">
                      <CardContent className="p-6 flex items-center gap-5 h-full">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg flex-shrink-0">
                          <User className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold mb-1">Profile Settings</h3>
                          <p className="text-muted-foreground text-sm">Update your profile, skills, and preferences</p>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
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
