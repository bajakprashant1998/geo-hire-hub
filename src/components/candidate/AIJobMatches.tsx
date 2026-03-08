import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles,
  Brain,
  MapPin,
  Building2,
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Lightbulb,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { useJobMatches } from '@/hooks/useJobMatches';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface AIJobMatchesProps {
  candidateId: string;
}

export const AIJobMatches = ({ candidateId }: AIJobMatchesProps) => {
  const { matches, loading, calculating, calculateMatches } = useJobMatches(candidateId);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-google-green';
    if (score >= 70) return 'text-google-blue';
    if (score >= 50) return 'text-google-yellow';
    return 'text-muted-foreground';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return { label: 'Excellent Match', icon: Zap, bg: 'bg-google-green/10 border-google-green/20' };
    if (score >= 70) return { label: 'Great Match', icon: TrendingUp, bg: 'bg-google-blue/10 border-google-blue/20' };
    if (score >= 50) return { label: 'Good Match', icon: Sparkles, bg: 'bg-google-yellow/10 border-google-yellow/20' };
    return { label: 'Potential Match', icon: Lightbulb, bg: 'bg-muted border-border' };
  };

  const getProgressColor = (score: number) => {
    if (score >= 85) return 'bg-google-green';
    if (score >= 70) return 'bg-google-blue';
    if (score >= 50) return 'bg-google-yellow';
    return 'bg-muted-foreground';
  };

  if (loading) {
    return (
      <Card className="shadow-google-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-google-blue/5 border-b">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            AI-Powered Job Matches
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-secondary/50 rounded-xl space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-google-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 via-google-blue/5 to-google-green/5 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary to-google-blue rounded-xl shadow-google">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <span>AI-Powered Job Matches</span>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                Personalized recommendations based on your profile
              </p>
            </div>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => calculateMatches()}
            disabled={calculating}
            className="gap-2"
          >
            {calculating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {calculating ? 'Analyzing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {matches.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-google-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">No matches yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Let AI analyze jobs and find your best matches
            </p>
            <Button onClick={() => calculateMatches()} disabled={calculating}>
              {calculating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Jobs...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Find My Matches
                </>
              )}
            </Button>
          </div>
        ) : (
          matches.map((match) => {
            const scoreInfo = getScoreLabel(match.match_score);
            const ScoreIcon = scoreInfo.icon;
            const isExpanded = expandedMatch === match.id;

            return (
              <Collapsible
                key={match.id}
                open={isExpanded}
                onOpenChange={() => setExpandedMatch(isExpanded ? null : match.id)}
              >
                <div
                  className={cn(
                    'p-4 rounded-xl border transition-all duration-200',
                    isExpanded
                      ? 'bg-secondary/80 border-primary/30 shadow-google'
                      : 'bg-secondary/30 border-border hover:border-primary/20 hover:bg-secondary/50'
                  )}
                >
                  {/* Main content */}
                  <div className="flex items-start gap-4">
                    {/* Score circle */}
                    <div className="relative shrink-0">
                      <div
                        className={cn(
                          'w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg',
                          scoreInfo.bg,
                          getScoreColor(match.match_score)
                        )}
                      >
                        {match.match_score}%
                      </div>
                    </div>

                    {/* Job info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            to={`/jobs/${match.job_id}`}
                            className="font-semibold hover:text-primary transition-colors line-clamp-1"
                          >
                            {match.job?.title}
                          </Link>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{match.job?.employers?.company_name}</span>
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            'shrink-0 text-[10px] sm:text-xs font-medium border hidden sm:inline-flex',
                            scoreInfo.bg,
                            getScoreColor(match.match_score)
                          )}
                        >
                          <ScoreIcon className="w-3 h-3 mr-1" />
                          {scoreInfo.label}
                        </Badge>
                      </div>

                      {/* Quick stats */}
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
                        {match.job?.salary_range && (
                          <span className="flex items-center gap-1 text-google-green">
                            <Banknote className="w-3.5 h-3.5" />
                            {match.job.salary_range}
                          </span>
                        )}
                        {match.job?.job_address && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="line-clamp-1 max-w-[150px]">
                              {match.job.job_address.split(',')[0]}
                            </span>
                          </span>
                        )}
                        {match.job?.created_at && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDistanceToNow(new Date(match.job.created_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', getProgressColor(match.match_score))}
                            style={{ width: `${match.match_score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expand trigger */}
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-3 text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          Why This Match?
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  {/* Expanded content */}
                  <CollapsibleContent>
                    <div className="mt-4 pt-4 border-t border-border space-y-4">
                      {/* Match reasons */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-google-yellow" />
                          Why You're a Good Fit
                        </h4>
                        <ul className="space-y-1.5">
                          {match.match_reasons.map((reason, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-4 h-4 text-google-green shrink-0 mt-0.5" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Skills */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {match.skill_overlap.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-google-green" />
                              Matching Skills
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {match.skill_overlap.slice(0, 5).map((skill, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-google-green/10 text-google-green">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {match.missing_skills.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-google-red" />
                              Skills to Develop
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {match.missing_skills.slice(0, 5).map((skill, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Compatibility indicators */}
                      <div className="flex flex-wrap gap-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full',
                            match.location_match
                              ? 'bg-google-green/10 text-google-green'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <MapPin className="w-3 h-3" />
                          {match.location_match ? 'Good Location' : 'Far Location'}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full',
                            match.experience_match
                              ? 'bg-google-green/10 text-google-green'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <TrendingUp className="w-3 h-3" />
                          {match.experience_match ? 'Experience Fit' : 'Experience Gap'}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full',
                            match.salary_match
                              ? 'bg-google-green/10 text-google-green'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <Banknote className="w-3 h-3" />
                          {match.salary_match ? 'Salary Aligned' : 'Salary Mismatch'}
                        </span>
                      </div>

                      {/* Action */}
                      <Link to={`/jobs/${match.job_id}`}>
                        <Button className="w-full">View Full Job Details</Button>
                      </Link>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
