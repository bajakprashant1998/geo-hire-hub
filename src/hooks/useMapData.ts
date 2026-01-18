import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Candidate, Job } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UseMapDataProps {
  userLocation: { lat: number; lng: number } | null;
  radius: number;
  searchQuery: string;
}

export const useMapData = ({ userLocation, radius, searchQuery }: UseMapDataProps) => {
  const { user, profile } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate distance using Haversine formula
  const calculateDistance = useCallback(
    (lat: number, lng: number) => {
      if (!userLocation) return undefined;
      const R = 6371; // Earth's radius in km
      const dLat = ((lat - userLocation.lat) * Math.PI) / 180;
      const dLon = ((lng - userLocation.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLocation.lat * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    [userLocation]
  );

  // Fetch candidates from database
  const fetchCandidates = useCallback(async () => {
    if (!user || !userLocation) return [];

    try {
      // Use the database function for geospatial query
      const { data, error } = await supabase.rpc('get_nearby_candidates', {
        user_lat: userLocation.lat,
        user_lng: userLocation.lng,
        radius_km: radius,
      });

      if (error) {
        // If RPC fails (user might not be employer), try direct query
        console.warn('RPC failed, falling back to direct query:', error.message);
        
        const { data: directData, error: directError } = await supabase
          .from('candidates')
          .select(`
            id,
            profile_id,
            job_title,
            experience_years,
            skills,
            profiles!inner (
              full_name,
              latitude,
              longitude,
              avatar_url,
              is_visible_on_map
            )
          `)
          .not('profiles.latitude', 'is', null)
          .not('profiles.longitude', 'is', null);

        if (directError) throw directError;

        return (directData || [])
          .filter((c: any) => c.profiles?.is_visible_on_map)
          .map((c: any) => ({
            id: c.id,
            profile_id: c.profile_id,
            full_name: c.profiles.full_name,
            job_title: c.job_title,
            experience_years: c.experience_years || 0,
            skills: c.skills || [],
            latitude: c.profiles.latitude,
            longitude: c.profiles.longitude,
            avatar_url: c.profiles.avatar_url,
            distance_km: calculateDistance(c.profiles.latitude, c.profiles.longitude),
          }))
          .filter((c: Candidate) => !c.distance_km || c.distance_km <= radius);
      }

      return (data || []).map((c: any) => ({
        id: c.id,
        profile_id: c.profile_id,
        full_name: c.full_name,
        job_title: c.job_title,
        experience_years: c.experience_years || 0,
        skills: c.skills || [],
        latitude: c.latitude,
        longitude: c.longitude,
        avatar_url: c.avatar_url,
        distance_km: c.distance_km,
      }));
    } catch (err: any) {
      console.error('Error fetching candidates:', err);
      return [];
    }
  }, [user, userLocation, radius, calculateDistance]);

  // Fetch jobs from database
  const fetchJobs = useCallback(async () => {
    if (!user || !userLocation) return [];

    try {
      // Use the database function for geospatial query
      const { data, error } = await supabase.rpc('get_nearby_jobs', {
        user_lat: userLocation.lat,
        user_lng: userLocation.lng,
        radius_km: radius,
      });

      if (error) {
        console.warn('RPC failed, falling back to direct query:', error.message);
        
        // Fallback to direct query
        const { data: directData, error: directError } = await supabase
          .from('jobs')
          .select(`
            id,
            employer_id,
            title,
            description,
            salary_range,
            job_type,
            latitude,
            longitude,
            status,
            created_at,
            employers!inner (
              company_name
            )
          `)
          .eq('status', 'open');

        if (directError) throw directError;

        return (directData || [])
          .map((j: any) => ({
            id: j.id,
            employer_id: j.employer_id,
            title: j.title,
            description: j.description,
            salary_range: j.salary_range,
            job_type: j.job_type || 'Full-time',
            latitude: j.latitude,
            longitude: j.longitude,
            status: j.status as 'open' | 'closed',
            created_at: j.created_at,
            company_name: j.employers.company_name,
            distance_km: calculateDistance(j.latitude, j.longitude),
          }))
          .filter((j: Job) => !j.distance_km || j.distance_km <= radius);
      }

      return (data || []).map((j: any) => ({
        id: j.id,
        employer_id: j.employer_id,
        title: j.title,
        description: j.description,
        salary_range: j.salary_range,
        job_type: j.job_type || 'Full-time',
        latitude: j.latitude,
        longitude: j.longitude,
        status: j.status as 'open' | 'closed',
        created_at: j.created_at,
        company_name: j.company_name,
        distance_km: j.distance_km,
      }));
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      return [];
    }
  }, [user, userLocation, radius, calculateDistance]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    const loadData = async () => {
      if (!userLocation) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [candidatesData, jobsData] = await Promise.all([
          fetchCandidates(),
          fetchJobs(),
        ]);

        setCandidates(candidatesData);
        setJobs(jobsData);
      } catch (err: any) {
        setError(err.message);
        toast.error('Failed to load map data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userLocation, radius, fetchCandidates, fetchJobs]);

  // Filter by search query
  const filteredCandidates = useMemo(() => {
    if (!searchQuery) return candidates;

    const query = searchQuery.toLowerCase();
    return candidates.filter(
      (candidate) =>
        candidate.full_name.toLowerCase().includes(query) ||
        candidate.job_title.toLowerCase().includes(query) ||
        candidate.skills.some((s) => s.toLowerCase().includes(query))
    );
  }, [candidates, searchQuery]);

  const filteredJobs = useMemo(() => {
    if (!searchQuery) return jobs;

    const query = searchQuery.toLowerCase();
    return jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(query) ||
        job.company_name.toLowerCase().includes(query) ||
        job.job_type.toLowerCase().includes(query)
    );
  }, [jobs, searchQuery]);

  return {
    candidates: filteredCandidates.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0)),
    jobs: filteredJobs.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0)),
    loading,
    error,
    refresh: useCallback(async () => {
      const [candidatesData, jobsData] = await Promise.all([
        fetchCandidates(),
        fetchJobs(),
      ]);
      setCandidates(candidatesData);
      setJobs(jobsData);
    }, [fetchCandidates, fetchJobs]),
  };
};
