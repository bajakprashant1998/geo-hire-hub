import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Share2, Copy, Users, Trophy, Gift, TrendingUp, CheckCircle2, Clock, Loader2,
  Briefcase, Target, Sparkles, ChevronRight, Star, Zap, Crown, Medal, Check, ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Referral {
  id: string;
  referral_code: string;
  referred_email: string | null;
  referred_name: string | null;
  status: string;
  points_earned: number;
  created_at: string;
  job_id: string | null;
  job_title?: string;
  company_name?: string;
  bounty_amount?: number;
}

interface PointEntry {
  id: string;
  points: number;
  action: string;
  description: string | null;
  created_at: string;
}

interface BountyJob {
  id: string;
  title: string;
  referral_bounty: number;
  company_name: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  pending: { color: 'text-muted-foreground', bg: 'bg-muted', icon: Clock, label: 'Pending' },
  signed_up: { color: 'text-primary', bg: 'bg-primary/10', icon: Users, label: 'Signed Up' },
  applied: { color: 'text-warning-foreground', bg: 'bg-warning/15', icon: TrendingUp, label: 'Applied' },
  hired: { color: 'text-success', bg: 'bg-success/15', icon: CheckCircle2, label: 'Hired' },
  expired: { color: 'text-muted-foreground', bg: 'bg-muted/50', icon: Clock, label: 'Expired' },
};

const TIERS = [
  { name: 'Starter', minPoints: 0, icon: Star, color: 'text-muted-foreground' },
  { name: 'Connector', minPoints: 50, icon: Users, color: 'text-primary' },
  { name: 'Influencer', minPoints: 200, icon: Zap, color: 'text-warning-foreground' },
  { name: 'Champion', minPoints: 500, icon: Trophy, color: 'text-success' },
  { name: 'Legend', minPoints: 1000, icon: Crown, color: 'text-primary' },
];

