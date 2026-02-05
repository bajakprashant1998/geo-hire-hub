import { Button } from '@/components/ui/button';
import { ViewMode } from '@/types';
 import { Briefcase, Users, Plus, Search, Sparkles, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface MobileFABProps {
  mode: ViewMode;
  className?: string;
}

export const MobileFAB = ({ mode, className }: MobileFABProps) => {
  const { user, profile } = useAuth();
  const [showTooltip, setShowTooltip] = useState(false);

  // Show tooltip on first visit
  useEffect(() => {
    const hasSeenTooltip = localStorage.getItem('hfj_fab_tooltip_seen');
    if (!hasSeenTooltip) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
        setTimeout(() => {
          setShowTooltip(false);
          localStorage.setItem('hfj_fab_tooltip_seen', 'true');
        }, 3000);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const isEmployer = profile?.user_type === 'employer';
  const isSeeking = mode === 'seeking';

  // Configure FAB based on mode and user type
  const fabConfig = {
    // Guest users
    guest_seeking: {
       icon: Zap,
      label: 'Find Jobs',
      href: '/signup',
       color: 'bg-gradient-to-br from-destructive via-destructive to-destructive/80',
      shadowColor: 'shadow-destructive/30',
    },
    guest_hiring: {
      icon: Users,
      label: 'Find Talent',
      href: '/signup',
       color: 'bg-gradient-to-br from-primary via-primary to-primary/80',
      shadowColor: 'shadow-primary/30',
    },
    // Employer users
    employer_hiring: {
      icon: Search,
      label: 'Browse Candidates',
      href: '/employer-dashboard?section=candidates',
       color: 'bg-gradient-to-br from-primary via-primary to-primary/80',
      shadowColor: 'shadow-primary/30',
    },
    employer_seeking: {
      icon: Plus,
      label: 'Post Job',
      href: '/post-job',
       color: 'bg-gradient-to-br from-success via-success to-success/80',
      shadowColor: 'shadow-success/30',
    },
    // Candidate users
    candidate_seeking: {
      icon: Sparkles,
      label: 'Quick Apply',
      href: '/candidate-dashboard?section=jobs',
       color: 'bg-gradient-to-br from-destructive via-destructive to-destructive/80',
      shadowColor: 'shadow-destructive/30',
    },
    candidate_hiring: {
      icon: Users,
      label: 'My Profile',
      href: '/candidate-settings',
       color: 'bg-gradient-to-br from-primary via-primary to-primary/80',
      shadowColor: 'shadow-primary/30',
    },
  };

  const getConfigKey = () => {
    if (!user) return `guest_${isSeeking ? 'seeking' : 'hiring'}`;
    return `${isEmployer ? 'employer' : 'candidate'}_${isSeeking ? 'seeking' : 'hiring'}`;
  };

  const config = fabConfig[getConfigKey() as keyof typeof fabConfig];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.5 }}
        className={cn("fab-position md:hidden", className)}
      >
        {/* Tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap"
            >
               <div className="bg-foreground/95 backdrop-blur-sm text-background text-[11px] font-medium px-3 py-1.5 rounded-lg shadow-lg">
                {config.label}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full">
                  <div className="border-8 border-transparent border-l-foreground" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Link to={config.href}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
               "relative h-12 w-12 rounded-full shadow-xl",
              config.color,
              config.shadowColor,
              "flex items-center justify-center",
              "touch-scale"
            )}
          >
             {/* Subtle glow */}
             <div className="absolute inset-0 rounded-full animate-pulse opacity-30 bg-white/20" />
            
             <config.icon className="w-5 h-5 text-white relative z-10" />
          </motion.div>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
};

export default MobileFAB;
