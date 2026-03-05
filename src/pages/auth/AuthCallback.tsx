import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const getSmartRedirect = async (userId: string, userType: string, profileCompleted: boolean) => {
  if (!profileCompleted) return '/profile-setup';

  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!prof) return userType === 'employer' ? '/employer-dashboard' : '/candidate-dashboard';

    if (userType === 'employer') {
      const { data: emp } = await supabase
        .from('employers')
        .select('profile_completeness')
        .eq('profile_id', prof.id)
        .maybeSingle();
      if (emp && (emp.profile_completeness ?? 0) >= 80) {
        return '/employer-dashboard?tab=candidates';
      }
      return '/employer-dashboard';
    } else {
      const { data: cand } = await supabase
        .from('candidates')
        .select('job_title, skills, bio, experience_years')
        .eq('profile_id', prof.id)
        .maybeSingle();
      if (cand) {
        let score = 0;
        if (cand.job_title && cand.job_title !== 'Not specified') score += 30;
        if (cand.skills && (cand.skills as string[]).length > 0) score += 25;
        if (cand.bio && cand.bio.length > 10) score += 25;
        if (cand.experience_years != null) score += 20;
        if (score >= 80) return '/candidate-dashboard?tab=job-radar';
      }
      return '/candidate-dashboard';
    }
  } catch {
    return userType === 'employer' ? '/employer-dashboard' : '/candidate-dashboard';
  }
};

const AuthCallback = () => {
  const navigate = useNavigate();

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
        const isNewUser = !profile || !profile.user_type;

        if (hasEstablishedRole && preferredRole) {
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
            } as any, { onConflict: 'user_id' });

          if (upsertError) {
            console.error('Error assigning initial role:', upsertError);
          } else {
            effectiveProfile = { user_type: preferredRole, profile_completed: false } as any;
          }
          sessionStorage.removeItem('preferred_role');
        } else {
          sessionStorage.removeItem('preferred_role');
        }

        if (!mounted) return;

        if (effectiveProfile?.user_type) {
          const redirect = await getSmartRedirect(
            session.user.id,
            effectiveProfile.user_type,
            effectiveProfile.profile_completed ?? false
          );
          navigate(redirect, { replace: true });
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
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Setting up your account...</p>
    </div>
  );
};

export default AuthCallback;
