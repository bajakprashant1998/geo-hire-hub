import { useState, useEffect } from 'react';
import { X, Users, Briefcase, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const GoogleSignInPrompt = () => {
  const [visible, setVisible] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [userType, setUserType] = useState<'candidate' | 'employer'>('candidate');

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
  };

  const handleSignIn = async () => {
    setGoogleLoading(true);

    try {
      sessionStorage.setItem('preferred_role', userType);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
          },
        }
      });

      if (error) throw error;
    } catch (error) {
      toast.error('Sign in failed. Please try again.');
      console.error('Google sign-in error:', error);
      setGoogleLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-4 fade-in duration-300 max-w-[calc(100vw-2rem)]">
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-[340px] max-w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="text-sm text-foreground font-medium">
              Sign in with Google
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
              >
                <X size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Dismiss</TooltipContent>
          </Tooltip>
        </div>

        {/* Role selection + sign in */}
        <div className="p-4">
          <div className="flex bg-muted rounded-xl p-1 mb-3">
            <button
              type="button"
              disabled={googleLoading}
              onClick={() => setUserType('candidate')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-colors",
                userType === 'candidate'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              Job Seeker
            </button>
            <button
              type="button"
              disabled={googleLoading}
              onClick={() => setUserType('employer')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-colors",
                userType === 'employer'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Employer
            </button>
          </div>

          <button
            onClick={handleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors border border-border"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
              {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'G'}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Continue with Google</p>
              <p className="text-xs text-muted-foreground">
                {userType === 'candidate'
                  ? 'Sign in as Job Seeker'
                  : 'Sign in as Employer'}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleSignInPrompt;
