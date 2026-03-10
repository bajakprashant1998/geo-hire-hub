import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Scale, X, MapPin, Banknote, Clock, Building2, Briefcase, Loader2, Trophy,
  CheckCircle2, XCircle, Star, Globe, Users, GraduationCap, Zap, ArrowRight,
  Eye, Info, Sparkles, Heart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  { key: 'salary', label: 'Salary Range', icon: Banknote, color: 'text-[hsl(var(--success))]' },
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
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3 w-64" />
      </div>
    </div>
    <Skeleton className="h-14 rounded-xl" />
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
    </div>
    <Skeleton className="h-64 rounded-xl" />
  </div>
);

const JobSlot = ({ job, index, onRemove }: { job: JobForComparison | null; index: number; onRemove?: () => void }) => {
  const colors = [
    'border-primary/30 bg-primary/5',
    'border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5',
    'border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5',
  ];
  const dotColors = ['bg-primary', 'bg-[hsl(var(--success))]', 'bg-[hsl(var(--warning))]'];

  if (!job) {
    return (
      <div className={cn("p-4 rounded-xl border-2 border-dashed border-border flex items-center justify-center min-h-[100px]")}>
        <p className="text-xs text-muted-foreground text-center">
          Select a job<br />from the dropdown
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn("p-4 rounded-xl border relative group", colors[index])}
    >
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1 rounded-full bg-background/80 border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:border-destructive/30"
        >
          <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
        </button>
      )}
      <div className="flex items-start gap-2">
        <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", dotColors[index])} />
        <div className="min-w-0">
          <Link to={`/jobs/${job.id}`} className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1">
            {job.title}
          </Link>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Building2 className="w-3 h-3" />
            {(job.employer as any)?.company_name || 'Company'}
          </p>
          <Badge variant="secondary" className="text-[10px] mt-2 rounded-full px-2">
            {job.source === 'both' ? '📌 Applied & Saved' : job.source === 'applied' ? '📝 Applied' : '💾 Saved'}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
};

