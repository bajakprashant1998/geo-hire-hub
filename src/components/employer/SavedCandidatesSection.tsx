import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Users,
  Briefcase,
  Clock,
  BookmarkX,
  MessageSquare,
  ExternalLink,
  Loader2,
} from 'lucide-react';

interface SavedCandidate {
  id: string;
  candidate_id: string;
  created_at: string;
  candidate: {
    id: string;
    job_title: string;
    experience_years: number | null;
    skills: string[] | null;
    profile: {
      id: string;
      full_name: string;
      avatar_url: string | null;
      user_id: string;
    };
  };
}

interface SavedCandidatesSectionProps {
  employerId: string;
}

export const SavedCandidatesSection = ({ employerId }: SavedCandidatesSectionProps) => {
  const [savedCandidates, setSavedCandidates] = useState<SavedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSavedCandidates = async () => {
      try {
        const { data, error } = await supabase
          .from('saved_candidates')
          .select(`
            id,
            candidate_id,
            created_at,
            candidates (
              id,
              job_title,
              experience_years,
              skills,
              profiles!candidates_profile_id_fkey (
                id,
                full_name,
                avatar_url,
                user_id
              )
            )
          `)
          .eq('employer_id', employerId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform the data structure
        const transformed = (data || []).map((item: any) => ({
          id: item.id,
          candidate_id: item.candidate_id,
          created_at: item.created_at,
          candidate: {
            id: item.candidates.id,
            job_title: item.candidates.job_title,
            experience_years: item.candidates.experience_years,
            skills: item.candidates.skills,
            profile: item.candidates.profiles,
          },
        }));

        setSavedCandidates(transformed);
      } catch (error) {
        console.error('Error fetching saved candidates:', error);
        toast.error('Failed to load saved candidates');
      } finally {
        setLoading(false);
      }
    };

    fetchSavedCandidates();
  }, [employerId]);

  const handleRemove = async (savedId: string) => {
    setRemovingId(savedId);
    try {
      const { error } = await supabase
        .from('saved_candidates')
        .delete()
        .eq('id', savedId);

      if (error) throw error;

      setSavedCandidates(prev => prev.filter(sc => sc.id !== savedId));
      toast.success('Candidate removed from saved list');
    } catch (error) {
      console.error('Error removing saved candidate:', error);
      toast.error('Failed to remove candidate');
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card className="shadow-google">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
          <p className="text-muted-foreground mt-2">Loading saved candidates...</p>
        </CardContent>
      </Card>
    );
  }

  if (savedCandidates.length === 0) {
    return (
      <Card className="shadow-google">
        <CardContent className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-2">No saved candidates yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Browse candidates on the map and save them to view here
          </p>
          <Link to="/">
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Browse Candidates
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-google">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Saved Candidates ({savedCandidates.length})
          </CardTitle>
          <CardDescription>
            Candidates you've saved from the map for later review
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {savedCandidates.map((saved) => (
          <Card key={saved.id} className="shadow-google hover:shadow-google-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={saved.candidate.profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(saved.candidate.profile.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">
                    {saved.candidate.profile.full_name}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {saved.candidate.job_title}
                  </p>
                  {saved.candidate.experience_years && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {saved.candidate.experience_years} years experience
                    </p>
                  )}
                </div>
              </div>

              {/* Skills */}
              {saved.candidate.skills && saved.candidate.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {saved.candidate.skills.slice(0, 4).map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {saved.candidate.skills.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{saved.candidate.skills.length - 4}
                    </Badge>
                  )}
                </div>
              )}

              {/* Saved date */}
              <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Saved {formatDate(saved.created_at)}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                <Link to={`/candidates/${saved.candidate.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View Profile
                  </Button>
                </Link>
                <Link to={`/messages?user=${saved.candidate.profile.user_id}`}>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="w-3 h-3" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(saved.id)}
                  disabled={removingId === saved.id}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {removingId === saved.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <BookmarkX className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
