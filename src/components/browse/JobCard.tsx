import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, MapPin, Clock, ChevronRight, Zap, Heart } from 'lucide-react';
import { SalaryBadge } from '@/components/SalaryBadge';
import { DeadlineCountdown } from '@/components/DeadlineCountdown';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface JobCardProps {
  job: any;
  index: number;
  viewMode: 'list' | 'grid';
  savedJobIds?: Set<string>;
  onSaveToggle?: () => void;
  compareMode?: boolean;
  isSelectedForCompare?: boolean;
  onCompareToggle?: (job: any) => void;
}

const JOB_TYPE_COLORS: Record<string, string> = {
  'Full-time': 'bg-primary/10 text-primary border-primary/20',
  'Part-time': 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
  'Contract': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  'Internship': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  'Freelance': 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
};

export function getJobUrl(job: any) {
  if (job.slug) {
    const parts = ['/jobs'];
    if (job.location_country) parts.push(encodeURIComponent(job.location_country.toLowerCase().replace(/\s+/g, '-')));
    if (job.location_state) parts.push(encodeURIComponent(job.location_state.toLowerCase().replace(/\s+/g, '-')));
    if (job.location_city) parts.push(encodeURIComponent(job.location_city.toLowerCase().replace(/\s+/g, '-')));
    parts.push(job.slug);
    return parts.join('/');
  }
  return `/jobs/${job.id}`;
}

function formatDate(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDescription(job: any) {
  if (!job.description) return null;
  const plain = job.description.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return plain.length > 140 ? plain.slice(0, 140) + '…' : plain;
}

function isNew(createdAt: string) {
  return (Date.now() - new Date(createdAt).getTime()) < 86400000 * 2;
}

export const JobCard = ({ job, index, viewMode, savedJobIds, onSaveToggle, compareMode, isSelectedForCompare, onCompareToggle }: JobCardProps) => {
  const { user, profile } = useAuth();
  // Use batch-fetched set if available, otherwise fall back to individual check
  const [localSaved, setLocalSaved] = useState(false);
  const saved = savedJobIds ? savedJobIds.has(job.id) : localSaved;
  const typeColor = JOB_TYPE_COLORS[job.job_type] || 'bg-secondary text-secondary-foreground';
  const companyName = (job.employers as any)?.company_name || 'Company';
  const industry = (job.employers as any)?.industry;
  const desc = getDescription(job);
  const jobIsNew = isNew(job.created_at);

  useEffect(() => {
    // Skip individual fetch if batch set is provided
    if (savedJobIds) return;
    if (!user || !profile || profile.user_type !== 'candidate') return;
    supabase.from('candidates').select('id').eq('profile_id', profile.id).maybeSingle().then(({ data: cand }) => {
      if (!cand) return;
      supabase.from('saved_jobs').select('id').eq('candidate_id', cand.id).eq('job_id', job.id).maybeSingle().then(({ data }) => {
        if (data) setLocalSaved(true);
      });
    });
  }, [user, profile, job.id, savedJobIds]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !profile) { toast.error('Please login to save jobs'); return; }
    if (profile.user_type !== 'candidate') return;
    const { data: cand } = await supabase.from('candidates').select('id').eq('profile_id', profile.id).maybeSingle();
    if (!cand) return;
    if (saved) {
      await supabase.from('saved_jobs').delete().eq('candidate_id', cand.id).eq('job_id', job.id);
      setLocalSaved(false);
      toast.success('Removed from saved');
    } else {
      await supabase.from('saved_jobs').insert({ candidate_id: cand.id, job_id: job.id });
      setLocalSaved(true);
      toast.success('Job saved!');
    }
    onSaveToggle?.();
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCompareToggle?.(job);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.25), duration: 0.3 }}
    >
      <Link to={getJobUrl(job)} className="block group">
        <Card className={cn(
          "overflow-hidden border-border/50 bg-card hover:shadow-lg hover:border-primary/25 transition-all duration-250 group-hover:-translate-y-0.5 relative",
          isSelectedForCompare && "ring-2 ring-primary border-primary/40 shadow-md"
        )}>
          {/* Compare checkbox */}
          {compareMode && (
            <button
              onClick={handleCompareClick}
              className={cn(
                "absolute top-3 left-3 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                isSelectedForCompare
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30 bg-card hover:border-primary/50"
              )}
              aria-label={isSelectedForCompare ? 'Remove from compare' : 'Add to compare'}
            >
              {isSelectedForCompare && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          )}
          {/* Save button */}
          {user && profile?.user_type === 'candidate' && (
            <button
              onClick={handleSave}
              className={cn(
                "absolute top-3 z-10 p-1.5 rounded-full transition-all",
                compareMode ? "right-3" : "right-3",
                saved
                  ? 'text-destructive bg-destructive/10 hover:bg-destructive/20'
                  : 'text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100'
              )}
              aria-label={saved ? 'Unsave job' : 'Save job'}
            >
              <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
            </button>
          )}
          <CardContent className={cn(
            viewMode === 'grid' ? 'p-5 flex flex-col h-full min-h-[220px]' : 'p-4 sm:p-5',
            compareMode && 'pl-11'
          )}>
            {viewMode === 'grid' ? (
              <GridLayout
                job={job} companyName={companyName} industry={industry}
                desc={desc} typeColor={typeColor} jobIsNew={jobIsNew}
              />
            ) : (
              <ListLayout
                job={job} companyName={companyName} industry={industry}
                desc={desc} typeColor={typeColor} jobIsNew={jobIsNew}
              />
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};

function GridLayout({ job, companyName, desc, typeColor, jobIsNew }: any) {
  return (
    <>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex items-center gap-1.5 pr-6">
          {jobIsNew && (
            <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-[10px] px-1.5 py-0 h-5 font-medium">
              <Zap className="w-2.5 h-2.5 mr-0.5" />New
            </Badge>
          )}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />{formatDate(job.created_at)}
          </span>
        </div>
      </div>

      <h3 className="font-semibold text-foreground line-clamp-2 mb-1.5 leading-snug group-hover:text-primary transition-colors">
        {job.title}
      </h3>
      <p className="text-sm text-muted-foreground mb-1.5 truncate">{companyName}</p>

      {desc && <p className="text-xs text-muted-foreground/70 line-clamp-2 mb-3 leading-relaxed">{desc}</p>}

      <div className="mt-auto space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {job.job_type && (
            <Badge variant="outline" className={`text-[11px] border ${typeColor}`}>{job.job_type}</Badge>
          )}
          {job.salary_range && (
            <Badge variant="outline" className="text-[11px] font-medium">{job.salary_range}</Badge>
          )}
          {job.salary_range && <SalaryBadge salaryRange={job.salary_range} compact />}
        </div>
        <div className="flex items-center justify-between gap-2">
          {job.job_address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0 text-muted-foreground/60" />
              <span className="truncate">{job.job_address}</span>
            </p>
          )}
          {job.expires_at && <DeadlineCountdown expiresAt={job.expires_at} variant="inline" />}
        </div>
      </div>
    </>
  );
}

