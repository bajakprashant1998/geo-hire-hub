import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { MessageNotificationProvider } from "@/components/messaging/MessageNotificationProvider";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { LocationGate } from "@/components/LocationGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageTransition } from "@/components/PageTransition";

// Critical path — keep eager
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

// Lazy-loaded routes
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const AuthCallback = lazy(() => import("./pages/auth/AuthCallback"));
const RoleSelection = lazy(() => import("./pages/auth/RoleSelection"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const BrowseJobs = lazy(() => import("./pages/BrowseJobs"));
const JobsNearMe = lazy(() => import("./pages/JobsNearMe"));
const CandidateDashboard = lazy(() => import("./pages/CandidateDashboard"));
const CandidateSettings = lazy(() => import("./pages/CandidateSettings"));
const CandidateProfileEdit = lazy(() => import("./pages/CandidateProfileEdit"));
const EmployerDashboard = lazy(() => import("./pages/EmployerDashboard"));
const AIResumeBuilder = lazy(() => import("./pages/AIResumeBuilder"));
const PostJob = lazy(() => import("./pages/PostJob"));
const Messages = lazy(() => import("./pages/Messages"));
const CandidateDetail = lazy(() => import("./pages/CandidateDetail"));
const CandidateResumeRedirect = lazy(() => import("./pages/CandidateResumeRedirect"));
const EmployerDetail = lazy(() => import("./pages/EmployerDetail"));
const JobDetail = lazy(() => import("./pages/JobDetail"));
const SEOJobDetail = lazy(() => import("./pages/SEOJobDetail"));
const SEOEmployerDetail = lazy(() => import("./pages/SEOEmployerDetail"));
const SEOCandidateDetail = lazy(() => import("./pages/SEOCandidateDetail"));
const Plans = lazy(() => import("./pages/Plans"));
const CompanyProfileEdit = lazy(() => import("./pages/CompanyProfileEdit"));
const VideoCall = lazy(() => import("./pages/VideoCall"));
const CandidatePortfolio = lazy(() => import("./pages/CandidatePortfolio"));

// Admin routes — always lazy
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminEmployers = lazy(() => import("./pages/admin/AdminEmployers"));
const AdminJobs = lazy(() => import("./pages/admin/AdminJobs"));
const AdminCandidates = lazy(() => import("./pages/admin/AdminCandidates"));
const AdminPlans = lazy(() => import("./pages/admin/AdminPlans"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminGovernment = lazy(() => import("./pages/admin/AdminGovernment"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminJobCategories = lazy(() => import("./pages/admin/AdminJobCategories"));
const AdminApplications = lazy(() => import("./pages/admin/AdminApplications"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminModeration = lazy(() => import("./pages/admin/AdminModeration"));
const AdminEmailTemplates = lazy(() => import("./pages/admin/AdminEmailTemplates"));
const AdminSystemHealth = lazy(() => import("./pages/admin/AdminSystemHealth"));
const AdminContentSEO = lazy(() => import("./pages/admin/AdminContentSEO"));
const AdminAutoApply = lazy(() => import("./pages/admin/AdminAutoApply"));
const AdminRevenue = lazy(() => import("./pages/admin/AdminRevenue"));
const AdminRoleManagement = lazy(() => import("./pages/admin/AdminRoleManagement"));
const AdminFraudDetection = lazy(() => import("./pages/admin/AdminFraudDetection"));
const AdminScheduledJobs = lazy(() => import("./pages/admin/AdminScheduledJobs"));
const AdminTasks = lazy(() => import("./pages/admin/AdminTasks"));
const AdminSEOAgent = lazy(() => import("./pages/admin/AdminSEOAgent"));
const AdminBanners = lazy(() => import("./pages/admin/AdminBanners"));
const AdminBulkImport = lazy(() => import("./pages/admin/AdminBulkImport"));

const queryClient = new QueryClient();

const JobRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/jobs/${id}`} replace />;
};

// Global handler for unhandled promise rejections (e.g. Google Maps AdvancedMarker cleanup)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || '';
    if (msg.includes('getRootNode') || msg.includes('AdvancedMarker')) {
      event.preventDefault();
      return;
    }
    console.error('Unhandled rejection:', event.reason);
  });
}

// Route loading fallback
const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <MessageNotificationProvider>
            <EmailVerificationBanner />
            <LocationGate>
            <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* ==================== PUBLIC ROUTES ==================== */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
              <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
              <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
              <Route path="/update-password" element={<PageTransition><UpdatePassword /></PageTransition>} />
              <Route path="/verify-email" element={<PageTransition><VerifyEmail /></PageTransition>} />
              <Route path="/profile-setup" element={<PageTransition><ProfileSetup /></PageTransition>} />
              <Route path="/plans" element={<PageTransition><Plans /></PageTransition>} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/select-role" element={<PageTransition><RoleSelection /></PageTransition>} />
              <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
              <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
              <Route path="/browse-jobs" element={<PageTransition><BrowseJobs /></PageTransition>} />
              <Route path="/jobs-near-me" element={<PageTransition><JobsNearMe /></PageTransition>} />
              <Route path="/job-listings-near-me" element={<Navigate to="/jobs-near-me" replace />} />
              <Route path="/jobs-hiring-near-me" element={<Navigate to="/jobs-near-me" replace />} />
              <Route path="/hire-for-job" element={<Navigate to="/jobs-near-me" replace />} />

              {/* ==================== SHARED ROUTES ==================== */}
              <Route path="/messages" element={<PageTransition><Messages /></PageTransition>} />
              <Route path="/messages/:conversationId" element={<PageTransition><Messages /></PageTransition>} />

              {/* ==================== SEO-FRIENDLY DETAIL PAGES ==================== */}
              <Route path="/jobs/:id" element={<PageTransition><JobDetail /></PageTransition>} />
              <Route path="/jobs/:country/:slug" element={<PageTransition><SEOJobDetail /></PageTransition>} />
              <Route path="/jobs/:country/:state/:slug" element={<PageTransition><SEOJobDetail /></PageTransition>} />
              <Route path="/jobs/:country/:state/:city/:slug" element={<PageTransition><SEOJobDetail /></PageTransition>} />

              <Route path="/candidates/:id/resume.pdf" element={<CandidateResumeRedirect />} />
              <Route path="/candidates/:id/portfolio" element={<PageTransition><CandidatePortfolio /></PageTransition>} />
              <Route path="/candidates/:id" element={<PageTransition><CandidateDetail /></PageTransition>} />
              <Route path="/candidates/:country/:slug" element={<PageTransition><SEOCandidateDetail /></PageTransition>} />
              <Route path="/candidates/:country/:state/:slug" element={<PageTransition><SEOCandidateDetail /></PageTransition>} />
              <Route path="/candidates/:country/:state/:city/:slug" element={<PageTransition><SEOCandidateDetail /></PageTransition>} />

              <Route path="/employers/:id" element={<PageTransition><EmployerDetail /></PageTransition>} />
              <Route path="/companies/:slug" element={<PageTransition><EmployerDetail /></PageTransition>} />
              <Route path="/companies/:country/:slug" element={<PageTransition><SEOEmployerDetail /></PageTransition>} />
              <Route path="/companies/:country/:state/:slug" element={<PageTransition><SEOEmployerDetail /></PageTransition>} />
              <Route path="/companies/:country/:state/:city/:slug" element={<PageTransition><SEOEmployerDetail /></PageTransition>} />

              {/* ==================== CANDIDATE ROUTES ==================== */}
              <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
              <Route path="/candidate-settings" element={<PageTransition><CandidateSettings /></PageTransition>} />
              <Route path="/candidate-profile" element={<PageTransition><CandidateProfileEdit /></PageTransition>} />
              <Route path="/ai-resume-builder" element={<PageTransition><AIResumeBuilder /></PageTransition>} />

              {/* ==================== EMPLOYER ROUTES ==================== */}
              <Route path="/employer-dashboard" element={<EmployerDashboard />} />
              <Route path="/employer-settings" element={<Navigate to="/employer-dashboard?tab=security" replace />} />
              <Route path="/post-job" element={<Navigate to="/employer-dashboard?tab=post-job" replace />} />
              <Route path="/edit-job/:jobId" element={<PageTransition><PostJob /></PageTransition>} />
              <Route path="/company-profile" element={<Navigate to="/employer-dashboard?tab=company" replace />} />
              <Route path="/video-call/:interviewId" element={<PageTransition><VideoCall /></PageTransition>} />

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
              <Route path="/admin/tasks" element={<AdminTasks />} />
              <Route path="/admin/seo-agent" element={<AdminSEOAgent />} />
              <Route path="/admin/banners" element={<AdminBanners />} />
              <Route path="/admin/bulk-import" element={<AdminBulkImport />} />

              {/* ==================== REDIRECTS & ALIASES ==================== */}
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/employer/:id" element={<PageTransition><EmployerDetail /></PageTransition>} />
              <Route path="/job/:id" element={<JobRedirect />} />

              {/* ==================== CATCH-ALL ==================== */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </ErrorBoundary>
            </LocationGate>
          </MessageNotificationProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
