import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
      }

      // CROSS-ROLE RESTRICTION FOR GOOGLE LOGIN
      const preferredRole = sessionStorage.getItem('preferred_role');
      let effectiveProfile = profile;

      // Determine if profile was auto-created by trigger (user_type will be null)
      // or manually set during email signup (user_type will have a value)
      const hasEstablishedRole = profile && profile.user_type;
      const isNewUser = !profile || !profile.user_type;

      if (hasEstablishedRole && preferredRole) {
        // Existing user with an established role trying to log in
        if (profile.user_type !== preferredRole) {
          // Role mismatch — they selected wrong tab
          console.warn(`Role mismatch: Registered as ${profile.user_type}, tried to login as ${preferredRole}`);
          await supabase.auth.signOut();
          sessionStorage.removeItem('preferred_role');

          const expectedTab = profile.user_type === 'employer' ? 'Employer' : 'Job Seeker';
          setTimeout(() => {
            toast.error(`This email is registered as an ${expectedTab}. Please switch tabs to log in.`);
          }, 100);

          navigate('/login');
          return;
        }
        // Role matches, proceed normally
        sessionStorage.removeItem('preferred_role');

      } else if (isNewUser && preferredRole && (preferredRole === 'candidate' || preferredRole === 'employer')) {
        // New Google user — assign their preferred role
        console.log(`Assigning initial role for new Google user: ${preferredRole}`);

        const fullName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';

        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            user_id: session.user.id,
            user_type: preferredRole,
            full_name: fullName,
          } as any, {
            onConflict: 'user_id'
          });

        if (upsertError) {
          console.error('Error assigning initial role:', upsertError);
        } else {
          effectiveProfile = { user_type: preferredRole, profile_completed: false } as any;
        }

        sessionStorage.removeItem('preferred_role');

      } else if (isNewUser && !preferredRole) {
        // New user without preferred role — send to role selection
        sessionStorage.removeItem('preferred_role');
      } else {
        // Existing user logging in without preferred_role (direct navigation)
        sessionStorage.removeItem('preferred_role');
      }

      if (effectiveProfile?.user_type) {
        // User has a role. Check if their profile is complete
        if (!effectiveProfile.profile_completed) {
          navigate('/profile-setup');
        } else if (effectiveProfile.user_type === 'employer') {
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
