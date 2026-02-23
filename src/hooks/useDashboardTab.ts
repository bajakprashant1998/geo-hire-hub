import { useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

/**
 * Hook that syncs dashboard active tab with URL search params.
 * Each tab change pushes a new history entry so browser back/forward works.
 */
export function useDashboardTab() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeSection = searchParams.get('tab') || null;

  const setActiveSection = useCallback((value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value === null || value === 'home') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    const qs = params.toString();
    // Push (not replace) so browser back works
    navigate(qs ? `?${qs}` : '.', { replace: false });
  }, [searchParams, navigate]);

  return { activeSection, setActiveSection };
}
