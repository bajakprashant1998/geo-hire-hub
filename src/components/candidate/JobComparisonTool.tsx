import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scale, Plus, X, MapPin, DollarSign, Clock, Building2, Briefcase, Loader2, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface JobForComparison {
  id: string;
  title: string;
  salary_range: string | null;
  job_type: string | null;
  location_city: string | null;
  location_country: string | null;
  work_mode: string | null;
  experience_min: number | null;
  employer: { company_name: string; benefits: string[] | null; team_size: string | null } | null;
}

const COMPARISON_FIELDS = [
  { key: 'salary', label: 'Salary Range', icon: DollarSign },
  { key: 'type', label: 'Job Type', icon: Briefcase },
  { key: 'location', label: 'Location', icon: MapPin },
  { key: 'workMode', label: 'Work Mode', icon: Building2 },
  { key: 'teamSize', label: 'Company Size', icon: Building2 },
  { key: 'benefits', label: 'Benefits', icon: Trophy },
];

export const JobComparisonTool = ({ candidateId }: { candidateId: string }) => {
  const [availableJobs, setAvailableJobs] = useState<JobForComparison[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, [candidateId]);

  const fetchJobs = async () => {
    try {
      // Fetch jobs from saved + applied
      const { data: apps } = await supabase
        .from('applications')
        .select('job_id')
        .eq('candidate_id', candidateId);

      const { data: saved } = await supabase
        .from('saved_jobs')
        .select('job_id')
        .eq('candidate_id', candidateId);

      const jobIds = [...new Set([
        ...(apps || []).map(a => a.job_id),
        ...(saved || []).map(s => s.job_id),
      ])];

      if (jobIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, salary_range, job_type, location_city, location_country, work_mode, experience_min, employer:employers(company_name, benefits, team_size)')
        .in('id', jobIds);

      setAvailableJobs((jobs as any) || []);
    } catch (err) {
      console.error('Error fetching jobs for comparison:', err);
    } finally {
      setLoading(false);
    }
  };

  const addJob = (id: string) => {
    if (selectedIds.length >= 3) {
      toast.error('Maximum 3 jobs for comparison');
      return;
    }
    if (!selectedIds.includes(id)) {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const removeJob = (id: string) => {
    setSelectedIds(prev => prev.filter(x => x !== id));
  };

  const selectedJobs = selectedIds.map(id => availableJobs.find(j => j.id === id)).filter(Boolean) as JobForComparison[];

  const getFieldValue = (job: JobForComparison, key: string) => {
    switch (key) {
      case 'salary': return job.salary_range || '—';
      case 'type': return job.job_type || '—';
      case 'location': return [job.location_city, job.location_country].filter(Boolean).join(', ') || '—';
      case 'workMode': return job.work_mode || '—';
      case 'teamSize': return (job.employer as any)?.team_size || '—';
      case 'benefits': return (job.employer as any)?.benefits?.join(', ') || '—';
      default: return '—';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary" />
          Job Comparison Tool
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Compare up to 3 jobs side-by-side from your applications and saved jobs.
        </p>
      </div>

      {/* Job Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-foreground">Select jobs to compare:</span>
            <Select onValueChange={addJob}>
              <SelectTrigger className="w-64 rounded-xl">
                <SelectValue placeholder="Add a job..." />
              </SelectTrigger>
              <SelectContent>
                {availableJobs
                  .filter(j => !selectedIds.includes(j.id))
                  .map(job => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} — {(job.employer as any)?.company_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {selectedJobs.map(job => (
                <Badge key={job.id} variant="secondary" className="gap-1.5 pr-1 rounded-lg">
                  {job.title}
                  <button onClick={() => removeJob(job.id)} className="hover:text-destructive transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {selectedJobs.length >= 2 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="p-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-36">
                      Criteria
                    </th>
                    {selectedJobs.map(job => (
                      <th key={job.id} className="p-4 text-left min-w-[180px]">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{job.title}</p>
                          <p className="text-xs text-muted-foreground">{(job.employer as any)?.company_name}</p>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FIELDS.map((field, i) => (
                    <motion.tr
                      key={field.key}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        "border-b border-border/30 last:border-b-0",
                        i % 2 === 0 ? "bg-muted/20" : ""
                      )}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <field.icon className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">{field.label}</span>
                        </div>
                      </td>
                      {selectedJobs.map(job => (
                        <td key={job.id} className="p-4">
                          <span className="text-sm text-foreground">
                            {getFieldValue(job, field.key)}
                          </span>
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="text-center py-12">
          <Scale className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {availableJobs.length === 0
              ? 'Apply to or save some jobs first to compare them.'
              : 'Select at least 2 jobs to start comparing.'}
          </p>
        </div>
      )}
    </div>
  );
};