function ListLayout({ job, companyName, industry, desc, typeColor, jobIsNew }: any) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
        <Building2 className="w-6 h-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-[15px]">
                {job.title}
              </h3>
              {jobIsNew && (
                <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-[10px] px-1.5 py-0 h-5 font-medium shrink-0">
                  <Zap className="w-2.5 h-2.5 mr-0.5" />New
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span className="truncate font-medium">{companyName}</span>
              {industry && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-xs truncate">{industry}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/60 px-2 py-1 rounded-md">
              <Clock className="w-3 h-3" />{formatDate(job.created_at)}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {desc && (
          <p className="text-[13px] text-muted-foreground/70 mt-1.5 line-clamp-1 leading-relaxed">{desc}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          {job.job_type && (
            <Badge variant="outline" className={`text-[11px] border ${typeColor}`}>{job.job_type}</Badge>
          )}
          {job.salary_range && (
            <Badge variant="outline" className="text-[11px] font-medium">{job.salary_range}</Badge>
          )}
          {job.salary_range && <SalaryBadge salaryRange={job.salary_range} compact />}
          {job.job_address && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3 text-muted-foreground/60" />
              <span className="truncate max-w-[220px]">{job.job_address}</span>
            </span>
          )}
          {job.expires_at && <DeadlineCountdown expiresAt={job.expires_at} variant="inline" />}
        </div>
      </div>
    </div>
  );
}
