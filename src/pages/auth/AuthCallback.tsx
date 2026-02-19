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
      }

      // Check for a preferred role set during login/signup flow
      const preferredRole = sessionStorage.getItem('preferred_role');
      let effectiveProfile = profile;

      if (preferredRole && (preferredRole === 'candidate' || preferredRole === 'employer')) {
        console.log(`Enforcing preferred role: ${preferredRole}`);

        // Try to update first (most likely scenario if trigger ran)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ user_type: preferredRole })
          .eq('user_id', session.user.id);

        if (!updateError) {
          // Update updated successfully
          if (effectiveProfile) {
            effectiveProfile.user_type = preferredRole;
          } else {
            effectiveProfile = { user_type: preferredRole } as any;
          }
        } else {
          // If update failed (likely row doesn't exist), try upsert with more data
          // We need full_name to satisfy potential constraints if creating a new row
          // although usually triggers handle this.
          console.log('Update failed, trying upsert/insert', updateError);

          const fullName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';

          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              user_id: session.user.id,
              user_type: preferredRole,
              full_name: fullName,
              // Add other required fields if known, but full_name is the main one usually
            } as any, {
              onConflict: 'user_id'
            });

          if (upsertError) {
            console.error('Error forcing role update/insert:', upsertError);
          } else {
            if (effectiveProfile) {
              effectiveProfile.user_type = preferredRole;
            } else {
              effectiveProfile = { user_type: preferredRole } as any;
            }
          }
        }

        // Clear storage
        sessionStorage.removeItem('preferred_role');
      }

      if (effectiveProfile?.user_type) {
        // User has a role, redirect to appropriate dashboard
        if (effectiveProfile.user_type === 'employer') {
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
