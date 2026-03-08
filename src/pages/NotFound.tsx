import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search, LogIn } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SEOHead title="Page Not Found – Hire For Job" description="This page doesn't exist. Find jobs near me, browse job listings, and discover jobs hiring near me on Hire For Job." noindex />
      <div className="text-center max-w-md space-y-6">
        <div className="text-8xl font-bold text-primary/20">404</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
          <p className="text-muted-foreground text-sm">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate(-1)} variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Button asChild className="gap-2">
            <Link to="/">
              <Home className="w-4 h-4" />
              Home
            </Link>
          </Button>
        </div>
        <div className="flex gap-3 justify-center text-sm">
          <Link to="/browse-jobs" className="text-primary hover:underline flex items-center gap-1">
            <Search className="w-3 h-3" /> Browse Jobs
          </Link>
          <Link to="/login" className="text-primary hover:underline flex items-center gap-1">
            <LogIn className="w-3 h-3" /> Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
