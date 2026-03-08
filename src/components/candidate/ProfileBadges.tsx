import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Zap, Trophy, ShieldCheck, Sunrise, GraduationCap, Star, Users, Award, Lock,
  Flame, Share2, ChevronRight, Sparkles, Target, TrendingUp, Gift, Copy, Check
} from 'lucide-react';
import { toast } from 'sonner';

const iconMap: Record<string, React.ElementType> = {
  zap: Zap, trophy: Trophy, 'shield-check': ShieldCheck, sunrise: Sunrise,
  'graduation-cap': GraduationCap, star: Star, users: Users, award: Award,
  flame: Flame, sparkles: Sparkles, target: Target, 'trending-up': TrendingUp, gift: Gift,
};

const colorMap: Record<string, { bg: string; text: string; ring: string; glow: string; gradient: string }> = {
  primary: { bg: 'bg-primary/15', text: 'text-primary', ring: 'ring-primary/30', glow: 'shadow-primary/20', gradient: 'from-primary/20 to-primary/5' },
  success: { bg: 'bg-success/15', text: 'text-success', ring: 'ring-success/30', glow: 'shadow-success/20', gradient: 'from-success/20 to-success/5' },
  warning: { bg: 'bg-warning/20', text: 'text-warning-foreground', ring: 'ring-warning/30', glow: 'shadow-warning/20', gradient: 'from-warning/20 to-warning/5' },
  accent: { bg: 'bg-accent/20', text: 'text-accent-foreground', ring: 'ring-accent/30', glow: 'shadow-accent/20', gradient: 'from-accent/20 to-accent/5' },
};

interface BadgeDef {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  sort_order: number;
}

interface ProfileBadgesProps {
  profileId?: string;
  compact?: boolean;
}

