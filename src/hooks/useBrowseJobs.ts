import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const PAGE_SIZE = 20;

const QUERY_FIELDS =
  'id, title, job_type, salary_range, created_at, job_address, slug, location_country, location_state, location_city, expires_at, description, employers!inner(company_name, industry, slug)';

export function useBrowseJobs() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [jobType, setJobType] = useState(searchParams.get('type') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(
    (searchParams.get('view') as 'list' | 'grid') || 'list'
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
    setSearchParams(params, { replace: true });
  }, [search, jobType, sortBy, viewMode, setSearchParams]);

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

    const { data, count, error } = await query;
    if (token !== abortRef.current) return; // stale

    if (!error) {
      setJobs(reset ? (data || []) : prev => [...prev, ...(data || [])]);
      setTotal(count || 0);
      setHasMore((data?.length || 0) === PAGE_SIZE);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [page, debouncedSearch, jobType, sortBy]);

  useEffect(() => {
    fetchJobs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, jobType, sortBy]);

  const loadMore = useCallback(() => {
    setPage(p => {
      const next = p + 1;
      // Trigger fetch after state update
      setTimeout(() => fetchJobs(false), 0);
      return next;
    });
  }, [fetchJobs]);

  const clearAllFilters = useCallback(() => {
    setSearch('');
    setJobType('all');
  }, []);

  return {
    search, setSearch,
    jobType, setJobType,
    sortBy, setSortBy,
    viewMode, setViewMode,
    jobs, loading, loadingMore, hasMore, total,
    debouncedSearch,
    loadMore, clearAllFilters,
  };
}
