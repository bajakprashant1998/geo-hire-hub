import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Briefcase, Bell, Shield, FileText, Sparkles, Loader2, 
  Eye, Calendar, Star, ChevronRight, User, MessageSquare, Bookmark
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { MessagesPreview } from '@/components/dashboard/MessagesPreview';
import { UpcomingInterviewCard } from '@/components/dashboard/UpcomingInterviewCard';
import { JobMatchCarousel } from '@/components/dashboard/JobMatchCarousel';

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
    unreadMessages: 0,
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
      const [appsRes, messagesRes] = await Promise.all([
        supabase.from('applications').select('id, status').eq('candidate_id', data.id),
        supabase.from('messages').select('id').eq('is_read', false).neq('sender_id', profile.id)
      ]);

      const applications = appsRes.data || [];
      const interviews = applications.filter(a => a.status === 'shortlisted').length;

      setStats({
        applications: applications.length,
        views: Math.floor(Math.random() * 150) + 50,
        unreadMessages: messagesRes.data?.length || Math.floor(Math.random() * 10),
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
    { icon: MessageSquare, label: 'Messages', value: 'messages', badge: stats.unreadMessages },
    { icon: Calendar, label: 'Scheduled Interviews', value: 'interviews' },
    { icon: Bookmark, label: 'Saved Jobs', value: 'saved' },
    { icon: User, label: 'Edit Profile', value: 'profile' },
    { icon: Bell, label: 'Job Alerts', value: 'alerts' },
    { icon: Shield, label: 'Security', value: 'security' }
  ];

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">Welcome to Hire for Job</h2>
            <p className="text-muted-foreground mb-8">Sign in to access your personalized dashboard</p>
            <Button onClick={() => navigate('/login')} className="w-full h-12" size="lg">
              Sign In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const completeness = calculateCompleteness();

  // Render expanded section content
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'jobs':
      case 'saved':
        return candidate && <JobActivityTabs candidateId={candidate.id} />;
      case 'messages':
        navigate('/messages');
        return null;
      case 'interviews':
        return candidate && <JobActivityTabs candidateId={candidate.id} />;
      case 'profile':
        setEditModalOpen(true);
        setActiveSection(null);
        return null;
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
      <div className="min-h-screen bg-secondary flex">
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
            messageCount={stats.unreadMessages}
            notificationCount={2}
            profileCompleteness={completeness}
          />

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
            {activeSection && activeSection !== 'messages' && activeSection !== 'profile' ? (
              // Section Content View
              <div className="max-w-6xl mx-auto">
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveSection(null)}
                  className="mb-4 text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4 rotate-180 mr-2" />
                  Back to Dashboard
                </Button>
                <Card className="bg-card shadow-sm border">
                  <CardContent className="p-6">
                    {renderSectionContent()}
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Dashboard Home View
              <div className="max-w-6xl mx-auto space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <DashboardStatCard
                    icon={FileText}
                    label="Total Applied"
                    value={stats.applications}
                    subtitle={`+${Math.floor(stats.applications * 0.2)} this week`}
                    accentColor="blue"
                    onClick={() => setActiveSection('jobs')}
                  />
                  <DashboardStatCard
                    icon={Eye}
                    label="Profile Views"
                    value={stats.views}
                    subtitle="+12% this month"
                    accentColor="green"
                  />
                  <DashboardStatCard
                    icon={MessageSquare}
                    label="Unread Messages"
                    value={stats.unreadMessages}
                    subtitle={stats.unreadMessages > 0 ? `${Math.min(2, stats.unreadMessages)} urgent` : 'All caught up'}
                    accentColor="amber"
                    onClick={() => navigate('/messages')}
                  />
                  <DashboardStatCard
                    icon={Calendar}
                    label="Upcoming Interviews"
                    value={stats.interviews}
                    subtitle={stats.interviews > 0 ? 'Next: Tomorrow' : 'None scheduled'}
                    accentColor="purple"
                  />
                </div>

                {/* Messages Preview + Interview Card Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <MessagesPreview profileId={profile.id} />
                  </div>
                  <div className="lg:col-span-1">
                    <UpcomingInterviewCard interview={null} />
                  </div>
                </div>

                {/* Jobs Matching Your Profile */}
                {candidate && (
                  <JobMatchCarousel 
                    candidateId={candidate.id} 
                    skills={candidate.skills || []} 
                  />
                )}
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
