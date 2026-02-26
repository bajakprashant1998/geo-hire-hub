import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, List, Target, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SearchBar } from './SearchBar';

interface FloatingControlsProps {
  onCenterOnUser: () => void;
  onToggleSidebar: () => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export const FloatingControls = ({
  onCenterOnUser, onToggleSidebar, radius, onRadiusChange, onSearch, searchQuery,
}: FloatingControlsProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const radiusCycle = [5, 10, 50, 100, 500];

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
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-[100px] left-3 right-3 z-[95]"
          >
            <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/40 shadow-2xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-foreground flex-1">Search nearby</span>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <SearchBar
                onSearch={(q) => {
                  onSearch(q);
                  if (q) setSearchOpen(false);
                }}
                placeholder="Search jobs, skills, companies..."
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
        className="absolute right-3 top-[40%] -translate-y-1/2 z-[90] flex flex-col gap-2.5"
      >
        {/* Search Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.36 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSearchOpen(!searchOpen)}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center",
                "bg-card/90 backdrop-blur-md border border-border/40 shadow-xl",
                "active:bg-muted transition-colors",
                searchOpen && "ring-2 ring-primary/40 bg-primary/10"
              )}
            >
              {searchOpen ? (
                <X className="w-5 h-5 text-primary" />
              ) : (
                <Search className="w-5 h-5 text-foreground" />
              )}
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="left">{searchOpen ? 'Close search' : 'Search'}</TooltipContent>
        </Tooltip>

        {/* My Location */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.44 }}
              whileTap={{ scale: 0.9 }}
              onClick={onCenterOnUser}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center",
                "bg-card/90 backdrop-blur-md border border-border/40 shadow-xl",
                "active:bg-muted transition-colors",
                "ring-2 ring-primary/30"
              )}
            >
              <Navigation className="w-5 h-5 text-primary" />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="left">My location</TooltipContent>
        </Tooltip>

        {/* Radius */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.52 }}
              whileTap={{ scale: 0.9 }}
              onClick={cycleRadius}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center",
                "bg-card/90 backdrop-blur-md border border-border/40 shadow-xl",
                "active:bg-muted transition-colors"
              )}
            >
              <span className="text-[10px] font-bold text-foreground">{radius}</span>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="left">{radius}km radius</TooltipContent>
        </Tooltip>

        {/* View List */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleSidebar}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center",
                "bg-card/90 backdrop-blur-md border border-border/40 shadow-xl",
                "active:bg-muted transition-colors"
              )}
            >
              <List className="w-5 h-5 text-foreground" />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="left">View list</TooltipContent>
        </Tooltip>
      </motion.div>
    </>
  );
};
