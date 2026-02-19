import { useParams, Navigate } from 'react-router-dom';
import { useSlugResolver } from '@/hooks/useSlugResolver';
import EmployerDetail from './EmployerDetail';

const SEOEmployerDetail = () => {
  const params = useParams();
  const slug = params.slug || params['*']?.split('/').pop();
  
  const { resolved, loading } = useSlugResolver(slug, 'employer');

  if (loading) return null;
  if (!resolved) return <EmployerDetail />;

  const currentPath = window.location.pathname;
  if (currentPath !== resolved.canonicalPath && resolved.slug) {
    return <Navigate to={resolved.canonicalPath + window.location.search} replace />;
  }

  return <EmployerDetail />;
};

export default SEOEmployerDetail;
