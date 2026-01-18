import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, MapPin, MessageSquare, User, Briefcase, Bell, Shield, 
  FileText, Settings, Sparkles, Edit, Camera, Loader2
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

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);

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
    setLoading(false);
  };

  const handleProfileSave = () => {
    fetchCandidate();
    refreshProfile();
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">Please log in</p>
            <Button onClick={() => navigate('/login')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <span className="font-semibold">Candidate Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/messages"><Button variant="ghost" size="icon"><MessageSquare className="w-5 h-5" /></Button></Link>
            <Link to="/"><Button variant="ghost" size="icon"><MapPin className="w-5 h-5" /></Button></Link>
            <Button variant="ghost" size="sm" onClick={signOut}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-8 shadow-google overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary to-primary/60" />
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-background">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {profile.full_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                <p className="text-muted-foreground">{candidate?.job_title || 'Add your job title'}</p>
                {candidate?.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {candidate.skills.slice(0, 5).map((skill: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                    {candidate.skills.length > 5 && (
                      <Badge variant="outline" className="text-xs">+{candidate.skills.length - 5}</Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditModalOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
                <Link to="/ai-resume-builder">
                  <Button className="bg-gradient-to-r from-primary to-purple-600">
                    <Sparkles className="w-4 h-4 mr-2" /> AI Resume Builder
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl mb-6">
            <TabsTrigger value="overview" className="gap-1"><User className="w-4 h-4" /><span className="hidden sm:inline">Overview</span></TabsTrigger>
            <TabsTrigger value="jobs" className="gap-1"><Briefcase className="w-4 h-4" /><span className="hidden sm:inline">Jobs</span></TabsTrigger>
            <TabsTrigger value="resume" className="gap-1"><FileText className="w-4 h-4" /><span className="hidden sm:inline">Resume</span></TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1"><Bell className="w-4 h-4" /><span className="hidden sm:inline">Alerts</span></TabsTrigger>
            <TabsTrigger value="security" className="gap-1"><Shield className="w-4 h-4" /><span className="hidden sm:inline">Security</span></TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1"><ProfileCompletenessCard profile={profile} candidate={candidate} /></div>
              <div className="lg:col-span-2"><NotificationCenter /></div>
            </div>
          </TabsContent>

          <TabsContent value="jobs">
            {candidate && <JobActivityTabs candidateId={candidate.id} />}
          </TabsContent>

          <TabsContent value="resume">
            {candidate && <ResumeUpload candidate={candidate} onUpdate={fetchCandidate} />}
          </TabsContent>

          <TabsContent value="alerts">
            {candidate && <JobAlertsManager candidateId={candidate.id} />}
          </TabsContent>

          <TabsContent value="security">
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
