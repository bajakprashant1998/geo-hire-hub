import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Star, Briefcase, GraduationCap, Clock, Loader2, X, Plus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CandidateComparisonBoardProps {
  employerId: string;
}

interface CompareCandidate {
  id: string;
  job_title: string;
  experience_years: number | null;
  skills: string[] | null;
  education: any;
  expected_salary: string | null;
  availability_status: string | null;
  certifications: string[] | null;
  profile: {
    full_name: string;
    avatar_url: string | null;
  };
}

export const CandidateComparisonBoard = ({ employerId }: CandidateComparisonBoardProps) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [shortlisted, setShortlisted] = useState<CompareCandidate[]>([]);
  const [selected, setSelected] = useState<CompareCandidate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('employer_id', employerId)
        .eq('is_active', true);
      setJobs(data || []);
    };
    fetchJobs();
  }, [employerId]);

  useEffect(() => {
    if (!selectedJobId) return;
    const fetchShortlisted = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('applications')
          .select(`
            candidate_id,
            candidates (
              id, job_title, experience_years, skills, education, expected_salary, availability_status, certifications,
              profiles!candidates_profile_id_fkey (full_name, avatar_url)
            )
          `)
          .eq('job_id', selectedJobId)
          .in('kanban_stage', ['shortlisted', 'reviewing', 'interview']);

        if (error) throw error;

        const candidates = (data || [])
          .map((a: any) => ({
            ...a.candidates,
            profile: a.candidates?.profiles,
          }))
          .filter((c: any) => c && c.profile);

        setShortlisted(candidates);
        setSelected([]);
      } catch {
        toast.error('Failed to load candidates');
      } finally {
        setLoading(false);
      }
    };
    fetchShortlisted();
  }, [selectedJobId]);

  const toggleCandidate = (c: CompareCandidate) => {
    if (selected.find((s) => s.id === c.id)) {
      setSelected(selected.filter((s) => s.id !== c.id));
    } else if (selected.length < 4) {
      setSelected([...selected, c]);
    } else {
      toast.error('You can compare up to 4 candidates');
    }
  };

  const COMPARE_FIELDS = [
    { key: 'job_title', label: 'Current Role', icon: Briefcase },
    { key: 'experience_years', label: 'Experience', icon: Clock, format: (v: any) => v ? `${v} years` : '—' },
    { key: 'expected_salary', label: 'Expected Salary', icon: Star, format: (v: any) => v || '—' },
    { key: 'availability_status', label: 'Availability', icon: Clock, format: (v: any) => v || '—' },
    { key: 'skills', label: 'Skills', icon: Star, type: 'tags' },
    { key: 'certifications', label: 'Certifications', icon: GraduationCap, type: 'tags' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Candidate Comparison Board</h2>
          <p className="text-sm text-muted-foreground">Compare shortlisted candidates side by side</p>
        </div>
      </div>

      <Select value={selectedJobId} onValueChange={setSelectedJobId}>
        <SelectTrigger className="w-full max-w-md rounded-xl">
          <SelectValue placeholder="Select a job to compare applicants" />
        </SelectTrigger>
        <SelectContent>
          {jobs.map((j) => (
            <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && selectedJobId && shortlisted.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No shortlisted candidates for this job yet</p>
          </CardContent>
        </Card>
      )}

      {!loading && shortlisted.length > 0 && (
        <>
          {/* Candidate Selection */}
          <div className="flex flex-wrap gap-2">
            {shortlisted.map((c) => {
              const isSelected = selected.find((s) => s.id === c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCandidate(c)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border/40 hover:border-border'
                  )}
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={c.profile.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{c.profile.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-foreground font-medium">{c.profile.full_name}</span>
                  {isSelected ? <X className="w-3 h-3 text-primary" /> : <Plus className="w-3 h-3 text-muted-foreground" />}
                </button>
              );
            })}
          </div>

          {/* Comparison Table */}
          {selected.length >= 2 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold text-muted-foreground border-b border-border/40 w-40">Field</th>
                    {selected.map((c) => (
                      <th key={c.id} className="p-3 border-b border-border/40 min-w-[200px]">
                        <div className="flex flex-col items-center gap-2">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={c.profile.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">{c.profile.full_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-semibold text-foreground">{c.profile.full_name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_FIELDS.map((field) => (
                    <tr key={field.key} className="border-b border-border/20">
                      <td className="p-3 text-sm text-muted-foreground font-medium">
                        <div className="flex items-center gap-2">
                          <field.icon className="w-4 h-4" />
                          {field.label}
                        </div>
                      </td>
                      {selected.map((c) => {
                        const value = (c as any)[field.key];
                        return (
                          <td key={c.id} className="p-3 text-center">
                            {field.type === 'tags' ? (
                              <div className="flex flex-wrap justify-center gap-1">
                                {(value || []).slice(0, 5).map((tag: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                                ))}
                                {(value || []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                              </div>
                            ) : (
                              <span className="text-sm text-foreground">
                                {field.format ? field.format(value) : value || '—'}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selected.length < 2 && selected.length > 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Select at least 2 candidates to compare</p>
          )}
        </>
      )}
    </div>
  );
};
