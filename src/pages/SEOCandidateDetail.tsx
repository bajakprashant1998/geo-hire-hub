import { useParams, Navigate } from 'react-router-dom';
import { useSlugResolver } from '@/hooks/useSlugResolver';
import CandidateDetail from './CandidateDetail';

const SEOCandidateDetail = () => {
  const params = useParams();
  const slug = params.slug || params['*']?.split('/').pop();
  
  const { resolved, loading } = useSlugResolver(slug, 'candidate');

  if (loading) return null;
  if (!resolved) return <CandidateDetail />;

  const currentPath = window.location.pathname;
  if (currentPath !== resolved.canonicalPath && resolved.slug) {
    return <Navigate to={resolved.canonicalPath + window.location.search} replace />;
  }

  return <CandidateDetail />;
};

export default SEOCandidateDetail;
