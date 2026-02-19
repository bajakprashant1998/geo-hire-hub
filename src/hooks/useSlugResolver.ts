import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type EntityType = 'job' | 'candidate' | 'employer';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ResolvedEntity {
  id: string;
  slug: string | null;
  canonicalPath: string;
}

export const useSlugResolver = (identifier: string | undefined, type: EntityType) => {
  const [resolved, setResolved] = useState<ResolvedEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identifier) {
      setLoading(false);
      return;
    }

    const resolve = async () => {
      setLoading(true);
      setError(null);

      try {
        const isUUID = UUID_REGEX.test(identifier);

        if (type === 'job') {
          const query = supabase
            .from('jobs')
            .select('id, slug, location_country, location_state, location_city')
            .limit(1);

          const { data, error: dbError } = isUUID
            ? await query.eq('id', identifier).maybeSingle()
            : await query.eq('slug', identifier).maybeSingle();

          if (dbError) throw dbError;
          if (!data) { setError('not_found'); setLoading(false); return; }

          const pathParts = ['/jobs'];
          if (data.location_country) pathParts.push(data.location_country.toLowerCase().replace(/\s+/g, '-'));
          if (data.location_state) pathParts.push(data.location_state.toLowerCase().replace(/\s+/g, '-'));
          if (data.location_city) pathParts.push(data.location_city.toLowerCase().replace(/\s+/g, '-'));
          pathParts.push(data.slug || data.id);

          setResolved({ id: data.id, slug: data.slug, canonicalPath: pathParts.join('/') });
        } else if (type === 'candidate') {
          const query = supabase
            .from('candidates')
            .select('id, profiles!inner(id, slug, location_country, location_state, location_city)')
            .limit(1);

          const { data, error: dbError } = isUUID
            ? await query.eq('id', identifier).maybeSingle()
            : await query.eq('profiles.slug', identifier).maybeSingle();

          if (dbError) throw dbError;
          if (!data) { setError('not_found'); setLoading(false); return; }

          const profile = data.profiles as any;
          const pathParts = ['/candidates'];
          if (profile.location_country) pathParts.push(profile.location_country.toLowerCase().replace(/\s+/g, '-'));
          if (profile.location_state) pathParts.push(profile.location_state.toLowerCase().replace(/\s+/g, '-'));
          if (profile.location_city) pathParts.push(profile.location_city.toLowerCase().replace(/\s+/g, '-'));
          pathParts.push(profile.slug || data.id);

          setResolved({ id: data.id, slug: profile.slug, canonicalPath: pathParts.join('/') });
        } else if (type === 'employer') {
          const query = supabase
            .from('employers')
            .select('id, slug, location_country, location_state, location_city')
            .limit(1);

          const { data, error: dbError } = isUUID
            ? await query.eq('id', identifier).maybeSingle()
            : await query.eq('slug', identifier).maybeSingle();

          if (dbError) throw dbError;
          if (!data) { setError('not_found'); setLoading(false); return; }

          const pathParts = ['/companies'];
          if (data.location_country) pathParts.push(data.location_country.toLowerCase().replace(/\s+/g, '-'));
          if (data.location_state) pathParts.push(data.location_state.toLowerCase().replace(/\s+/g, '-'));
          if (data.location_city) pathParts.push(data.location_city.toLowerCase().replace(/\s+/g, '-'));
          pathParts.push(data.slug || data.id);

          setResolved({ id: data.id, slug: data.slug, canonicalPath: pathParts.join('/') });
        }
      } catch (err: any) {
        console.error('Slug resolver error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    resolve();
  }, [identifier, type]);

  return { resolved, loading, error };
};
