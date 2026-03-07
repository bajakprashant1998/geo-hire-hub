import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Briefcase, Users, X, Sparkles, ArrowRight, Shield, Globe2, TrendingUp, UserPlus, LogIn, Zap, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface WelcomeOverlayProps {
  onDismiss: () => void;
  onFindJobs: () => void;
  onFindTalent: () => void;
}

const STORAGE_KEY = 'hfj_welcome_dismissed';

export const WelcomeOverlay = ({ onDismiss, onFindJobs, onFindTalent }: WelcomeOverlayProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [liveStats, setLiveStats] = useState({ jobs: 0, candidates: 0, employers: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setIsVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fetch live stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [jobsRes, candidatesRes, employersRes] = await Promise.all([
          supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open').eq('is_active', true),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'candidate'),
          supabase.from('employers').select('id', { count: 'exact', head: true }),
        ]);
        setLiveStats({
          jobs: jobsRes.count || 0,
          candidates: candidatesRes.count || 0,
          employers: employersRes.count || 0,
        });
      } catch { /* silent */ }
    };
    fetchStats();
  }, []);

  const handleDismiss = (dontShowAgain = false) => {
    setIsVisible(false);
    if (dontShowAgain) localStorage.setItem(STORAGE_KEY, 'true');
    setTimeout(onDismiss, 300);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
    exit: { opacity: 0 },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
  };

  const features = [
    { icon: MapPin, text: 'Nearby Jobs', iconClass: 'text-destructive', bgClass: 'bg-destructive/20' },
    { icon: Sparkles, text: 'AI Matching', iconClass: 'text-primary', bgClass: 'bg-primary/20' },
    { icon: Shield, text: 'Verified', iconClass: 'text-[hsl(142,71%,35%)]', bgClass: 'bg-[hsl(142,71%,35%)]/20' },
    { icon: Zap, text: 'Auto Apply', iconClass: 'text-[hsl(38,92%,45%)]', bgClass: 'bg-[hsl(38,92%,45%)]/20' },
  ];

  const stats = [
    { value: liveStats.jobs || '10+', label: 'Active Jobs', color: 'text-destructive' },
    { value: liveStats.candidates || '30+', label: 'Candidates', color: 'text-primary' },
    { value: liveStats.employers || '5+', label: 'Companies', color: 'text-[hsl(142,71%,35%)]' },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => handleDismiss(false)}
          />

          {/* Card */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[420px] z-10 mx-3 mb-3 sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card rounded-3xl shadow-2xl border border-border/40 overflow-hidden">
              {/* Gradient header */}
              <div className="relative bg-gradient-to-br from-primary via-primary/85 to-destructive/70 px-5 pt-7 pb-16 text-center overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 z-0" />
                <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/8 z-0" />

                {/* Close */}
                <motion.button
                  variants={itemVariants}
                  onClick={() => handleDismiss(false)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white/90 transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>

                {/* Logo */}
                <motion.div variants={itemVariants} className="mb-3">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                    className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto shadow-lg"
                  >
                    <Globe2 className="w-7 h-7 text-white" />
                  </motion.div>
                </motion.div>

                <motion.h1 variants={itemVariants} className="text-2xl sm:text-3xl font-bold text-white mb-1.5 tracking-tight">
                  Find Jobs Near You
                </motion.h1>
                <motion.p variants={itemVariants} className="text-white/70 text-sm max-w-[260px] mx-auto leading-relaxed">
                  Discover opportunities within walking distance on an interactive map
                </motion.p>
              </div>

              {/* Features grid – overlapping the header */}
              <div className="px-4 -mt-8 relative z-10">
                <motion.div variants={itemVariants} className="grid grid-cols-4 gap-2.5">
                  {features.map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 + i * 0.06 }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border shadow-md"
                    >
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', f.bgClass)}>
                        <f.icon className={cn('w-5 h-5', f.iconClass)} />
                      </div>
                      <span className="text-[11px] font-bold text-foreground leading-tight">{f.text}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Live Stats Bar */}
              <motion.div variants={itemVariants} className="px-4 pt-4">
                <div className="flex items-center justify-around p-3 rounded-xl bg-muted/50 border border-border/30">
                  {stats.map((s, i) => (
                    <div key={i} className="text-center">
                      <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Action area */}
              <div className="px-4 pt-3 pb-5 space-y-3">
                {/* Primary: Register */}
                <motion.div variants={itemVariants}>
                  <Button
                    onClick={() => { handleDismiss(true); navigate('/signup'); }}
                    size="lg"
                    className="w-full h-12 rounded-2xl text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg group"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Free Account
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </motion.div>

                {/* Secondary: Sign In */}
                <motion.div variants={itemVariants}>
                  <Button
                    onClick={() => { handleDismiss(true); navigate('/login'); }}
                    size="lg"
                    variant="outline"
                    className="w-full h-11 rounded-2xl text-sm font-semibold border-2 border-border group"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Already have an account? Sign In
                  </Button>
                </motion.div>

                {/* Explore buttons */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    onClick={() => { handleDismiss(true); onFindJobs(); }}
                    size="sm"
                    variant="ghost"
                    className="h-10 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 group"
                  >
                    <Briefcase className="w-3.5 h-3.5 mr-1" />
                    Find Jobs
                    <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                  <Button
                    onClick={() => { handleDismiss(true); onFindTalent(); }}
                    size="sm"
                    variant="ghost"
                    className="h-10 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 group"
                  >
                    <Users className="w-3.5 h-3.5 mr-1" />
                    Hire Talent
                    <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </motion.div>

                {/* Social proof */}
                <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 pt-0.5">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-[9px] font-bold text-primary"
                      >
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {liveStats.candidates > 0 ? `${liveStats.candidates}+ users` : '10,000+ users'} finding local jobs
                  </span>
                </motion.div>

                <motion.button
                  variants={itemVariants}
                  onClick={() => handleDismiss(true)}
                  className="w-full text-xs text-muted-foreground/70 hover:text-foreground transition-colors pt-0.5"
                >
                  Skip and explore the map →
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeOverlay;
