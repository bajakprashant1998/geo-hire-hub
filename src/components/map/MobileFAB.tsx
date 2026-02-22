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

  const fabConfig = {
    guest_seeking: { icon: Zap, label: 'Find Jobs', href: '/signup', color: 'bg-destructive', shadowColor: 'shadow-destructive/30' },
    guest_hiring: { icon: Users, label: 'Find Talent', href: '/signup', color: 'bg-primary', shadowColor: 'shadow-primary/30' },
    employer_hiring: { icon: Search, label: 'Browse', href: '/employer-dashboard?section=candidates', color: 'bg-primary', shadowColor: 'shadow-primary/30' },
    employer_seeking: { icon: Plus, label: 'Post Job', href: '/post-job', color: 'bg-success', shadowColor: 'shadow-success/30' },
    candidate_seeking: { icon: Sparkles, label: 'Apply', href: '/candidate-dashboard?section=jobs', color: 'bg-destructive', shadowColor: 'shadow-destructive/30' },
    candidate_hiring: { icon: Users, label: 'Profile', href: '/candidate-settings', color: 'bg-primary', shadowColor: 'shadow-primary/30' },
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
              <div className="bg-foreground/95 backdrop-blur-sm text-background text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-lg">
                {config.label}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full">
                  <div className="border-8 border-transparent border-l-foreground/95" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Link to={config.href}>
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className={cn(
              "relative h-14 w-14 rounded-2xl shadow-xl",
              config.color,
              config.shadowColor,
              "flex items-center justify-center",
              "active:scale-95 transition-transform"
            )}
          >
            {/* Glow ring */}
            <div className={cn("absolute inset-0 rounded-2xl opacity-20 blur-sm", config.color)} />
            <config.icon className="w-6 h-6 text-white relative z-10" />
          </motion.div>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
};

export default MobileFAB;
