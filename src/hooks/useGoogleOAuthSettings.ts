import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface GoogleOAuthSettings {
  enabled_for_candidates: boolean;
  enabled_for_employers: boolean;
  force_account_select: boolean;
}

const DEFAULT_SETTINGS: GoogleOAuthSettings = {
  enabled_for_candidates: true,
  enabled_for_employers: true,
  force_account_select: true,
};

export function useGoogleOAuthSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ['google-oauth-settings'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'google_oauth')
          .maybeSingle();
        if (error || !data) return DEFAULT_SETTINGS;
        return data.value as unknown as GoogleOAuthSettings;
      } catch {
        return DEFAULT_SETTINGS;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    settings: data || DEFAULT_SETTINGS,
    isLoading,
    isEnabledFor: (role: 'candidate' | 'employer') => {
      const s = data || DEFAULT_SETTINGS;
      return role === 'candidate' ? s.enabled_for_candidates : s.enabled_for_employers;
    },
  };
}
