import { Briefcase, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const CandidateDashboardLoading = () => (
  <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/80 flex items-center justify-center">
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-5">
        <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping" />
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl shadow-primary/20">
          <Briefcase className="w-7 h-7 text-primary-foreground" />
        </div>
      </div>
      <p className="text-sm font-medium text-foreground mb-1">Loading your dashboard</p>
      <p className="text-xs text-muted-foreground">Fetching your latest activity...</p>
    </motion.div>
  </div>
);

export const EmployerDashboardLoading = () => (
  <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/80 flex">
    <aside className="hidden lg:block w-[264px] bg-card/95 border-r border-border/30 animate-pulse">
      <div className="p-4 space-y-4">
        <div className="h-8 bg-muted/60 rounded-xl w-32" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 bg-muted/40 rounded-xl" />
          ))}
        </div>
      </div>
    </aside>
    <div className="flex-1">
      <div className="h-16 bg-card/80 border-b border-border/30 animate-pulse px-6 flex items-center gap-4">
        <div className="h-6 bg-muted/50 rounded-lg w-48" />
        <div className="flex-1" />
        <div className="h-8 w-8 bg-muted/50 rounded-full" />
      </div>
      <div className="p-6 space-y-4 max-w-6xl mx-auto animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-card/60 border border-border/30 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64 bg-card/60 border border-border/30 rounded-2xl" />
          <div className="h-64 bg-card/60 border border-border/30 rounded-2xl" />
        </div>
      </div>
    </div>
  </div>
);
