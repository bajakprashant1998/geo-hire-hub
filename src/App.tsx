import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProfileSetup from "./pages/ProfileSetup";
import Dashboard from "./pages/Dashboard";
import PostJob from "./pages/PostJob";
import Messages from "./pages/Messages";
import CandidateDetail from "./pages/CandidateDetail";
import EmployerDetail from "./pages/EmployerDetail";
import JobDetail from "./pages/JobDetail";
import Plans from "./pages/Plans";
import CompanyProfileEdit from "./pages/CompanyProfileEdit";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/post-job" element={<PostJob />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:conversationId" element={<Messages />} />
            <Route path="/candidates/:id" element={<CandidateDetail />} />
            <Route path="/employers/:id" element={<EmployerDetail />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/company-profile" element={<CompanyProfileEdit />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
