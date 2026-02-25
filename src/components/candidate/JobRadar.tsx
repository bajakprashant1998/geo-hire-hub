import { useState, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  Search, SlidersHorizontal, Radar, Loader2, X, Save, Trash2, RotateCcw, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useJobRadar, defaultFilters, type JobRadarFilters, type SortOption } from '@/hooks/useJobRadar';
import { JobRadarCard } from './JobRadarCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface JobRadarProps {
  candidateId: string;
  candidate: any;
  profile: any;
}

interface SavedFilter {
  name: string;
  filters: JobRadarFilters;
}

const EXP_OPTIONS = [
  { value: 'fresher', label: 'Fresher' },
  { value: '1-3', label: '1-3y' },
  { value: '3-5', label: '3-5y' },
  { value: '5+', label: '5+' },
];

const JOB_TYPE_OPTIONS = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance', 'Remote'];

const FRESHNESS_OPTIONS = [
  { value: 'all' as const, label: 'All time' },
  { value: 'today' as const, label: 'Today' },
  { value: '3days' as const, label: '3 days' },
  { value: '1week' as const, label: '1 week' },
];

function loadSavedFilters(): SavedFilter[] {
  try {
    return JSON.parse(localStorage.getItem('job-radar-filters') || '[]');
  } catch { return []; }
}

function saveSavedFilters(filters: SavedFilter[]) {
  localStorage.setItem('job-radar-filters', JSON.stringify(filters));
}