const CellValue = ({ value, field, jobIndex }: { value: string; field: string; jobIndex: number }) => {
  if (value === '—') return <span className="text-muted-foreground/50">—</span>;

  // Render skills as badges
  if (field === 'skills') {
    const skills = value.split(', ').filter(Boolean);
    if (skills.length === 0 || skills[0] === '—') return <span className="text-muted-foreground/50">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {skills.slice(0, 4).map((s, i) => (
          <Badge key={i} variant="secondary" className="text-[10px] rounded-full px-2 py-0">{s}</Badge>
        ))}
        {skills.length > 4 && (
          <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0">+{skills.length - 4}</Badge>
        )}
      </div>
    );
  }

  // Render benefits as badges
  if (field === 'benefits') {
    const items = value.split(', ').filter(Boolean);
    if (items.length === 0 || items[0] === '—') return <span className="text-muted-foreground/50">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {items.slice(0, 3).map((b, i) => (
          <Badge key={i} variant="secondary" className="text-[10px] rounded-full px-2 py-0 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20">
            {b}
          </Badge>
        ))}
        {items.length > 3 && (
          <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0">+{items.length - 3}</Badge>
        )}
      </div>
    );
  }

  // Work mode with icon
  if (field === 'workMode') {
    const mode = value.toLowerCase();
    const config = mode.includes('remote')
      ? { color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20', icon: '🏠' }
      : mode.includes('hybrid')
      ? { color: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20', icon: '🔄' }
      : { color: 'bg-primary/10 text-primary border-primary/20', icon: '🏢' };
    return (
      <Badge variant="outline" className={cn("text-xs rounded-full px-2.5", config.color)}>
        {config.icon} {value}
      </Badge>
    );
  }

  // Salary with highlight
  if (field === 'salary') {
    return (
      <span className="text-sm font-medium text-[hsl(var(--success))]">{value}</span>
    );
  }

  return <span className="text-sm text-foreground">{value}</span>;
};

// --- Main Component ---

export const JobComparisonTool = ({ candidateId }: { candidateId: string }) => {
  const [availableJobs, setAvailableJobs] = useState<JobForComparison[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const addJob = (id: string) => {
    if (selectedIds.length >= 3) { toast.error('Maximum 3 jobs for comparison'); return; }
    if (!selectedIds.includes(id)) setSelectedIds(prev => [...prev, id]);
  };

  const removeJob = (id: string) => setSelectedIds(prev => prev.filter(x => x !== id));

  const selectedJobs = selectedIds.map(id => availableJobs.find(j => j.id === id)).filter(Boolean) as JobForComparison[];

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

  // Highlight best value per row
  const getBestIndex = (fieldKey: string): number | null => {
    if (selectedJobs.length < 2) return null;
    const values = selectedJobs.map(j => getFieldValue(j, fieldKey));
    // For benefits/skills, most items wins
    if (fieldKey === 'benefits' || fieldKey === 'skills') {
      const counts = values.map(v => v === '—' ? 0 : v.split(', ').length);
      const max = Math.max(...counts);
      if (max === 0) return null;
      return counts.indexOf(max);
    }
    return null;
  };

  const unselectedJobs = availableJobs.filter(j => !selectedIds.includes(j.id));

  if (loading) return <ComparisonSkeleton />;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Scale className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground font-heading">Job Comparison</h2>
              <p className="text-sm text-muted-foreground">
                Compare up to 3 jobs side-by-side from your saved & applied list
              </p>
            </div>
          </div>
        </motion.div>

        {/* Job Selector */}
        <Card className="border-border rounded-xl">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="text-sm font-medium text-foreground whitespace-nowrap">Add a job:</span>
              <Select onValueChange={addJob} value="" key={`job-select-${selectedIds.length}`}>
                <SelectTrigger className="w-full sm:w-80 rounded-xl bg-secondary/50 border-border">
                  <SelectValue placeholder={unselectedJobs.length > 0 ? `${unselectedJobs.length} jobs available` : 'No more jobs to add'} />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {unselectedJobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>
                      <span className="truncate">{job.title} — {(job.employer as any)?.company_name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="text-xs rounded-full px-2.5">
                {selectedIds.length}/3 selected
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Job Slots */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        {/* Comparison Table */}
        {selectedJobs.length >= 2 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
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
                      <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-36 bg-secondary/30">
                        Criteria
                      </th>
                      {selectedJobs.map((job, i) => {
                        const dotColors = ['bg-primary', 'bg-[hsl(var(--success))]', 'bg-[hsl(var(--warning))]'];
                        return (
                          <th key={job.id} className="p-4 text-left min-w-[180px]">
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
                        <motion.tr
                          key={field.key}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: rowIdx * 0.04 }}
                          className={cn(
                            "border-b border-border/30 last:border-b-0",
                            rowIdx % 2 === 0 ? "bg-secondary/10" : ""
                          )}
                        >
                          <td className="p-4 bg-secondary/30">
                            <div className="flex items-center gap-2">
                              <field.icon className={cn("w-3.5 h-3.5 shrink-0", field.color)} />
                              <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
                            </div>
                          </td>
                          {selectedJobs.map((job, colIdx) => {
                            const val = getFieldValue(job, field.key);
                            const isBest = bestIdx === colIdx;
                            return (
                              <td key={job.id} className={cn("p-4", isBest && "bg-[hsl(var(--success))]/5")}>
                                <div className="flex items-start gap-1.5">
                                  <CellValue value={val} field={field.key} jobIndex={colIdx} />
                                  {isBest && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Trophy className="w-3.5 h-3.5 text-[hsl(var(--warning))] shrink-0 mt-0.5" />
                                      </TooltipTrigger>
                                      <TooltipContent>Best in this category</TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Action row */}
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedJobs.map(job => (
                <Link key={job.id} to={`/jobs/${job.id}`} className="flex-1 min-w-[140px]">
                  <Button variant="outline" className="w-full rounded-xl text-xs gap-1.5 group border-border hover:border-primary/30">
                    <Eye className="w-3.5 h-3.5" />
                    View {job.title.split(' ').slice(0, 2).join(' ')}
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Scale className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="font-semibold font-heading mb-2 text-foreground">
              {availableJobs.length === 0 ? 'No jobs to compare' : 'Select at least 2 jobs'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {availableJobs.length === 0
                ? 'Apply to or save some jobs first, then come back here to compare them side-by-side.'
                : `You have ${availableJobs.length} job${availableJobs.length > 1 ? 's' : ''} available. Pick 2 or 3 from the dropdown above.`}
            </p>
            {availableJobs.length === 0 && (
              <div className="flex gap-3 justify-center mt-6">
                <Link to="/">
                  <Button variant="outline" className="rounded-xl gap-2">
                    <MapPin className="w-4 h-4" /> Explore Map
                  </Button>
                </Link>
                <Link to="/browse-jobs">
                  <Button className="rounded-xl gap-2">
                    <Briefcase className="w-4 h-4" /> Browse Jobs
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
};
