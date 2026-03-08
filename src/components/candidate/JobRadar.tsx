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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search, SlidersHorizontal, Radar, Loader2, X, Save, Trash2, RotateCcw, ChevronDown,
  Sparkles, Target, Zap, TrendingUp, Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useJobRadar, defaultFilters, type JobRadarFilters, type SortOption } from '@/hooks/useJobRadar';
import { JobRadarCard } from './JobRadarCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

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
  { value: '1-3', label: '1-3 yrs' },
  { value: '3-5', label: '3-5 yrs' },
  { value: '5+', label: '5+ yrs' },
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

/* ─── Loading Skeleton ─── */
const JobRadarSkeleton = () => (
  <div className="space-y-3">
    {/* Stats row skeleton */}
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
    {/* Card skeletons */}
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="rounded-2xl border border-border/30 p-4 space-y-3">
        <div className="flex justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/4 rounded-lg" />
            <Skeleton className="h-3.5 w-1/2 rounded-lg" />
          </div>
          <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>
    ))}
  </div>
);

/* ─── Filter Chip ─── */
const FilterChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      'h-8 px-3 rounded-lg text-xs font-medium border transition-all duration-150',
      active
        ? 'bg-primary/12 border-primary/30 text-primary shadow-sm'
        : 'bg-card/70 border-border/40 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
    )}
  >
    {label}
  </button>
);

