import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Trophy, Star, Zap, GraduationCap, TrendingUp, Crown, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  profile_id: string;
  full_name: string;
  avatar_url: string | null;
  job_title: string;
  completeness_score: number;
  assessments_passed: number;
  applications_count: number;
  activity_score: number;
  total_score: number;
}

const rankIcons = [Crown, Medal, Award];
const rankColors = [
  'from-yellow-400 to-amber-500',
  'from-slate-300 to-slate-400',
  'from-amber-600 to-amber-700',
];

export const CandidateLeaderboard = () => {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overall');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // Fetch candidates with profiles
      const { data: candidates } = await supabase
        .from('candidates')
        .select(`
          id, profile_id, job_title, skills, experience_years, bio, resume_url, education,
          profiles!candidates_profile_id_fkey ( id, full_name, avatar_url, latitude, longitude, is_visible_on_map )
        `)
        .eq('is_blocked', false)
        .limit(100);

      if (!candidates) { setLoading(false); return; }

      // Fetch assessment results for all candidates
      const candidateIds = candidates.map(c => c.id);
      const { data: assessments } = await supabase
        .from('assessment_results')
        .select('candidate_id, passed')
        .in('candidate_id', candidateIds)
        .eq('passed', true);

      // Fetch application counts
      const { data: applications } = await supabase
        .from('applications')
        .select('candidate_id')
        .in('candidate_id', candidateIds);

      // Build lookup maps
      const assessmentMap = new Map<string, number>();
      (assessments || []).forEach(a => {
        assessmentMap.set(a.candidate_id, (assessmentMap.get(a.candidate_id) || 0) + 1);
      });

      const appMap = new Map<string, number>();
      (applications || []).forEach(a => {
        appMap.set(a.candidate_id, (appMap.get(a.candidate_id) || 0) + 1);
      });

      const leaderboard: LeaderboardEntry[] = candidates
        .filter(c => (c as any).profiles)
        .map(c => {
          const p = (c as any).profiles;
          // Calculate completeness
          const checks = [
            p.full_name, p.avatar_url, c.job_title && c.job_title !== 'Not specified',
            c.skills?.length > 0, (c.experience_years ?? 0) > 0,
            Array.isArray(c.education) && c.education.length > 0,
            p.latitude && p.longitude, c.bio && c.bio.length > 20, c.resume_url,
          ];
          const completeness = Math.round((checks.filter(Boolean).length / checks.length) * 100);
          const assessmentsPassed = assessmentMap.get(c.id) || 0;
          const appsCount = appMap.get(c.id) || 0;
          const activityScore = Math.min(100, appsCount * 4 + assessmentsPassed * 15);
          const totalScore = Math.round(completeness * 0.4 + assessmentsPassed * 10 + activityScore * 0.3);

          return {
            profile_id: p.id,
            full_name: p.full_name || 'Anonymous',
            avatar_url: p.avatar_url,
            job_title: c.job_title || 'Job Seeker',
            completeness_score: completeness,
            assessments_passed: assessmentsPassed,
            applications_count: appsCount,
            activity_score: activityScore,
            total_score: totalScore,
          };
        });

      setEntries(leaderboard);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sorted = useMemo(() => {
    const copy = [...entries];
    switch (activeTab) {
      case 'completeness': return copy.sort((a, b) => b.completeness_score - a.completeness_score);
      case 'assessments': return copy.sort((a, b) => b.assessments_passed - a.assessments_passed);
      case 'activity': return copy.sort((a, b) => b.activity_score - a.activity_score);
      default: return copy.sort((a, b) => b.total_score - a.total_score);
    }
  }, [entries, activeTab]);

  const top20 = sorted.slice(0, 20);
  const myRank = profile ? sorted.findIndex(e => e.profile_id === profile.id) + 1 : 0;
  const myEntry = profile ? sorted.find(e => e.profile_id === profile.id) : null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-6 h-6 text-warning-foreground" />
            Candidate Leaderboard
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Top candidates ranked by profile strength, skills, and engagement
          </p>
        </div>
        {myRank > 0 && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 text-sm px-3 py-1.5">
            Your Rank: #{myRank}
          </Badge>
        )}
      </div>

      {/* Top 3 Podium */}
      {top20.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 items-end">
          {[1, 0, 2].map((idx, gridPos) => {
            const entry = top20[idx];
            const isFirst = idx === 0;
            const RankIcon = rankIcons[idx];
            return (
              <motion.div
                key={entry.profile_id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gridPos * 0.15 }}
                className={cn(gridPos === 1 && 'row-start-1')}
              >
                <Card className={cn(
                  'border-0 overflow-hidden transition-all',
                  isFirst ? 'shadow-xl shadow-warning/20' : 'shadow-lg',
                )}>
                  <div className={cn(
                    'h-1.5 bg-gradient-to-r',
                    rankColors[idx],
                  )} />
                  <CardContent className={cn('text-center', isFirst ? 'p-5' : 'p-4')}>
                    <div className="relative mx-auto mb-3" style={{ width: isFirst ? 64 : 52, height: isFirst ? 64 : 52 }}>
                      <Avatar className={cn('w-full h-full ring-2 ring-offset-2 ring-offset-card', idx === 0 ? 'ring-yellow-400' : idx === 1 ? 'ring-slate-400' : 'ring-amber-600')}>
                        <AvatarImage src={entry.avatar_url || ''} />
                        <AvatarFallback className="bg-muted text-foreground font-bold">
                          {entry.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        'absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-br shadow-lg',
                        rankColors[idx],
                      )}>
                        <RankIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <p className={cn('font-bold text-foreground truncate', isFirst ? 'text-sm' : 'text-xs')}>
                      {entry.full_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{entry.job_title}</p>
                    <div className="mt-2 flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5 text-warning-foreground" />
                      <span className="text-sm font-bold text-foreground">{entry.total_score}</span>
                      <span className="text-[10px] text-muted-foreground">pts</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* My stats card */}
      {myEntry && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-4">
              <Avatar className="w-12 h-12 ring-2 ring-primary/30 ring-offset-2 ring-offset-card">
                <AvatarImage src={myEntry.avatar_url || ''} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold">{myEntry.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">You — Rank #{myRank}</p>
                <p className="text-xs text-muted-foreground truncate">{myEntry.job_title}</p>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                {[
                  { label: 'Score', value: myEntry.total_score, icon: Star },
                  { label: 'Profile', value: `${myEntry.completeness_score}%`, icon: TrendingUp },
                  { label: 'Assessments', value: myEntry.assessments_passed, icon: GraduationCap },
                  { label: 'Activity', value: myEntry.activity_score, icon: Zap },
                ].map(stat => (
                  <Tooltip key={stat.label}>
                    <TooltipTrigger asChild>
                      <div>
                        <stat.icon className="w-4 h-4 text-muted-foreground mx-auto mb-0.5" />
                        <p className="text-sm font-bold text-foreground">{stat.value}</p>
                        <p className="text-[9px] text-muted-foreground">{stat.label}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{stat.label}: {stat.value}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Sort tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overall" className="text-xs gap-1"><Trophy className="w-3.5 h-3.5" /> Overall</TabsTrigger>
          <TabsTrigger value="completeness" className="text-xs gap-1"><TrendingUp className="w-3.5 h-3.5" /> Profile</TabsTrigger>
          <TabsTrigger value="assessments" className="text-xs gap-1"><GraduationCap className="w-3.5 h-3.5" /> Skills</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs gap-1"><Zap className="w-3.5 h-3.5" /> Activity</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Rankings list */}
      <div className="space-y-2">
        {top20.slice(3).map((entry, i) => {
          const rank = i + 4;
          const isMe = entry.profile_id === profile?.id;
          return (
            <motion.div
              key={entry.profile_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className={cn(
                'border transition-all hover:shadow-md',
                isMe ? 'border-primary/30 bg-primary/5' : 'border-border/40',
              )}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
                  </div>
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={entry.avatar_url || ''} />
                    <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
                      {entry.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {entry.full_name}
                      {isMe && <span className="text-primary ml-1">(You)</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{entry.job_title}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-center">
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="text-center">
                          <p className="text-xs font-bold text-foreground">{entry.completeness_score}%</p>
                          <p className="text-[9px] text-muted-foreground">Profile</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Profile Completeness</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="text-center">
                          <p className="text-xs font-bold text-foreground">{entry.assessments_passed}</p>
                          <p className="text-[9px] text-muted-foreground">Tests</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Assessments Passed</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="text-center">
                          <p className="text-xs font-bold text-foreground">{entry.activity_score}</p>
                          <p className="text-[9px] text-muted-foreground">Activity</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Activity Score</TooltipContent>
                    </Tooltip>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs shrink-0">
                    {entry.total_score} pts
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {top20.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No candidates to rank yet.</p>
        </div>
      )}
    </div>
  );
};
