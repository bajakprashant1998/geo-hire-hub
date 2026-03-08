import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AuthRouteGuardProps {
  children: ReactNode;
  requiredRole?: 'candidate' | 'employer';
}

const AuthRouteGuard = ({ children, requiredRole }: AuthRouteGuardProps) => {
  const { user, profile, loading: authLoading, profileLoading } = useAuth();

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && profile?.user_type !== requiredRole) {
    const redirect = profile?.user_type === 'employer' ? '/employer-dashboard' : '/candidate-dashboard';
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
};

export default AuthRouteGuard;
