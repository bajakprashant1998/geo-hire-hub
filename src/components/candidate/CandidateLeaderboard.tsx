import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Trophy, Star, Zap, GraduationCap, TrendingUp, Crown, Medal, Award,
  RefreshCw, ChevronUp, ChevronDown, Minus, Target, Flame, Sparkles
} from 'lucide-react';

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
const rankGradients = [
  'from-yellow-400 to-amber-500',
  'from-slate-300 to-slate-400',
  'from-amber-600 to-amber-700',
];
const rankRings = ['ring-yellow-400', 'ring-slate-400', 'ring-amber-600'];
const rankShadows = ['shadow-yellow-400/30', 'shadow-slate-400/20', 'shadow-amber-600/20'];

/* ── Podium Card ── */
const PodiumCard = ({ entry, rank, delay }: { entry: LeaderboardEntry; rank: number; delay: number }) => {
  const isFirst = rank === 0;
  const RankIcon = rankIcons[rank];
  const size = isFirst ? 72 : 56;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
    >
      <Card className={cn(
        'border-0 overflow-hidden transition-all hover:scale-[1.02]',
        isFirst ? `shadow-xl ${rankShadows[0]}` : 'shadow-lg',
      )}>
        <div className={cn('h-1.5 bg-gradient-to-r', rankGradients[rank])} />
        <CardContent className={cn('text-center relative', isFirst ? 'p-5 pt-6' : 'p-4 pt-5')}>
          {/* Rank badge */}
          <div className={cn(
            'absolute top-2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br shadow-lg z-10',
            rankGradients[rank],
          )}>
            <RankIcon className="w-4 h-4 text-white" />
          </div>

          <div className="relative mx-auto mb-3" style={{ width: size, height: size }}>
            <Avatar className={cn('w-full h-full ring-2 ring-offset-2 ring-offset-card', rankRings[rank])}>
              <AvatarImage src={entry.avatar_url || ''} />
              <AvatarFallback className="bg-muted text-foreground font-bold text-lg">
                {entry.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
          <p className={cn('font-bold text-foreground truncate', isFirst ? 'text-sm' : 'text-xs')}>
            {entry.full_name}
          </p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{entry.job_title}</p>

          {/* Score with animation */}
          <motion.div
            className="mt-3 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-muted/30 rounded-xl mx-auto w-fit"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.3, type: 'spring' }}
          >
            <Star className="w-4 h-4 text-warning-foreground" />
            <span className="text-base font-extrabold text-foreground">{entry.total_score}</span>
            <span className="text-[10px] text-muted-foreground">pts</span>
          </motion.div>

          {/* Mini breakdown */}
          <div className="flex justify-center gap-3 mt-2.5">
            {[
              { val: `${entry.completeness_score}%`, tip: 'Profile' },
              { val: entry.assessments_passed, tip: 'Tests' },
              { val: entry.activity_score, tip: 'Activity' },
            ].map(s => (
              <Tooltip key={s.tip}>
                <TooltipTrigger>
                  <span className="text-[10px] text-muted-foreground">{s.val}</span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{s.tip}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/* ── My Stats Card ── */
const MyStatsCard = ({ entry, rank }: { entry: LeaderboardEntry; rank: number }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
    <Card className="border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-primary/5 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
      <CardContent className="p-4 relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="w-14 h-14 ring-2 ring-primary/30 ring-offset-2 ring-offset-card">
            <AvatarImage src={entry.avatar_url || ''} />
            <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">{entry.full_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-extrabold text-foreground">Your Stats</p>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1">
                <Trophy className="w-3 h-3" /> #{rank}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.job_title}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-primary">{entry.total_score}</p>
            <p className="text-[10px] text-muted-foreground">total pts</p>
          </div>
        </div>

        {/* Score Breakdown Bars */}
        <div className="space-y-3">
          {[
            { label: 'Profile Strength', value: entry.completeness_score, max: 100, icon: Target, weight: '40%', color: 'bg-primary' },
            { label: 'Assessments', value: entry.assessments_passed * 10, max: 50, icon: GraduationCap, weight: '30%', color: 'bg-success' },
            { label: 'Activity', value: entry.activity_score, max: 100, icon: Zap, weight: '30%', color: 'bg-warning' },
          ].map(stat => (
            <div key={stat.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">{stat.label}</span>
                  <span className="text-[10px] text-muted-foreground">({stat.weight})</span>
                </div>
                <span className="text-xs font-bold text-foreground">{stat.value}{stat.label === 'Profile Strength' ? '%' : ''}</span>
              </div>
              <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', stat.color)}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (stat.value / stat.max) * 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

/* ── Rank Row ── */
const RankRow = ({ entry, rank, isMe, delay }: { entry: LeaderboardEntry; rank: number; isMe: boolean; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    layout
  >
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl transition-all group',
      isMe
        ? 'bg-primary/5 border border-primary/20 ring-1 ring-primary/10'
        : 'hover:bg-muted/30 border border-transparent hover:border-border/40',
    )}>
      {/* Rank */}
      <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
        <span className={cn('text-sm font-extrabold', isMe ? 'text-primary' : 'text-muted-foreground')}>
          {rank}
        </span>
      </div>

      {/* Avatar */}
      <Avatar className={cn('w-10 h-10', isMe && 'ring-2 ring-primary/30 ring-offset-1 ring-offset-card')}>
        <AvatarImage src={entry.avatar_url || ''} />
        <AvatarFallback className="bg-muted text-foreground text-xs font-bold">
          {entry.full_name.charAt(0)}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={cn('text-sm font-bold text-foreground truncate', isMe && 'text-primary')}>
            {entry.full_name}
          </p>
          {isMe && (
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-primary/10 text-primary border-primary/20">You</Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{entry.job_title}</p>
      </div>

      {/* Desktop Stats */}
      <div className="hidden sm:flex items-center gap-4">
        {[
          { value: `${entry.completeness_score}%`, label: 'Profile', icon: Target },
          { value: entry.assessments_passed, label: 'Tests', icon: GraduationCap },
          { value: entry.activity_score, label: 'Activity', icon: Zap },
        ].map(s => (
          <Tooltip key={s.label}>
            <TooltipTrigger>
              <div className="text-center min-w-[44px]">
                <p className="text-xs font-bold text-foreground">{s.value}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </div>
            </TooltipTrigger>
            <TooltipContent>{s.label}: {s.value}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Score */}
      <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-lg shrink-0">
        <Flame className="w-3.5 h-3.5 text-primary" />
        <span className="text-sm font-extrabold text-primary">{entry.total_score}</span>
      </div>
    </div>
  </motion.div>
);

/* ── Main ── */
export const CandidateLeaderboard = () => {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overall');

  const fetchLeaderboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data: candidates } = await supabase
        .from('candidates')
        .select(`
          id, profile_id, job_title, skills, experience_years, bio, resume_url, education,
          profiles!candidates_profile_id_fkey ( id, full_name, avatar_url, latitude, longitude, is_visible_on_map )
        `)
        .eq('is_blocked', false)
        .limit(100);

      if (!candidates) { setLoading(false); setRefreshing(false); return; }

      const candidateIds = candidates.map(c => c.id);
      const [{ data: assessments }, { data: applications }] = await Promise.all([
        supabase.from('assessment_results').select('candidate_id, passed').in('candidate_id', candidateIds).eq('passed', true),
        supabase.from('applications').select('candidate_id').in('candidate_id', candidateIds),
      ]);

      const assessmentMap = new Map<string, number>();
      (assessments || []).forEach(a => assessmentMap.set(a.candidate_id, (assessmentMap.get(a.candidate_id) || 0) + 1));
      const appMap = new Map<string, number>();
      (applications || []).forEach(a => appMap.set(a.candidate_id, (appMap.get(a.candidate_id) || 0) + 1));

      const leaderboard: LeaderboardEntry[] = candidates
        .filter(c => (c as any).profiles)
        .map(c => {
          const p = (c as any).profiles;
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

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
      <div className="space-y-5">
        <Skeleton className="h-12 w-56 rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
        <Skeleton className="h-32 rounded-2xl" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2.5">
            <div className="p-2 bg-warning/10 rounded-xl">
              <Trophy className="w-6 h-6 text-warning-foreground" />
            </div>
            Leaderboard
          </h3>
          <p className="text-sm text-muted-foreground mt-1.5">
            Top candidates ranked by profile strength, skills & engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => fetchLeaderboard(true)} disabled={refreshing}>
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </Button>
          {myRank > 0 && (
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1.5 text-sm px-3 py-1.5 rounded-xl">
              <Sparkles className="w-3.5 h-3.5" /> #{myRank}
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Podium */}
      {top20.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 items-end">
          {[1, 0, 2].map((idx, gridPos) => (
            <PodiumCard
              key={top20[idx].profile_id}
              entry={top20[idx]}
              rank={idx}
              delay={gridPos * 0.15}
            />
          ))}
        </div>
      )}

      {/* My Stats */}
      {myEntry && myRank > 0 && <MyStatsCard entry={myEntry} rank={myRank} />}

      {/* Sort Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full h-10 bg-muted/30 rounded-xl p-0.5">
          <TabsTrigger value="overall" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1">
            <Trophy className="w-3.5 h-3.5" /> Overall
          </TabsTrigger>
          <TabsTrigger value="completeness" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1">
            <Target className="w-3.5 h-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="assessments" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1">
            <GraduationCap className="w-3.5 h-3.5" /> Skills
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1">
            <Zap className="w-3.5 h-3.5" /> Activity
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Rankings */}
      <div className="space-y-1.5">
        <AnimatePresence>
          {top20.slice(3).map((entry, i) => (
            <RankRow
              key={entry.profile_id}
              entry={entry}
              rank={i + 4}
              isMe={entry.profile_id === profile?.id}
              delay={i * 0.03}
            />
          ))}
        </AnimatePresence>
      </div>

      {top20.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">No rankings yet</h3>
          <p className="text-sm text-muted-foreground">Complete your profile and pass assessments to appear here</p>
        </div>
      )}
    </div>
  );
};
