import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Users, Star, Briefcase, GraduationCap, Clock, Loader2, X, Plus,
  Trophy, TrendingUp, MapPin, Zap, Award, CheckCircle2, AlertCircle,
  ChevronDown, Sparkles, Target, UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
  city: string | null;
  bio: string | null;
  notice_period: string | null;
  remote_preference: string | null;
  profile: {
    full_name: string;
    avatar_url: string | null;
  };
}

const AVAILABILITY_COLORS: Record<string, string> = {
  available: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  open: 'bg-blue-500/10 text-blue-600 border-blue-200',
  not_available: 'bg-red-500/10 text-red-600 border-red-200',
};

interface CompareField {
  key: string;
  label: string;
  icon: any;
  highlight: boolean;
  format?: (v: any) => string;
  type?: 'tags' | 'status';
  best?: 'max' | 'count';
}

const COMPARE_FIELDS: CompareField[] = [
  { key: 'job_title', label: 'Current Role', icon: Briefcase, highlight: false },
  { key: 'experience_years', label: 'Experience', icon: TrendingUp, highlight: true, format: (v: any) => v ? `${v} year${v !== 1 ? 's' : ''}` : '—', best: 'max' },
  { key: 'expected_salary', label: 'Expected Salary', icon: Star, highlight: false, format: (v: any) => v || '—' },
  { key: 'availability_status', label: 'Availability', icon: Clock, highlight: false, type: 'status' },
  { key: 'notice_period', label: 'Notice Period', icon: Clock, highlight: false, format: (v: any) => v || '—' },
  { key: 'remote_preference', label: 'Work Mode', icon: MapPin, highlight: false, format: (v: any) => v ? v.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : '—' },
  { key: 'city', label: 'Location', icon: MapPin, highlight: false, format: (v: any) => v || '—' },
  { key: 'skills', label: 'Skills', icon: Zap, type: 'tags', highlight: true, best: 'count' },
  { key: 'certifications', label: 'Certifications', icon: GraduationCap, type: 'tags', highlight: true, best: 'count' },
];

function computeScore(c: CompareCandidate): number {
  let score = 0;
  if (c.experience_years) score += Math.min(c.experience_years * 5, 25);
  if (c.skills?.length) score += Math.min(c.skills.length * 3, 30);
  if (c.certifications?.length) score += c.certifications.length * 5;
  if (c.availability_status === 'available') score += 15;
  else if (c.availability_status === 'open') score += 10;
  if (c.bio) score += 5;
  if (c.city) score += 5;
  if (c.expected_salary) score += 5;
  return Math.min(score, 100);
}

function getBestForField(candidates: CompareCandidate[], field: typeof COMPARE_FIELDS[number]): string | null {
  if (!field.highlight || !field.best) return null;
  let bestId: string | null = null;
  let bestVal = -1;

  for (const c of candidates) {
    const val = (c as any)[field.key];
    let num = 0;
    if (field.best === 'max') num = typeof val === 'number' ? val : 0;
    if (field.best === 'count') num = Array.isArray(val) ? val.length : 0;
    if (num > bestVal) { bestVal = num; bestId = c.id; }
  }
  return bestVal > 0 ? bestId : null;
}

function findCommonSkills(candidates: CompareCandidate[]): string[] {
  if (candidates.length < 2) return [];
  const allSkills = candidates.map(c => new Set((c.skills || []).map(s => s.toLowerCase())));
  const common = [...allSkills[0]].filter(s => allSkills.every(set => set.has(s)));
  return common;
}

