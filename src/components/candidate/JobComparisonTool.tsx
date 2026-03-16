import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Scale, X, MapPin, Banknote, Clock, Building2, Briefcase, Loader2, Trophy,
  CheckCircle2, XCircle, Star, Globe, Users, GraduationCap, Zap, ArrowRight,
  Eye, Info, Sparkles, Heart, Plus, Check, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface JobForComparison {
  id: string;
  title: string;
  salary_range: string | null;
  job_type: string | null;
  job_address: string | null;
  location_city: string | null;
  location_country: string | null;
  work_mode: string | null;
  experience_min: number | null;
  description: string | null;
  skills: string[] | null;
  created_at: string;
  employer: { company_name: string; benefits: string[] | null; team_size: string | null; industry: string | null } | null;
  source: 'applied' | 'saved' | 'both';
}

const COMPARISON_FIELDS = [
  { key: 'salary', label: 'Salary', icon: Banknote, color: 'text-[hsl(var(--success))]' },
  { key: 'type', label: 'Job Type', icon: Briefcase, color: 'text-primary' },
  { key: 'location', label: 'Location', icon: MapPin, color: 'text-destructive' },
  { key: 'workMode', label: 'Work Mode', icon: Globe, color: 'text-[hsl(var(--warning))]' },
  { key: 'experience', label: 'Experience', icon: GraduationCap, color: 'text-primary' },
  { key: 'teamSize', label: 'Company Size', icon: Users, color: 'text-muted-foreground' },
  { key: 'industry', label: 'Industry', icon: Building2, color: 'text-muted-foreground' },
  { key: 'skills', label: 'Key Skills', icon: Zap, color: 'text-[hsl(var(--warning))]' },
  { key: 'benefits', label: 'Benefits', icon: Heart, color: 'text-destructive' },
];

// --- Sub-components ---

const ComparisonSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
    </div>
    <div className="grid grid-cols-1 gap-3">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  </div>
);

