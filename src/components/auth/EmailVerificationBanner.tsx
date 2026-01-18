import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { X, Mail, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export const EmailVerificationBanner = () => {
  const { user, isEmailVerified, loading } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Don't show if loading, no user, verified, or dismissed
  if (loading || !user || isEmailVerified || dismissed) {
    return null;
  }

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

  return (
    <div className="bg-warning/10 border-b border-warning/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 text-warning-foreground">
            <Mail className="w-5 h-5 text-warning shrink-0" />
            <p className="text-sm">
              <span className="font-medium">Please verify your email to continue.</span>
              <span className="hidden sm:inline text-muted-foreground ml-1">
                Check your inbox at <span className="font-medium text-foreground">{user.email}</span>
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendVerification}
              disabled={resending || cooldown > 0}
              className="text-xs h-8"
            >
              {resending ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Sending...
                </>
              ) : cooldown > 0 ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Resend in {cooldown}s
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Resend Email
                </>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
