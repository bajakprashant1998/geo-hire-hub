import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Briefcase, Users, X, Sparkles, ArrowRight, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
interface WelcomeOverlayProps {
  onDismiss: () => void;
  onFindJobs: () => void;
  onFindTalent: () => void;
}
const STORAGE_KEY = 'hfj_welcome_dismissed';
export const WelcomeOverlay = ({
  onDismiss,
  onFindJobs,
  onFindTalent
}: WelcomeOverlayProps) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setIsVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);
  const handleDismiss = (dontShowAgain: boolean = false) => {
    setIsVisible(false);
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setTimeout(onDismiss, 300);
  };
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    },
    exit: {
      opacity: 0
    }
  };
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0
    }
  };
  return <AnimatePresence>
      {isVisible && <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop with gradient */}
          <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-destructive/70 backdrop-blur-md" onClick={() => handleDismiss(false)} />

          {/* Content */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="relative w-full max-w-lg z-10" onClick={e => e.stopPropagation()}>
            {/* Close button */}
            <motion.button variants={itemVariants} onClick={() => handleDismiss(false)} className="absolute -top-2 -right-2 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors z-20">
              <X className="w-5 h-5" />
            </motion.button>

            {/* Hero Content */}
            <div className="text-center text-white">
              {/* Logo Animation */}
              <motion.div variants={itemVariants} className="mb-6">
                <motion.div initial={{
              scale: 0,
              rotate: -180
            }} animate={{
              scale: 1,
              rotate: 0
            }} transition={{
              type: 'spring',
              damping: 15,
              stiffness: 200
            }} className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                  <MapPin className="w-10 h-10 text-white" />
                </motion.div>
              </motion.div>

              {/* Title */}
              <motion.h1 variants={itemVariants} className="text-3xl sm:text-4xl font-bold mb-3 text-cyan-50">
                Find Jobs Near You
              </motion.h1>

              <motion.p variants={itemVariants} className="text-white/80 text-base sm:text-lg mb-8 max-w-md mx-auto">
                Discover opportunities within walking distance. Connect with local employers and candidates on an interactive map.
              </motion.p>

              {/* Features */}
              <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-3 mb-8">
                {[{
              icon: MapPin,
              text: 'Location-based'
            }, {
              icon: Sparkles,
              text: 'AI Matching'
            }, {
              icon: Shield,
              text: 'Verified Jobs'
            }].map((feature, index) => <motion.div key={index} initial={{
              opacity: 0,
              scale: 0.8
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 0.5 + index * 0.1
            }} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm">
                    <feature.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{feature.text}</span>
                  </motion.div>)}
              </motion.div>

              {/* CTA Buttons */}
              <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 mb-6">
                <Button onClick={() => {
              handleDismiss(true);
              onFindJobs();
            }} size="lg" className={cn("h-14 rounded-2xl text-base font-semibold", "bg-white text-primary hover:bg-white/90", "shadow-2xl shadow-black/20", "touch-target touch-scale group")}>
                  <Briefcase className="w-5 h-5 mr-2" />
                  Find Jobs
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <Button onClick={() => {
              handleDismiss(true);
              onFindTalent();
            }} size="lg" variant="outline" className={cn("h-14 rounded-2xl text-base font-semibold", "bg-transparent border-2 border-white/50 text-white", "hover:bg-white/10 hover:border-white", "touch-target touch-scale group")}>
                  <Users className="w-5 h-5 mr-2" />
                  Hire Talent
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>

              {/* Social Proof */}
              <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 text-white/70 text-sm mb-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map(i => <div key={i} className="w-7 h-7 rounded-full bg-white/30 border-2 border-white/50 flex items-center justify-center text-xs font-bold">
                      {String.fromCharCode(64 + i)}
                    </div>)}
                </div>
                <span>Join 10,000+ users finding local opportunities</span>
              </motion.div>

              {/* Skip link */}
              <motion.button variants={itemVariants} onClick={() => handleDismiss(true)} className="text-white/60 hover:text-white text-sm underline-offset-4 hover:underline transition-colors">
                Skip and explore the map
              </motion.button>
            </div>
          </motion.div>
        </motion.div>}
    </AnimatePresence>;
};
export default WelcomeOverlay;