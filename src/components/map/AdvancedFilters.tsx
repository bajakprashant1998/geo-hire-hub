import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, Briefcase, DollarSign, Clock, Building2, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export interface MapFilters {
  jobTypes: string[];
  salaryMin: number;
  salaryMax: number;
  experienceMin: number;
  experienceMax: number;
  category: 'all' | 'private' | 'government';
}

const defaultFilters: MapFilters = {
  jobTypes: [],
  salaryMin: 0,
  salaryMax: 100,
  experienceMin: 0,
  experienceMax: 30,
  category: 'all',
};

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];

interface AdvancedFiltersProps {
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  isOpen: boolean;
  onToggle: () => void;
  activeCount: number;
}

export const AdvancedFilters = ({ filters, onFiltersChange, isOpen, onToggle, activeCount }: AdvancedFiltersProps) => {
  const toggleJobType = (type: string) => {
    const updated = filters.jobTypes.includes(type)
      ? filters.jobTypes.filter(t => t !== type)
      : [...filters.jobTypes, type];
    onFiltersChange({ ...filters, jobTypes: updated });
  };

  const resetFilters = () => onFiltersChange(defaultFilters);

  return (
    <>
      {/* Filter Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className={cn(
          "h-9 text-xs gap-1.5 rounded-xl border-border/40 transition-all relative",
          isOpen && "border-primary/50 text-primary bg-primary/5 shadow-sm"
        )}
      >
        <Filter className="w-3.5 h-3.5" />
        Filters
        {activeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </Button>

      {/* Filter Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-3.5 rounded-xl border border-border/30 bg-muted/20 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Advanced Filters</span>
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-6 text-[10px] text-muted-foreground px-2">
                  Reset All
                </Button>
              </div>

              {/* Job Type */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> Job Type
                </label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {JOB_TYPES.map(type => (
                    <Badge
                      key={type}
                      variant={filters.jobTypes.includes(type) ? 'default' : 'outline'}
                      className={cn(
                        "text-[10px] cursor-pointer transition-all hover:scale-105",
                        filters.jobTypes.includes(type)
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                      onClick={() => toggleJobType(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Salary Range */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Salary Range (LPA)
                </label>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[filters.salaryMin, filters.salaryMax]}
                  onValueChange={([min, max]) => onFiltersChange({ ...filters, salaryMin: min, salaryMax: max })}
                  className="mt-2"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">₹{filters.salaryMin}L</span>
                  <span className="text-[10px] text-muted-foreground">₹{filters.salaryMax}L</span>
                </div>
              </div>

              {/* Experience Range */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Experience (years)
                </label>
                <Slider
                  min={0}
                  max={30}
                  step={1}
                  value={[filters.experienceMin, filters.experienceMax]}
                  onValueChange={([min, max]) => onFiltersChange({ ...filters, experienceMin: min, experienceMax: max })}
                  className="mt-2"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{filters.experienceMin}y</span>
                  <span className="text-[10px] text-muted-foreground">{filters.experienceMax}y</span>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-2 block">Category</label>
                <div className="flex gap-1.5 mt-1.5">
                  {[
                    { value: 'all', label: 'All', icon: Briefcase },
                    { value: 'private', label: 'Private', icon: Building2 },
                    { value: 'government', label: 'Govt', icon: Landmark },
                  ].map(cat => (
                    <Badge
                      key={cat.value}
                      variant={filters.category === cat.value ? 'default' : 'outline'}
                      className={cn(
                        "text-[10px] cursor-pointer transition-all gap-1",
                        filters.category === cat.value
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                      onClick={() => onFiltersChange({ ...filters, category: cat.value as MapFilters['category'] })}
                    >
                      <cat.icon className="w-3 h-3" />
                      {cat.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export { defaultFilters };