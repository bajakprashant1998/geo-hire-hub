import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const toStorageCandidates = (raw: string, userId: string | null) => {
  const clean = raw.split('?')[0].split('#')[0].replace(/^\/+/, '');
  const attempts: string[] = [];

  if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
    attempts.push(clean);

    if (userId && !clean.includes('/')) {
      attempts.push(`${userId}/${clean}`);
    }

    if (clean.startsWith('candidates/')) {
      const fileName = clean.split('/').pop();
      if (userId && fileName) attempts.push(`${userId}/${fileName}`);
    }
  }

  return [...new Set(attempts)];
};

const CandidateResumeRedirect = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const resolveResume = async () => {
      if (!id) {
        navigate('/', { replace: true });
        return;
      }

      try {
        const { data: candidate, error } = await supabase
          .from('candidates')
          .select('resume_url, profiles!inner(user_id)')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;

        if (!candidate?.resume_url) {
          toast.info('Resume not available');
          navigate(`/candidates/${id}`, { replace: true });
          return;
        }

        const resumeUrl = candidate.resume_url;
        if (resumeUrl.startsWith('http://') || resumeUrl.startsWith('https://')) {
          window.location.replace(resumeUrl);
          return;
        }

        const userId = (candidate.profiles as { user_id?: string } | null)?.user_id || null;
        const attempts = toStorageCandidates(resumeUrl, userId);

        for (const path of attempts) {
          const { data: signed, error: signedError } = await supabase.storage
            .from('resumes')
            .createSignedUrl(path, 300);

          if (!signedError && signed?.signedUrl) {
            window.location.replace(signed.signedUrl);
            return;
          }

          const { data: publicUrlData } = supabase.storage.from('resumes').getPublicUrl(path);
          if (publicUrlData?.publicUrl) {
            window.location.replace(publicUrlData.publicUrl);
            return;
          }
        }

        toast.error('Resume file could not be resolved');
        navigate(`/candidates/${id}`, { replace: true });
      } catch (err) {
        console.error('Error resolving candidate resume:', err);
        toast.error('Failed to download resume');
        navigate(`/candidates/${id}`, { replace: true });
      }
    };

    resolveResume();
  }, [id, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Preparing resume download...</span>
      </div>
    </div>
  );
};

export default CandidateResumeRedirect;
