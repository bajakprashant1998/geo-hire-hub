import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface JobMatch {
  id: string;
  job_id: string;
  match_score: number;
  match_reasons: string[];
  skill_overlap: string[];
  missing_skills: string[];
  location_match: boolean;
  experience_match: boolean;
  salary_match: boolean;
  job?: {
    id: string;
    title: string;
    salary_range: string | null;
    job_type: string | null;
    job_address: string | null;
    created_at: string;
    employers: {
      company_name: string;
    };
  };
}

export const useJobMatches = (candidateId: string | null) => {
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const fetchMatches = useCallback(async () => {
    if (!candidateId) {
      setMatches([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('job_matches')
        .select(`
          *,
          job:jobs(
            id,
            title,
            salary_range,
            job_type,
            job_address,
            created_at,
            employers(company_name)
          )
        `)
        .eq('candidate_id', candidateId)
        .order('match_score', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Parse JSONB fields
      const parsedMatches = (data || []).map(match => ({
        ...match,
        match_reasons: Array.isArray(match.match_reasons) 
          ? match.match_reasons 
          : JSON.parse(match.match_reasons as string || '[]'),
      }));

      setMatches(parsedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  const calculateMatches = useCallback(async (jobId?: string) => {
    if (!candidateId) return;

    setCalculating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-job-match`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ candidateId, jobId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to calculate matches');
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Analyzed ${data.matches?.length || 0} job matches`);
        await fetchMatches();
      }
    } catch (error) {
      console.error('Error calculating matches:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to calculate matches');
    } finally {
      setCalculating(false);
    }
  }, [candidateId, fetchMatches]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return {
    matches,
    loading,
    calculating,
    calculateMatches,
    refetch: fetchMatches,
  };
};
