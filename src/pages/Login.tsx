import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, MapPin, Loader2, Users, Briefcase, Shield, CheckCircle2, Sparkles, TrendingUp, Globe2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { motion, AnimatePresence } from 'framer-motion';
import { SEOHead } from '@/components/SEOHead';
import { useGoogleOAuthSettings } from '@/hooks/useGoogleOAuthSettings';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'candidate' | 'employer'>('candidate');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [liveStats, setLiveStats] = useState({ jobs: 0, companies: 0, seekers: 0 });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { isEnabledFor: isGoogleEnabledFor } = useGoogleOAuthSettings();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [jobsRes, employersRes, candidatesRes] = await Promise.all([
          supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open').eq('is_active', true),
          supabase.from('employers').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'candidate'),
        ]);
        setLiveStats({
          jobs: jobsRes.count || 0,
          companies: employersRes.count || 0,
          seekers: candidatesRes.count || 0,
        });
      } catch {
        // Keep default 0 values on error
      }
    };
    fetchStats();
  }, []);

  const getSmartRedirect = async (userId: string, userTypeVal: string, profileCompleted: boolean) => {
    if (!profileCompleted) return '/profile-setup';

    try {
      if (userTypeVal === 'employer') {
        const { data: emp } = await supabase
          .from('employers')
          .select('profile_completeness')
          .eq('profile_id', (await supabase.from('profiles').select('id').eq('user_id', userId).single()).data?.id || '')
          .maybeSingle();
        if (emp && (emp.profile_completeness ?? 0) >= 80) {
          return '/employer-dashboard?tab=candidates';
        }
        return '/employer-dashboard';
      } else {
        // For candidates, check if key fields are filled
        const { data: prof } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userId)
          .single();
        if (prof) {
          const { data: cand } = await supabase
            .from('candidates')
            .select('job_title, skills, bio, experience_years')
            .eq('profile_id', prof.id)
            .maybeSingle();
          if (cand) {
            let score = 0;
            if (cand.job_title && cand.job_title !== 'Not specified') score += 30;
            if (cand.skills && (cand.skills as string[]).length > 0) score += 25;
            if (cand.bio && cand.bio.length > 10) score += 25;
            if (cand.experience_years != null) score += 20;
            if (score >= 80) return '/candidate-dashboard?tab=job-radar';
          }
        }
        return '/candidate-dashboard';
      }
    } catch {
      return userTypeVal === 'employer' ? '/employer-dashboard' : '/candidate-dashboard';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_type, profile_completed')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (profileData && profileData.user_type) {
        if (profileData.user_type !== userType) {
          await supabase.auth.signOut();
          const expectedTab = profileData.user_type === 'employer' ? 'Employer' : 'Job Seeker';
          toast.error(`This email is registered as an ${expectedTab}. Please switch tabs to log in.`);
          return;
        }
      }

      toast.success('Welcome back!');
      const redirect = await getSmartRedirect(data.user.id, profileData?.user_type || userType, profileData?.profile_completed ?? false);
      navigate(redirect);
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
        toast.error('Service temporarily unavailable. Please check your connection and try again.');
      } else {
        toast.error(msg || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      sessionStorage.setItem('preferred_role', userType);
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
        extraParams: { prompt: 'select_account' },
      });
      if (result?.error) throw result.error;
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
        toast.error('Service temporarily unavailable. Please check your connection and try again.');
      } else {
        toast.error(msg || 'Google login failed');
      }
      setGoogleLoading(false);
    }
  };

  const features = [
    { icon: MapPin, label: 'Location-Based Matching', desc: 'Find jobs near you' },
    { icon: Sparkles, label: 'AI-Powered Insights', desc: 'Smart career recommendations' },
    { icon: TrendingUp, label: 'Career Growth', desc: 'Track your progress' },
    { icon: Globe2, label: 'Global Reach', desc: 'Opportunities worldwide' },
  ];

  return (
    <div className="min-h-screen flex">
      <SEOHead title="Login – Hire For Job | Find Jobs Near Me" description="Sign in to Hire For Job to find jobs near me, manage applications, and connect with employers hiring near you." canonicalUrl="https://www.hireforjob.com/login" noindex />

      {/* Left side - Premium Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Multi-layer gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/50 via-transparent to-transparent" />

        {/* Animated orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-16 left-8 w-80 h-80 bg-white rounded-full blur-[100px] pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-16 right-8 w-96 h-96 bg-white rounded-full blur-[120px] pointer-events-none"
        />
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.04, 0.1, 0.04] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute top-1/2 left-1/3 w-64 h-64 bg-white rounded-full blur-[80px] pointer-events-none"
        />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        <div className="relative z-10 flex flex-col justify-between px-12 xl:px-16 py-12 w-full">
          {/* Logo */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg shadow-black/10">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-2xl text-white tracking-tight">Hire for Job</span>
            </div>
          </motion.div>

          {/* Hero text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="space-y-8"
          >
            <div>
              <h1 className="text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
                Your Next
                <br />
                <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                  Career Move
                </span>
                <br />
                Starts Here
              </h1>
              <p className="text-lg text-white/70 mt-6 max-w-lg leading-relaxed">
                Join thousands of professionals discovering their perfect role through AI-powered, location-based job matching.
              </p>
            </div>

            {/* Feature pills */}
            <div className="grid grid-cols-2 gap-3">
              {features.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.label}</p>
                    <p className="text-xs text-white/60">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex items-center gap-8 bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-8 py-5"
          >
            {[
              { val: liveStats.jobs, label: 'Active Jobs', icon: Briefcase },
              { val: liveStats.companies, label: 'Companies', icon: Globe2 },
              { val: liveStats.seekers, label: 'Job Seekers', icon: Users },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-white/80" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white tabular-nums">{s.val.toLocaleString()}+</div>
                  <div className="text-xs text-white/60 font-medium">{s.label}</div>
                </div>
                {i < 2 && <div className="ml-auto w-px h-10 bg-white/15" />}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/3 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[420px] space-y-6 relative z-10"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group text-sm">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to map
          </Link>

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-2">
            <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight">Hire for Job</span>
          </div>

          {/* Form card */}
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-7 space-y-6 shadow-xl shadow-black/5">
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">Sign in to continue your journey</p>
            </div>

            {/* User type toggle */}
            <div className="flex bg-muted/50 rounded-xl p-1">
              {[
                { type: 'candidate' as const, icon: Users, label: 'Job Seeker' },
                { type: 'employer' as const, icon: Briefcase, label: 'Employer' },
              ].map((tab) => (
                <button
                  key={tab.type}
                  type="button"
                  onClick={() => setUserType(tab.type)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${userType === tab.type
                    ? 'bg-background text-foreground shadow-md shadow-black/5'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Google Sign In */}
            {isGoogleEnabledFor(userType) && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-sm font-medium border-2 gap-3 rounded-xl hover:bg-muted/50 transition-all duration-200 hover:shadow-md"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                >
                  {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  Continue with Google
                </Button>
              </>
            )}
            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card/60 px-3 text-muted-foreground font-medium tracking-wider">or</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${focusedField === 'email' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="h-11 pl-10 text-sm border-border/50 rounded-xl bg-background/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${focusedField === 'password' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="h-11 pl-10 pr-10 text-sm border-border/50 rounded-xl bg-background/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 mt-2"
                disabled={loading}
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in...
                    </motion.div>
                  ) : (
                    <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      Sign In
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </form>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-5 pt-1">
              {[
                { icon: Shield, label: 'SSL Secured' },
                { icon: CheckCircle2, label: 'Data Protected' },
              ].map((badge) => (
                <div key={badge.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <badge.icon className="w-3.5 h-3.5 text-primary/70" />
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-semibold hover:text-primary/80 transition-colors">
              Create account
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground/70">
            By signing in, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-foreground transition-colors">Terms</Link>{' '}and{' '}
            <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
