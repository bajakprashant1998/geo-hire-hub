import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type HealthStatus = 'unknown' | 'healthy' | 'unavailable';

interface BackendHealth {
  status: HealthStatus;
  isHealthy: boolean;
  isUnavailable: boolean;
  lastChecked: number | null;
  check: () => Promise<boolean>;
}

/** Lightweight backend reachability probe — pings the auth endpoint once. */
export function useBackendHealth(): BackendHealth {
  const [status, setStatus] = useState<HealthStatus>('unknown');
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const inflightRef = useRef(false);

  const check = useCallback(async (): Promise<boolean> => {
    if (inflightRef.current) return status === 'healthy';
    inflightRef.current = true;
    try {
      // Use getSession as a lightweight ping — it always hits the auth server
      const { error } = await supabase.auth.getSession();
      const ok = !error || !isTransportError(error);
      setStatus(ok ? 'healthy' : 'unavailable');
      setLastChecked(Date.now());
      return ok;
    } catch {
      setStatus('unavailable');
      setLastChecked(Date.now());
      return false;
    } finally {
      inflightRef.current = false;
    }
  }, [status]);

  // Run once on mount
  useEffect(() => {
    check();
  }, [check]);

  return {
    status,
    isHealthy: status === 'healthy',
    isUnavailable: status === 'unavailable',
    lastChecked,
    check,
  };
}

/** Detect transport-level failures vs normal API errors */
export function isTransportError(error: unknown): boolean {
  if (!error) return false;
  const msg = (error as any)?.message || String(error);
  return (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Load failed') ||
    msg.includes('net::ERR_') ||
    msg.includes('TypeError: cancelled') ||
    msg.includes('CORS')
  );
}