/* ─── Filter Panel ─── */
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
    <div className="space-y-4">
      {/* Saved filters */}
      {savedFilters.length > 0 && (
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-2 block">Saved Filters</Label>
          <div className="flex flex-wrap gap-1.5">
            {savedFilters.map(sf => (
              <div key={sf.name} className="flex items-center gap-0.5">
                <Button variant="outline" size="sm" className="h-7 text-[11px] rounded-lg px-2.5 border-border/40" onClick={() => onLoadFilter(sf)}>
                  {sf.name}
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onDeleteFilter(sf.name)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1.5 block">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Job title, skill, company..."
            value={filters.keyword}
            onChange={e => updateFilter('keyword', e.target.value)}
            className="pl-9 h-9 rounded-xl border-border/40 bg-muted/30 text-sm"
          />
          {filters.keyword && (
            <button onClick={() => updateFilter('keyword', '')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Location */}
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1.5 block">Location</Label>
        <Input
          placeholder="City or state..."
          value={filters.locationCity}
          onChange={e => updateFilter('locationCity', e.target.value)}
          className="h-9 rounded-xl border-border/40 bg-muted/30 text-sm mb-2"
        />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Radius: <strong className="text-foreground">{filters.radiusKm} km</strong></span>
          </div>
          <Slider
            value={[filters.radiusKm]}
            onValueChange={([v]) => updateFilter('radiusKm', v)}
            min={5} max={200} step={5}
            className="py-1"
          />
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Switch checked={filters.remoteOnly} onCheckedChange={v => updateFilter('remoteOnly', v)} className="scale-75" />
              Remote
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Switch checked={filters.hybridOnly} onCheckedChange={v => updateFilter('hybridOnly', v)} className="scale-75" />
              Hybrid
            </label>
          </div>
        </div>
      </div>

      <Separator className="bg-border/20" />

      {/* Salary */}
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1.5 block">Min Salary</Label>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-muted-foreground">{filters.minSalary > 0 ? <strong className="text-foreground">₹{(filters.minSalary / 1000).toFixed(0)}K+</strong> : 'Any'}</span>
        </div>
        <Slider
          value={[filters.minSalary]}
          onValueChange={([v]) => updateFilter('minSalary', v)}
          min={0} max={200000} step={5000}
          className="py-1"
        />
        <label className="flex items-center gap-1.5 text-xs mt-2 cursor-pointer">
          <Switch checked={filters.hideUndisclosed} onCheckedChange={v => updateFilter('hideUndisclosed', v)} className="scale-75" />
          Hide undisclosed
        </label>
      </div>

      <Separator className="bg-border/20" />

      {/* Experience */}
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1.5 block">Experience</Label>
        <div className="flex flex-wrap gap-1.5">
          {EXP_OPTIONS.map(opt => (
            <FilterChip key={opt.value} label={opt.label} active={filters.experience.includes(opt.value)} onClick={() => toggleChip('experience', opt.value)} />
          ))}
        </div>
      </div>

      {/* Job Type */}
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1.5 block">Job Type</Label>
        <div className="flex flex-wrap gap-1.5">
          {JOB_TYPE_OPTIONS.map(type => (
            <FilterChip key={type} label={type} active={filters.jobTypes.includes(type)} onClick={() => toggleChip('jobTypes', type)} />
          ))}
        </div>
      </div>

      <Separator className="bg-border/20" />

      {/* Match Score */}
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1.5 block">
          Min Match Score: <strong className="text-foreground">{filters.minMatchScore}%</strong>
        </Label>
        <Slider
          value={[filters.minMatchScore]}
          onValueChange={([v]) => updateFilter('minMatchScore', v)}
          min={0} max={100} step={5}
          className="py-1"
        />
      </div>

      {/* Freshness */}
      <div>
        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1.5 block">Posted</Label>
        <div className="flex flex-wrap gap-1.5">
          {FRESHNESS_OPTIONS.map(opt => (
            <FilterChip key={opt.value} label={opt.label} active={filters.freshness === opt.value} onClick={() => updateFilter('freshness', opt.value)} />
          ))}
        </div>
      </div>

      <Separator className="bg-border/20" />

      {/* Toggles */}
      <div className="space-y-2.5">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-foreground font-medium">Actively Hiring</span>
          <Switch checked={filters.activelyHiring} onCheckedChange={v => updateFilter('activelyHiring', v)} className="scale-90" />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-foreground font-medium">Verified Only</span>
          <Switch checked={filters.verifiedOnly} onCheckedChange={v => updateFilter('verifiedOnly', v)} className="scale-90" />
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1 h-8 rounded-xl text-xs gap-1.5 border-border/40" onClick={onSaveFilter}>
          <Save className="w-3 h-3" /> Save
        </Button>
        <Button variant="ghost" size="sm" className="h-8 rounded-xl text-xs gap-1.5 text-muted-foreground" onClick={onReset} disabled={isDefault}>
          <RotateCcw className="w-3 h-3" /> Reset
        </Button>
      </div>
    </div>
  );
};

/* ─── Quick Stats Bar ─── */
const QuickStatsBar = ({ totalCount, topMatchScore, avgMatchScore }: {
  totalCount: number;
  topMatchScore: number;
  avgMatchScore: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    className="grid grid-cols-3 gap-2"
  >
    {[
      { icon: Briefcase, label: 'Jobs Found', value: totalCount, color: 'text-primary', bg: 'bg-primary/10' },
      { icon: Target, label: 'Best Match', value: `${topMatchScore}%`, color: 'text-success', bg: 'bg-success/10' },
      { icon: TrendingUp, label: 'Avg Match', value: `${avgMatchScore}%`, color: 'text-[hsl(262,83%,58%)]', bg: 'bg-[hsl(262,83%,58%)]/10' },
    ].map((stat, i) => (
      <motion.div
        key={stat.label}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.12 + i * 0.05 }}
        className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-card/60 backdrop-blur border border-border/30"
      >
        <div className={cn('w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0', stat.bg)}>
          <stat.icon className={cn('w-4 h-4', stat.color)} />
        </div>
        <div className="min-w-0">
          <p className="text-base sm:text-lg font-bold text-foreground leading-none">{stat.value}</p>
          <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
        </div>
      </motion.div>
    ))}
  </motion.div>
);

/* ─── Active Filters Bar ─── */
const ActiveFiltersBar = ({ filters, setFilters, count }: {
  filters: JobRadarFilters;
  setFilters: React.Dispatch<React.SetStateAction<JobRadarFilters>>;
  count: number;
}) => {
  if (count === 0) return null;

  const chips: { label: string; clear: () => void }[] = [];
  if (filters.keyword) chips.push({ label: `"${filters.keyword}"`, clear: () => setFilters(f => ({ ...f, keyword: '' })) });
  if (filters.locationCity) chips.push({ label: filters.locationCity, clear: () => setFilters(f => ({ ...f, locationCity: '' })) });
  if (filters.remoteOnly) chips.push({ label: 'Remote', clear: () => setFilters(f => ({ ...f, remoteOnly: false })) });
  if (filters.hybridOnly) chips.push({ label: 'Hybrid', clear: () => setFilters(f => ({ ...f, hybridOnly: false })) });
  if (filters.minSalary > 0) chips.push({ label: `₹${(filters.minSalary / 1000).toFixed(0)}K+`, clear: () => setFilters(f => ({ ...f, minSalary: 0 })) });
  if (filters.experience.length) chips.push({ label: `Exp: ${filters.experience.join(', ')}`, clear: () => setFilters(f => ({ ...f, experience: [] })) });
  if (filters.jobTypes.length) chips.push({ label: filters.jobTypes.join(', '), clear: () => setFilters(f => ({ ...f, jobTypes: [] })) });
  if (filters.freshness !== 'all') chips.push({ label: `Posted: ${filters.freshness}`, clear: () => setFilters(f => ({ ...f, freshness: 'all' })) });
  if (filters.activelyHiring) chips.push({ label: 'Actively Hiring', clear: () => setFilters(f => ({ ...f, activelyHiring: false })) });
  if (filters.verifiedOnly) chips.push({ label: 'Verified', clear: () => setFilters(f => ({ ...f, verifiedOnly: false })) });
  if (filters.minMatchScore > 0) chips.push({ label: `≥${filters.minMatchScore}% match`, clear: () => setFilters(f => ({ ...f, minMatchScore: 0 })) });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="flex flex-wrap items-center gap-1.5"
    >
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Active:</span>
      {chips.map(chip => (
        <button
          key={chip.label}
          onClick={chip.clear}
          className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-primary/8 border border-primary/20 text-[10px] font-medium text-primary hover:bg-primary/15 transition-colors group"
        >
          {chip.label}
          <X className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
        </button>
      ))}
      <button
        onClick={() => setFilters(defaultFilters)}
        className="text-[10px] text-destructive/70 hover:text-destructive font-medium ml-1"
      >
        Clear all
      </button>
    </motion.div>
  );
};

/* ─── Main Component ─── */
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
    setFilterSheetOpen(false);
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

  const topMatchScore = useMemo(() => jobs.length > 0 ? Math.max(...jobs.map(j => j.matchScore)) : 0, [jobs]);
  const avgMatchScore = useMemo(() => jobs.length > 0 ? Math.round(jobs.reduce((s, j) => s + j.matchScore, 0) / jobs.length) : 0, [jobs]);

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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20"
          >
            <Radar className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              Job Radar
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-primary/25 text-primary bg-primary/8 font-semibold gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> AI
              </Badge>
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Smart-ranked jobs matched to your skills & preferences</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Desktop Filter Panel */}
        {!isMobile && (
          <div className="hidden lg:block w-[272px] shrink-0">
            <div className="sticky top-20 bg-card/70 backdrop-blur-xl border border-border/40 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
                  {activeFilterCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
                  )}
                </h3>
              </div>
              <ScrollArea className="max-h-[calc(100vh-180px)]">
                <div className="p-4">
                  {filterPanelContent}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Results Column */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Sort + Filter trigger row */}
          <div className="flex items-center justify-between gap-2">
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
                        {activeFilterCount > 0 && (
                          <Badge variant="secondary" className="text-[10px]">{activeFilterCount} active</Badge>
                        )}
                      </SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="mt-4 pb-8 px-1 h-[calc(85vh-80px)]">
                      {filterPanelContent}
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              )}

              <Badge variant="secondary" className="text-xs h-7 px-3 rounded-lg font-medium tabular-nums">
                {totalCount} job{totalCount !== 1 ? 's' : ''}
              </Badge>
            </div>

            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="w-[150px] h-9 rounded-xl border-border/40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">Best Match</SelectItem>
                <SelectItem value="distance">Nearest First</SelectItem>
                <SelectItem value="salary">Highest Salary</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters inline chips */}
          <ActiveFiltersBar filters={filters} setFilters={setFilters} count={activeFilterCount} />

          {/* Content */}
          {loading ? (
            <JobRadarSkeleton />
          ) : jobs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-muted/40 flex items-center justify-center mb-5">
                <Radar className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5 text-lg">No jobs match your filters</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-5">Try broadening your search criteria or expanding the distance radius.</p>
              <Button variant="outline" className="rounded-xl gap-2" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5" /> Reset All Filters
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Quick Stats */}
              <QuickStatsBar totalCount={totalCount} topMatchScore={topMatchScore} avgMatchScore={avgMatchScore} />

              {/* Job Cards */}
              <div className="space-y-2.5">
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
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center pt-3 pb-2"
                  >
                    <Button variant="outline" onClick={loadMore} className="rounded-xl gap-2 border-border/40 h-10 px-6 text-sm font-medium">
                      <ChevronDown className="w-4 h-4" /> Load More Jobs
                    </Button>
                  </motion.div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
