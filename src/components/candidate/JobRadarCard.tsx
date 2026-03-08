import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Bookmark, BookmarkCheck, MapPin, Clock, Building2, AlertTriangle, TrendingUp, Zap, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScoredJob } from '@/hooks/useJobRadar';
import { formatDistanceToNow } from 'date-fns';
import { SalaryBadge } from '@/components/SalaryBadge';

interface JobRadarCardProps {
  job: ScoredJob;
  index: number;
  onToggleSave: (id: string) => void;
  isApplied: boolean;
}

const matchColor = (score: number) => {
  if (score >= 85) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/12', border: 'border-emerald-500/25', ring: 'ring-emerald-500/20' };
  if (score >= 70) return { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/25', ring: 'ring-primary/20' };
  if (score >= 50) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/12', border: 'border-amber-500/25', ring: 'ring-amber-500/20' };
  return { text: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border/40', ring: 'ring-border/20' };
};

const matchLabel = (score: number) => {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Great';
  if (score >= 50) return 'Good';
  return 'Fair';
};

export const JobRadarCard = memo(({ job, index, onToggleSave, isApplied }: JobRadarCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const timeAgo = job.createdAt ? formatDistanceToNow(new Date(job.createdAt), { addSuffix: true }) : '';
  const colors = matchColor(job.matchScore);
  const showSkillGap = job.missingSkills.length > 0;
  const showInsight = !!job.salaryInsight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: Math.min(index * 0.025, 0.25), duration: 0.25 }}
      layout
      className={cn(
        "group relative bg-card/70 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all duration-200",
        "hover:shadow-lg hover:shadow-primary/5",
        expanded ? 'border-border/60 shadow-md' : 'border-border/30'
      )}
    >
      {/* Top accent line based on match */}
      <div className={cn("h-[2px] w-full", job.matchScore >= 85 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : job.matchScore >= 70 ? 'bg-gradient-to-r from-primary to-primary/60' : 'bg-transparent')} />

      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          {/* Row 1: Title + Match Score */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link
                to={job.slug ? `/jobs/${job.slug}` : `/jobs/${job.id}`}
                className="text-[15px] sm:text-base font-semibold text-foreground hover:text-primary transition-colors line-clamp-1 leading-tight"
              >
                {job.title}
              </Link>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />
                  <span className="truncate max-w-[180px]">{job.companyName}</span>
                </span>
                {job.companyVerified && (
                  <Badge variant="outline" className="text-[9px] h-[18px] px-1.5 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 bg-emerald-500/8 gap-0.5">
                    ✓ Verified
                  </Badge>
                )}
                {job.hiringUrgency === 'urgent' && (
                  <Badge variant="outline" className="text-[9px] h-[18px] px-1.5 border-destructive/25 text-destructive bg-destructive/8 gap-0.5 animate-pulse">
                    <Zap className="w-2.5 h-2.5" /> Urgent
                  </Badge>
                )}
              </div>
            </div>

            {/* Match Score Badge */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn('flex flex-col items-center shrink-0 rounded-xl border px-3 py-2 ring-1', colors.bg, colors.border, colors.ring)}>
                  <span className={cn('text-xl font-bold leading-none tabular-nums', colors.text)}>{job.matchScore}%</span>
                  <span className={cn('text-[8px] font-semibold uppercase tracking-wider mt-0.5', colors.text, 'opacity-70')}>{matchLabel(job.matchScore)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-xs">
                <p className="font-semibold mb-1">Match Breakdown</p>
                <p>Skills: {job.matchedSkills.length}/{job.skills.length} matched</p>
                {job.distanceKm !== null && <p>Distance: {Math.round(job.distanceKm)} km away</p>}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Row 2: Meta tags */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-muted-foreground">
            {(job.locationCity || job.distanceKm !== null) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {job.locationCity || 'Remote'}
                {job.distanceKm !== null && (
                  <span className="text-foreground/80 font-medium">
                    · {job.distanceKm < 1 ? '<1' : Math.round(job.distanceKm)} km
                  </span>
                )}
              </span>
            )}
            {job.salaryRange && (
              <span className="font-semibold text-foreground">
                {job.salaryCurrency || '₹'} {job.salaryRange}
              </span>
            )}
            {job.salaryRange && <SalaryBadge salaryRange={job.salaryRange} compact />}
            {job.jobType && (
              <Badge variant="secondary" className="text-[10px] h-[18px] px-1.5 font-medium">
                {job.jobType}
              </Badge>
            )}
            {timeAgo && (
              <span className="flex items-center gap-1 opacity-70">
                <Clock className="w-3 h-3 shrink-0" /> {timeAgo}
              </span>
            )}
          </div>

          {/* Row 3: Matched Skills (always shown, limited) */}
          {job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {job.skills.slice(0, expanded ? 12 : 5).map(skill => {
                const isMatched = job.matchedSkills.includes(skill.toLowerCase());
                return (
                  <Badge
                    key={skill}
                    variant="outline"
                    className={cn(
                      'text-[10px] h-[20px] px-2 font-medium transition-colors',
                      isMatched
                        ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : 'bg-muted/30 border-border/30 text-muted-foreground'
                    )}
                  >
                    {isMatched && <span className="mr-0.5">✓</span>}
                    {skill}
                  </Badge>
                );
              })}
              {!expanded && job.skills.length > 5 && (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-[10px] h-[20px] px-2 rounded-full border border-border/30 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors font-medium"
                >
                  +{job.skills.length - 5} more
                </button>
              )}
            </div>
          )}

          {/* Expandable Section: Insights */}
          <AnimatePresence>
            {expanded && (showSkillGap || showInsight) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-2"
              >
                {showSkillGap && (
                  <div className="flex items-start gap-2 bg-amber-500/6 border border-amber-500/12 rounded-xl px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      <span className="font-semibold">Skills to learn:</span> {job.missingSkills.join(', ')}
                    </p>
                  </div>
                )}
                {showInsight && (
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/12 rounded-xl px-3 py-2">
                    <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                    <p className="text-[11px] text-primary font-medium">{job.salaryInsight}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Row 4: Actions */}
          <div className="flex items-center gap-2 pt-0.5">
            <Link to={job.slug ? `/jobs/${job.slug}` : `/jobs/${job.id}`} className="flex-1">
              <Button
                size="sm"
                className={cn(
                  'w-full h-9 rounded-xl text-xs font-semibold gap-1.5',
                  isApplied
                    ? 'bg-muted text-muted-foreground cursor-default pointer-events-none'
                    : 'shadow-sm shadow-primary/10'
                )}
                disabled={isApplied}
              >
                {isApplied ? '✓ Applied' : (
                  <>View & Apply <ExternalLink className="w-3 h-3" /></>
                )}
              </Button>
            </Link>

            {/* Expand toggle */}
            {(showSkillGap || showInsight || job.skills.length > 5) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl border-border/30 shrink-0"
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">{expanded ? 'Show less' : 'Show insights'}</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    'h-9 w-9 rounded-xl border-border/30 shrink-0 transition-colors',
                    job.isSaved && 'bg-primary/10 border-primary/25 text-primary'
                  )}
                  onClick={() => onToggleSave(job.id)}
                >
                  {job.isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">{job.isSaved ? 'Unsave' : 'Save Job'}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

JobRadarCard.displayName = 'JobRadarCard';
