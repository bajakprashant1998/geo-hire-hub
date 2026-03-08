import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Briefcase, Users, X, Sparkles, ArrowRight, Shield, Globe2, TrendingUp, UserPlus, LogIn, Zap, Building2, Star, Target, Search, Award } from 'lucide-react';
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
    visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
    exit: { opacity: 0 },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 320, damping: 28 } },
  };

  const features = [
    { icon: Target, text: 'Nearby Jobs', desc: 'Map-based', iconClass: 'text-destructive', bgClass: 'bg-destructive/15' },
    { icon: Sparkles, text: 'AI Match', desc: 'Smart fit', iconClass: 'text-primary', bgClass: 'bg-primary/15' },
    { icon: Shield, text: 'Verified', desc: 'Trusted', iconClass: 'text-[hsl(var(--success,142_71%_45%))]', bgClass: 'bg-[hsl(142,71%,45%)]/15' },
    { icon: Zap, text: 'Auto Apply', desc: 'One-click', iconClass: 'text-[hsl(38,92%,50%)]', bgClass: 'bg-[hsl(38,92%,50%)]/15' },
  ];

  const stats = [
    { value: liveStats.jobs || '10+', label: 'Jobs', icon: Briefcase, color: 'text-destructive', bg: 'bg-destructive/10' },
    { value: liveStats.candidates || '30+', label: 'Talent', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { value: liveStats.employers || '5+', label: 'Companies', icon: Building2, color: 'text-[hsl(142,71%,45%)]', bg: 'bg-[hsl(142,71%,45%)]/10' },
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
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => handleDismiss(false)}
          />

          {/* Card */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[440px] z-10 mx-3 mb-3 sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card rounded-[28px] shadow-2xl border border-border/30 overflow-hidden">
              {/* Premium gradient header */}
              <div className="relative px-5 pt-8 pb-20 text-center overflow-hidden">
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-[hsl(var(--chart-1,220_70%_50%))]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--destructive)/0.3),transparent_70%)]" />
                
                {/* Mesh pattern */}
                <div className="absolute inset-0 opacity-[0.06]" style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                  backgroundSize: '20px 20px',
                }} />

                {/* Floating decorative elements */}
                <motion.div 
                  animate={{ y: [-5, 5, -5], rotate: [0, 5, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-6 right-8 w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center"
                >
                  <MapPin className="w-4 h-4 text-white/70" />
                </motion.div>
                <motion.div 
                  animate={{ y: [3, -3, 3], rotate: [0, -5, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="absolute top-16 left-6 w-7 h-7 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center"
                >
                  <Star className="w-3.5 h-3.5 text-white/70" />
                </motion.div>

                {/* Close */}
                <motion.button
                  variants={itemVariants}
                  onClick={() => handleDismiss(false)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition-all z-10"
                >
                  <X className="w-4 h-4" />
                </motion.button>

                {/* Logo icon */}
                <motion.div variants={itemVariants} className="mb-4 relative z-10">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                    className="w-16 h-16 bg-white/15 backdrop-blur-lg rounded-[20px] flex items-center justify-center mx-auto shadow-xl ring-1 ring-white/20"
                  >
                    <Globe2 className="w-8 h-8 text-white" />
                  </motion.div>
                </motion.div>

                <motion.h1 variants={itemVariants} className="text-[26px] sm:text-3xl font-extrabold text-white mb-2 tracking-tight relative z-10 leading-tight">
                  Find Jobs Near You
                </motion.h1>
                <motion.p variants={itemVariants} className="text-white/65 text-sm max-w-[280px] mx-auto leading-relaxed relative z-10">
                  Discover opportunities within walking distance on an interactive map
                </motion.p>
              </div>

              {/* Features grid – overlapping the header */}
              <div className="px-4 -mt-12 relative z-10">
                <motion.div variants={itemVariants} className="grid grid-cols-4 gap-2">
                  {features.map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.06, type: 'spring', stiffness: 300 }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border/40 shadow-lg hover:shadow-xl transition-shadow"
                    >
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', f.bgClass)}>
                        <f.icon className={cn('w-5 h-5', f.iconClass)} />
                      </div>
                      <span className="text-[10px] font-bold text-foreground leading-tight text-center">{f.text}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Live Stats */}
              <motion.div variants={itemVariants} className="px-4 pt-4">
                <div className="flex items-center justify-around p-3.5 rounded-2xl bg-muted/40 border border-border/20">
                  {stats.map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", s.bg)}>
                        <s.icon className={cn("w-4 h-4", s.color)} />
                      </div>
                      <p className={cn("text-lg font-extrabold leading-none", s.color)}>{s.value}</p>
                      <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Action area */}
              <div className="px-4 pt-4 pb-5 space-y-2.5">
                {/* Primary: Register */}
                <motion.div variants={itemVariants}>
                  <Button
                    onClick={() => { handleDismiss(true); navigate('/signup'); }}
                    size="lg"
                    className="w-full h-[52px] rounded-2xl text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <UserPlus className="w-4.5 h-4.5 mr-2" />
                    Create Free Account
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>

                {/* Secondary: Sign In */}
                <motion.div variants={itemVariants}>
                  <Button
                    onClick={() => { handleDismiss(true); navigate('/login'); }}
                    size="lg"
                    variant="outline"
                    className="w-full h-11 rounded-2xl text-sm font-semibold border-2 border-border/60 hover:border-primary/40 group"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Already have an account? Sign In
                  </Button>
                </motion.div>

                {/* Explore buttons */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 gap-2 pt-0.5">
                  <Button
                    onClick={() => { handleDismiss(true); onFindJobs(); }}
                    size="sm"
                    variant="ghost"
                    className="h-10 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 group border border-transparent hover:border-destructive/20"
                  >
                    <Briefcase className="w-3.5 h-3.5 mr-1" />
                    Find Jobs
                    <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                  <Button
                    onClick={() => { handleDismiss(true); onFindTalent(); }}
                    size="sm"
                    variant="ghost"
                    className="h-10 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 group border border-transparent hover:border-primary/20"
                  >
                    <Users className="w-3.5 h-3.5 mr-1" />
                    Hire Talent
                    <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </motion.div>

                {/* Social proof */}
                <motion.div variants={itemVariants} className="flex items-center justify-center gap-2.5 pt-1">
                  <div className="flex -space-x-2.5">
                    {['👨‍💻', '👩‍💼', '👨‍🔧', '👩‍🎨'].map((emoji, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.6 + i * 0.08, type: 'spring', stiffness: 300 }}
                        className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs shadow-sm"
                      >
                        {emoji}
                      </motion.div>
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {liveStats.candidates > 0 ? `${liveStats.candidates}+ professionals` : '10,000+ professionals'} joined
                  </span>
                </motion.div>

                <motion.button
                  variants={itemVariants}
                  onClick={() => handleDismiss(true)}
                  className="w-full text-xs text-muted-foreground/60 hover:text-foreground transition-colors pt-0.5 font-medium"
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
