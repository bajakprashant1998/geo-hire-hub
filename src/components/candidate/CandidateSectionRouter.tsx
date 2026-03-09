import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardMessaging } from '@/components/dashboard/DashboardMessaging';
import { JobActivityTabs } from '@/components/candidate/JobActivityTabs';
import { NotificationCenter } from '@/components/candidate/NotificationCenter';
import { JobAlertsManager } from '@/components/candidate/JobAlertsManager';
import { SecuritySettings } from '@/components/candidate/SecuritySettings';
import { RecommendedJobs } from '@/components/candidate/RecommendedJobs';
import { CandidateInterviewManager } from '@/components/candidate/CandidateInterviewManager';
import { SavedJobsSection } from '@/components/candidate/SavedJobsSection';
import { TaskList } from '@/components/candidate/TaskList';
import { AudioResumeCard } from '@/components/candidate/AudioResumeCard';
import { SalaryInsights } from '@/components/candidate/SalaryInsights';
import { CareerBuddyChat } from '@/components/candidate/CareerBuddyChat';
import { ResumeAndDocumentManager } from '@/components/candidate/ResumeAndDocumentManager';
import { PublicProfilePreview } from '@/components/candidate/PublicProfilePreview';
import { AutoApplyManager } from '@/components/candidate/AutoApplyManager';
import { JobRadar } from '@/components/candidate/JobRadar';
import { ApplicationTracker } from '@/components/candidate/ApplicationTracker';
import { ReferralDashboard } from '@/components/candidate/ReferralDashboard';
import { AssessmentHub } from '@/components/candidate/AssessmentHub';
import { InterviewPrepCoach } from '@/components/candidate/InterviewPrepCoach';
import { MarketValueScore } from '@/components/candidate/MarketValueScore';
import { SalaryNegotiationCoach } from '@/components/candidate/SalaryNegotiationCoach';
import { ProfileBadges } from '@/components/candidate/ProfileBadges';
import { CandidateLeaderboard } from '@/components/candidate/CandidateLeaderboard';
import { FollowUpReminders } from '@/components/candidate/FollowUpReminders';
import { SkillGapAnalyzer } from '@/components/candidate/SkillGapAnalyzer';
import { InterviewAvailability } from '@/components/candidate/InterviewAvailability';
import { JobComparisonTool } from '@/components/candidate/JobComparisonTool';
import { CareerPathVisualizer } from '@/components/candidate/CareerPathVisualizer';
import { CultureMatchScore } from '@/components/candidate/CultureMatchScore';
import { SmartNotificationDigest } from '@/components/candidate/SmartNotificationDigest';
import { CompanyWatchlist } from '@/components/candidate/CompanyWatchlist';
import { PortfolioShowcase } from '@/components/candidate/PortfolioShowcase';
import { CandidateAnalyticsDashboard } from '@/components/candidate/CandidateAnalyticsDashboard';
import { CandidateNetworking } from '@/components/candidate/CandidateNetworking';
import { CoverLetterTemplates } from '@/components/candidate/CoverLetterTemplates';
import CandidateProfileEdit from '@/pages/CandidateProfileEdit';

const AIResumeBuilder = lazy(() => import('@/pages/AIResumeBuilder'));

interface CandidateSectionRouterProps {
  activeSection: string | null;
  candidate: any;
  profile: any;
  onNavigate: (section: string) => void;
  onUpdate: () => void;
}

const REQUIRES_CANDIDATE = [
  'jobs', 'saved', 'interviews', 'resume', 'audio-resume', 'alerts', 'tasks',
  'public-profile', 'recommended', 'auto-apply', 'job-radar', 'app-tracker',
  'assessments', 'interview-prep', 'follow-ups', 'skill-gap', 'availability',
  'compare-jobs', 'career-path', 'culture-match', 'analytics', 'networking', 'templates',
];

export const CandidateSectionRouter = ({
  activeSection,
  candidate,
  profile,
  onNavigate,
  onUpdate,
}: CandidateSectionRouterProps) => {
  const navigate = useNavigate();

  if (REQUIRES_CANDIDATE.includes(activeSection || '') && !candidate) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <User className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Profile Setup Required</h3>
        <p className="text-sm text-muted-foreground mb-4">Please complete your profile setup to access this feature.</p>
        <Button onClick={() => navigate('/profile-setup')}>Complete Profile</Button>
      </div>
    );
  }

  switch (activeSection) {
    case 'jobs': return <JobActivityTabs candidateId={candidate.id} />;
    case 'saved': return <SavedJobsSection candidateId={candidate.id} />;
    case 'interviews': return <CandidateInterviewManager candidateId={candidate.id} />;
    case 'profile': return <CandidateProfileEdit embedded />;
    case 'resume': return <ResumeAndDocumentManager candidate={candidate} onUpdate={onUpdate} />;
    case 'audio-resume': return <AudioResumeCard candidate={candidate} onUpdate={onUpdate} />;
    case 'alerts': return <JobAlertsManager candidateId={candidate.id} />;
    case 'security': return <SecuritySettings />;
    case 'tasks': return <TaskList candidateId={candidate.id} />;
    case 'messages': return <DashboardMessaging />;
    case 'notifications': return <NotificationCenter />;
    case 'public-profile': return <PublicProfilePreview candidateId={candidate.id} candidate={candidate} profile={profile} onNavigate={onNavigate} />;
    case 'recommended': return <RecommendedJobs candidateId={candidate.id} skills={candidate.skills || []} latitude={profile.latitude} longitude={profile.longitude} />;
    case 'auto-apply': return <AutoApplyManager candidateId={candidate.id} />;
    case 'job-radar': return <JobRadar candidateId={candidate.id} candidate={candidate} profile={profile} />;
    case 'salary-insights': return <SalaryInsights />;
    case 'career-buddy': return <CareerBuddyChat />;
    case 'app-tracker': return <ApplicationTracker candidateId={candidate.id} />;
    case 'referrals': return profile ? <ReferralDashboard profileId={profile.id} /> : null;
    case 'ai-resume': return (
      <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
        <AIResumeBuilder embedded />
      </Suspense>
    );
    case 'assessments': return <AssessmentHub candidateId={candidate.id} />;
    case 'interview-prep': return <InterviewPrepCoach candidateId={candidate.id} />;
    case 'market-value': return <MarketValueScore />;
    case 'badges': return <ProfileBadges />;
    case 'leaderboard': return <CandidateLeaderboard />;
    case 'follow-ups': return <FollowUpReminders candidateId={candidate.id} />;
    case 'skill-gap': return <SkillGapAnalyzer candidateSkills={candidate.skills || []} />;
    case 'availability': return <InterviewAvailability candidateId={candidate.id} />;
    case 'compare-jobs': return <JobComparisonTool candidateId={candidate.id} />;
    case 'career-path': return <CareerPathVisualizer currentJobTitle={candidate.job_title || ''} currentSkills={candidate.skills || []} />;
    case 'culture-match': return <CultureMatchScore candidateId={candidate.id} />;
    case 'smart-digest': return <SmartNotificationDigest />;
    case 'watchlist': return candidate ? <CompanyWatchlist candidateId={candidate.id} /> : null;
    case 'negotiation-coach': return <SalaryNegotiationCoach candidateId={candidate.id} />;
    case 'portfolio': return <PortfolioShowcase candidateId={candidate.id} />;
    case 'analytics': return <CandidateAnalyticsDashboard candidateId={candidate.id} />;
    case 'networking': return <CandidateNetworking candidateId={candidate.id} />;
    case 'templates': return <CoverLetterTemplates candidateId={candidate.id} />;
    default: return null;
  }
};
