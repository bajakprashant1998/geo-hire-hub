import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const processProfile = async (session: any) => {
      try {
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

        const hasEstablishedRole = profile && profile.user_type;
        const isNewUser = !profile || !profile.user_type;

        if (hasEstablishedRole && preferredRole) {
          // Existing user with an established role trying to log in
          if (profile.user_type !== preferredRole) {
            console.warn(`Role mismatch: Registered as ${profile.user_type}, tried to login as ${preferredRole}`);
            await supabase.auth.signOut();
            sessionStorage.removeItem('preferred_role');

            const expectedTab = profile.user_type === 'employer' ? 'Employer' : 'Job Seeker';
            setTimeout(() => {
              toast.error(`This email is registered as an ${expectedTab}. Please switch tabs to log in.`);
            }, 100);

            if (mounted) navigate('/login');
            return;
          }
          sessionStorage.removeItem('preferred_role');
        } else if (isNewUser && preferredRole && (preferredRole === 'candidate' || preferredRole === 'employer')) {
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
          sessionStorage.removeItem('preferred_role');
        } else {
          sessionStorage.removeItem('preferred_role');
        }

        if (!mounted) return;

        if (effectiveProfile?.user_type) {
          if (!effectiveProfile.profile_completed) {
            navigate('/profile-setup', { replace: true });
          } else if (effectiveProfile.user_type === 'employer') {
            navigate('/employer-dashboard', { replace: true });
          } else {
            navigate('/candidate-dashboard', { replace: true });
          }
        } else {
          navigate('/select-role', { replace: true });
        }
      } catch (err) {
        console.error('Error processing profile in auth callback:', err);
        if (mounted) navigate('/login', { replace: true });
      }
    };

    // First attempt to get an existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error handling auth callback:', error);
        if (mounted) navigate('/login', { replace: true });
        return;
      }

      if (session) {
        processProfile(session);
      }
    });

    // Also listen for auth state changes (crucial for OAuth redirects with PKCE)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        processProfile(session);
      } else if (event === 'SIGNED_OUT') {
        if (mounted) navigate('/login', { replace: true });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Setting up your account...</p>
    </div>
  );
};

export default AuthCallback;
