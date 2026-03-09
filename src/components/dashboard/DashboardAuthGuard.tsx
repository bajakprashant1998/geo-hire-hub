import { ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ChevronRight, Sparkles, MapPin, Zap, Building2, Users, User, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DashboardAuthGuardProps {
  type: 'candidate' | 'employer';
  authLoading: boolean;
  profileLoading: boolean;
  profileResolved: boolean;
  user: any;
  profile: any;
  refreshProfile: () => void;
  signOut: () => void;
  children: ReactNode;
}

export const DashboardAuthGuard = ({
  type,
  authLoading,
  profileLoading,
  profileResolved,
  user,
  profile,
  refreshProfile,
  signOut,
  children,
}: DashboardAuthGuardProps) => {
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (user && !profile && !profileResolved) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <DashboardUnauthenticatedView type={type} />;
  }

  if (!profile) {
    const Icon = type === 'employer' ? Building2 : User;
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Icon className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">Profile Not Found</h2>
            <p className="text-muted-foreground mb-8">We couldn't load your profile. Please try again or contact support.</p>
            <div className="flex gap-3">
              <Button onClick={() => refreshProfile()} variant="outline" className="flex-1">Retry</Button>
              <Button onClick={() => signOut()} variant="destructive" className="flex-1">Sign Out</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

const DashboardUnauthenticatedView = ({ type }: { type: 'candidate' | 'employer' }) => {
  const navigate = useNavigate();
  const isEmployer = type === 'employer';
  const HeroIcon = isEmployer ? Building2 : Briefcase;
  const title = isEmployer ? 'Build Your Dream Team' : 'Your Career Starts Here';
  const subtitle = isEmployer
    ? 'Sign in to manage job postings, discover top talent, and streamline your hiring process.'
    : 'Sign in to access your personalized dashboard, AI-powered job matching, and one-click applications.';
  const badges = isEmployer
    ? ['Verified Employers', 'AI Screening', 'Smart Hiring']
    : ['10K+ Jobs', '5K+ Companies', 'AI Powered'];
  const features = isEmployer
    ? [
        { icon: Users, label: 'Top Talent', color: 'text-primary bg-primary/10' },
        { icon: MapPin, label: 'Local Hiring', color: 'text-success bg-success/10' },
        { icon: Sparkles, label: 'AI Screening', color: 'text-warning-foreground bg-warning/20' },
      ]
    : [
        { icon: Sparkles, label: 'AI Matching', color: 'text-primary bg-primary/10' },
        { icon: MapPin, label: 'Local Jobs', color: 'text-success bg-success/10' },
        { icon: Zap, label: 'Auto Apply', color: 'text-warning-foreground bg-warning/20' },
      ];
  const whyText = isEmployer ? 'Why employers love us' : 'Why candidates love us';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <motion.div animate={{ x: [0, -25, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }} className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/12 rounded-full blur-3xl" />
        <motion.div animate={{ x: [0, 15, 0], y: [0, 15, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }} className="absolute top-10 right-1/4 w-48 h-48 bg-primary/6 rounded-full blur-2xl" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 70, damping: 18 }} className="relative z-10 w-full max-w-md">
        <div className="flex justify-center gap-2 mb-5">
          {badges.map((text, i) => (
            <motion.div key={text} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.1 }} className="px-3 py-1 rounded-full bg-card/80 backdrop-blur-md border border-border/40 shadow-sm">
              <span className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">{text}</span>
            </motion.div>
          ))}
        </div>

        <Card className="shadow-2xl shadow-primary/5 border border-border/40 backdrop-blur-xl bg-card/90 rounded-3xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary/60" />
          <CardContent className="p-8 sm:p-10 text-center">
            <motion.div initial={{ scale: 0.3, opacity: 0, rotate: -20 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 180, damping: 14 }} className="relative mx-auto mb-8 w-24 h-24">
              <motion.div animate={{ rotate: [6, 8, 6] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} className="absolute inset-0 bg-primary/15 rounded-3xl" />
              <motion.div animate={{ rotate: [-3, -5, -3] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} className="absolute inset-0 bg-primary/10 rounded-3xl" />
              <div className="relative w-full h-full bg-gradient-to-br from-primary to-primary/80 rounded-3xl flex items-center justify-center shadow-xl shadow-primary/30">
                <HeroIcon className="w-11 h-11 text-primary-foreground drop-shadow-sm" />
              </div>
              <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }} className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="w-3 h-3 text-accent-foreground" />
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground tracking-tight">{title}</h2>
              <p className="text-muted-foreground mb-8 text-sm sm:text-base leading-relaxed max-w-sm mx-auto">{subtitle}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
              <Button onClick={() => navigate('/login')} className="w-full h-13 text-base font-semibold rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200" size="lg">
                Sign In to Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button onClick={() => navigate('/signup')} variant="ghost" className="w-full h-11 text-sm rounded-2xl hover:bg-primary/5 text-muted-foreground hover:text-foreground" size="lg">
                New here? <span className="font-semibold text-primary ml-1">Create an account</span>
              </Button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-8 pt-6 border-t border-border/30">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold mb-3">{whyText}</p>
              <div className="grid grid-cols-3 gap-2">
                {features.map((feat, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.55 + i * 0.08 }} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-muted/30 hover:bg-muted/60 transition-colors cursor-default group">
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110', feat.color)}>
                      <feat.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">{feat.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </CardContent>
        </Card>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-center text-xs text-muted-foreground/50 mt-6">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="underline hover:text-foreground/70 transition-colors">Terms</Link>{' & '}
          <Link to="/privacy" className="underline hover:text-foreground/70 transition-colors">Privacy Policy</Link>
        </motion.p>
      </motion.div>
    </div>
  );
};