const SourceBadge = ({ source }: { source: string }) => {
  const config = source === 'both'
    ? { label: 'Applied & Saved', bg: 'bg-primary/10 text-primary border-primary/20' }
    : source === 'applied'
    ? { label: 'Applied', bg: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20' }
    : { label: 'Saved', bg: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20' };
  return <Badge variant="outline" className={cn("text-[10px] rounded-full px-2 py-0", config.bg)}>{config.label}</Badge>;
};

// Selectable job card for picking jobs
const SelectableJobCard = ({ job, isSelected, onToggle, disabled }: {
  job: JobForComparison;
  isSelected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) => (
  <motion.button
    type="button"
    onClick={onToggle}
    disabled={disabled && !isSelected}
    whileTap={{ scale: 0.97 }}
    className={cn(
      "w-full text-left p-3 rounded-xl border-2 transition-all duration-200 relative",
      isSelected
        ? "border-primary bg-primary/5 shadow-sm"
        : disabled
        ? "border-border/30 bg-muted/30 opacity-50 cursor-not-allowed"
        : "border-border hover:border-primary/40 hover:bg-secondary/50 active:bg-secondary"
    )}
  >
    <div className="flex items-start gap-3">
      {/* Selection indicator */}
      <div className={cn(
        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
        isSelected
          ? "border-primary bg-primary"
          : "border-muted-foreground/30"
      )}>
        {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground line-clamp-1">{job.title}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Building2 className="w-3 h-3 shrink-0" />
          <span className="truncate">{(job.employer as any)?.company_name || 'Company'}</span>
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <SourceBadge source={job.source} />
          {job.job_type && (
            <Badge variant="secondary" className="text-[10px] rounded-full px-2 py-0">{job.job_type}</Badge>
          )}
          {job.salary_range && (
            <span className="text-[10px] text-[hsl(var(--success))] font-medium">{job.salary_range}</span>
          )}
        </div>
      </div>
    </div>
  </motion.button>
);

// Selected job slot in comparison header
const JobSlot = ({ job, index, onRemove }: { job: JobForComparison | null; index: number; onRemove?: () => void }) => {
  const dotColors = ['bg-primary', 'bg-[hsl(var(--success))]', 'bg-[hsl(var(--warning))]'];
  const borderColors = [
    'border-primary/30 bg-primary/5',
    'border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5',
    'border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5',
  ];

  if (!job) {
    return (
      <div className="p-3 rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center min-h-[72px]">
        <p className="text-[11px] text-muted-foreground/60 text-center">
          <Plus className="w-4 h-4 mx-auto mb-0.5 text-muted-foreground/40" />
          Empty slot
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn("p-3 rounded-xl border relative group", borderColors[index])}
    >
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-destructive text-destructive-foreground shadow-sm z-10 active:scale-90 transition-transform"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      <div className="flex items-start gap-2">
        <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", dotColors[index])} />
        <div className="min-w-0">
          <p className="font-semibold text-xs line-clamp-1 text-foreground">{job.title}</p>
          <p className="text-[10px] text-muted-foreground truncate">{(job.employer as any)?.company_name}</p>
        </div>
      </div>
    </motion.div>
  );
};

const CellValue = ({ value, field }: { value: string; field: string }) => {
  if (value === '—') return <span className="text-muted-foreground/40 text-xs">—</span>;

  if (field === 'skills') {
    const skills = value.split(', ').filter(Boolean);
    if (!skills.length || skills[0] === '—') return <span className="text-muted-foreground/40 text-xs">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {skills.slice(0, 3).map((s, i) => (
          <Badge key={i} variant="secondary" className="text-[9px] rounded-full px-1.5 py-0">{s}</Badge>
        ))}
        {skills.length > 3 && <Badge variant="outline" className="text-[9px] rounded-full px-1.5 py-0">+{skills.length - 3}</Badge>}
      </div>
    );
  }

  if (field === 'benefits') {
    const items = value.split(', ').filter(Boolean);
    if (!items.length || items[0] === '—') return <span className="text-muted-foreground/40 text-xs">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {items.slice(0, 2).map((b, i) => (
          <Badge key={i} variant="secondary" className="text-[9px] rounded-full px-1.5 py-0 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]">{b}</Badge>
        ))}
        {items.length > 2 && <Badge variant="outline" className="text-[9px] rounded-full px-1.5 py-0">+{items.length - 2}</Badge>}
      </div>
    );
  }

  if (field === 'workMode') {
    const mode = value.toLowerCase();
    const config = mode.includes('remote')
      ? { color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]', icon: '🏠' }
      : mode.includes('hybrid')
      ? { color: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]', icon: '🔄' }
      : { color: 'bg-primary/10 text-primary', icon: '🏢' };
    return <Badge variant="outline" className={cn("text-[10px] rounded-full px-2", config.color)}>{config.icon} {value}</Badge>;
  }

  if (field === 'salary') return <span className="text-xs font-medium text-[hsl(var(--success))]">{value}</span>;

  return <span className="text-xs text-foreground">{value}</span>;
};

// Mobile-friendly comparison view (stacked cards instead of table)
const MobileComparisonView = ({ jobs, fields, getFieldValue, getBestIndex }: {
  jobs: JobForComparison[];
  fields: typeof COMPARISON_FIELDS;
  getFieldValue: (job: JobForComparison, key: string) => string;
  getBestIndex: (key: string) => number | null;
}) => {
  const dotColors = ['bg-primary', 'bg-[hsl(var(--success))]', 'bg-[hsl(var(--warning))]'];

  return (
    <div className="space-y-2">
      {fields.map((field, rowIdx) => {
        const bestIdx = getBestIndex(field.key);
        return (
          <motion.div
            key={field.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: rowIdx * 0.03 }}
            className="rounded-xl border border-border/50 overflow-hidden"
          >
            {/* Field header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/40 border-b border-border/30">
              <field.icon className={cn("w-3.5 h-3.5", field.color)} />
              <span className="text-xs font-semibold text-muted-foreground">{field.label}</span>
            </div>
            {/* Values for each job */}
            <div className="divide-y divide-border/20">
              {jobs.map((job, colIdx) => {
                const val = getFieldValue(job, field.key);
                const isBest = bestIdx === colIdx;
                return (
                  <div key={job.id} className={cn("flex items-center gap-2 px-3 py-2.5", isBest && "bg-[hsl(var(--success))]/5")}>
                    <div className={cn("w-2 h-2 rounded-full shrink-0", dotColors[colIdx])} />
                    <div className="flex-1 min-w-0">
                      <CellValue value={val} field={field.key} />
                    </div>
                    {isBest && <Trophy className="w-3.5 h-3.5 text-[hsl(var(--warning))] shrink-0" />}
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// --- Main Component ---

export const JobComparisonTool = ({ candidateId }: { candidateId: string }) => {
  const [availableJobs, setAvailableJobs] = useState<JobForComparison[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showJobList, setShowJobList] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, [candidateId]);

  const fetchJobs = async () => {
    try {
      const [{ data: apps }, { data: saved }] = await Promise.all([
        supabase.from('applications').select('job_id').eq('candidate_id', candidateId),
        supabase.from('saved_jobs').select('job_id').eq('candidate_id', candidateId),
      ]);

      const appliedIds = new Set((apps || []).map(a => a.job_id));
      const savedIds = new Set((saved || []).map(s => s.job_id));
      const allIds = [...new Set([...appliedIds, ...savedIds])];

      if (allIds.length === 0) { setLoading(false); return; }

      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, salary_range, job_type, job_address, location_city, location_country, work_mode, experience_min, description, skills, created_at, employer:employers(company_name, benefits, team_size, industry)')
        .in('id', allIds);

      const enriched = (jobs || []).map((j: any) => ({
        ...j,
        source: appliedIds.has(j.id) && savedIds.has(j.id) ? 'both' : appliedIds.has(j.id) ? 'applied' : 'saved',
      }));

      setAvailableJobs(enriched);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const toggleJob = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(x => x !== id));
    } else {
      if (selectedIds.length >= 3) {
        toast.error('Maximum 3 jobs can be compared');
        return;
      }
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const removeJob = (id: string) => setSelectedIds(prev => prev.filter(x => x !== id));

  const selectedJobs = selectedIds.map(id => availableJobs.find(j => j.id === id)).filter(Boolean) as JobForComparison[];

  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return availableJobs;
    const q = searchQuery.toLowerCase();
    return availableJobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      (j.employer as any)?.company_name?.toLowerCase().includes(q) ||
      j.job_type?.toLowerCase().includes(q)
    );
  }, [availableJobs, searchQuery]);

  const getFieldValue = (job: JobForComparison, key: string) => {
    switch (key) {
      case 'salary': return job.salary_range || '—';
      case 'type': return job.job_type || '—';
      case 'location': return job.job_address || [job.location_city, job.location_country].filter(Boolean).join(', ') || '—';
      case 'workMode': return job.work_mode || '—';
      case 'experience': return job.experience_min ? `${job.experience_min}+ years` : '—';
      case 'teamSize': return (job.employer as any)?.team_size || '—';
      case 'industry': return (job.employer as any)?.industry || '—';
      case 'skills': return job.skills?.join(', ') || '—';
      case 'benefits': return (job.employer as any)?.benefits?.join(', ') || '—';
      default: return '—';
    }
  };

  const getBestIndex = (fieldKey: string): number | null => {
    if (selectedJobs.length < 2) return null;
    const values = selectedJobs.map(j => getFieldValue(j, fieldKey));
    if (fieldKey === 'benefits' || fieldKey === 'skills') {
      const counts = values.map(v => v === '—' ? 0 : v.split(', ').length);
      const max = Math.max(...counts);
      if (max === 0) return null;
      return counts.indexOf(max);
    }
    return null;
  };

  if (loading) return <ComparisonSkeleton />;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground font-heading">Compare Jobs</h2>
              <p className="text-xs text-muted-foreground">
                Select 2-3 jobs to compare side-by-side
              </p>
            </div>
            {selectedIds.length > 0 && (
              <Badge className="rounded-full text-xs px-3 bg-primary text-primary-foreground">
                {selectedIds.length}/3
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Selected jobs slots */}
        {selectedIds.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-3 gap-2">
              <AnimatePresence mode="popLayout">
                {[0, 1, 2].map(i => (
                  <JobSlot
                    key={selectedJobs[i]?.id || `empty-${i}`}
                    job={selectedJobs[i] || null}
                    index={i}
                    onRemove={selectedJobs[i] ? () => removeJob(selectedJobs[i].id) : undefined}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Compare button */}
        {selectedJobs.length >= 2 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Button
              onClick={() => setShowJobList(false)}
              className="w-full rounded-xl gap-2 h-11"
              size="lg"
            >
              <Scale className="w-4 h-4" />
              Compare {selectedJobs.length} Jobs
            </Button>
          </motion.div>
        )}

        {/* Job list or Comparison results */}
        {showJobList || selectedJobs.length < 2 ? (
          <>
            {/* Empty state */}
            {availableJobs.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Scale className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <h3 className="font-semibold font-heading mb-1.5 text-foreground">No jobs to compare</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
                  Apply to or save some jobs first, then come back to compare them.
                </p>
                <div className="flex gap-2 justify-center">
                  <Link to="/">
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Explore
                    </Button>
                  </Link>
                  <Link to="/browse-jobs">
                    <Button size="sm" className="rounded-xl gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" /> Browse Jobs
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ) : (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search your jobs..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 rounded-xl bg-secondary/50 border-border h-10"
                  />
                </div>

                {/* Instruction */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                  <Info className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Tap on jobs to select them for comparison. Pick 2 or 3 jobs.
                  </p>
                </div>

                {/* Job list */}
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  <AnimatePresence>
                    {filteredJobs.map((job, idx) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                      >
                        <SelectableJobCard
                          job={job}
                          isSelected={selectedIds.includes(job.id)}
                          onToggle={() => toggleJob(job.id)}
                          disabled={selectedIds.length >= 3}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {filteredJobs.length === 0 && searchQuery && (
                    <p className="text-center text-sm text-muted-foreground py-8">No jobs match "{searchQuery}"</p>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          /* Comparison Results */
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Back to selection */}
            <Button variant="ghost" size="sm" onClick={() => setShowJobList(true)} className="rounded-xl gap-1.5 text-muted-foreground">
              <ChevronUp className="w-4 h-4" />
              Change selection
            </Button>

            {/* Desktop table view */}
            <div className="hidden md:block">
              <Card className="border-border rounded-xl overflow-hidden">
                <CardHeader className="bg-secondary/50 border-b border-border py-3 px-4">
                  <CardTitle className="text-sm font-heading flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[hsl(var(--warning))]" />
                    Side-by-Side Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32 bg-secondary/30">
                          Criteria
                        </th>
                        {selectedJobs.map((job, i) => {
                          const dotColors = ['bg-primary', 'bg-[hsl(var(--success))]', 'bg-[hsl(var(--warning))]'];
                          return (
                            <th key={job.id} className="p-3 text-left min-w-[160px]">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full shrink-0", dotColors[i])} />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">{job.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">{(job.employer as any)?.company_name}</p>
                                </div>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARISON_FIELDS.map((field, rowIdx) => {
                        const bestIdx = getBestIndex(field.key);
                        return (
                          <tr
                            key={field.key}
                            className={cn(
                              "border-b border-border/30 last:border-b-0",
                              rowIdx % 2 === 0 ? "bg-secondary/10" : ""
                            )}
                          >
                            <td className="p-3 bg-secondary/30">
                              <div className="flex items-center gap-2">
                                <field.icon className={cn("w-3.5 h-3.5 shrink-0", field.color)} />
                                <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
                              </div>
                            </td>
                            {selectedJobs.map((job, colIdx) => {
                              const val = getFieldValue(job, field.key);
                              const isBest = bestIdx === colIdx;
                              return (
                                <td key={job.id} className={cn("p-3", isBest && "bg-[hsl(var(--success))]/5")}>
                                  <div className="flex items-start gap-1.5">
                                    <CellValue value={val} field={field.key} />
                                    {isBest && <Trophy className="w-3.5 h-3.5 text-[hsl(var(--warning))] shrink-0 mt-0.5" />}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            {/* Mobile stacked view */}
            <div className="md:hidden">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[hsl(var(--warning))]" />
                <h3 className="text-sm font-heading font-semibold text-foreground">Comparison Results</h3>
              </div>
              <MobileComparisonView
                jobs={selectedJobs}
                fields={COMPARISON_FIELDS}
                getFieldValue={getFieldValue}
                getBestIndex={getBestIndex}
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              {selectedJobs.map(job => (
                <Link key={job.id} to={`/jobs/${job.id}`} className="flex-1">
                  <Button variant="outline" className="w-full rounded-xl text-xs gap-1.5 group border-border hover:border-primary/30 h-10">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="truncate">View {job.title.split(' ').slice(0, 2).join(' ')}</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </Button>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
};
