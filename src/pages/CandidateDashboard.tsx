import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Briefcase, Bell, Shield, FileText, Sparkles, Edit, Loader2, 
  Eye, CheckCircle2, Star, ChevronRight, Zap, User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatCard } from '@/components/dashboard/StatCard';

import { ProfileEditModal } from '@/components/candidate/ProfileEditModal';
import { ResumeUpload } from '@/components/candidate/ResumeUpload';
import { JobActivityTabs } from '@/components/candidate/JobActivityTabs';
import { NotificationCenter } from '@/components/candidate/NotificationCenter';
import { JobAlertsManager } from '@/components/candidate/JobAlertsManager';
import { SecuritySettings } from '@/components/candidate/SecuritySettings';
import { RecommendedJobs } from '@/components/candidate/RecommendedJobs';

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const handleSectionClick = (value: string) => {
    if (value === 'home') {
      setActiveSection(null);
    } else {
      setActiveSection(value);
    }
    setSidebarOpen(false);
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

  const sidebarItems = [
    { icon: Briefcase, label: 'My Applications', value: 'jobs', badge: stats.applications },
    { icon: Star, label: 'Recommended Jobs', value: 'recommended' },
    { icon: FileText, label: 'Resume Builder', value: 'resume' },
    { icon: Bell, label: 'Job Alerts', value: 'alerts' },
    { icon: Bell, label: 'Notifications', value: 'notifications' },
    { icon: Shield, label: 'Security', value: 'security' }
  ];

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-gray-900">Welcome to Hire for Job</h2>
            <p className="text-gray-500 mb-8">Sign in to access your personalized dashboard</p>
            <Button onClick={() => navigate('/login')} className="w-full h-12 bg-blue-600 hover:bg-blue-700" size="lg">
              Sign In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const completeness = calculateCompleteness();

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
      <div className="min-h-screen bg-[#F4F6F9] flex">
        {/* Sidebar */}
        <DashboardSidebar
          type="candidate"
          items={sidebarItems}
          activeItem={activeSection}
          onItemClick={handleSectionClick}
          userName={profile.full_name}
          userTitle={candidate?.job_title || 'Job Seeker'}
          avatarUrl={profile.avatar_url}
          onSignOut={signOut}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
          {/* Header */}
          <DashboardHeader
            type="candidate"
            userName={profile.full_name}
            userTitle={candidate?.job_title}
            avatarUrl={profile.avatar_url}
            onMenuClick={() => setSidebarOpen(true)}
            onSignOut={signOut}
            messageCount={3}
            notificationCount={2}
          />

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
            {activeSection ? (
              // Section Content View
              <div className="max-w-6xl mx-auto">
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveSection(null)}
                  className="mb-4 text-gray-600 hover:text-gray-900"
                >
                  <ChevronRight className="w-4 h-4 rotate-180 mr-2" />
                  Back to Dashboard
                </Button>
                <Card className="bg-white shadow-sm border-0">
                  <CardContent className="p-6">
                    {renderSectionContent()}
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Dashboard Home View
              <div className="max-w-6xl mx-auto space-y-6">
                {/* Welcome Banner */}
                <Card className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 text-white border-0 shadow-lg overflow-hidden">
                  <CardContent className="p-6 lg:p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div>
                        <h1 className="text-2xl lg:text-3xl font-bold mb-2">
                          Welcome back, {profile.full_name?.split(' ')[0]}! 👋
                        </h1>
                        <p className="text-blue-100 text-lg">
                          {completeness < 100 
                            ? `Your profile is ${completeness}% complete. Complete it to get more visibility!`
                            : "Your profile is complete. You're ready to land your dream job!"}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-4">
                          <Button 
                            onClick={() => setEditModalOpen(true)}
                            className="bg-white text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4 mr-2" /> Edit Profile
                          </Button>
                          <Link to="/ai-resume-builder">
                            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                              <Sparkles className="w-4 h-4 mr-2" /> AI Resume Builder
                            </Button>
                          </Link>
                        </div>
                      </div>
                      
                      {/* Profile Completeness Circle */}
                      <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                        <div className="relative w-20 h-20">
                          <svg className="w-20 h-20 -rotate-90">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                            <circle 
                              cx="40" cy="40" r="34" fill="none" 
                              stroke="white" strokeWidth="6"
                              strokeDasharray={`${completeness * 2.14} 214`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">{completeness}%</span>
                        </div>
                        <div>
                          <p className="font-semibold text-lg">Profile Score</p>
                          <p className="text-blue-100 text-sm">
                            {completeness === 100 ? 'Excellent!' : 'Keep improving'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    icon={Briefcase}
                    label="Applications"
                    value={stats.applications}
                    trend="+12%"
                    trendUp={true}
                    iconColor="bg-blue-500"
                    onClick={() => setActiveSection('jobs')}
                  />
                  <StatCard
                    icon={Eye}
                    label="Profile Views"
                    value={stats.views}
                    trend="+8%"
                    trendUp={true}
                    iconColor="bg-rose-500"
                  />
                  <StatCard
                    icon={Star}
                    label="Saved Jobs"
                    value={stats.savedJobs}
                    iconColor="bg-amber-500"
                    onClick={() => setActiveSection('jobs')}
                  />
                  <StatCard
                    icon={CheckCircle2}
                    label="Interviews"
                    value={stats.interviews}
                    iconColor="bg-emerald-500"
                  />
                </div>

                {/* Skills Section */}
                {candidate?.skills?.length > 0 && (
                  <Card className="bg-white shadow-sm border-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-gray-900">Your Skills</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {candidate.skills.slice(0, 8).map((skill: string, i: number) => (
                          <Badge 
                            key={i} 
                            variant="secondary" 
                            className="px-4 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {candidate.skills.length > 8 && (
                          <Badge variant="outline" className="px-4 py-1.5">
                            +{candidate.skills.length - 8} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card 
                    className="bg-white shadow-sm border-0 cursor-pointer hover:shadow-md transition-all group"
                    onClick={() => setActiveSection('recommended')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                          <Zap className="w-6 h-6 text-amber-600" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mt-4">Recommended Jobs</h3>
                      <p className="text-sm text-gray-500 mt-1">Jobs matching your skills and preferences</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-white shadow-sm border-0 cursor-pointer hover:shadow-md transition-all group"
                    onClick={() => setActiveSection('resume')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-purple-600" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mt-4">Manage Resume</h3>
                      <p className="text-sm text-gray-500 mt-1">Upload and manage your resume documents</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-white shadow-sm border-0 cursor-pointer hover:shadow-md transition-all group"
                    onClick={() => setActiveSection('alerts')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                          <Bell className="w-6 h-6 text-green-600" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mt-4">Job Alerts</h3>
                      <p className="text-sm text-gray-500 mt-1">Set up alerts for new job postings</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity (Optional) */}
                <Card className="bg-white shadow-sm border-0">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-500">
                      <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No recent activity</p>
                      <Link to="/">
                        <Button variant="link" className="text-blue-600 mt-2">
                          Browse Jobs on Map
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>

        {/* Profile Edit Modal */}
        {profile && candidate && (
          <ProfileEditModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            profile={profile}
            candidate={candidate}
            onSave={handleProfileSave}
          />
        )}
      </div>
    </EmailVerificationGuard>
  );
};

export default CandidateDashboard;
