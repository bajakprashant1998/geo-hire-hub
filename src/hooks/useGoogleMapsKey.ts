import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useGoogleMapsKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchApiKey() {
      try {
        // Allow overriding the key with a local environment variable during local development
        const localKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (localKey) {
          setApiKey(localKey);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('get-google-maps-key');

        if (error) throw error;

        if (data?.apiKey) {
          setApiKey(data.apiKey);
        } else {
          throw new Error('No API key returned');
        }
      } catch (err: any) {
        console.error('Failed to fetch Google Maps API key:', err);
        setError(err.message || 'Failed to load map');
      } finally {
        setLoading(false);
      }
    }

    fetchApiKey();
  }, []);

  return { apiKey, loading, error };
}
