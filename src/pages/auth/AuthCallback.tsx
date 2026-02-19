import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error handling auth callback:', error);
        navigate('/login');
        return;
      }

      if (!session) {
        navigate('/login');
        return;
      }

      // Check if user has a profile and user_type
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type, profile_completed')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // If profile doesn't exist, it likely means it hasn't been created yet by a trigger (if any),
        // or we need to create it. For now, let's assume we proceed to role selection if no profile/type found.
      }


      // Check for a preferred role set during login/signup flow
      const preferredRole = sessionStorage.getItem('preferred_role');

      if (preferredRole && (preferredRole === 'candidate' || preferredRole === 'employer')) {
        // If the user explicitly selected a role, we ensure their profile matches it.
        // This is crucial because DB triggers might have created a default 'candidate' profile.

        if (profile?.user_type !== preferredRole) {
          console.log(`Updating role from ${profile?.user_type} to ${preferredRole}`);
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ user_type: preferredRole })
            .eq('user_id', session.user.id);

          if (updateError) {
            console.error('Error enforcing preferred role:', updateError);
          } else {
            // Update local profile object so the redirect logic below uses the new role
            if (profile) {
              profile.user_type = preferredRole;
            }
          }
        }
        // Clear storage after using it
        sessionStorage.removeItem('preferred_role');
      }

      if (profile?.user_type) {
        // User has a role, redirect to appropriate dashboard
        if (profile.user_type === 'employer') {
          navigate('/employer-dashboard');
        } else {
          navigate('/candidate-dashboard');
        }
      } else {
        // New user or no role selected, redirect to role selection
        navigate('/select-role');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Setting up your account...</p>
    </div>
  );
};

export default AuthCallback;
