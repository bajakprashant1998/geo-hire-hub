import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Database, Search, Loader2, MessageSquare, Star, Clock, Briefcase,
  Users, TrendingUp, Zap, Filter, X, ChevronRight, UserCheck,
  CalendarDays, ArrowUpRight, Sparkles, RotateCcw, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

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
    availability_status: string | null;
    city: string | null;
    profile: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  application_status: string;
  job_title: string;
}

type StatusFilter = 'all' | 'rejected' | 'withdrawn' | 'closed';
type SortMode = 'recent' | 'experience' | 'skills';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof RotateCcw }> = {
  rejected: { label: 'Not Selected', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: X },
  withdrawn: { label: 'Withdrew', color: 'bg-amber-500/10 text-amber-600 border-amber-200', icon: RotateCcw },
  closed: { label: 'Position Closed', color: 'bg-muted text-muted-foreground border-border', icon: Clock },
};

export const TalentPoolCRM = ({ employerId }: TalentPoolCRMProps) => {
  const [candidates, setCandidates] = useState<PoolCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPool = async () => {
      try {
        const { data, error } = await supabase
          .from('applications')
          .select(`
            id, candidate_id, created_at, status, kanban_stage,
            jobs!applications_job_id_fkey (title, employer_id),
            candidates!applications_candidate_id_fkey (
              id, job_title, experience_years, skills, availability_status, city,
              profiles!candidates_profile_id_fkey (full_name, avatar_url)
            )
          `)
          .in('status', ['rejected', 'withdrawn', 'closed'])
          .order('created_at', { ascending: false })
          .limit(200);

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
              availability_status: a.candidates.availability_status,
              city: a.candidates.city,
              profile: a.candidates.profiles,
            },
            application_status: a.status,
            job_title: a.jobs?.title || '',
          }));

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

  // Extract top skills across pool
  const topSkills = useMemo(() => {
    const skillCount: Record<string, number> = {};
    candidates.forEach(c => {
      (c.candidate.skills || []).forEach(s => {
        skillCount[s] = (skillCount[s] || 0) + 1;
      });
    });
    return Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([skill, count]) => ({ skill, count }));
  }, [candidates]);

  const stats = useMemo(() => ({
    total: candidates.length,
    rejected: candidates.filter(c => c.application_status === 'rejected').length,
    withdrawn: candidates.filter(c => c.application_status === 'withdrawn').length,
    closed: candidates.filter(c => c.application_status === 'closed').length,
    avgExp: candidates.length > 0
      ? (candidates.reduce((s, c) => s + (c.candidate.experience_years || 0), 0) / candidates.length).toFixed(1)
      : '0',
    available: candidates.filter(c => c.candidate.availability_status === 'available').length,
  }), [candidates]);

  const filteredCandidates = useMemo(() => {
    let result = candidates.filter((c) => {
      const matchSearch = !search ||
        c.candidate.profile.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.candidate.job_title.toLowerCase().includes(search.toLowerCase()) ||
        (c.candidate.skills || []).some(s => s.toLowerCase().includes(search.toLowerCase()));
      const matchFilter = filter === 'all' || c.application_status === filter;
      const matchSkills = selectedSkills.length === 0 ||
        selectedSkills.every(sk => (c.candidate.skills || []).some(s => s.toLowerCase() === sk.toLowerCase()));
      return matchSearch && matchFilter && matchSkills;
    });

    if (sortMode === 'experience') {
      result.sort((a, b) => (b.candidate.experience_years || 0) - (a.candidate.experience_years || 0));
    } else if (sortMode === 'skills') {
      result.sort((a, b) => (b.candidate.skills?.length || 0) - (a.candidate.skills?.length || 0));
    }
    // 'recent' is already default order

    return result;
  }, [candidates, search, filter, selectedSkills, sortMode]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const hasActiveFilters = filter !== 'all' || selectedSkills.length > 0 || search;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading talent pool...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Talent Pool</h2>
            <p className="text-sm text-muted-foreground">Re-engage promising past applicants for new roles</p>
          </div>
        </div>
        {stats.available > 0 && (
          <Badge className="gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-200">
            <Zap className="w-3 h-3" />
            {stats.available} currently available
          </Badge>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Pool', value: stats.total, icon: Users, color: 'bg-primary/10 text-primary' },
          { label: 'Not Selected', value: stats.rejected, icon: UserCheck, color: 'bg-destructive/10 text-destructive' },
          { label: 'Withdrew', value: stats.withdrawn, icon: RotateCcw, color: 'bg-amber-500/10 text-amber-600' },
          { label: 'Avg Experience', value: `${stats.avgExp}y`, icon: TrendingUp, color: 'bg-blue-500/10 text-blue-600' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-border/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', stat.color)}>
                    <stat.icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters */}
      <Card className="border-border/40">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, role, or skills..."
                className="pl-10 h-11 rounded-xl"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'rejected', 'withdrawn', 'closed'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className="rounded-xl capitalize text-xs h-9"
                >
                  {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label || f}
                  {f !== 'all' && (
                    <span className="ml-1 opacity-70">
                      {f === 'rejected' ? stats.rejected : f === 'withdrawn' ? stats.withdrawn : stats.closed}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Sort:</span>
            {([
              { key: 'recent' as SortMode, label: 'Most Recent' },
              { key: 'experience' as SortMode, label: 'Experience' },
              { key: 'skills' as SortMode, label: 'Most Skills' },
            ]).map(s => (
              <button
                key={s.key}
                onClick={() => setSortMode(s.key)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-lg transition-colors',
                  sortMode === s.key
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Skill Chips */}
          {topSkills.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Top Skills in Pool:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {topSkills.map(({ skill, count }) => {
                  const isActive = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={cn(
                        'text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1',
                        isActive
                          ? 'bg-primary/10 text-primary border-primary/30 font-medium'
                          : 'bg-card text-muted-foreground border-border/40 hover:border-border hover:text-foreground'
                      )}
                    >
                      {skill}
                      <span className="opacity-50">({count})</span>
                      {isActive && <X className="w-2.5 h-2.5 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                Showing <strong>{filteredCandidates.length}</strong> of {candidates.length} candidates
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFilter('all'); setSelectedSkills([]); setSearch(''); }}
                className="text-xs h-7 gap-1"
              >
                <X className="w-3 h-3" /> Clear filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Candidates List */}
      {filteredCandidates.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              {candidates.length === 0 ? 'Your talent pool is empty' : 'No matching candidates'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {candidates.length === 0
                ? 'Past applicants who were not selected or withdrew will appear here for future re-engagement.'
                : 'Try adjusting your search or filters to find candidates.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filteredCandidates.map((c, i) => {
              const statusCfg = STATUS_CONFIG[c.application_status] || STATUS_CONFIG.closed;
              const isExpanded = expandedId === c.id;
              const isAvailable = c.candidate.availability_status === 'available';
              const timeAgo = formatDistanceToNow(new Date(c.created_at), { addSuffix: true });

              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <Card
                    className={cn(
                      'border-border/40 transition-all cursor-pointer group hover:shadow-md',
                      isExpanded && 'ring-1 ring-primary/20 border-primary/30'
                    )}
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="w-11 h-11">
                            <AvatarImage src={c.candidate.profile.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                              {c.candidate.profile.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {isAvailable && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-semibold text-sm text-foreground truncate">
                              {c.candidate.profile.full_name}
                            </h3>
                            <Badge className={cn('text-[10px] border', statusCfg.color)}>
                              {statusCfg.label}
                            </Badge>
                            {isAvailable && (
                              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
                                Available
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Briefcase className="w-3 h-3 shrink-0" />
                            <span className="truncate">{c.candidate.job_title}</span>
                            {c.candidate.experience_years && (
                              <>
                                <span className="mx-1">·</span>
                                {c.candidate.experience_years}y exp
                              </>
                            )}
                            {c.candidate.city && (
                              <>
                                <span className="mx-1">·</span>
                                {c.candidate.city}
                              </>
                            )}
                          </p>

                          <p className="text-[11px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            Applied for <span className="font-medium text-muted-foreground">{c.job_title}</span> · {timeAgo}
                          </p>

                          {/* Skills */}
                          {c.candidate.skills && c.candidate.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {c.candidate.skills.slice(0, isExpanded ? 20 : 4).map((s, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className={cn(
                                    'text-[10px]',
                                    selectedSkills.includes(s) && 'bg-primary/10 text-primary border-primary/20'
                                  )}
                                >
                                  {s}
                                </Badge>
                              ))}
                              {!isExpanded && c.candidate.skills.length > 4 && (
                                <Badge variant="outline" className="text-[10px]">
                                  +{c.candidate.skills.length - 4}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Expanded Actions */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 pt-3 border-t border-border/30 flex gap-2"
                              >
                                <Button
                                  size="sm"
                                  className="rounded-lg gap-1.5 text-xs h-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast.info('Navigate to messaging to contact this candidate');
                                  }}
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  Re-engage
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg gap-1.5 text-xs h-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/candidate/${c.candidate.id}`, '_blank');
                                  }}
                                >
                                  <Eye className="w-3 h-3" />
                                  View Profile
                                </Button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <ChevronRight className={cn(
                          'w-4 h-4 text-muted-foreground/40 shrink-0 transition-transform mt-1',
                          isExpanded && 'rotate-90'
                        )} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Result count footer */}
      {filteredCandidates.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};
