import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database, Search, Loader2, UserPlus, MessageSquare, Star, Clock, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TalentPoolCRMProps {
  employerId: string;
}

interface PoolCandidate {
  id: string;
  candidate_id: string;
  created_at: string;
  candidate: {
    id: string;
    job_title: string;
    experience_years: number | null;
    skills: string[] | null;
    profile: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  application_status: string;
  job_title: string;
}

export const TalentPoolCRM = ({ employerId }: TalentPoolCRMProps) => {
  const [candidates, setCandidates] = useState<PoolCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'rejected' | 'withdrawn'>('all');

  useEffect(() => {
    const fetchPool = async () => {
      try {
        // Get all past applicants who were rejected or withdrew — potential future hires
        const { data, error } = await supabase
          .from('applications')
          .select(`
            id, candidate_id, created_at, status, kanban_stage,
            jobs!applications_job_id_fkey (title, employer_id),
            candidates!applications_candidate_id_fkey (
              id, job_title, experience_years, skills,
              profiles!candidates_profile_id_fkey (full_name, avatar_url)
            )
          `)
          .in('status', ['rejected', 'withdrawn', 'closed'])
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        const filtered = (data || [])
          .filter((a: any) => a.jobs?.employer_id === employerId && a.candidates?.profiles)
          .map((a: any) => ({
            id: a.id,
            candidate_id: a.candidate_id,
            created_at: a.created_at,
            candidate: {
              id: a.candidates.id,
              job_title: a.candidates.job_title,
              experience_years: a.candidates.experience_years,
              skills: a.candidates.skills,
              profile: a.candidates.profiles,
            },
            application_status: a.status,
            job_title: a.jobs?.title || '',
          }));

        // Deduplicate by candidate_id
        const unique = filtered.filter(
          (c: PoolCandidate, i: number, arr: PoolCandidate[]) =>
            arr.findIndex((x) => x.candidate_id === c.candidate_id) === i
        );

        setCandidates(unique);
      } catch {
        toast.error('Failed to load talent pool');
      } finally {
        setLoading(false);
      }
    };
    fetchPool();
  }, [employerId]);

  const filteredCandidates = candidates.filter((c) => {
    const matchSearch = !search || 
      c.candidate.profile.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.candidate.job_title.toLowerCase().includes(search.toLowerCase()) ||
      (c.candidate.skills || []).some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || c.application_status === filter;
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Database className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Talent Pool CRM</h2>
          <p className="text-sm text-muted-foreground">Save promising candidates for future opportunities</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, title, or skills..."
            className="pl-10 rounded-xl"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'rejected', 'withdrawn'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="rounded-xl capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{candidates.length}</p>
            <p className="text-xs text-muted-foreground">Total in Pool</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {candidates.filter(c => c.application_status === 'rejected').length}
            </p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {candidates.filter(c => c.application_status === 'withdrawn').length}
            </p>
            <p className="text-xs text-muted-foreground">Withdrawn</p>
          </CardContent>
        </Card>
      </div>

      {/* Candidates List */}
      {filteredCandidates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{candidates.length === 0 ? 'No past applicants in your talent pool yet' : 'No candidates match your search'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredCandidates.map((c) => (
            <Card key={c.id} className="border-border/40 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={c.candidate.profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {c.candidate.profile.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-foreground truncate">{c.candidate.profile.full_name}</h3>
                      <Badge variant={c.application_status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {c.application_status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Briefcase className="w-3 h-3" /> {c.candidate.job_title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Applied for: {c.job_title}
                    </p>
                    {c.candidate.skills && c.candidate.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.candidate.skills.slice(0, 4).map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(c.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