/* ── Compact mode (unchanged logic, used in other views) ── */
const CompactBadges = ({ earned }: { earned: BadgeDef[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {earned.map(badge => {
      const Icon = iconMap[badge.icon] || Award;
      const colors = colorMap[badge.color] || colorMap.primary;
      return (
        <Tooltip key={badge.id}>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn('gap-1 cursor-default', colors.bg, colors.text, 'border-0')}>
              <Icon className="w-3 h-3" />
              {badge.name}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{badge.description}</TooltipContent>
        </Tooltip>
      );
    })}
  </div>
);

/* ── Single badge card ── */
const BadgeCard = ({ badge, isEarned, index }: { badge: BadgeDef; isEarned: boolean; index: number }) => {
  const Icon = iconMap[badge.icon] || Award;
  const colors = colorMap[badge.color] || colorMap.primary;

  if (!isEarned) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="border border-border/30 bg-muted/10 opacity-50 cursor-default h-full hover:opacity-70 transition-opacity">
              <CardContent className="p-4 text-center space-y-2.5">
                <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-muted/30 relative">
                  <Icon className="w-7 h-7 text-muted-foreground/40" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-muted-foreground leading-tight">{badge.name}</p>
                <p className="text-[11px] text-muted-foreground/60 leading-snug line-clamp-2">{badge.description}</p>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent className="max-w-[200px]">
            <p className="font-medium">How to earn:</p>
            <p className="text-muted-foreground">{badge.description}</p>
          </TooltipContent>
        </Tooltip>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 200, damping: 20 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className={cn(
        'border-0 shadow-lg h-full cursor-default overflow-hidden relative group',
        colors.glow
      )}>
        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60', colors.gradient)} />
        <CardContent className="relative z-10 p-4 text-center space-y-2.5">
          <motion.div
            className={cn('w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ring-2', colors.bg, colors.ring)}
            whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
          >
            <Icon className={cn('w-7 h-7', colors.text)} />
          </motion.div>
          <p className="text-sm font-bold text-foreground leading-tight">{badge.name}</p>
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{badge.description}</p>
          <div className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full', colors.bg, colors.text)}>
            <Check className="w-3 h-3" /> Earned
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/* ── Hero stats banner ── */
const HeroBanner = ({ earned, total, categories }: { earned: number; total: number; categories: string[] }) => {
  const percentage = total > 0 ? Math.round((earned / total) * 100) : 0;
  const level = earned < 3 ? 'Newcomer' : earned < 6 ? 'Rising Star' : earned < 10 ? 'Achiever' : 'Legend';
  const levelIcon = earned < 3 ? Star : earned < 6 ? TrendingUp : earned < 10 ? Trophy : Sparkles;
  const LevelIcon = levelIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-success/5 border border-border/50 p-5 sm:p-6"
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Level badge */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 ring-2 ring-primary/20 flex items-center justify-center shrink-0">
            <LevelIcon className="w-8 h-8 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Level</p>
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">{level}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-bold text-primary">{earned}</span> of {total} badges earned
            </p>
          </div>
        </div>

        {/* Progress ring */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative w-20 h-20">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <motion.circle
                cx="50" cy="50" r="42" fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={264}
                initial={{ strokeDashoffset: 264 }}
                animate={{ strokeDashoffset: 264 - (264 * percentage) / 100 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-extrabold text-foreground">{percentage}%</span>
            </div>
          </div>

          <div className="hidden sm:flex flex-col gap-1.5">
            {[
              { label: 'Categories', value: categories.length },
              { label: 'Next unlock', value: total - earned > 0 ? `${total - earned} left` : 'All done!' },
            ].map(s => (
              <div key={s.label} className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className="text-sm font-bold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Share card ── */
const ShareBanner = ({ earnedCount }: { earnedCount: number }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/candidate-dashboard?tab=badges`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `I've earned ${earnedCount} badges on Hire for Job!`, url });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Profile link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (earnedCount === 0) return null;

  return (
    <Card className="border border-border/40 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Share2 className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">Show off your achievements</p>
            <p className="text-xs text-muted-foreground">Share your badges with employers and connections</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleShare} className="shrink-0 gap-1.5">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Share'}
        </Button>
      </CardContent>
    </Card>
  );
};

/* ── Main component ── */
export const ProfileBadges = ({ profileId, compact = false }: ProfileBadgesProps) => {
  const { profile } = useAuth();
  const targetProfileId = profileId || profile?.id;
  const [allBadges, setAllBadges] = useState<BadgeDef[]>([]);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetProfileId) return;
    const fetchBadges = async () => {
      const [{ data: defs }, { data: earned }] = await Promise.all([
        supabase.from('badge_definitions').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('user_badges').select('badge_id').eq('profile_id', targetProfileId),
      ]);
      setAllBadges((defs as any[]) || []);
      setEarnedBadgeIds(new Set((earned || []).map((e: any) => e.badge_id)));
      setLoading(false);
    };
    fetchBadges();
  }, [targetProfileId]);

  const { earned, locked, categories } = useMemo(() => {
    const e = allBadges.filter(b => earnedBadgeIds.has(b.id));
    const l = allBadges.filter(b => !earnedBadgeIds.has(b.id));
    const cats = [...new Set(allBadges.map(b => b.category))].sort();
    return { earned: e, locked: l, categories: cats };
  }, [allBadges, earnedBadgeIds]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (compact) return <CompactBadges earned={earned} />;

  const activeCategory = 'all';

  return (
    <div className="space-y-5">
      {/* Hero banner */}
      <HeroBanner earned={earned.length} total={allBadges.length} categories={categories} />

      {/* Share banner */}
      <ShareBanner earnedCount={earned.length} />

      {/* Category tabs */}
      <Tabs defaultValue="all">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-transparent p-0 justify-start">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full text-xs px-3 py-1.5">
            All ({allBadges.length})
          </TabsTrigger>
          {categories.map(cat => {
            const count = allBadges.filter(b => b.category === cat).length;
            const earnedInCat = allBadges.filter(b => b.category === cat && earnedBadgeIds.has(b.id)).length;
            return (
              <TabsTrigger
                key={cat}
                value={cat}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full text-xs px-3 py-1.5 gap-1"
              >
                {cat}
                <span className="text-[10px] opacity-70">{earnedInCat}/{count}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* All badges tab */}
        <TabsContent value="all" className="space-y-6 mt-5">
          {earned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Earned</p>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{earned.length}</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {earned.map((badge, i) => (
                  <BadgeCard key={badge.id} badge={badge} isEarned index={i} />
                ))}
              </div>
            </div>
          )}
          {locked.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Locked</p>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{locked.length}</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {locked.map((badge, i) => (
                  <BadgeCard key={badge.id} badge={badge} isEarned={false} index={i} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Per-category tabs */}
        {categories.map(cat => {
          const catEarned = earned.filter(b => b.category === cat);
          const catLocked = locked.filter(b => b.category === cat);
          return (
            <TabsContent key={cat} value={cat} className="space-y-6 mt-5">
              {catEarned.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Earned in {cat}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {catEarned.map((badge, i) => (
                      <BadgeCard key={badge.id} badge={badge} isEarned index={i} />
                    ))}
                  </div>
                </div>
              )}
              {catLocked.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Locked in {cat}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {catLocked.map((badge, i) => (
                      <BadgeCard key={badge.id} badge={badge} isEarned={false} index={i} />
                    ))}
                  </div>
                </div>
              )}
              {catEarned.length === 0 && catLocked.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No badges in this category yet.</p>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Empty state */}
      {allBadges.length === 0 && (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="py-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
              <Award className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No badges available yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Badges are being set up. Keep using the platform and you'll start earning achievements soon!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Motivation tip */}
      {locked.length > 0 && earned.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border border-warning/20 bg-warning/5">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-warning/15 flex items-center justify-center shrink-0 mt-0.5">
                <Flame className="w-5 h-5 text-warning-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Keep the momentum going!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You're {Math.round((earned.length / allBadges.length) * 100)}% there. Complete your profile, apply to more jobs, and engage with the platform to unlock the remaining {locked.length} badge{locked.length !== 1 ? 's' : ''}.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
