import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Zap, Trophy, ShieldCheck, Sunrise, GraduationCap, Star, Users, Award, Lock
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  zap: Zap, trophy: Trophy, 'shield-check': ShieldCheck, sunrise: Sunrise,
  'graduation-cap': GraduationCap, star: Star, users: Users, award: Award,
};

const colorMap: Record<string, { bg: string; text: string; ring: string; glow: string }> = {
  primary: { bg: 'bg-primary/15', text: 'text-primary', ring: 'ring-primary/30', glow: 'shadow-primary/20' },
  success: { bg: 'bg-success/15', text: 'text-success', ring: 'ring-success/30', glow: 'shadow-success/20' },
  warning: { bg: 'bg-warning/20', text: 'text-warning-foreground', ring: 'ring-warning/30', glow: 'shadow-warning/20' },
  accent: { bg: 'bg-accent/20', text: 'text-accent-foreground', ring: 'ring-accent/30', glow: 'shadow-accent/20' },
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

  const { earned, locked } = useMemo(() => {
    const e = allBadges.filter(b => earnedBadgeIds.has(b.id));
    const l = allBadges.filter(b => !earnedBadgeIds.has(b.id));
    return { earned: e, locked: l };
  }, [allBadges, earnedBadgeIds]);

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {earned.map(badge => {
          const Icon = iconMap[badge.icon] || Award;
          const colors = colorMap[badge.color] || colorMap.primary;
          return (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn('gap-1 cursor-default', colors.bg, colors.text, `border-0`)}>
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
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Badges & Achievements</h3>
          <p className="text-sm text-muted-foreground">
            {earned.length} of {allBadges.length} badges earned
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1">
          <Trophy className="w-3.5 h-3.5" />
          {earned.length}/{allBadges.length}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
          initial={{ width: 0 }}
          animate={{ width: `${allBadges.length > 0 ? (earned.length / allBadges.length) * 100 : 0}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>

      {/* Earned badges */}
      {earned.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Earned</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {earned.map((badge, i) => {
              const Icon = iconMap[badge.icon] || Award;
              const colors = colorMap[badge.color] || colorMap.primary;
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className={cn(
                    'border-0 shadow-lg transition-all hover:scale-[1.03] cursor-default',
                    colors.glow
                  )}>
                    <CardContent className="p-4 text-center space-y-2">
                      <div className={cn('w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ring-2', colors.bg, colors.ring)}>
                        <Icon className={cn('w-6 h-6', colors.text)} />
                      </div>
                      <p className="text-sm font-bold text-foreground leading-tight">{badge.name}</p>
                      <p className="text-[10px] text-muted-foreground leading-snug">{badge.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked badges */}
      {locked.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Locked</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {locked.map((badge) => {
              const Icon = iconMap[badge.icon] || Award;
              return (
                <Tooltip key={badge.id}>
                  <TooltipTrigger asChild>
                    <Card className="border border-border/30 bg-muted/20 opacity-60 cursor-default">
                      <CardContent className="p-4 text-center space-y-2">
                        <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-muted/40 relative">
                          <Icon className="w-6 h-6 text-muted-foreground/50" />
                          <Lock className="w-3.5 h-3.5 text-muted-foreground absolute -bottom-0.5 -right-0.5" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground leading-tight">{badge.name}</p>
                        <p className="text-[10px] text-muted-foreground/70 leading-snug">{badge.description}</p>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent>Complete: {badge.description}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
