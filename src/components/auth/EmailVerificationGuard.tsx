import { ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MailWarning, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailVerificationGuardProps {
  children: ReactNode;
  fallbackMessage?: string;
}

export const EmailVerificationGuard = ({ 
  children, 
  fallbackMessage = "Please verify your email to continue." 
}: EmailVerificationGuardProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Check if email is verified
  const isEmailVerified = user?.email_confirmed_at != null;

  // Start cooldown timer
  const startCooldown = () => {
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendVerification = async () => {
    if (!user?.email || cooldown > 0) return;

    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast.success('Verification email sent! Please check your inbox.');
      startCooldown();
    } catch (error: any) {
      console.error('Error resending verification:', error);
      toast.error(error.message || 'Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    navigate('/login');
    return null;
  }

  // If email is not verified, show verification required screen
  if (!isEmailVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MailWarning className="w-10 h-10 text-warning" />
            </div>
            <CardTitle className="text-2xl">Email Verification Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">{fallbackMessage}</p>
              <p className="text-sm text-muted-foreground">
                We sent a verification link to:
              </p>
              <p className="font-medium text-foreground">{user.email}</p>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Didn't receive the email?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check your spam or junk folder</li>
                <li>Make sure the email address is correct</li>
                <li>Wait a few minutes and try again</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleResendVerification} 
                disabled={resending || cooldown > 0}
                className="w-full"
                size="lg"
              >
                {resending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend in {cooldown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </Button>

              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Sign Out & Use Different Email
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              After verifying your email, refresh this page or{' '}
              <button 
                onClick={() => window.location.reload()} 
                className="text-primary hover:underline"
              >
                click here to continue
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email is verified, render children
  return <>{children}</>;
};
