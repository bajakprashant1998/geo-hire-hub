import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, List, Search, X, Radar, Flame, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SearchBar } from './SearchBar';
import { HeatmapToggle } from './HeatmapToggle';
import { SalaryHeatmapPanel } from './SalaryHeatmapPanel';

interface FloatingControlsProps {
  onCenterOnUser: () => void;
  onToggleSidebar: () => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  heatmapEnabled?: boolean;
  onHeatmapToggle?: () => void;
  salaryHeatmapEnabled?: boolean;
  onSalaryHeatmapToggle?: () => void;
  salaryRoleFilter?: string;
  onSalaryRoleFilterChange?: (role: string) => void;
}

const FAB = ({
  icon: Icon,
  onClick,
  className,
  label,
  delay = 0,
  children,
  isActive = false,
}: {
  icon?: any;
  onClick: () => void;
  className?: string;
  label: string;
  delay?: number;
  children?: React.ReactNode;
  isActive?: boolean;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <motion.button
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay }}
        whileTap={{ scale: 0.85 }}
        whileHover={{ scale: 1.08 }}
        onClick={onClick}
        className={cn(
          "w-11 h-11 rounded-2xl flex items-center justify-center",
          "bg-card/95 backdrop-blur-xl border border-border/20 shadow-xl",
          "hover:shadow-2xl transition-all duration-200",
          isActive && "ring-2 ring-primary/30 bg-primary/5",
          className
        )}
      >
        {children || (Icon && <Icon className={cn(
          "w-[18px] h-[18px] transition-colors",
          isActive ? "text-primary" : "text-foreground"
        )} />)}
      </motion.button>
    </TooltipTrigger>
    <TooltipContent side="left" className="text-xs rounded-lg">{label}</TooltipContent>
  </Tooltip>
);

export const FloatingControls = ({
  onCenterOnUser, onToggleSidebar, radius, onRadiusChange, onSearch, searchQuery,
  heatmapEnabled = false, onHeatmapToggle,
  salaryHeatmapEnabled = false, onSalaryHeatmapToggle,
  salaryRoleFilter = '', onSalaryRoleFilterChange,
}: FloatingControlsProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const radiusCycle = [5, 10, 25, 50, 100, 500];

  const cycleRadius = () => {
    const currentIndex = radiusCycle.indexOf(radius);
    const nextIndex = (currentIndex + 1) % radiusCycle.length;
    onRadiusChange(radiusCycle[nextIndex]);
  };

  return (
    <>
      {/* Floating Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-[100px] left-3 right-3 z-[95]"
          >
            <div className="bg-card/95 backdrop-blur-2xl rounded-2xl border border-border/20 shadow-2xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-foreground flex-1">Search nearby</span>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              <SearchBar
                onSearch={(q) => {
                  onSearch(q);
                  if (q) setSearchOpen(false);
                }}
                placeholder="Jobs, skills, companies..."
                showResultCount
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right-side floating buttons */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="absolute right-3 top-[35%] -translate-y-1/2 z-[90] flex flex-col gap-2.5"
      >
        <FAB
          icon={searchOpen ? X : Search}
          onClick={() => setSearchOpen(!searchOpen)}
          label={searchOpen ? 'Close search' : 'Search'}
          delay={0.36}
          isActive={searchOpen}
        />

        <FAB
          icon={Navigation}
          onClick={onCenterOnUser}
          label="My location"
          delay={0.44}
          className="ring-2 ring-emerald-500/20"
        />

        <FAB
          onClick={cycleRadius}
          label={`${radius}km radius`}
          delay={0.52}
        >
          <div className="flex flex-col items-center">
            <Radar className="w-3 h-3 text-muted-foreground mb-0.5" />
            <span className="text-[9px] font-bold text-foreground leading-none">{radius}km</span>
          </div>
        </FAB>

        {onHeatmapToggle && (
          <HeatmapToggle enabled={heatmapEnabled} onToggle={onHeatmapToggle} />
        )}

        {onSalaryHeatmapToggle && (
          <div className="relative">
            <SalaryHeatmapPanel
              enabled={salaryHeatmapEnabled}
              onToggle={onSalaryHeatmapToggle}
              roleFilter={salaryRoleFilter}
              onRoleFilterChange={onSalaryRoleFilterChange || (() => {})}
            />
          </div>
        )
        <FAB
          icon={List}
          onClick={onToggleSidebar}
          label="View list"
          delay={0.6}
        />
      </motion.div>
    </>
  );
};