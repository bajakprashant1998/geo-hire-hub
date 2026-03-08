import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Banknote, X, Search, TrendingUp, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SalaryHeatmapPanelProps {
  enabled: boolean;
  onToggle: () => void;
  roleFilter: string;
  onRoleFilterChange: (role: string) => void;
}

const POPULAR_ROLES = [
  'Software Engineer', 'Data Analyst', 'Product Manager',
  'Designer', 'Marketing', 'Sales', 'DevOps', 'QA',
];

export const SalaryHeatmapPanel = ({
  enabled, onToggle, roleFilter, onRoleFilterChange,
}: SalaryHeatmapPanelProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => {
          if (!enabled) {
            onToggle();
            setExpanded(true);
          } else {
            setExpanded(!expanded);
          }
        }}
        className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center",
          "backdrop-blur-xl border shadow-xl transition-all duration-200",
          enabled
            ? "bg-emerald-500/90 border-emerald-400/50 text-white shadow-emerald-500/20"
            : "bg-card/95 border-border/30 text-foreground hover:bg-card"
        )}
      >
        <Banknote className="w-[18px] h-[18px]" />
      </motion.button>

      {/* Expanded Panel */}
      <AnimatePresence>
        {enabled && expanded && (
          <motion.div
            initial={{ opacity: 0, x: 12, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 12, scale: 0.95 }}
            className="absolute right-14 top-0 w-64 z-[100]"
          >
            <div className="bg-card/95 backdrop-blur-2xl rounded-2xl border border-border/30 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-foreground">Salary Heatmap</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={onToggle}
                    className="p-1 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Role filter */}
              <div className="px-3.5 py-2.5 space-y-2.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filter by role..."
                    value={roleFilter}
                    onChange={e => onRoleFilterChange(e.target.value)}
                    className="h-8 pl-8 text-xs rounded-lg bg-muted/50 border-border/30"
                  />
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {POPULAR_ROLES.map(role => (
                    <Badge
                      key={role}
                      variant={roleFilter === role ? 'default' : 'secondary'}
                      className={cn(
                        "text-[10px] px-2 py-0 h-5 cursor-pointer transition-all",
                        roleFilter === role
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                          : "hover:bg-muted"
                      )}
                      onClick={() => onRoleFilterChange(roleFilter === role ? '' : role)}
                    >
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="px-3.5 py-2.5 border-t border-border/30 bg-muted/20">
                <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Salary Scale</p>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground">Low</span>
                  <div className="flex-1 h-2.5 rounded-full overflow-hidden flex">
                    <div className="flex-1" style={{ background: 'hsl(210, 70%, 60%)' }} />
                    <div className="flex-1" style={{ background: 'hsl(185, 65%, 50%)' }} />
                    <div className="flex-1" style={{ background: 'hsl(140, 60%, 45%)' }} />
                    <div className="flex-1" style={{ background: 'hsl(80, 70%, 48%)' }} />
                    <div className="flex-1" style={{ background: 'hsl(45, 75%, 48%)' }} />
                  </div>
                  <span className="text-[9px] text-muted-foreground">High</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>Bubble size = job count in region</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
