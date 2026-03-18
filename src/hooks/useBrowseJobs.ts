import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const PAGE_SIZE = 20;

const QUERY_FIELDS =
  'id, title, job_type, salary_range, salary_min, salary_max, experience_level, is_remote, created_at, job_address, slug, location_country, location_state, location_city, expires_at, description, employers!inner(company_name, industry, slug)';

export function useBrowseJobs() {
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [jobType, setJobType] = useState(searchParams.get('type') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(
    (searchParams.get('view') as 'list' | 'grid') || 'list'
  );
  const [isRemote, setIsRemote] = useState(searchParams.get('remote') === 'true');
  const [experienceLevel, setExperienceLevel] = useState(searchParams.get('exp') || 'all');
  const [salaryMin, setSalaryMin] = useState<number | null>(
    searchParams.get('salMin') ? Number(searchParams.get('salMin')) : null
  );
  const [salaryMax, setSalaryMax] = useState<number | null>(
    searchParams.get('salMax') ? Number(searchParams.get('salMax')) : null
  );

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const abortRef = useRef(0);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Sync filters → URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (jobType !== 'all') params.set('type', jobType);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (viewMode !== 'list') params.set('view', viewMode);
    if (isRemote) params.set('remote', 'true');
    if (experienceLevel !== 'all') params.set('exp', experienceLevel);
    if (salaryMin) params.set('salMin', String(salaryMin));
    if (salaryMax) params.set('salMax', String(salaryMax));
    setSearchParams(params, { replace: true });
  }, [search, jobType, sortBy, viewMode, isRemote, experienceLevel, salaryMin, salaryMax, setSearchParams]);

  // Fetch jobs (reset = new search)
  const fetchJobs = useCallback(async (reset = false) => {
    const token = ++abortRef.current;
    const currentPage = reset ? 0 : page;
    if (reset) setPage(0);
    reset ? setLoading(true) : setLoadingMore(true);

    let query = supabase
      .from('jobs')
      .select(QUERY_FIELDS, { count: 'exact' })
      .eq('status', 'open')
      .eq('is_active', true)
      .order('created_at', { ascending: sortBy === 'oldest' })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (debouncedSearch) {
      query = query.or(`title.ilike.%${debouncedSearch}%,job_address.ilike.%${debouncedSearch}%`);
    }
    if (jobType !== 'all') {
      query = query.eq('job_type', jobType);
    }
    if (isRemote) {
      query = query.eq('is_remote', true);
    }
    if (experienceLevel !== 'all') {
      query = query.eq('experience_level', experienceLevel);
    }
    if (salaryMin !== null) {
      query = query.gte('salary_min', salaryMin);
    }
    if (salaryMax !== null) {
      query = query.lte('salary_max', salaryMax);
    }

    // Filter out expired jobs
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    const { data, count, error } = await query;
    if (token !== abortRef.current) return; // stale

    if (!error) {
      setJobs(reset ? (data || []) : prev => [...prev, ...(data || [])]);
      setTotal(count || 0);
      setHasMore((data?.length || 0) === PAGE_SIZE);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [page, debouncedSearch, jobType, sortBy, isRemote, experienceLevel, salaryMin, salaryMax]);

  useEffect(() => {
    fetchJobs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, jobType, sortBy, isRemote, experienceLevel, salaryMin, salaryMax]);

  // Trigger fetch when page increments (loadMore)
  useEffect(() => {
    if (page > 0) fetchJobs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearch('');
    setJobType('all');
    setIsRemote(false);
    setExperienceLevel('all');
    setSalaryMin(null);
    setSalaryMax(null);
  }, []);

  const activeFilterCount =
    (jobType !== 'all' ? 1 : 0) +
    (isRemote ? 1 : 0) +
    (experienceLevel !== 'all' ? 1 : 0) +
    (salaryMin !== null ? 1 : 0) +
    (salaryMax !== null ? 1 : 0);

  // Batch-fetch saved job IDs once for the current user
  const fetchSavedJobIds = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavedJobIds(new Set()); return; }
    const { data: profileData } = await supabase.from('profiles').select('id, user_type').eq('user_id', user.id).maybeSingle();
    if (!profileData || profileData.user_type !== 'candidate') { setSavedJobIds(new Set()); return; }
    const { data: cand } = await supabase.from('candidates').select('id').eq('profile_id', profileData.id).maybeSingle();
    if (!cand) { setSavedJobIds(new Set()); return; }
    const { data: saved } = await supabase.from('saved_jobs').select('job_id').eq('candidate_id', cand.id);
    setSavedJobIds(new Set((saved || []).map(s => s.job_id)));
  }, []);

  useEffect(() => { fetchSavedJobIds(); }, [fetchSavedJobIds]);

  return {
    search, setSearch,
    jobType, setJobType,
    sortBy, setSortBy,
    viewMode, setViewMode,
    isRemote, setIsRemote,
    experienceLevel, setExperienceLevel,
    salaryMin, setSalaryMin,
    salaryMax, setSalaryMax,
    jobs, loading, loadingMore, hasMore, total,
    debouncedSearch, activeFilterCount,
    loadMore, clearAllFilters,
    savedJobIds, refreshSavedJobIds: fetchSavedJobIds,
  };
}
