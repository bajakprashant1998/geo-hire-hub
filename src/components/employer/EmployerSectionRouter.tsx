import { DashboardMessaging } from '@/components/dashboard/DashboardMessaging';
import { NotificationCenter } from '@/components/candidate/NotificationCenter';
import { SecuritySettings } from '@/components/candidate/SecuritySettings';
import { PlanUsagePanel } from '@/components/employer/PlanUsagePanel';
import { JobDraftsSection } from '@/components/employer/JobDraftsSection';
import { SavedCandidatesSection } from '@/components/employer/SavedCandidatesSection';
import { CandidateFilterTool } from '@/components/employer/CandidateFilterTool';
import { ApplicantTabs } from '@/components/employer/ApplicantTabs';
import { InterviewScheduler } from '@/components/employer/InterviewScheduler';
import { JobAnalyticsDashboard } from '@/components/employer/JobAnalyticsDashboard';
import { EmployerInterviewCalendar } from '@/components/employer/EmployerInterviewCalendar';
import { TaskManager } from '@/components/employer/TaskManager';
import { CompanyProfileSection } from '@/components/employer/CompanyProfileSection';
import { SkillAssessmentManager } from '@/components/employer/SkillAssessmentManager';
import { JDOptimizer } from '@/components/employer/JDOptimizer';
import { SpotlightStories } from '@/components/employer/SpotlightStories';
import { OfferLetterGenerator } from '@/components/employer/OfferLetterGenerator';
import { CandidateComparisonBoard } from '@/components/employer/CandidateComparisonBoard';
import { InterviewFeedbackForms } from '@/components/employer/InterviewFeedbackForms';
import { TalentPoolCRM } from '@/components/employer/TalentPoolCRM';
import { JobABTesting } from '@/components/employer/JobABTesting';
import { TeamCollaborationNotes } from '@/components/employer/TeamCollaborationNotes';
import { TeamWorkflows } from '@/components/employer/TeamWorkflows';
import { AccessibilityScoreChecker } from '@/components/employer/AccessibilityScoreChecker';
import { BulkJobImport } from '@/components/employer/BulkJobImport';
import { BrandingPageBuilder } from '@/components/employer/BrandingPageBuilder';
import { AnalyticsReportExport } from '@/components/employer/AnalyticsReportExport';
import { AIScreeningWithJobSelector } from '@/components/employer/AIScreeningWithJobSelector';
import EmployerDetail from '@/pages/EmployerDetail';
import PostJob from '@/pages/PostJob';
import { EmployerJobsSection } from '@/components/employer/EmployerJobsSection';

interface EmployerSectionRouterProps {
  activeSection: string | null;
  employer: any;
  profile: any;
  jobs: any[];
  selectedJob: any;
  setSelectedJob: (job: any) => void;
  setJobs: (fn: (prev: any[]) => any[]) => void;
  setJobToDelete: (job: any) => void;
  onSectionChange: (section: string | null) => void;
  search: string;
}

export const EmployerSectionRouter = ({
  activeSection,
  employer,
  profile,
  jobs,
  selectedJob,
  setSelectedJob,
  setJobs,
  setJobToDelete,
  onSectionChange,
  search,
}: EmployerSectionRouterProps) => {
  switch (activeSection) {
    case 'jobs':
      return (
        <EmployerJobsSection
          jobs={jobs}
          selectedJob={selectedJob}
          setSelectedJob={setSelectedJob}
          setJobs={setJobs}
          setJobToDelete={setJobToDelete}
          employer={employer}
          search={search}
          onSectionChange={onSectionChange}
        />
      );
    case 'candidates':
      return employer ? <CandidateFilterTool employerId={employer.id} /> : null;
    case 'drafts':
      return employer ? <JobDraftsSection employerId={employer.id} /> : null;
    case 'chat':
      return <DashboardMessaging />;
    case 'tasks':
      return employer ? <TaskManager employerId={employer.id} /> : null;
    case 'plan':
      return employer ? <PlanUsagePanel employerId={employer.id} /> : null;
    case 'analytics':
      return employer ? (
        <div className="space-y-6">
          <JobAnalyticsDashboard employerId={employer.id} />
          <AnalyticsReportExport employerId={employer.id} employerName={employer.company_name} />
          <PlanUsagePanel employerId={employer.id} />
        </div>
      ) : null;
    case 'interviews':
      return employer ? (
        <div className="space-y-6">
          <EmployerInterviewCalendar employerId={employer.id} />
          <InterviewScheduler employerId={employer.id} />
        </div>
      ) : null;
    case 'public-profile':
      return employer ? <EmployerDetail id={employer.id} /> : null;
    case 'company':
      return <CompanyProfileSection onViewPublicProfile={() => onSectionChange('public-profile')} />;
    case 'notifications':
      return <NotificationCenter />;
    case 'security':
      return <SecuritySettings />;
    case 'ai-screening':
      return employer ? <AIScreeningWithJobSelector jobs={jobs} /> : null;
    case 'jd-optimizer':
      return <JDOptimizer />;
    case 'assessments':
      return employer ? <SkillAssessmentManager employerId={employer.id} /> : null;
    case 'spotlight':
      return employer ? <SpotlightStories employerId={employer.id} companyName={employer.company_name} isOwner /> : null;
    case 'offer-letters':
      return employer ? <OfferLetterGenerator employerId={employer.id} companyName={employer.company_name} /> : null;
    case 'compare-candidates':
      return employer ? <CandidateComparisonBoard employerId={employer.id} /> : null;
    case 'interview-feedback':
      return employer ? <InterviewFeedbackForms employerId={employer.id} /> : null;
    case 'talent-pool':
      return employer ? <TalentPoolCRM employerId={employer.id} /> : null;
    case 'ab-testing':
      return employer ? <JobABTesting employerId={employer.id} /> : null;
    case 'team-notes':
      return employer ? <TeamCollaborationNotes employerId={employer.id} /> : null;
    case 'team-workflows':
      return employer ? <TeamWorkflows employerId={employer.id} /> : null;
    case 'bulk-import':
      return employer ? <BulkJobImport employerId={employer.id} /> : null;
    case 'accessibility-check':
      return <AccessibilityScoreChecker />;
    case 'branding':
      return employer ? <BrandingPageBuilder employerId={employer.id} /> : null;
    case 'post-job':
      return <PostJob embedded />;
    default:
      return null;
  }
};
