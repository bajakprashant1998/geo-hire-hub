import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Briefcase, Clock, Building2, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ViewMode } from '@/types';

export type FilterValue = 'all' | '5km' | '10km' | '25km' | 'remote' | 'fulltime' | 'parttime' | 'government';

interface QuickFilterChipsProps {
  mode: ViewMode;
  activeFilters: FilterValue[];
  onFilterChange: (filters: FilterValue[]) => void;
  className?: string;
}

const jobFilters = [
  { id: 'all' as FilterValue, label: 'All', icon: Briefcase },
  { id: '5km' as FilterValue, label: 'Within 5km', icon: MapPin },
  { id: '10km' as FilterValue, label: 'Within 10km', icon: MapPin },
  { id: 'remote' as FilterValue, label: 'Remote', icon: Building2 },
  { id: 'fulltime' as FilterValue, label: 'Full-time', icon: Clock },
  { id: 'parttime' as FilterValue, label: 'Part-time', icon: Clock },
  { id: 'government' as FilterValue, label: 'Government', icon: Landmark },
];

const candidateFilters = [
  { id: 'all' as FilterValue, label: 'All', icon: Briefcase },
  { id: '5km' as FilterValue, label: 'Within 5km', icon: MapPin },
  { id: '10km' as FilterValue, label: 'Within 10km', icon: MapPin },
  { id: '25km' as FilterValue, label: 'Within 25km', icon: MapPin },
];

export const QuickFilterChips = ({ 
  mode, 
  activeFilters, 
  onFilterChange,
  className 
}: QuickFilterChipsProps) => {
  const filters = mode === 'seeking' ? jobFilters : candidateFilters;

  const handleFilterClick = (filterId: FilterValue) => {
    if (filterId === 'all') {
      onFilterChange(['all']);
    } else {
      const newFilters = activeFilters.includes(filterId)
        ? activeFilters.filter(f => f !== filterId)
        : [...activeFilters.filter(f => f !== 'all'), filterId];
      
      onFilterChange(newFilters.length === 0 ? ['all'] : newFilters);
    }
  };

  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1 scrollbar-hide", className)}>
      {filters.map((filter, index) => {
        const isActive = activeFilters.includes(filter.id);
        const Icon = filter.icon;

        return (
          <motion.button
            key={filter.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleFilterClick(filter.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap",
              "transition-all duration-200 touch-target-sm touch-scale",
              "border backdrop-blur-sm",
              isActive
                ? mode === 'seeking'
                  ? "bg-destructive text-destructive-foreground border-destructive shadow-md"
                  : "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card/80 text-muted-foreground border-border/50 hover:bg-card hover:text-foreground hover:border-border"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{filter.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default QuickFilterChips;
