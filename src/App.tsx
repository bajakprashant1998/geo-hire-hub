import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { MessageNotificationProvider } from "@/components/messaging/MessageNotificationProvider";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import VerifyEmail from "./pages/VerifyEmail";
import ProfileSetup from "./pages/ProfileSetup";
import AuthCallback from "./pages/auth/AuthCallback";
import RoleSelection from "./pages/auth/RoleSelection";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import BrowseJobs from "./pages/BrowseJobs";
import CandidateDashboard from "./pages/CandidateDashboard";
import CandidateSettings from "./pages/CandidateSettings";
import CandidateProfileEdit from "./pages/CandidateProfileEdit";
import EmployerDashboard from "./pages/EmployerDashboard";
import EmployerSettings from "./pages/EmployerSettings";
import AIResumeBuilder from "./pages/AIResumeBuilder";
import PostJob from "./pages/PostJob";
import Messages from "./pages/Messages";
import CandidateDetail from "./pages/CandidateDetail";
import CandidateResumeRedirect from "./pages/CandidateResumeRedirect";
import EmployerDetail from "./pages/EmployerDetail";
import JobDetail from "./pages/JobDetail";
import Plans from "./pages/Plans";
import CompanyProfileEdit from "./pages/CompanyProfileEdit";
import VideoCall from "./pages/VideoCall";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEmployers from "./pages/admin/AdminEmployers";
import AdminJobs from "./pages/admin/AdminJobs";
import AdminCandidates from "./pages/admin/AdminCandidates";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminGovernment from "./pages/admin/AdminGovernment";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminJobCategories from "./pages/admin/AdminJobCategories";
import AdminApplications from "./pages/admin/AdminApplications";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminModeration from "./pages/admin/AdminModeration";
import AdminEmailTemplates from "./pages/admin/AdminEmailTemplates";
import AdminSystemHealth from "./pages/admin/AdminSystemHealth";
import AdminContentSEO from "./pages/admin/AdminContentSEO";
import AdminAutoApply from "./pages/admin/AdminAutoApply";
import AdminRevenue from "./pages/admin/AdminRevenue";
import AdminRoleManagement from "./pages/admin/AdminRoleManagement";
import AdminFraudDetection from "./pages/admin/AdminFraudDetection";
import AdminScheduledJobs from "./pages/admin/AdminScheduledJobs";

const queryClient = new QueryClient();

// Proper redirect component that preserves the :id param
const JobRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/jobs/${id}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <MessageNotificationProvider>
            <EmailVerificationBanner />
            <Routes>
              {/* ==================== PUBLIC ROUTES ==================== */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/select-role" element={<RoleSelection />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/browse-jobs" element={<BrowseJobs />} />

              {/* ==================== SHARED ROUTES ==================== */}
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:conversationId" element={<Messages />} />

              {/* ==================== SEO-FRIENDLY DETAIL PAGES ==================== */}
              {/* Jobs: /jobs/:slug or /jobs/:country/:slug or /jobs/:country/:state/:slug or /jobs/:country/:state/:city/:slug */}
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/jobs/:country/:slug" element={<JobDetail />} />
              <Route path="/jobs/:country/:state/:slug" element={<JobDetail />} />
              <Route path="/jobs/:country/:state/:city/:slug" element={<JobDetail />} />

              {/* Candidates: /candidates/:slug or with location hierarchy */}
              <Route path="/candidates/:id/resume.pdf" element={<CandidateResumeRedirect />} />
              <Route path="/candidates/:id" element={<CandidateDetail />} />
              <Route path="/candidates/:country/:slug" element={<CandidateDetail />} />
              <Route path="/candidates/:country/:state/:slug" element={<CandidateDetail />} />
              <Route path="/candidates/:country/:state/:city/:slug" element={<CandidateDetail />} />

              {/* Companies/Employers: /companies/:slug or with location hierarchy */}
              <Route path="/employers/:id" element={<EmployerDetail />} />
              <Route path="/companies/:slug" element={<EmployerDetail />} />
              <Route path="/companies/:country/:slug" element={<EmployerDetail />} />
              <Route path="/companies/:country/:state/:slug" element={<EmployerDetail />} />
              <Route path="/companies/:country/:state/:city/:slug" element={<EmployerDetail />} />

              {/* ==================== CANDIDATE ROUTES ==================== */}
              <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
              <Route path="/candidate-settings" element={<CandidateSettings />} />
              <Route path="/candidate-profile" element={<CandidateProfileEdit />} />
              <Route path="/ai-resume-builder" element={<AIResumeBuilder />} />

              {/* ==================== EMPLOYER ROUTES ==================== */}
              <Route path="/employer-dashboard" element={<EmployerDashboard />} />
              <Route path="/employer-settings" element={<EmployerSettings />} />
              <Route path="/post-job" element={<Navigate to="/employer-dashboard?tab=post-job" replace />} />
              <Route path="/edit-job/:jobId" element={<PostJob />} />
              <Route path="/company-profile" element={<Navigate to="/employer-dashboard?tab=company" replace />} />
              <Route path="/video-call/:interviewId" element={<VideoCall />} />

              {/* ==================== ADMIN ROUTES ==================== */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/employers" element={<AdminEmployers />} />
              <Route path="/admin/jobs" element={<AdminJobs />} />
              <Route path="/admin/applications" element={<AdminApplications />} />
              <Route path="/admin/candidates" element={<AdminCandidates />} />
              <Route path="/admin/categories" element={<AdminJobCategories />} />
              <Route path="/admin/government" element={<AdminGovernment />} />
              <Route path="/admin/moderation" element={<AdminModeration />} />
              <Route path="/admin/notifications" element={<AdminNotifications />} />
              <Route path="/admin/messages" element={<AdminMessages />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/email-templates" element={<AdminEmailTemplates />} />
              <Route path="/admin/system-health" element={<AdminSystemHealth />} />
              <Route path="/admin/content-seo" element={<AdminContentSEO />} />
              <Route path="/admin/auto-apply" element={<AdminAutoApply />} />
              <Route path="/admin/revenue" element={<AdminRevenue />} />
              <Route path="/admin/roles" element={<AdminRoleManagement />} />
              <Route path="/admin/fraud" element={<AdminFraudDetection />} />
              <Route path="/admin/scheduled-jobs" element={<AdminScheduledJobs />} />

              {/* ==================== REDIRECTS & ALIASES ==================== */}
              <Route path="/dashboard" element={<Navigate to="/candidate-dashboard" replace />} />
              <Route path="/employer/:id" element={<EmployerDetail />} />
              <Route path="/job/:id" element={<JobRedirect />} />

              {/* ==================== CATCH-ALL ==================== */}
              <Route path="*" element={<NotFound />} />
            </Routes >
          </MessageNotificationProvider >
        </BrowserRouter >
      </TooltipProvider >
    </AuthProvider >
  </QueryClientProvider >
);

export default App;
