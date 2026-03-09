import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  user_type: 'candidate' | 'employer';
  full_name: string;
  latitude: number | null;
  longitude: number | null;
  avatar_url: string | null;
  is_visible_on_map: boolean;
  profile_completed: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  profileResolved: boolean;
  isEmailVerified: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_FETCH_TIMEOUT = 5000; // 5 seconds max wait for profile

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);

  const migrateSavedJobs = useCallback(async (profileData: Profile) => {
    if (profileData.user_type !== 'candidate') return;
    try {
      const raw = localStorage.getItem('hfj_saved_jobs');
      if (!raw) return;
      const localIds: string[] = JSON.parse(raw);
      if (!localIds.length) return;

      const { data: cand } = await supabase.from('candidates').select('id').eq('profile_id', profileData.id).maybeSingle();
      if (!cand) return;

      // Get already-saved to avoid duplicates
      const { data: existing } = await supabase.from('saved_jobs').select('job_id').eq('candidate_id', cand.id);
      const existingIds = new Set((existing || []).map(e => e.job_id));
      const toInsert = localIds.filter(id => !existingIds.has(id)).map(job_id => ({ candidate_id: cand.id, job_id }));

      if (toInsert.length > 0) {
        await supabase.from('saved_jobs').insert(toInsert);
      }
      localStorage.removeItem('hfj_saved_jobs');
    } catch (err) {
      console.warn('Failed to migrate saved jobs:', err);
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string, retryCount = 0): Promise<Profile | null> => {
    try {
      setProfileLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data && !error) {
        setProfile(data as Profile);
        setProfileResolved(true);
        // Migrate localStorage saved jobs on login
        migrateSavedJobs(data as Profile);
        return data as Profile;
      } else if (error) {
        console.error('Error fetching profile:', error);
        if (retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return fetchProfile(userId, retryCount + 1);
        }
      }
      // Only mark as resolved after all retries exhausted
      setProfileResolved(true);
      return null;
    } catch (err) {
      console.error('Error fetching profile:', err);
      // Mark resolved on error after retries
      if (retryCount >= 2) setProfileResolved(true);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [migrateSavedJobs]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let isMounted = true;
    let profileFetchTimeout: NodeJS.Timeout | null = null;

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // CRITICAL: Set loading to false IMMEDIATELY after we know auth state
        // Profile fetch happens in background - don't block UI
        if (isMounted) {
          setLoading(false);
        }

        if (session?.user) {
          setProfileResolved(false);
          // Fetch profile in background with timeout protection
          profileFetchTimeout = setTimeout(() => {
            if (isMounted) {
              console.warn('Profile fetch timed out - continuing without profile');
              setProfileLoading(false);
              // Do NOT set profileResolved here - let retry chain finish
            }
          }, PROFILE_FETCH_TIMEOUT);

          fetchProfile(session.user.id).finally(() => {
            if (profileFetchTimeout) clearTimeout(profileFetchTimeout);
          });
        } else {
          setProfile(null);
          setProfileResolved(true);
        }
      }
    );

    // Then get initial session
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // CRITICAL: Set loading to false after we know auth state
        if (isMounted) {
          setLoading(false);
        }
        
        if (session?.user) {
          setProfileResolved(false);
          // Fetch profile in background
          fetchProfile(session.user.id);
        } else {
          setProfileResolved(true);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    initSession();

    return () => {
      isMounted = false;
      if (profileFetchTimeout) clearTimeout(profileFetchTimeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setProfileResolved(false);
  };

  // Check if email is verified
  const isEmailVerified = user?.email_confirmed_at != null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      profileLoading,
      profileResolved,
      isEmailVerified, 
      signOut, 
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