/* ── Hero Banner ── */
const HeroBanner = ({ totalPoints, referralCount, hiredCount }: { totalPoints: number; referralCount: number; hiredCount: number }) => {
  const currentTier = useMemo(() => {
    for (let i = TIERS.length - 1; i >= 0; i--) {
      if (totalPoints >= TIERS[i].minPoints) return { ...TIERS[i], index: i };
    }
    return { ...TIERS[0], index: 0 };
  }, [totalPoints]);

  const nextTier = TIERS[currentTier.index + 1];
  const progressToNext = nextTier
    ? Math.min(100, ((totalPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100)
    : 100;

  const TierIcon = currentTier.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-success/5 border border-border/50 p-5 sm:p-6"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-success/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Tier badge */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <motion.div
            className="w-16 h-16 rounded-2xl bg-card ring-2 ring-primary/20 flex items-center justify-center shrink-0 shadow-lg"
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            <TierIcon className={cn('w-8 h-8', currentTier.color)} />
          </motion.div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Referral Tier</p>
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">{currentTier.name}</h2>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1 text-sm">
                <Trophy className="w-4 h-4 text-warning-foreground" />
                <span className="font-bold text-foreground">{totalPoints}</span>
                <span className="text-muted-foreground">pts</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1 text-sm">
                <Users className="w-4 h-4 text-primary" />
                <span className="font-bold text-foreground">{referralCount}</span>
                <span className="text-muted-foreground">referred</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div className="w-full sm:w-48">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Next: <span className="font-semibold text-foreground">{nextTier.name}</span></span>
              <span className="font-bold text-primary">{nextTier.minPoints - totalPoints} pts</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                initial={{ width: 0 }}
                animate={{ width: `${progressToNext}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Stats pills (mobile) */}
        <div className="flex sm:hidden gap-2 w-full">
          <div className="flex-1 text-center py-2 rounded-xl bg-success/10 border border-success/20">
            <p className="text-lg font-extrabold text-success">{hiredCount}</p>
            <p className="text-[10px] text-muted-foreground">Hires</p>
          </div>
          <div className="flex-1 text-center py-2 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-lg font-extrabold text-primary">{referralCount}</p>
            <p className="text-[10px] text-muted-foreground">Referrals</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Points breakdown card ── */
const HowItWorks = () => (
  <Card className="border border-border/50 bg-gradient-to-br from-card to-muted/10">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-bold text-foreground">How Referrals Work</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { step: 1, points: '+10', label: 'They Sign Up', icon: Users },
          { step: 2, points: '+25', label: 'First Application', icon: Briefcase },
          { step: 3, points: '+100', label: 'They Get Hired', icon: CheckCircle2 },
        ].map((item, i) => (
          <motion.div
            key={item.step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-muted/50 mx-auto flex items-center justify-center mb-2">
              <item.icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-lg font-extrabold text-success">{item.points}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{item.label}</p>
            {i < 2 && (
              <ChevronRight className="absolute top-4 -right-1 w-4 h-4 text-muted-foreground/30 hidden sm:block" />
            )}
          </motion.div>
        ))}
      </div>
    </CardContent>
  </Card>
);

/* ── Single referral row ── */
const ReferralRow = ({ ref: referral, onCopy }: { ref: Referral; onCopy: (code: string) => void }) => {
  const config = STATUS_CONFIG[referral.status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', config.bg)}>
        <Icon className={cn('w-5 h-5', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-mono font-semibold text-foreground">{referral.referral_code}</p>
          <Badge variant="outline" className={cn('text-[10px] h-5', config.bg, config.color, 'border-0')}>
            {config.label}
          </Badge>
        </div>
        {referral.job_title ? (
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <Briefcase className="w-3 h-3 shrink-0" />
            {referral.job_title} at {referral.company_name}
            {(referral.bounty_amount ?? 0) > 0 && (
              <Badge className="ml-1 h-4 text-[9px] px-1.5 bg-primary/10 text-primary border-0">
                🏆 {referral.bounty_amount} pts
              </Badge>
            )}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(referral.created_at).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {referral.points_earned > 0 && (
          <Badge className="bg-success/15 text-success border-0 text-xs font-bold">
            +{referral.points_earned}
          </Badge>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onCopy(referral.referral_code)}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy Link</TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
};

/* ── Bounty job card ── */
const BountyJobCard = ({ job, onRefer }: { job: BountyJob; onRefer: (jobId: string) => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2 }}
    className="group"
  >
    <Card className="border border-border/50 hover:border-primary/30 transition-colors overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-foreground truncate">{job.title}</h4>
            <p className="text-xs text-muted-foreground">{job.company_name}</p>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary/15 to-success/15 border border-primary/20">
            <Trophy className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-extrabold text-primary">{job.referral_bounty}</span>
            <span className="text-[10px] text-muted-foreground">pts</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onRefer(job.id)}
            className="flex-1 rounded-xl gap-1.5 text-xs"
          >
            <Share2 className="w-3.5 h-3.5" /> Refer & Earn
          </Button>
          <Button size="sm" variant="outline" asChild className="rounded-xl text-xs px-3">
            <a href={`/jobs/${job.id}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

/* ── Points history item ── */
const PointsHistoryItem = ({ entry }: { entry: PointEntry }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{entry.action}</p>
      {entry.description && (
        <p className="text-xs text-muted-foreground truncate">{entry.description}</p>
      )}
    </div>
    <div className="text-right shrink-0 ml-3">
      <span className={cn(
        'text-sm font-bold',
        entry.points > 0 ? 'text-success' : 'text-destructive'
      )}>
        {entry.points > 0 ? '+' : ''}{entry.points}
      </span>
      <p className="text-[10px] text-muted-foreground">
        {new Date(entry.created_at).toLocaleDateString()}
      </p>
    </div>
  </div>
);

/* ── Main Component ── */
export const ReferralDashboard = ({ profileId }: { profileId: string }) => {
  const { profile } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [points, setPoints] = useState<PointEntry[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bountyJobs, setBountyJobs] = useState<BountyJob[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [profileId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: refs }, { data: pts }, { data: jobs }] = await Promise.all([
        supabase.from('referrals').select('*').eq('referrer_id', profileId).order('created_at', { ascending: false }),
        supabase.from('reward_points').select('*').eq('user_id', profileId).order('created_at', { ascending: false }).limit(20),
        supabase.from('jobs').select('id, title, referral_bounty, employers!jobs_employer_id_fkey(company_name)')
          .gt('referral_bounty', 0).eq('is_active', true).eq('status', 'open').order('referral_bounty', { ascending: false }).limit(20),
      ]);

      const jobIds = (refs || []).filter(r => r.job_id).map(r => r.job_id);
      let jobMap = new Map<string, { title: string; company_name: string; referral_bounty: number }>();
      if (jobIds.length > 0) {
        const { data: refJobs } = await supabase
          .from('jobs')
          .select('id, title, referral_bounty, employers!jobs_employer_id_fkey(company_name)')
          .in('id', jobIds);
        (refJobs || []).forEach((j: any) => {
          jobMap.set(j.id, { title: j.title, company_name: j.employers?.company_name || '', referral_bounty: j.referral_bounty || 0 });
        });
      }

      const enrichedRefs: Referral[] = (refs || []).map(r => ({
        ...r,
        job_title: r.job_id ? jobMap.get(r.job_id)?.title : undefined,
        company_name: r.job_id ? jobMap.get(r.job_id)?.company_name : undefined,
        bounty_amount: r.job_id ? jobMap.get(r.job_id)?.referral_bounty : undefined,
      }));

      setReferrals(enrichedRefs);
      setPoints(pts || []);
      setTotalPoints((pts || []).reduce((sum, p) => sum + p.points, 0));
      setBountyJobs((jobs || []).map((j: any) => ({
        id: j.id,
        title: j.title,
        referral_bounty: j.referral_bounty,
        company_name: j.employers?.company_name || 'Company',
      })));
    } catch (err) {
      console.error('Error fetching referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'HFJ-';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const createReferral = async (jobId?: string) => {
    if (!profile) return;
    try {
      const code = generateReferralCode();
      const { error } = await supabase.from('referrals').insert({
        referrer_id: profileId,
        referral_code: code,
        ...(jobId ? { job_id: jobId } : {}),
      });

      if (error) throw error;

      const link = `${window.location.origin}/signup?ref=${code}`;
      await navigator.clipboard.writeText(link);
      setCopiedCode(code);
      toast.success('Referral link copied to clipboard!');
      setTimeout(() => setCopiedCode(null), 2000);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create referral');
    }
  };

  const copyLink = async (code: string) => {
    const link = `${window.location.origin}/signup?ref=${code}`;
    await navigator.clipboard.writeText(link);
    setCopiedCode(code);
    toast.success('Link copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const hiredCount = referrals.filter(r => r.status === 'hired').length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 rounded-xl bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <HeroBanner totalPoints={totalPoints} referralCount={referrals.length} hiredCount={hiredCount} />

      {/* How it works */}
      <HowItWorks />

      {/* Tabs */}
      <Tabs defaultValue="refer">
        <TabsList className="w-full grid grid-cols-3 h-11 bg-muted/30 rounded-xl p-1">
          <TabsTrigger value="refer" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Refer &</span> Earn
          </TabsTrigger>
          <TabsTrigger value="bounties" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
            <Target className="w-4 h-4" />
            Bounties
            {bountyJobs.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{bountyJobs.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
            <Trophy className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Refer & Earn Tab */}
        <TabsContent value="refer" className="space-y-4 mt-4">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-5 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center">
                <Gift className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Invite Friends & Earn Points</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Share your unique link and earn up to <span className="font-bold text-success">135 points</span> per successful hire
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => createReferral()}
                className="w-full sm:w-auto rounded-xl gap-2 px-8"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {copiedCode ? 'Copied!' : 'Generate Referral Link'}
              </Button>
            </CardContent>
          </Card>

          {/* Referral list */}
          {referrals.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Your Referrals
                  <Badge variant="secondary" className="ml-auto">{referrals.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <AnimatePresence>
                  {referrals.slice(0, 10).map(ref => (
                    <ReferralRow key={ref.id} ref={ref} onCopy={copyLink} />
                  ))}
                </AnimatePresence>
                {referrals.length > 10 && (
                  <p className="text-xs text-center text-muted-foreground pt-2">
                    +{referrals.length - 10} more referrals
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {referrals.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No referrals yet</p>
              <p className="text-sm">Generate your first link above to start earning!</p>
            </div>
          )}
        </TabsContent>

        {/* Bounties Tab */}
        <TabsContent value="bounties" className="space-y-4 mt-4">
          <Card className="border-warning/20 bg-gradient-to-br from-warning/5 to-transparent">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-warning-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Job Bounties</h3>
                <p className="text-xs text-muted-foreground">
                  Refer someone for these jobs and earn <span className="font-semibold">bonus points</span> when they get hired
                </p>
              </div>
            </CardContent>
          </Card>

          {bountyJobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No bounty jobs available</p>
              <p className="text-sm">Check back later for new opportunities</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {bountyJobs.map(job => (
                <BountyJobCard key={job.id} job={job} onRefer={createReferral} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4 mt-4">
          {points.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No points history yet</p>
              <p className="text-sm">Start referring to earn your first points!</p>
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Points Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {points.map(entry => (
                  <PointsHistoryItem key={entry.id} entry={entry} />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Tier guide */}
      <Card className="border border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Medal className="w-4 h-4 text-primary" />
            Referral Tiers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
            {TIERS.map((tier, i) => {
              const TierIcon = tier.icon;
              const isActive = totalPoints >= tier.minPoints;
              const isCurrent = totalPoints >= tier.minPoints && (i === TIERS.length - 1 || totalPoints < TIERS[i + 1].minPoints);
              return (
                <Tooltip key={tier.name}>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all shrink-0',
                      isCurrent && 'bg-primary/10 ring-2 ring-primary/30',
                      !isActive && 'opacity-40'
                    )}>
                      <TierIcon className={cn('w-5 h-5', isActive ? tier.color : 'text-muted-foreground')} />
                      <span className="text-[10px] font-semibold text-foreground">{tier.name}</span>
                      <span className="text-[9px] text-muted-foreground">{tier.minPoints}+</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{tier.minPoints}+ points to unlock {tier.name}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
