import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Bookmark, BookmarkCheck, MapPin, Clock, Building2, AlertTriangle, TrendingUp, Zap, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { ScoredJob } from '@/hooks/useJobRadar';
import { formatDistanceToNow } from 'date-fns';

interface JobRadarCardProps {
  job: ScoredJob;
  index: number;
  onToggleSave: (id: string) => void;
  isApplied: boolean;
}

const matchColor = (score: number) => {
  if (score >= 85) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  if (score >= 70) return 'text-blue-600 dark:text-blue-400 bg-blue-500/15 border-blue-500/30';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400 bg-amber-500/15 border-amber-500/30';
  return 'text-muted-foreground bg-muted/60 border-border/40';
};

export const JobRadarCard = memo(({ job, index, onToggleSave, isApplied }: JobRadarCardProps) => {
  const timeAgo = job.createdAt ? formatDistanceToNow(new Date(job.createdAt), { addSuffix: true }) : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
      className="group bg-card/70 backdrop-blur-xl border border-border/40 rounded-2xl p-4 sm:p-5 hover:shadow-lg hover:scale-[1.01] transition-all duration-200 relative overflow-hidden"
    >
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="relative flex flex-col gap-3">
        {/* Header: Company + Match Score */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              to={job.slug ? `/jobs/${job.slug}` : `/jobs/${job.id}`}
              className="text-base sm:text-lg font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
            >
              {job.title}
            </Link>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[160px]">{job.companyName}</span>
              </div>
              {job.companyVerified && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                  Verified
                </Badge>
              )}
              {job.hiringUrgency === 'urgent' && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-destructive/30 text-destructive bg-destructive/10 gap-0.5">
                  <Zap className="w-2.5 h-2.5" /> Urgent
                </Badge>
              )}
            </div>
          </div>

          {/* Match Score Circle */}
          <div className={cn('flex flex-col items-center shrink-0 rounded-xl border px-3 py-2', matchColor(job.matchScore))}>
            <span className="text-xl font-bold leading-none">{job.matchScore}%</span>
            <span className="text-[9px] font-medium uppercase tracking-wider mt-0.5 opacity-80">Match</span>
          </div>
        </div>

        {/* Meta row: Location, Salary, Experience, Time */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {(job.locationCity || job.distanceKm !== null) && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {job.locationCity || 'Remote'}
              {job.distanceKm !== null && (
                <span className="text-foreground font-medium ml-0.5">
                  {job.distanceKm < 1 ? '<1' : Math.round(job.distanceKm)} km
                </span>
              )}
            </span>
          )}
          {job.salaryRange && (
            <span className="font-medium text-foreground">
              {job.salaryCurrency || '₹'} {job.salaryRange}
            </span>
          )}
          {job.jobType && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium">
              {job.jobType}
            </Badge>
          )}
          {timeAgo && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 shrink-0" /> {timeAgo}
            </span>
          )}
        </div>

        {/* Skills */}
        {job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.skills.slice(0, 8).map(skill => {
              const isMatched = job.matchedSkills.includes(skill.toLowerCase());
              return (
                <Badge
                  key={skill}
                  variant="outline"
                  className={cn(
                    'text-[10px] h-5 px-2 font-medium',
                    isMatched
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                      : 'bg-muted/40 border-border/40 text-muted-foreground'
                  )}
                >
                  {skill}
                </Badge>
              );
            })}
            {job.skills.length > 8 && (
              <Badge variant="outline" className="text-[10px] h-5 px-2 bg-muted/40 border-border/40 text-muted-foreground">
                +{job.skills.length - 8}
              </Badge>
            )}
          </div>
        )}

        {/* Skill Gap Alert */}
        {job.missingSkills.length > 0 && (
          <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/15 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              <span className="font-semibold">Skill gap:</span>{' '}
              {job.missingSkills.join(', ')}
            </p>
          </div>
        )}

        {/* Salary Insight */}
        {job.salaryInsight && (
          <div className="flex items-center gap-2 bg-blue-500/8 border border-blue-500/15 rounded-xl px-3 py-2">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">{job.salaryInsight}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Link to={job.slug ? `/jobs/${job.slug}` : `/jobs/${job.id}`} className="flex-1">
            <Button
              size="sm"
              className={cn(
                'w-full h-9 rounded-xl text-xs font-semibold gap-1.5',
                isApplied
                  ? 'bg-muted text-muted-foreground cursor-default'
                  : 'bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/15'
              )}
              disabled={isApplied}
            >
              {isApplied ? 'Applied' : (
                <>View & Apply <ExternalLink className="w-3 h-3" /></>
              )}
            </Button>
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  'h-9 w-9 rounded-xl border-border/40 shrink-0',
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
    </motion.div>
  );
});

JobRadarCard.displayName = 'JobRadarCard';
