import { MapPin, Loader2, Briefcase, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface MapLoadingSkeletonProps {
  mode?: 'hiring' | 'job';
}

export const MapLoadingSkeleton = ({ mode = 'job' }: MapLoadingSkeletonProps) => {
  const isHiring = mode === 'hiring';

  return (
    <div className="absolute inset-0 z-20 bg-background/90 backdrop-blur-md flex items-center justify-center">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full ${
            isHiring ? 'bg-primary' : 'bg-destructive'
          }`}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative flex flex-col items-center gap-5 p-8 sm:p-10 rounded-3xl bg-card/95 shadow-2xl border border-border/30 backdrop-blur-xl max-w-sm w-full mx-4"
      >
        {/* Animated map icon */}
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
              isHiring ? 'bg-primary/10' : 'bg-destructive/10'
            }`}
          >
            {isHiring ? (
              <Users className="w-9 h-9 text-primary" />
            ) : (
              <Briefcase className="w-9 h-9 text-destructive" />
            )}
          </motion.div>

          {/* Radar rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.5, opacity: 0.6 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
              className={`absolute inset-0 rounded-2xl border-2 ${
                isHiring ? 'border-primary/30' : 'border-destructive/30'
              }`}
            />
          ))}

          {/* Spinner badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-border shadow-lg flex items-center justify-center"
          >
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </motion.div>
        </div>

        {/* Text */}
        <div className="text-center space-y-1.5">
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="font-semibold text-lg text-foreground"
          >
            {isHiring ? 'Finding Talent' : 'Discovering Jobs'}
          </motion.h3>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-sm text-muted-foreground"
          >
            {isHiring ? 'Scanning for candidates near you…' : 'Locating opportunities nearby…'}
          </motion.p>
        </div>

        {/* Animated pin drops */}
        <div className="flex items-end gap-4 pt-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: 0.6 + i * 0.15,
                type: 'spring',
                stiffness: 300,
                damping: 15,
              }}
              className="flex flex-col items-center gap-1"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              >
                <MapPin
                  className={`w-5 h-5 ${isHiring ? 'text-primary' : 'text-destructive'}`}
                  style={{ opacity: 1 - i * 0.12 }}
                />
              </motion.div>
              <div
                className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20"
                style={{ opacity: 1 - i * 0.15 }}
              />
            </motion.div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className={`h-full rounded-full ${isHiring ? 'bg-primary' : 'bg-destructive'}`}
          />
        </div>
      </motion.div>
    </div>
  );
};
