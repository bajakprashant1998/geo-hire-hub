import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Briefcase, Eye, Users, CheckCircle2, Clock, MapPin, Pencil, Trash2, BarChart3, Search, ChevronRight, Plus,
} from 'lucide-react';
import { JobExpiryBadge } from '@/components/employer/JobExpiryBadge';
import { JobActiveToggle } from '@/components/employer/JobActiveToggle';
import { ApplicantTabs } from '@/components/employer/ApplicantTabs';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface EmployerJobsSectionProps {
  jobs: any[];
  selectedJob: any;
  setSelectedJob: (job: any) => void;
  setJobs: (fn: (prev: any[]) => any[]) => void;
  setJobToDelete: (job: any) => void;
  employer: any;
  search: string;
  onSectionChange: (section: string | null) => void;
}

export const EmployerJobsSection = ({
  jobs, selectedJob, setSelectedJob, setJobs, setJobToDelete, employer, search, onSectionChange,
}: EmployerJobsSectionProps) => {
  const navigate = useNavigate();
  const activeJobCount = jobs.filter(j => j.is_active && j.status === 'open').length;
  const inactiveJobCount = jobs.filter(j => !j.is_active || j.status !== 'open').length;
  const expiredJobCount = jobs.filter(j => j.expires_at && new Date(j.expires_at) < new Date()).length;
  const totalApplicants = jobs.reduce((sum, j) => sum + (j.applications_count || 0), 0);
  const jobSearchQuery = search?.toLowerCase() || '';

  type JobFilter = 'all' | 'active' | 'inactive' | 'expired';
  const filterTabs: { key: JobFilter; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'All Jobs', count: jobs.length, color: 'text-foreground' },
    { key: 'active', label: 'Active', count: activeJobCount, color: 'text-success' },
    { key: 'inactive', label: 'Inactive', count: inactiveJobCount - expiredJobCount, color: 'text-muted-foreground' },
    { key: 'expired', label: 'Expired', count: expiredJobCount, color: 'text-destructive' },
  ];

  const currentFilter = (new URLSearchParams(window.location.search).get('jf') || 'all') as JobFilter;
  const currentSort = (new URLSearchParams(window.location.search).get('js') || 'newest') as string;

  let filteredJobs = jobs.filter(j => {
    const isExpired = j.expires_at && new Date(j.expires_at) < new Date();
    if (currentFilter === 'active') return j.is_active && j.status === 'open' && !isExpired;
    if (currentFilter === 'inactive') return (!j.is_active || j.status !== 'open') && !isExpired;
    if (currentFilter === 'expired') return isExpired;
    return true;
  });

  if (jobSearchQuery) {
    filteredJobs = filteredJobs.filter(j =>
      j.title.toLowerCase().includes(jobSearchQuery) ||
      j.job_address?.toLowerCase().includes(jobSearchQuery) ||
      j.job_category?.toLowerCase().includes(jobSearchQuery)
    );
  }

  filteredJobs = [...filteredJobs].sort((a, b) => {
    if (currentSort === 'applicants') return (b.applications_count || 0) - (a.applications_count || 0);
    if (currentSort === 'views') return (b.view_count || 0) - (a.view_count || 0);
    if (currentSort === 'title') return a.title.localeCompare(b.title);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const setJobFilter = (f: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('jf', f);
    navigate(`?${params.toString()}`, { replace: true });
  };
  const setJobSort = (s: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('js', s);
    navigate(`?${params.toString()}`, { replace: true });
  };

  const handleToggleActive = (jobId: string, newState: boolean) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, is_active: newState } : j));
    if (selectedJob?.id === jobId) setSelectedJob({ ...selectedJob, is_active: newState });
  };

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Total Jobs', value: jobs.length, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Active', value: activeJobCount, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Applicants', value: totalApplicants, icon: Users, color: 'text-warning-foreground', bg: 'bg-warning/10' },
          { label: 'Expired', value: expiredJobCount, icon: Clock, color: 'text-destructive', bg: 'bg-destructive/10' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-3 p-3 rounded-xl bg-card/60 backdrop-blur border border-border/40">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', stat.bg)}>
              <stat.icon className={cn('w-5 h-5', stat.color)} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter Tabs + Search + Sort + New */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {filterTabs.map(tab => (
            <button key={tab.key} onClick={() => setJobFilter(tab.key)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all', currentFilter === tab.key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted')}>
              {tab.label} <span className="ml-1 opacity-70">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <select value={currentSort} onChange={e => setJobSort(e.target.value)} className="text-xs bg-muted/50 border border-border/40 rounded-lg px-2 py-1.5 text-foreground">
            <option value="newest">Newest</option>
            <option value="applicants">Most Applicants</option>
            <option value="views">Most Views</option>
            <option value="title">Title A-Z</option>
          </select>
          <Button size="sm" className="rounded-xl h-8 gap-1.5 text-xs font-semibold" onClick={() => onSectionChange('post-job')}>
            <Plus className="w-3.5 h-3.5" /> New Job
          </Button>
        </div>
      </motion.div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Job List — 2 cols */}
        <div className="lg:col-span-2 space-y-2 max-h-[700px] overflow-y-auto scrollbar-thin pr-1">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground font-medium">No jobs match this filter</p>
              <Button variant="outline" size="sm" className="mt-3 rounded-xl text-xs" onClick={() => setJobFilter('all')}>Show All Jobs</Button>
            </div>
          ) : (
            filteredJobs.map((job, i) => {
              const isExpired = job.expires_at && new Date(job.expires_at) < new Date();
              const convRate = job.view_count > 0 ? ((job.applications_count || 0) / job.view_count * 100).toFixed(1) : null;
              return (
                <motion.div key={job.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.03 }}>
                  <Card onClick={() => setSelectedJob(job)} className={cn('cursor-pointer transition-all hover:shadow-md rounded-xl border', selectedJob?.id === job.id ? 'border-primary/40 bg-primary/5 shadow-md ring-1 ring-primary/20' : 'border-border/50 bg-card hover:border-border')}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-foreground truncate">{job.title}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 shrink-0" />{job.job_address || 'No location'}
                          </p>
                        </div>
                        <JobActiveToggle jobId={job.id} employerId={employer.id} isActive={job.is_active} onToggle={(ns) => handleToggleActive(job.id, ns)} />
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />{job.applications_count || 0}</span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" />{job.view_count || 0}</span>
                        {isExpired && <span className="text-[10px] text-destructive font-semibold">Expired</span>}
                        {convRate && <span className="text-[10px] text-primary font-semibold" title="Application conversion rate">{convRate}% conv.</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        {job.job_category && <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">{job.job_category}</span>}
                        {job.created_at && <span className="text-[10px] text-muted-foreground/60">{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>}
                      </div>
                      {job.expires_at && !isExpired && (
                        <div className="mt-2"><JobExpiryBadge expiresAt={job.expires_at} /></div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Right: Job Detail + Applicants — 3 cols */}
        <div className="lg:col-span-3">
          {selectedJob ? (
            <motion.div key={selectedJob.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4 lg:sticky lg:top-4">
              <Card className="shadow-sm border border-border/50 bg-card rounded-xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary/60" />
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg sm:text-xl text-foreground leading-tight">{selectedJob.title}</CardTitle>
                        <span className={cn('text-[11px] px-2.5 py-0.5 rounded-full font-semibold', selectedJob.is_active ? 'bg-success/10 text-success border border-success/20' : 'bg-muted text-muted-foreground')}>
                          {selectedJob.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" />{selectedJob.job_address || 'Location not set'}</p>
                      {selectedJob.created_at && <p className="text-[11px] text-muted-foreground/60">Posted {formatDistanceToNow(new Date(selectedJob.created_at), { addSuffix: true })}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <Link to={`/jobs/${selectedJob.id}`}><Button variant="outline" size="sm" className="gap-1.5 rounded-xl h-8"><Eye className="w-3.5 h-3.5" /><span className="text-xs">View</span></Button></Link>
                      <Link to={`/edit-job/${selectedJob.id}`}><Button variant="outline" size="sm" className="gap-1.5 rounded-xl h-8"><Pencil className="w-3.5 h-3.5" /><span className="text-xs">Edit</span></Button></Link>
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl h-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => setJobToDelete(selectedJob)}>
                        <Trash2 className="w-3.5 h-3.5" /><span className="text-xs">Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <div className="px-4 sm:px-6 pb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'Applicants', value: selectedJob.applications_count || 0, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
                      { label: 'Views', value: selectedJob.view_count || 0, icon: Eye, color: 'text-muted-foreground', bg: 'bg-muted/50' },
                      { label: 'Openings', value: selectedJob.openings || 1, icon: Briefcase, color: 'text-success', bg: 'bg-success/10' },
                      { label: 'Conversion', value: selectedJob.view_count > 0 ? `${((selectedJob.applications_count || 0) / selectedJob.view_count * 100).toFixed(1)}%` : '—', icon: BarChart3, color: 'text-primary', bg: 'bg-primary/10' },
                    ].map(m => (
                      <div key={m.label} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/20 border border-border/30">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', m.bg)}><m.icon className={cn('w-3.5 h-3.5', m.color)} /></div>
                        <div><p className="text-sm font-bold text-foreground leading-none">{m.value}</p><p className="text-[10px] text-muted-foreground">{m.label}</p></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {selectedJob.job_type && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{selectedJob.job_type}</span>}
                    {selectedJob.job_category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent-foreground font-medium">{selectedJob.job_category}</span>}
                    {selectedJob.salary_range && <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">{selectedJob.salary_currency || '₹'} {selectedJob.salary_range}</span>}
                    {selectedJob.shift_type && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{selectedJob.shift_type}</span>}
                    {selectedJob.work_mode && <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning-foreground font-medium capitalize">{selectedJob.work_mode}</span>}
                    {selectedJob.expires_at && <JobExpiryBadge expiresAt={selectedJob.expires_at} />}
                  </div>
                </div>
              </Card>
              <Card className="shadow-sm border border-border/50 bg-card rounded-xl">
                <CardContent className="p-4 sm:p-5">
                  <h4 className="font-semibold mb-4 flex items-center gap-2 text-foreground text-sm"><Users className="w-4 h-4 text-primary" /> Applicants ({selectedJob.applications_count || 0})</h4>
                  {employer && <ApplicantTabs jobId={selectedJob.id} employerId={employer.id} />}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card className="shadow-sm border border-border/50 bg-card rounded-xl lg:sticky lg:top-4">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4"><Briefcase className="w-8 h-8 text-primary/30" /></div>
                <p className="text-foreground font-medium mb-1">Select a Job</p>
                <p className="text-sm text-muted-foreground">Click on any job from the list to view details, metrics, and manage applicants.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