const FilterPanel = ({
  filters,
  setFilters,
  savedFilters,
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter,
  onReset,
}: {
  filters: JobRadarFilters;
  setFilters: React.Dispatch<React.SetStateAction<JobRadarFilters>>;
  savedFilters: SavedFilter[];
  onSaveFilter: () => void;
  onLoadFilter: (f: SavedFilter) => void;
  onDeleteFilter: (name: string) => void;
  onReset: () => void;
}) => {
  const updateFilter = <K extends keyof JobRadarFilters>(key: K, value: JobRadarFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleChip = (key: 'experience' | 'jobTypes', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter(v => v !== value) : [...prev[key], value],
    }));
  };

  const isDefault = JSON.stringify(filters) === JSON.stringify(defaultFilters);

  return (
    <div className="space-y-5">
      {/* Saved filters chips */}
      {savedFilters.length > 0 && (
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2 block">Saved Filters</Label>
          <div className="flex flex-wrap gap-1.5">
            {savedFilters.map(sf => (
              <div key={sf.name} className="flex items-center gap-0.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] rounded-lg px-2.5 border-border/40"
                  onClick={() => onLoadFilter(sf)}
                >
                  {sf.name}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => onDeleteFilter(sf.name)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyword */}
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2 block">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Job title, skill, company..."
            value={filters.keyword}
            onChange={e => updateFilter('keyword', e.target.value)}
            className="pl-9 h-9 rounded-xl border-border/40 bg-muted/30 text-sm"
          />
          {filters.keyword && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => updateFilter('keyword', '')}>
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Location */}
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2 block">Location</Label>
        <Input
          placeholder="City or state..."
          value={filters.locationCity}
          onChange={e => updateFilter('locationCity', e.target.value)}
          className="h-9 rounded-xl border-border/40 bg-muted/30 text-sm mb-2"
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Distance: {filters.radiusKm} km</span>
          </div>
          <Slider
            value={[filters.radiusKm]}
            onValueChange={([v]) => updateFilter('radiusKm', v)}
            min={5}
            max={200}
            step={5}
            className="py-1"
          />
          <div className="flex gap-2">
            <label className="flex items-center gap-1.5 text-xs">
              <Switch checked={filters.remoteOnly} onCheckedChange={v => updateFilter('remoteOnly', v)} className="scale-75" />
              Remote
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <Switch checked={filters.hybridOnly} onCheckedChange={v => updateFilter('hybridOnly', v)} className="scale-75" />
              Hybrid
            </label>
          </div>
        </div>
      </div>

      <Separator className="bg-border/30" />

      {/* Salary */}
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2 block">Salary</Label>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Min: {filters.minSalary > 0 ? `₹${(filters.minSalary / 1000).toFixed(0)}K` : 'Any'}</span>
        </div>
        <Slider
          value={[filters.minSalary]}
          onValueChange={([v]) => updateFilter('minSalary', v)}
          min={0}
          max={200000}
          step={5000}
          className="py-1"
        />
        <label className="flex items-center gap-1.5 text-xs mt-2">
          <Switch checked={filters.hideUndisclosed} onCheckedChange={v => updateFilter('hideUndisclosed', v)} className="scale-75" />
          Hide undisclosed
        </label>
      </div>

      <Separator className="bg-border/30" />

      {/* Experience */}
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2 block">Experience</Label>
        <div className="flex flex-wrap gap-1.5">
          {EXP_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant="outline"
              size="sm"
              className={cn(
                'h-7 text-[11px] rounded-lg px-3',
                filters.experience.includes(opt.value) && 'bg-primary/15 border-primary/30 text-primary'
              )}
              onClick={() => toggleChip('experience', opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Job Type */}
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2 block">Job Type</Label>
        <div className="flex flex-wrap gap-1.5">
          {JOB_TYPE_OPTIONS.map(type => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              className={cn(
                'h-7 text-[11px] rounded-lg px-3',
                filters.jobTypes.includes(type) && 'bg-primary/15 border-primary/30 text-primary'
              )}
              onClick={() => toggleChip('jobTypes', type)}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      <Separator className="bg-border/30" />

      {/* Match Score */}
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2 block">
          Min Match: {filters.minMatchScore}%
        </Label>
        <Slider
          value={[filters.minMatchScore]}
          onValueChange={([v]) => updateFilter('minMatchScore', v)}
          min={0}
          max={100}
          step={5}
          className="py-1"
        />
      </div>

      {/* Freshness */}
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2 block">Posted</Label>
        <div className="flex flex-wrap gap-1.5">
          {FRESHNESS_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant="outline"
              size="sm"
              className={cn(
                'h-7 text-[11px] rounded-lg px-3',
                filters.freshness === opt.value && 'bg-primary/15 border-primary/30 text-primary'
              )}
              onClick={() => updateFilter('freshness', opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <Separator className="bg-border/30" />

      {/* Toggles */}
      <div className="space-y-2.5">
        <label className="flex items-center justify-between">
          <span className="text-xs text-foreground font-medium">Actively Hiring</span>
          <Switch checked={filters.activelyHiring} onCheckedChange={v => updateFilter('activelyHiring', v)} className="scale-90" />
        </label>
        <label className="flex items-center justify-between">
          <span className="text-xs text-foreground font-medium">Verified Only</span>
          <Switch checked={filters.verifiedOnly} onCheckedChange={v => updateFilter('verifiedOnly', v)} className="scale-90" />
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" className="flex-1 h-8 rounded-xl text-xs gap-1.5 border-border/40" onClick={onSaveFilter}>
          <Save className="w-3 h-3" /> Save Filter
        </Button>
        <Button variant="ghost" size="sm" className="h-8 rounded-xl text-xs gap-1.5 text-muted-foreground" onClick={onReset} disabled={isDefault}>
          <RotateCcw className="w-3 h-3" /> Reset
        </Button>
      </div>
    </div>
  );
};

export const JobRadar = ({ candidateId, candidate, profile }: JobRadarProps) => {
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<JobRadarFilters>(defaultFilters);
  const [sort, setSort] = useState<SortOption>('match');
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(loadSavedFilters);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const { jobs, totalCount, loading, hasMore, loadMore, toggleSave, appliedJobIds } = useJobRadar(
    candidateId, candidate, profile, filters, sort
  );

  const handleSaveFilter = useCallback(() => {
    const name = prompt('Name this filter preset:');
    if (!name || !name.trim()) return;
    const updated = [...savedFilters.filter(f => f.name !== name), { name: name.trim(), filters: { ...filters } }];
    setSavedFilters(updated);
    saveSavedFilters(updated);
    toast.success(`Filter "${name}" saved`);
  }, [filters, savedFilters]);

  const handleLoadFilter = useCallback((sf: SavedFilter) => {
    setFilters(sf.filters);
    toast.info(`Loaded filter "${sf.name}"`);
  }, []);

  const handleDeleteFilter = useCallback((name: string) => {
    const updated = savedFilters.filter(f => f.name !== name);
    setSavedFilters(updated);
    saveSavedFilters(updated);
    toast.success(`Filter "${name}" removed`);
  }, [savedFilters]);

  const handleReset = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.keyword) c++;
    if (filters.locationCity) c++;
    if (filters.remoteOnly) c++;
    if (filters.hybridOnly) c++;
    if (filters.minSalary > 0) c++;
    if (filters.hideUndisclosed) c++;
    if (filters.experience.length) c++;
    if (filters.jobTypes.length) c++;
    if (filters.minMatchScore > 0) c++;
    if (filters.freshness !== 'all') c++;
    if (filters.activelyHiring) c++;
    if (filters.verifiedOnly) c++;
    return c;
  }, [filters]);

  const filterPanelContent = (
    <FilterPanel
      filters={filters}
      setFilters={setFilters}
      savedFilters={savedFilters}
      onSaveFilter={handleSaveFilter}
      onLoadFilter={handleLoadFilter}
      onDeleteFilter={handleDeleteFilter}
      onReset={handleReset}
    />
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
          <Radar className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Job Radar</h2>
          <p className="text-xs text-muted-foreground">AI-ranked jobs matched to your profile</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Desktop Filter Panel */}
        {!isMobile && (
          <div className="hidden lg:block w-[280px] shrink-0">
            <div className="sticky top-4 bg-card/70 backdrop-blur-xl border border-border/40 rounded-2xl p-4 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" /> Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{activeFilterCount}</Badge>
                )}
              </h3>
              {filterPanelContent}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Sort bar + Mobile filter trigger */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              {/* Mobile filter button */}
              {isMobile && (
                <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 rounded-xl border-border/40 gap-1.5 text-xs relative">
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
                      {activeFilterCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4" /> Filters
                      </SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto mt-4 pb-8 px-1">
                      {filterPanelContent}
                    </div>
                  </SheetContent>
                </Sheet>
              )}

              <Badge variant="secondary" className="text-xs h-7 px-3 rounded-lg font-medium">
                {totalCount} job{totalCount !== 1 ? 's' : ''} found
              </Badge>
            </div>

            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="w-[160px] h-9 rounded-xl border-border/40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">Highest Match %</SelectItem>
                <SelectItem value="distance">Nearest First</SelectItem>
                <SelectItem value="salary">Highest Salary</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Job Cards */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Analyzing jobs for your profile...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Radar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No jobs match your filters</h3>
              <p className="text-sm text-muted-foreground max-w-sm">Try adjusting your filters or expanding the search radius.</p>
              <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {jobs.map((job, i) => (
                  <JobRadarCard
                    key={job.id}
                    job={job}
                    index={i}
                    onToggleSave={toggleSave}
                    isApplied={appliedJobIds.has(job.id)}
                  />
                ))}
              </AnimatePresence>

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={loadMore} className="rounded-xl gap-2 border-border/40">
                    <ChevronDown className="w-4 h-4" /> Load More Jobs
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
