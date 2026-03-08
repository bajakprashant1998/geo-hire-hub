import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Share2, Copy, Users, Trophy, Gift, TrendingUp, CheckCircle2, Clock, Loader2, Briefcase, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: 'bg-muted text-muted-foreground', icon: Clock, label: 'Pending' },
  signed_up: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Users, label: 'Signed Up' },
  applied: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: TrendingUp, label: 'Applied' },
  hired: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle2, label: 'Hired' },
  expired: { color: 'bg-secondary text-muted-foreground', icon: Clock, label: 'Expired' },
};

export const ReferralDashboard = ({ profileId }: { profileId: string }) => {
  const { profile } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [points, setPoints] = useState<PointEntry[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bountyJobs, setBountyJobs] = useState<BountyJob[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'bounties'>('overview');

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

      // Enrich referrals with job data
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
      toast.success('Referral link copied to clipboard!');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create referral');
    }
  };

  const copyLink = async (code: string) => {
    const link = `${window.location.origin}/signup?ref=${code}`;
    await navigator.clipboard.writeText(link);
    toast.success('Link copied!');
  };

  if (loading) {
    return (
      <Card className="shadow-google">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const bountyReferrals = referrals.filter(r => r.job_id);
  const generalReferrals = referrals.filter(r => !r.job_id);
  const earnedFromBounties = bountyReferrals.filter(r => r.status === 'hired').reduce((sum, r) => sum + (r.bounty_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Trophy, label: 'Total Points', value: totalPoints, color: 'text-amber-400' },
          { icon: Users, label: 'Referrals Sent', value: referrals.length, color: 'text-primary' },
          { icon: Gift, label: 'Successful Hires', value: referrals.filter(r => r.status === 'hired').length, color: 'text-green-500' },
          { icon: Target, label: 'Bounty Earned', value: earnedFromBounties, color: 'text-primary' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="shadow-google text-center p-4">
              <stat.icon className={`w-8 h-8 ${stat.color} mx-auto mb-2`} />
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('overview')}
          className="rounded-xl gap-1.5"
        >
          <Share2 className="w-3.5 h-3.5" /> Refer & Earn
        </Button>
        <Button
          variant={activeTab === 'bounties' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('bounties')}
          className="rounded-xl gap-1.5"
        >
          <Target className="w-3.5 h-3.5" /> Job Bounties
          {bountyJobs.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 text-[10px] px-1.5">{bountyJobs.length}</Badge>
          )}
        </Button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Generate Referral */}
          <Card className="shadow-google">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Refer & Earn
              </CardTitle>
              <CardDescription>
                Share your referral link and earn points when friends sign up, apply, or get hired
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-secondary rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-3 text-center text-xs">
                  <div>
                    <p className="font-bold text-lg text-foreground">+10</p>
                    <p className="text-muted-foreground">Sign Up</p>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-foreground">+25</p>
                    <p className="text-muted-foreground">First Apply</p>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-foreground">+100</p>
                    <p className="text-muted-foreground">Gets Hired</p>
                  </div>
                </div>
              </div>

              <Button onClick={() => createReferral()} className="w-full gap-2 rounded-xl">
                <Share2 className="w-4 h-4" />
                Generate & Copy Referral Link
              </Button>
            </CardContent>
          </Card>

          {/* Referral History */}
          {referrals.length > 0 && (
            <Card className="shadow-google">
              <CardHeader>
                <CardTitle className="text-base">Your Referrals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {referrals.map(ref => {
                  const config = STATUS_CONFIG[ref.status] || STATUS_CONFIG.pending;
                  const Icon = config.icon;
                  return (
                    <div key={ref.id} className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium font-mono">{ref.referral_code}</p>
                          {ref.job_title ? (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Briefcase className="w-3 h-3" /> {ref.job_title} at {ref.company_name}
                              {(ref.bounty_amount ?? 0) > 0 && (
                                <Badge variant="outline" className="ml-1 h-4 text-[9px] px-1 text-primary border-primary/30">
                                  🏆 {ref.bounty_amount} pts
                                </Badge>
                              )}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {new Date(ref.created_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{config.label}</Badge>
                        {ref.points_earned > 0 && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">+{ref.points_earned}</Badge>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLink(ref.referral_code)}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Points History */}
          {points.length > 0 && (
            <Card className="shadow-google">
              <CardHeader>
                <CardTitle className="text-base">Points History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {points.map(pt => (
                  <div key={pt.id} className="flex items-center justify-between p-2">
                    <div>
                      <p className="text-sm font-medium">{pt.action}</p>
                      {pt.description && <p className="text-xs text-muted-foreground">{pt.description}</p>}
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${pt.points > 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {pt.points > 0 ? '+' : ''}{pt.points}
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(pt.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {activeTab === 'bounties' && (
        <div className="space-y-4">
          <Card className="shadow-google border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Job Bounties</h3>
                  <p className="text-xs text-muted-foreground">Refer candidates for these jobs and earn bonus points when they get hired!</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {bountyJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No bounty jobs available right now</p>
              <p className="text-xs mt-1">Check back later for new opportunities</p>
            </div>
          ) : (
            bountyJobs.map((job, i) => (
              <motion.div key={job.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="shadow-google hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-foreground truncate">{job.title}</h4>
                        <p className="text-xs text-muted-foreground">{job.company_name}</p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0 gap-1">
                        <Trophy className="w-3 h-3" /> {job.referral_bounty} pts
                      </Badge>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => createReferral(job.id)} className="flex-1 rounded-xl gap-1.5 text-xs">
                        <Share2 className="w-3.5 h-3.5" /> Refer Someone
                      </Button>
                      <Button size="sm" variant="ghost" asChild className="rounded-xl text-xs">
                        <a href={`/jobs/${job.id}`} target="_blank" rel="noopener noreferrer">
                          <Briefcase className="w-3.5 h-3.5 mr-1" /> View Job
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}

          {/* Bounty Referral History */}
          {bountyReferrals.length > 0 && (
            <Card className="shadow-google">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Your Bounty Referrals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bountyReferrals.map(ref => {
                  const config = STATUS_CONFIG[ref.status] || STATUS_CONFIG.pending;
                  const Icon = config.icon;
                  return (
                    <div key={ref.id} className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{ref.job_title || 'Job'}</p>
                          <p className="text-xs text-muted-foreground">{ref.company_name} · {ref.referral_code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{config.label}</Badge>
                        {ref.status === 'hired' && (ref.bounty_amount ?? 0) > 0 && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">+{ref.bounty_amount}</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
