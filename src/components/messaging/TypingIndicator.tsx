import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  userName?: string;
}

export const TypingIndicator = ({ userName }: TypingIndicatorProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2"
    >
      <div className="flex items-center gap-1 bg-muted rounded-full px-3 py-2">
        <span className="text-sm text-muted-foreground">
          {userName ? `${userName} is typing` : 'Typing'}
        </span>
        <div className="flex gap-0.5 ml-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full"
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};
