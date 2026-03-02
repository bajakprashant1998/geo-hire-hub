import { Briefcase, Users, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

interface MapLoadingSkeletonProps {
  mode?: 'hiring' | 'job';
}

export const MapLoadingSkeleton = ({ mode = 'job' }: MapLoadingSkeletonProps) => {
  const isHiring = mode === 'hiring';

  return (
    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-md flex items-center justify-center">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      <div className="flex flex-col items-center gap-6 p-10 rounded-3xl bg-card/90 backdrop-blur-xl shadow-2xl border border-border/20 max-w-xs w-full mx-4 relative overflow-hidden">
        {/* Decorative glow */}
        <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20 ${
          isHiring ? 'bg-primary' : 'bg-destructive'
        }`} />

        {/* Radar pulse animation */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`absolute inset-0 rounded-full border-2 ${
                isHiring ? 'border-primary/30' : 'border-destructive/30'
              }`}
              initial={{ scale: 0.3, opacity: 0.8 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.6,
                ease: 'easeOut',
              }}
            />
          ))}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
              isHiring ? 'bg-primary/10 shadow-primary/10' : 'bg-destructive/10 shadow-destructive/10'
            }`}
          >
            {isHiring ? (
              <Users className="w-8 h-8 text-primary" />
            ) : (
              <Briefcase className="w-8 h-8 text-destructive" />
            )}
          </motion.div>
          
          {/* Orbiting pin */}
          <motion.div
            className="absolute"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            style={{ width: 80, height: 80 }}
          >
            <MapPin className={`w-4 h-4 absolute -top-1 left-1/2 -translate-x-1/2 ${
              isHiring ? 'text-primary' : 'text-destructive'
            }`} />
          </motion.div>
        </div>

        <div className="text-center space-y-2 relative z-10">
          <motion.h3
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-bold text-lg text-foreground tracking-tight"
          >
            {isHiring ? 'Scanning for Talent' : 'Discovering Jobs'}
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sm text-muted-foreground"
          >
            {isHiring ? 'Finding candidates in your area…' : 'Locating opportunities nearby…'}
          </motion.p>
        </div>

        {/* Animated progress bar */}
        <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isHiring ? 'bg-primary' : 'bg-destructive'}`}
            initial={{ width: '0%' }}
            animate={{ width: ['0%', '70%', '40%', '90%', '60%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Floating dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${isHiring ? 'bg-primary' : 'bg-destructive'}`}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};