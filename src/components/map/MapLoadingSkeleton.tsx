import { Briefcase, Users, MapPin, Compass, Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface MapLoadingSkeletonProps {
  mode?: 'hiring' | 'job';
}

export const MapLoadingSkeleton = ({ mode = 'job' }: MapLoadingSkeletonProps) => {
  const isHiring = mode === 'hiring';
  const accentColor = isHiring ? 'primary' : 'destructive';

  return (
    <div className="absolute inset-0 z-20 bg-background flex items-center justify-center overflow-hidden">
      {/* Animated gradient backdrop */}
      <div className={`absolute inset-0 bg-gradient-to-br ${
        isHiring ? 'from-primary/5 via-background to-primary/3' : 'from-destructive/5 via-background to-destructive/3'
      }`} />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      {/* Floating map pins in background */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-3 h-3 rounded-full ${isHiring ? 'bg-primary/10' : 'bg-destructive/10'}`}
          style={{
            top: `${15 + Math.random() * 70}%`,
            left: `${10 + Math.random() * 80}%`,
          }}
          animate={{
            y: [0, -15, 0],
            opacity: [0.2, 0.5, 0.2],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.5,
            ease: 'easeInOut',
          }}
        />
      ))}

      <div className="flex flex-col items-center gap-7 p-10 rounded-[28px] bg-card/95 backdrop-blur-xl shadow-2xl border border-border/20 max-w-[340px] w-full mx-4 relative overflow-hidden">
        {/* Decorative gradient glow */}
        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[60px] opacity-15 bg-${accentColor}`} />
        <div className={`absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-[60px] opacity-10 bg-${accentColor}`} />

        {/* Radar pulse animation */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`absolute inset-0 rounded-full border-2 border-${accentColor}/25`}
              initial={{ scale: 0.3, opacity: 0.8 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.7,
                ease: 'easeOut',
              }}
            />
          ))}
          
          {/* Center icon with glass effect */}
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className={`relative w-18 h-18 rounded-[22px] flex items-center justify-center shadow-xl bg-gradient-to-br ${
              isHiring ? 'from-primary/20 to-primary/5' : 'from-destructive/20 to-destructive/5'
            } ring-1 ring-${accentColor}/10`}
            style={{ width: 72, height: 72 }}
          >
            {isHiring ? (
              <Users className="w-9 h-9 text-primary" />
            ) : (
              <Briefcase className="w-9 h-9 text-destructive" />
            )}
          </motion.div>
          
          {/* Orbiting compass */}
          <motion.div
            className="absolute"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            style={{ width: 96, height: 96 }}
          >
            <Compass className={`w-4 h-4 absolute -top-1 left-1/2 -translate-x-1/2 text-${accentColor}/60`} />
          </motion.div>

          {/* Secondary orbiting element */}
          <motion.div
            className="absolute"
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            style={{ width: 110, height: 110 }}
          >
            <Search className={`w-3 h-3 absolute -top-1 left-1/2 -translate-x-1/2 text-${accentColor}/30`} />
          </motion.div>
        </div>

        <div className="text-center space-y-2.5 relative z-10">
          <motion.h3
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-extrabold text-xl text-foreground tracking-tight"
          >
            {isHiring ? 'Scanning for Talent' : 'Discovering Jobs'}
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sm text-muted-foreground leading-relaxed"
          >
            {isHiring ? 'Finding top candidates near you…' : 'Mapping opportunities in your area…'}
          </motion.p>
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-2">
          <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${
                isHiring ? 'from-primary/80 to-primary' : 'from-destructive/80 to-destructive'
              }`}
              initial={{ width: '0%' }}
              animate={{ width: ['0%', '65%', '35%', '85%', '55%', '95%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          
          {/* Status text */}
          <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-[10px] text-muted-foreground/60 text-center font-medium uppercase tracking-widest"
          >
            Loading map data
          </motion.p>
        </div>
      </div>
    </div>
  );
};
