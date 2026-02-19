import { useParams, Navigate } from 'react-router-dom';
import { useSlugResolver } from '@/hooks/useSlugResolver';
import JobDetail from './JobDetail';

/**
 * SEO wrapper for JobDetail that resolves slug-based URLs
 * Supports: /jobs/:slug, /jobs/:country/:slug, /jobs/:country/:state/:slug, /jobs/:country/:state/:city/:slug
 */
const SEOJobDetail = () => {
  const params = useParams<{ slug: string; country?: string; state?: string; city?: string }>();
  const slug = params.slug || params['*']?.split('/').pop();
  
  const { resolved, loading, error } = useSlugResolver(slug, 'job');

  if (loading) return null; // JobDetail has its own skeleton
  if (error === 'not_found' || !resolved) return <JobDetail />;

  // If accessed via UUID, redirect to canonical SEO URL
  const currentPath = window.location.pathname;
  if (currentPath !== resolved.canonicalPath && resolved.slug) {
    return <Navigate to={resolved.canonicalPath + window.location.search} replace />;
  }

  return <JobDetail />;
};

export default SEOJobDetail;
