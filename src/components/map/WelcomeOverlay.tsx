import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Briefcase, Users, X, Sparkles, ArrowRight, Shield, Globe2, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WelcomeOverlayProps {
  onDismiss: () => void;
  onFindJobs: () => void;
  onFindTalent: () => void;
}

const STORAGE_KEY = 'hfj_welcome_dismissed';

export const WelcomeOverlay = ({ onDismiss, onFindJobs, onFindTalent }: WelcomeOverlayProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setIsVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = (dontShowAgain = false) => {
    setIsVisible(false);
    if (dontShowAgain) localStorage.setItem(STORAGE_KEY, 'true');
    setTimeout(onDismiss, 300);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
    exit: { opacity: 0 },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
  };

  const features = [
    { icon: MapPin, text: 'Nearby Jobs', color: 'bg-destructive/20 text-destructive' },
    { icon: Sparkles, text: 'AI Matching', color: 'bg-primary/20 text-primary' },
    { icon: Shield, text: 'Verified', color: 'bg-emerald-500/20 text-emerald-600' },
    { icon: TrendingUp, text: 'Real-time', color: 'bg-warning/20 text-warning' },
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => handleDismiss(false)}
          />

          {/* Card */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-md z-10 mx-4 mb-4 sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card rounded-3xl shadow-2xl border border-border/30 overflow-hidden">
              {/* Gradient header */}
              <div className="relative bg-gradient-to-br from-primary via-primary/90 to-destructive/80 px-6 pt-8 pb-10 text-center">
                {/* Close */}
                <motion.button
                  variants={itemVariants}
                  onClick={() => handleDismiss(false)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>

                {/* Logo */}
                <motion.div variants={itemVariants} className="mb-4">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                    className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto"
                  >
                    <Globe2 className="w-8 h-8 text-white" />
                  </motion.div>
                </motion.div>

                <motion.h1 variants={itemVariants} className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Find Jobs Near You
                </motion.h1>
                <motion.p variants={itemVariants} className="text-white/75 text-sm sm:text-base max-w-xs mx-auto">
                  Discover opportunities within walking distance on an interactive map
                </motion.p>
              </div>

              {/* Features grid */}
              <div className="px-6 -mt-5">
                <motion.div variants={itemVariants} className="grid grid-cols-4 gap-2">
                  {features.map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/50 shadow-sm"
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', f.color)}>
                        <f.icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground">{f.text}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* CTAs */}
              <div className="px-6 pt-5 pb-6 space-y-3">
                <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => { handleDismiss(true); onFindJobs(); }}
                    size="lg"
                    className="h-13 rounded-2xl text-sm font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg group"
                  >
                    <Briefcase className="w-4 h-4 mr-1.5" />
                    Find Jobs
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                  <Button
                    onClick={() => { handleDismiss(true); onFindTalent(); }}
                    size="lg"
                    variant="outline"
                    className="h-13 rounded-2xl text-sm font-semibold border-2 group"
                  >
                    <Users className="w-4 h-4 mr-1.5" />
                    Hire Talent
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </motion.div>

                {/* Social proof */}
                <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 pt-1">
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
                  <span className="text-xs text-muted-foreground">10,000+ users finding local jobs</span>
                </motion.div>

                <motion.button
                  variants={itemVariants}
                  onClick={() => handleDismiss(true)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
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
