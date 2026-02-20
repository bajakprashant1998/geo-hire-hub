import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';

const GoogleSignInPrompt = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('google_prompt_dismissed');
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem('google_prompt_dismissed', '1');
  };

  const handleSignIn = async () => {
    sessionStorage.setItem('preferred_role', 'candidate');
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
      extraParams: { prompt: 'select_account' },
    });
    if (error) {
      toast.error('Sign in failed. Please try again.');
      console.error('Google sign-in error:', error);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[360px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-sm text-gray-800 font-medium">
              Sign in to hireforjob.com with Google
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sign in button area */}
        <div className="p-4">
          <button
            onClick={handleSignIn}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-200"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
              G
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-800">Continue with Google</p>
              <p className="text-xs text-gray-500">Quick sign in with your Google account</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleSignInPrompt;
