import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Briefcase, Users, X, Sparkles, ArrowRight, Globe2, UserPlus, LogIn, Zap, Building2, Star, Target, Shield, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface WelcomeOverlayProps {
  onDismiss: () => void;
  onFindJobs: () => void;
  onFindTalent: () => void;
}

const STORAGE_KEY = 'hfj_welcome_dismissed';

// Animated counter component
const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value <= 0) return;
    let frame: number;
    const duration = 1200;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{display}</>;
};

export const WelcomeOverlay = ({ onDismiss, onFindJobs, onFindTalent }: WelcomeOverlayProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [liveStats, setLiveStats] = useState({ jobs: 0, candidates: 0, employers: 0 });
  const [testimonial, setTestimonial] = useState<{ author_name: string; company_name: string; quote: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setIsVisible(true), 500);
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

  useEffect(() => {
    const fetchTestimonial = async () => {
      const { data } = await supabase
        .from('employer_testimonials')
        .select('author_name, company_name, quote')
        .eq('is_featured', true)
        .eq('is_approved', true)
        .order('sort_order')
        .limit(1)
        .maybeSingle();
      if (data) setTestimonial(data);
    };
    fetchTestimonial();
  }, []);

  const handleDismiss = (dontShowAgain = false) => {
    setIsVisible(false);
    if (dontShowAgain) localStorage.setItem(STORAGE_KEY, 'true');
    setTimeout(onDismiss, 300);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.06 } },
    exit: { opacity: 0 },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
  };

  const features = [
    { icon: Target, text: 'Nearby Jobs', desc: 'Map-based discovery', iconClass: 'text-destructive', bgClass: 'bg-destructive/10' },
    { icon: Sparkles, text: 'AI Matching', desc: 'Smart job fit', iconClass: 'text-primary', bgClass: 'bg-primary/10' },
    { icon: Shield, text: 'Verified', desc: 'Trusted employers', iconClass: 'text-[hsl(var(--success))]', bgClass: 'bg-[hsl(var(--success))]/10' },
    { icon: Zap, text: 'Auto Apply', desc: 'One-click apply', iconClass: 'text-[hsl(var(--warning))]', bgClass: 'bg-[hsl(var(--warning))]/10' },
  ];

  const stats = [
    { value: liveStats.jobs || 10, suffix: '+', label: 'Active Jobs', icon: Briefcase, color: 'text-destructive' },
    { value: liveStats.candidates || 30, suffix: '+', label: 'Professionals', icon: Users, color: 'text-primary' },
    { value: liveStats.employers || 5, suffix: '+', label: 'Companies', icon: Building2, color: 'text-[hsl(var(--success))]' },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
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
              {/* Hero header */}
              <div className="relative px-6 pt-10 pb-24 text-center overflow-hidden">
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/85 to-[hsl(260,70%,55%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,hsl(var(--destructive)/0.15),transparent_60%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(260,80%,65%,0.2),transparent_50%)]" />

                {/* Dot pattern */}
                <div className="absolute inset-0 opacity-[0.05]" style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                  backgroundSize: '24px 24px',
                }} />

                {/* Floating decorative */}
                <motion.div
                  animate={{ y: [-4, 4, -4], rotate: [0, 8, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-8 right-10 w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center"
                >
                  <MapPin className="w-4 h-4 text-white/60" />
                </motion.div>
                <motion.div
                  animate={{ y: [3, -3, 3] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                  className="absolute bottom-20 left-8 w-8 h-8 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center"
                >
                  <Star className="w-3.5 h-3.5 text-white/60" />
                </motion.div>

                {/* Close */}
                <motion.button
                  variants={itemVariants}
                  onClick={() => handleDismiss(false)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition-all z-10"
                >
                  <X className="w-4 h-4" />
                </motion.button>

                {/* Logo */}
                <motion.div variants={itemVariants} className="mb-5 relative z-10">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 14, stiffness: 180, delay: 0.15 }}
                    className="w-[72px] h-[72px] bg-white/15 backdrop-blur-lg rounded-[22px] flex items-center justify-center mx-auto shadow-2xl ring-1 ring-white/20"
                  >
                    <Globe2 className="w-9 h-9 text-white" />
                  </motion.div>
                </motion.div>

                <motion.h1 variants={itemVariants} className="text-[28px] sm:text-[32px] font-extrabold text-white mb-2.5 tracking-tight relative z-10 leading-[1.1]">
                  Find Jobs Near You
                </motion.h1>
                <motion.p variants={itemVariants} className="text-white/55 text-[13px] max-w-[260px] mx-auto leading-relaxed relative z-10">
                  Discover opportunities within walking distance on an interactive map
                </motion.p>
              </div>

              {/* Features grid – overlapping header */}
              <div className="px-3 sm:px-4 -mt-14 relative z-10">
                <motion.div variants={itemVariants} className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {features.map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.25 + i * 0.05, type: 'spring', stiffness: 350 }}
                      className="flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-default"
                    >
                      <div className={cn('w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center', f.bgClass)}>
                        <f.icon className={cn('w-4 h-4 sm:w-5 sm:h-5', f.iconClass)} />
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] sm:text-[10px] font-bold text-foreground leading-tight block">{f.text}</span>
                        <span className="text-[7px] sm:text-[8px] text-muted-foreground leading-tight">{f.desc}</span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Live Stats */}
              <motion.div variants={itemVariants} className="px-3 sm:px-4 pt-3 sm:pt-4">
                <div className="flex items-center justify-around p-4 rounded-2xl bg-muted/30 border border-border/20">
                  {stats.map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <s.icon className={cn("w-5 h-5", s.color)} />
                      <p className={cn("text-xl font-extrabold leading-none tabular-nums", s.color)}>
                        <AnimatedNumber value={s.value} />{s.suffix}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Testimonial quote */}
              {testimonial && (
                <motion.div variants={itemVariants} className="px-3 sm:px-4 pt-2.5 sm:pt-3">
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="flex gap-2">
                      <Quote className="w-4 h-4 text-primary/40 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                          "{testimonial.quote}"
                        </p>
                        <p className="text-[10px] font-semibold text-foreground mt-1.5">
                          — {testimonial.author_name}, {testimonial.company_name}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Action area */}
              <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-4 sm:pb-5 space-y-2">
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
                  <div className="flex -space-x-2">
                    {['👨‍💻', '👩‍💼', '👨‍🔧', '👩‍🎨', '👨‍⚕️'].map((emoji, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, x: -8 }}
                        animate={{ scale: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.06, type: 'spring', stiffness: 350 }}
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
                  className="w-full text-xs text-muted-foreground/50 hover:text-foreground transition-colors pt-0.5 font-medium"
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