export const CandidateComparisonBoard = ({ employerId }: CandidateComparisonBoardProps) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [shortlisted, setShortlisted] = useState<CompareCandidate[]>([]);
  const [selected, setSelected] = useState<CompareCandidate[]>([]);
  const [loading, setLoading] = useState(false);

  const scores = useMemo(() => {
    const map: Record<string, number> = {};
    selected.forEach(c => { map[c.id] = computeScore(c); });
    return map;
  }, [selected]);

  const topCandidateId = useMemo(() => {
    if (selected.length < 2) return null;
    let best: string | null = null;
    let bestScore = -1;
    for (const c of selected) {
      if (scores[c.id] > bestScore) { bestScore = scores[c.id]; best = c.id; }
    }
    return best;
  }, [selected, scores]);

  const commonSkills = useMemo(() => findCommonSkills(selected), [selected]);

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
              id, job_title, experience_years, skills, education, expected_salary,
              availability_status, certifications, city, bio, notice_period, remote_preference,
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

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Candidate Comparison</h2>
            <p className="text-sm text-muted-foreground">Side-by-side analysis of your top applicants</p>
          </div>
        </div>
        {selected.length >= 2 && (
          <Badge className="gap-1.5 bg-primary/10 text-primary border-primary/20">
            <Trophy className="w-3 h-3" />
            {selected.length} candidates compared
          </Badge>
        )}
      </div>

      {/* Job Selector */}
      <Card className="border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium text-foreground">Job Position</Label>
            </div>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="w-full sm:max-w-md rounded-xl h-11">
                <SelectValue placeholder="Select a job to compare applicants..." />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedJob && shortlisted.length > 0 && (
              <Badge variant="secondary" className="shrink-0">
                {shortlisted.length} shortlisted
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading shortlisted candidates...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && selectedJobId && shortlisted.length === 0 && (
        <Card className="border-dashed border-border/60">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No candidates to compare</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Shortlist candidates from your applicant pipeline first, then come back to compare them side by side.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Job Selected */}
      {!loading && !selectedJobId && (
        <Card className="border-dashed border-border/60">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-primary/40" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Select a job position</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Choose one of your active job listings to view and compare shortlisted candidates.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && shortlisted.length > 0 && (
        <>
          {/* Candidate Picker */}
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                  Select Candidates to Compare
                  <span className="text-xs font-normal text-muted-foreground">(up to 4)</span>
                </CardTitle>
                {selected.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSelected([])} className="text-xs h-7">
                    Clear all
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {shortlisted.map((c, i) => {
                  const isSelected = !!selected.find((s) => s.id === c.id);
                  const score = computeScore(c);
                  return (
                    <motion.button
                      key={c.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => toggleCandidate(c)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border transition-all text-left group',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                          : 'border-border/40 hover:border-border hover:bg-muted/30'
                      )}
                    >
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={c.profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                            {c.profile.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                          >
                            <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                          </motion.div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{c.profile.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.job_title}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={cn(
                          'text-[11px] font-bold px-2 py-0.5 rounded-full',
                          score >= 70 ? 'bg-emerald-500/10 text-emerald-600' :
                          score >= 40 ? 'bg-amber-500/10 text-amber-600' :
                          'bg-muted text-muted-foreground'
                        )}>
                          {score}%
                        </span>
                        {!isSelected && (
                          <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selection prompt */}
          {selected.length > 0 && selected.length < 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 py-3">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <p className="text-sm text-muted-foreground">Select at least <strong>1 more</strong> candidate to start comparing</p>
            </motion.div>
          )}

          {/* Comparison View */}
          <AnimatePresence>
            {selected.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="space-y-4"
              >
                {/* Score Overview Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {selected.map((c, i) => {
                    const score = scores[c.id];
                    const isTop = c.id === topCandidateId;
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <Card className={cn(
                          'border-border/40 relative overflow-hidden',
                          isTop && 'border-primary/40 ring-1 ring-primary/10'
                        )}>
                          {isTop && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/50" />
                          )}
                          <CardContent className="p-4 text-center">
                            <div className="relative mx-auto w-fit mb-3">
                              <Avatar className="w-14 h-14">
                                <AvatarImage src={c.profile.avatar_url || undefined} />
                                <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                                  {c.profile.full_name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              {isTop && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
                                  <Trophy className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                            <p className="text-sm font-bold text-foreground truncate">{c.profile.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate mb-3">{c.job_title}</p>

                            {/* Score Ring */}
                            <div className="relative w-16 h-16 mx-auto">
                              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                                <circle cx="32" cy="32" r="28" fill="none" strokeWidth="4"
                                  className="stroke-muted" />
                                <circle cx="32" cy="32" r="28" fill="none" strokeWidth="4"
                                  strokeDasharray={`${score * 1.76} 176`}
                                  strokeLinecap="round"
                                  className={cn(
                                    score >= 70 ? 'stroke-emerald-500' :
                                    score >= 40 ? 'stroke-amber-500' : 'stroke-muted-foreground'
                                  )}
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold text-foreground">{score}</span>
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1.5">Match Score</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Common Skills */}
                {commonSkills.length > 0 && (
                  <Card className="border-border/40 bg-primary/[0.02]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">Shared Skills</span>
                        <Badge variant="secondary" className="text-[10px]">{commonSkills.length}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {commonSkills.map(s => (
                          <Badge key={s} className="text-xs bg-primary/10 text-primary border-primary/20 capitalize">{s}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Comparison Table */}
                <Card className="border-border/40 overflow-hidden">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      Detailed Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 mt-3">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-muted/30">
                            <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40 w-44">
                              Criteria
                            </th>
                            {selected.map((c) => (
                              <th key={c.id} className="p-3 border-b border-border/40 min-w-[180px]">
                                <div className="flex items-center justify-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage src={c.profile.avatar_url || undefined} />
                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                      {c.profile.full_name?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                                    {c.profile.full_name}
                                  </span>
                                  {c.id === topCandidateId && (
                                    <Trophy className="w-3 h-3 text-amber-500 shrink-0" />
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {COMPARE_FIELDS.map((field, rowIdx) => {
                            const bestId = getBestForField(selected, field);
                            return (
                              <tr key={field.key} className={cn(
                                'border-b border-border/20 transition-colors hover:bg-muted/20',
                                rowIdx % 2 === 0 && 'bg-muted/5'
                              )}>
                                <td className="p-3 text-sm text-muted-foreground font-medium">
                                  <div className="flex items-center gap-2">
                                    <field.icon className="w-4 h-4 shrink-0" />
                                    {field.label}
                                  </div>
                                </td>
                                {selected.map((c) => {
                                  const value = (c as any)[field.key];
                                  const isBest = bestId === c.id;
                                  return (
                                    <td key={c.id} className={cn(
                                      'p-3 text-center',
                                      isBest && 'bg-emerald-500/5'
                                    )}>
                                      {field.type === 'tags' ? (
                                        <div className="flex flex-wrap justify-center gap-1">
                                          {(value || []).slice(0, 6).map((tag: string, i: number) => (
                                            <Badge key={i} variant="secondary" className={cn(
                                              'text-[11px]',
                                              commonSkills.includes(tag.toLowerCase()) && field.key === 'skills' &&
                                              'bg-primary/10 text-primary border-primary/20'
                                            )}>
                                              {tag}
                                            </Badge>
                                          ))}
                                          {(value || []).length > 6 && (
                                            <Badge variant="outline" className="text-[10px]">
                                              +{(value || []).length - 6}
                                            </Badge>
                                          )}
                                          {(!value || value.length === 0) && (
                                            <span className="text-xs text-muted-foreground">—</span>
                                          )}
                                          {isBest && (
                                            <Trophy className="w-3 h-3 text-amber-500 ml-1" />
                                          )}
                                        </div>
                                      ) : field.type === 'status' ? (
                                        <Badge className={cn(
                                          'text-[11px] border',
                                          AVAILABILITY_COLORS[value || ''] || 'bg-muted text-muted-foreground'
                                        )}>
                                          {value ? value.replace(/_/g, ' ').replace(/\b\w/g, (ch: string) => ch.toUpperCase()) : '—'}
                                        </Badge>
                                      ) : (
                                        <div className="flex items-center justify-center gap-1.5">
                                          <span className="text-sm text-foreground">
                                            {field.format ? field.format(value) : value || '—'}
                                          </span>
                                          {isBest && <Trophy className="w-3 h-3 text-amber-500" />}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

function Label({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('text-sm font-medium', className)} {...props}>{children}</span>;
}
