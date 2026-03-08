import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PortfolioShowcase } from '@/components/candidate/PortfolioShowcase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SEOHead } from '@/components/SEOHead';

const CandidatePortfolio = () => {
  const { id } = useParams<{ id: string }>();
  const [candidate, setCandidate] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      const { data: c } = await supabase
        .from('candidates')
        .select('id, job_title, profile_id')
        .eq('id', id)
        .maybeSingle();
      if (c) {
        setCandidate(c);
        const { data: p } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', c.profile_id)
          .maybeSingle();
        if (p) setProfile(p);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Portfolio not found</p>
          <Link to="/">
            <Button variant="outline" className="mt-4 rounded-xl">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`${profile?.full_name || 'Candidate'}'s Portfolio`}
        description={`View ${profile?.full_name || 'candidate'}'s portfolio showcasing projects and case studies.`}
      />
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/80">
        <header className="border-b border-border/40 bg-card/50 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
            <Link to={`/candidates/${id}`}>
              <Button variant="ghost" size="sm" className="rounded-xl gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Profile
              </Button>
            </Link>
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm text-foreground">{profile?.full_name}</p>
                <p className="text-[11px] text-muted-foreground">{candidate.job_title}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">
          <PortfolioShowcase candidateId={candidate.id} readOnly />
        </main>
      </div>
    </>
  );
};

export default CandidatePortfolio;
