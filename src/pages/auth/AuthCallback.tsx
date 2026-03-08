import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const getSmartRedirect = async (userId: string, userType: string, profileCompleted: boolean) => {
  if (!profileCompleted) return '/profile-setup';
  return '/';
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    let mounted = true;
    let processing = false;

    const processProfile = async (session: any) => {
      if (processing) return;
      processing = true;

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_type, profile_completed')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        }

        const preferredRole = sessionStorage.getItem('preferred_role');
        let effectiveProfile = profile;

        const hasEstablishedRole = profile && profile.user_type;
        const isNewUser = !profile || !profile.user_type || profile.profile_completed === false;

        if (hasEstablishedRole && preferredRole && !isNewUser) {
          if (profile.user_type !== preferredRole) {
            console.warn(`Role mismatch: Registered as ${profile.user_type}, tried to login as ${preferredRole}. Proceeding with actual role.`);
            toast.info(`You're signed in as ${profile.user_type === 'employer' ? 'an Employer' : 'a Job Seeker'}.`);
          }
          sessionStorage.removeItem('preferred_role');
        } else if (isNewUser && preferredRole && (preferredRole === 'candidate' || preferredRole === 'employer')) {
          const fullName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';

          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              user_id: session.user.id,
              user_type: preferredRole,
              full_name: fullName,
              profile_completed: false
            } as any, { onConflict: 'user_id' });

          if (upsertError) {
            console.error('Error assigning initial role:', upsertError);
          } else {
            effectiveProfile = { user_type: preferredRole, profile_completed: false } as any;
            await refreshProfile();
          }
          sessionStorage.removeItem('preferred_role');

          // Process referral for Google OAuth signups
          const storedRef = sessionStorage.getItem('referral_code');
          if (storedRef && isNewUser) {
            const { data: newProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', session.user.id)
              .maybeSingle();
            if (newProfile) {
              await supabase.rpc('process_referral_signup', {
                p_referral_code: storedRef,
                p_new_user_profile_id: newProfile.id,
              });
              sessionStorage.removeItem('referral_code');
            }
          }
        } else {
          sessionStorage.removeItem('preferred_role');
        }

        if (!mounted) return;

        if (effectiveProfile?.user_type) {
          if (!effectiveProfile.profile_completed) {
            navigate('/profile-setup', { replace: true });
          } else {
            const redirect = await getSmartRedirect(
              session.user.id,
              effectiveProfile.user_type,
              effectiveProfile.profile_completed ?? false
            );
            navigate(redirect, { replace: true });
          }
        } else {
          navigate('/select-role', { replace: true });
        }
      } catch (err) {
        console.error('Error processing profile in auth callback:', err);
        if (mounted) navigate('/login', { replace: true });
      }
    };

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
  }, [navigate, refreshProfile]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Setting up your account...</p>
    </div>
  );
};

export default AuthCallback;
