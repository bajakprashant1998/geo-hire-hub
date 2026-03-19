import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react';
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

const PROFILE_FETCH_TIMEOUT = 5000;
const SESSION_CACHE_KEY = 'hfj_auth_cache';

/** Restore cached auth state so Chrome tab-discard reloads are instant */
function getCachedAuth(): { profile: Profile | null } {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.profile) return { profile: parsed.profile };
    }
  } catch { /* ignore */ }
  return { profile: null };
}

function setCachedAuth(profile: Profile | null) {
  try {
    if (profile) {
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ profile }));
    } else {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    }
  } catch { /* ignore */ }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const cached = getCachedAuth();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(cached.profile);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileResolved, setProfileResolved] = useState(!!cached.profile);

  // Track current user ID to prevent unnecessary re-renders on token refresh
  const currentUserIdRef = useRef<string | null>(null);
  // Prevent double profile fetch from initSession + onAuthStateChange race
  const profileFetchInFlightRef = useRef(false);

  const migrateSavedJobs = useCallback(async (profileData: Profile) => {
    if (profileData.user_type !== 'candidate') return;
    try {
      const raw = localStorage.getItem('hfj_saved_jobs');
      if (!raw) return;
      const localIds: string[] = JSON.parse(raw);
      if (!localIds.length) return;

      const { data: cand } = await supabase.from('candidates').select('id').eq('profile_id', profileData.id).maybeSingle();
      if (!cand) return;

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
    // Prevent concurrent fetches for the same user
    if (profileFetchInFlightRef.current && retryCount === 0) {
      return null;
    }
    profileFetchInFlightRef.current = true;

    try {
      setProfileLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data && !error) {
        setProfile(data as Profile);
        setCachedAuth(data as Profile);
        setProfileResolved(true);
        migrateSavedJobs(data as Profile);
        return data as Profile;
      } else if (error) {
        console.error('Error fetching profile:', error);
        if (retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return fetchProfile(userId, retryCount + 1);
        }
      }
      setProfileResolved(true);
      return null;
    } catch (err) {
      console.error('Error fetching profile:', err);
      if (retryCount >= 2) setProfileResolved(true);
      return null;
    } finally {
      setProfileLoading(false);
      profileFetchInFlightRef.current = false;
    }
  }, [migrateSavedJobs]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      profileFetchInFlightRef.current = false; // Allow explicit refresh
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let isMounted = true;
    let profileFetchTimeout: NodeJS.Timeout | null = null;
    let initDone = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        const newUserId = newSession?.user?.id ?? null;
        const isSameUser = newUserId === currentUserIdRef.current;

        // TOKEN_REFRESHED fires when Chrome tab regains focus or token auto-refreshes.
        // If the user hasn't changed, just silently update the session — no state resets.
        if (event === 'TOKEN_REFRESHED' && isSameUser) {
          setSession(newSession);
          // Don't touch user/profile/loading — nothing changed
          return;
        }

        // For INITIAL_SESSION, skip if initSession already handled it
        if (event === 'INITIAL_SESSION' && initDone && isSameUser) {
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);
        currentUserIdRef.current = newUserId;

        if (isMounted) {
          setLoading(false);
        }

        if (newSession?.user) {
          // Only fetch profile on actual sign-in or initial load
          const shouldFetchProfile = event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
          if (shouldFetchProfile && !profileFetchInFlightRef.current) {
            setProfileResolved(false);
            profileFetchTimeout = setTimeout(() => {
              if (isMounted) {
                console.warn('Profile fetch timed out');
                setProfileLoading(false);
                setProfileResolved(true);
              }
            }, PROFILE_FETCH_TIMEOUT);

            fetchProfile(newSession.user.id).finally(() => {
              if (profileFetchTimeout) clearTimeout(profileFetchTimeout);
            });
          }
          // USER_UPDATED (e.g. email confirm, password change) — refresh profile silently
          if (event === 'USER_UPDATED') {
            profileFetchInFlightRef.current = false;
            fetchProfile(newSession.user.id);
          }
        } else {
          setProfile(null);
          setCachedAuth(null);
          setProfileResolved(true);
        }
      }
    );

    const initSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        const userId = initialSession?.user?.id ?? null;
        
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        currentUserIdRef.current = userId;
        initDone = true;

        if (isMounted) {
          setLoading(false);
        }
        
        if (initialSession?.user) {
          if (!profileFetchInFlightRef.current) {
            setProfileResolved(false);
            fetchProfile(initialSession.user.id);
          }
        } else {
          setProfileResolved(true);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (isMounted) {
          setLoading(false);
          setProfileResolved(true);
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
    currentUserIdRef.current = null;
    profileFetchInFlightRef.current = false;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setCachedAuth(null);
    setProfileResolved(false);
  };

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
