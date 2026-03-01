import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Share2, Copy, Users, Trophy, Gift, TrendingUp, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Referral {
  id: string;
  referral_code: string;
  referred_email: string | null;
  status: string;
  points_earned: number;
  created_at: string;
}

interface PointEntry {
  id: string;
  points: number;
  action: string;
  description: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: 'bg-muted text-muted-foreground', icon: Clock, label: 'Pending' },
  signed_up: { color: 'bg-blue-100 text-blue-800', icon: Users, label: 'Signed Up' },
  applied: { color: 'bg-amber-100 text-amber-800', icon: TrendingUp, label: 'Applied' },
  hired: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Hired' },
  expired: { color: 'bg-secondary text-muted-foreground', icon: Clock, label: 'Expired' },
};

export const ReferralDashboard = ({ profileId }: { profileId: string }) => {
  const { profile } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [points, setPoints] = useState<PointEntry[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [referralLink, setReferralLink] = useState('');

  useEffect(() => {
    fetchData();
  }, [profileId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: refs }, { data: pts }] = await Promise.all([
        supabase.from('referrals').select('*').eq('referrer_id', profileId).order('created_at', { ascending: false }),
        supabase.from('reward_points').select('*').eq('user_id', profileId).order('created_at', { ascending: false }).limit(20),
      ]);

      setReferrals(refs || []);
      setPoints(pts || []);
      setTotalPoints((pts || []).reduce((sum, p) => sum + p.points, 0));
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

  const createReferral = async () => {
    if (!profile) return;
    try {
      const code = generateReferralCode();
      const { error } = await supabase.from('referrals').insert({
        referrer_id: profileId,
        referral_code: code,
      });

      if (error) throw error;

      const link = `${window.location.origin}/signup?ref=${code}`;
      setReferralLink(link);
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

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-google text-center p-4">
            <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{totalPoints}</p>
            <p className="text-xs text-muted-foreground">Total Points</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="shadow-google text-center p-4">
            <Users className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{referrals.length}</p>
            <p className="text-xs text-muted-foreground">Referrals Sent</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-google text-center p-4">
            <Gift className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">
              {referrals.filter(r => r.status === 'hired').length}
            </p>
            <p className="text-xs text-muted-foreground">Successful Hires</p>
          </Card>
        </motion.div>
      </div>

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

          <Button onClick={createReferral} className="w-full gap-2 rounded-xl">
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
                      <p className="text-xs text-muted-foreground">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{config.label}</Badge>
                    {ref.points_earned > 0 && (
                      <Badge className="bg-green-100 text-green-800 text-xs">+{ref.points_earned}</Badge>
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
    </div>
  );
};
