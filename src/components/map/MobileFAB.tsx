import { Button } from '@/components/ui/button';
import { ViewMode } from '@/types';
import { Briefcase, Users, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MobileFABProps {
  mode: ViewMode;
  className?: string;
}

export const MobileFAB = ({ mode, className }: MobileFABProps) => {
  const { user, profile } = useAuth();

  // Don't show FAB if not logged in
  if (!user) return null;

  const isEmployer = profile?.user_type === 'employer';
  const isSeeking = mode === 'seeking';

  // Configure FAB based on mode and user type
  const fabConfig = {
    // Employer viewing candidates (hiring mode)
    employer_hiring: {
      icon: Users,
      label: 'Browse Candidates',
      href: '/employer-dashboard?section=candidates',
      color: 'bg-primary hover:bg-primary/90',
    },
    // Employer viewing jobs (seeking mode) - show post job
    employer_seeking: {
      icon: Plus,
      label: 'Post Job',
      href: '/post-job',
      color: 'bg-success hover:bg-success/90',
    },
    // Candidate viewing jobs (seeking mode)
    candidate_seeking: {
      icon: Briefcase,
      label: 'Quick Apply',
      href: '/candidate-dashboard?section=jobs',
      color: 'bg-destructive hover:bg-destructive/90',
    },
    // Candidate viewing candidates (hiring mode) - hide or show profile
    candidate_hiring: {
      icon: Users,
      label: 'My Profile',
      href: '/candidate-settings',
      color: 'bg-primary hover:bg-primary/90',
    },
  };

  const key = `${isEmployer ? 'employer' : 'candidate'}_${isSeeking ? 'seeking' : 'hiring'}`;
  const config = fabConfig[key as keyof typeof fabConfig];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.5 }}
        className={cn("fab-position md:hidden", className)}
      >
        <Link to={config.href}>
          <Button
            size="lg"
            className={cn(
              "h-14 w-14 rounded-full shadow-xl touch-scale",
              config.color,
              "flex items-center justify-center"
            )}
          >
            <config.icon className="w-6 h-6" />
            <span className="sr-only">{config.label}</span>
          </Button>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
};

export default MobileFAB;
