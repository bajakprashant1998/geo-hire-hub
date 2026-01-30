import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Briefcase, Users, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeOverlayProps {
  onDismiss: () => void;
  onFindJobs: () => void;
  onFindTalent: () => void;
}

const STORAGE_KEY = 'hfj_welcome_dismissed';

export const WelcomeOverlay = ({ onDismiss, onFindJobs, onFindTalent }: WelcomeOverlayProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has dismissed before
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 800);
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

  const features = [
    { icon: MapPin, text: 'Find opportunities near you', color: 'text-primary' },
    { icon: Briefcase, text: 'Apply to jobs instantly', color: 'text-destructive' },
    { icon: Users, text: 'Connect with top talent', color: 'text-success' },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => handleDismiss(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <Card className="border-0 shadow-2xl overflow-hidden">
              {/* Header with gradient */}
              <div className="relative bg-gradient-to-br from-primary via-primary to-primary/80 p-6 pb-8 text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDismiss(false)}
                  className="absolute top-3 right-3 text-white/80 hover:text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
                
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                >
                  <MapPin className="w-8 h-8 text-white" />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-white mb-2">
                  Welcome to Hire for Job
                </h2>
                <p className="text-white/80 text-sm">
                  Your location-based job discovery platform
                </p>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Features */}
                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-background flex items-center justify-center ${feature.color}`}>
                        <feature.icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{feature.text}</span>
                      <CheckCircle2 className="w-4 h-4 text-success ml-auto" />
                    </motion.div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => {
                      handleDismiss(true);
                      onFindJobs();
                    }}
                    className="h-12 bg-destructive hover:bg-destructive/90 gap-2"
                  >
                    <Briefcase className="w-4 h-4" />
                    Find Jobs
                  </Button>
                  <Button
                    onClick={() => {
                      handleDismiss(true);
                      onFindTalent();
                    }}
                    variant="outline"
                    className="h-12 border-primary text-primary hover:bg-primary/10 gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Find Talent
                  </Button>
                </div>

                {/* Skip link */}
                <button
                  onClick={() => handleDismiss(true)}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Don't show this again
                </button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeOverlay;
