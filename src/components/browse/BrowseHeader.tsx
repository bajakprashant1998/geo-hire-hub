import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, LayoutDashboard, Sparkles, ArrowUpDown,
  LayoutGrid, LayoutList, X, Map, SlidersHorizontal, Wifi, GraduationCap, DollarSign,
  CheckCircle, Shield, Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { BreadcrumbNav } from '@/components/BreadcrumbNav';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead / Principal' },
  { value: 'executive', label: 'Executive' },
];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

interface BrowseHeaderProps {
  search: string;
  setSearch: (v: string) => void;
  jobType: string;
  setJobType: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  viewMode: 'list' | 'grid';
  setViewMode: (v: 'list' | 'grid') => void;
  total: number;
  debouncedSearch: string;
  clearAllFilters: () => void;
  isRemote: boolean;
  setIsRemote: (v: boolean) => void;
  experienceLevel: string;
  setExperienceLevel: (v: string) => void;
  salaryMin: number | null;
  setSalaryMin: (v: number | null) => void;
  salaryMax: number | null;
  setSalaryMax: (v: number | null) => void;
  activeFilterCount: number;
}

export const BrowseHeader = ({
  search, setSearch, jobType, setJobType,
  sortBy, setSortBy, viewMode, setViewMode,
  total, debouncedSearch, clearAllFilters,
  isRemote, setIsRemote,
  experienceLevel, setExperienceLevel,
  salaryMin, setSalaryMin,
  salaryMax, setSalaryMax,
  activeFilterCount,
}: BrowseHeaderProps) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const dashboardPath = profile?.user_type === 'employer' ? '/employer-dashboard' : '/candidate-dashboard';
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilters = [
    ...(jobType !== 'all' ? [{ key: 'type', label: jobType }] : []),
    ...(debouncedSearch ? [{ key: 'search', label: `"${debouncedSearch}"` }] : []),
    ...(isRemote ? [{ key: 'remote', label: 'Remote' }] : []),
    ...(experienceLevel !== 'all' ? [{ key: 'exp', label: EXPERIENCE_LEVELS.find(e => e.value === experienceLevel)?.label || experienceLevel }] : []),
    ...(salaryMin !== null ? [{ key: 'salMin', label: `Min ₹${salaryMin.toLocaleString()}` }] : []),
    ...(salaryMax !== null ? [{ key: 'salMax', label: `Max ₹${salaryMax.toLocaleString()}` }] : []),
  ];

  const clearFilter = (key: string) => {
    if (key === 'type') setJobType('all');
    if (key === 'search') setSearch('');
    if (key === 'remote') setIsRemote(false);
    if (key === 'exp') setExperienceLevel('all');
    if (key === 'salMin') setSalaryMin(null);
    if (key === 'salMax') setSalaryMax(null);
  };

  return (
    <div className="border-b bg-gradient-to-br from-primary/[0.04] via-background to-accent/30 sticky top-0 z-30 backdrop-blur-md">
      <div className="container mx-auto px-4 py-4 sm:py-5 max-w-6xl overflow-hidden">
        {/* Top row */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
          <BreadcrumbNav items={[{ label: 'Browse Jobs' }]} />
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/jobs-near-me')}
              className="gap-1.5 text-muted-foreground hover:text-foreground text-xs h-8 px-2 sm:px-3"
            >
              <Map className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Map View</span>
            </Button>
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(dashboardPath)}
                className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2 sm:px-3"
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Dashboard</span>
              </Button>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="mb-4 sm:mb-5">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
            Find Your Next Opportunity
          </h1>
          <p className="text-muted-foreground mt-1 sm:mt-1.5 flex items-center gap-2 text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>
              <strong className="text-foreground tabular-nums">{total.toLocaleString()}</strong> open positions — updated in real time
            </span>
          </p>
        </div>

        {/* Trust signals - compact horizontal bar */}
        <div className="flex items-center gap-3 sm:gap-5 mb-4 pb-3 border-b border-border/30">
          <span className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground whitespace-nowrap">
            <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" /> Verified Employers
          </span>
          <span className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground whitespace-nowrap">
            <Zap className="w-3.5 h-3.5 text-warning shrink-0" /> Direct Apply
          </span>
          <span className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground whitespace-nowrap">
            <Shield className="w-3.5 h-3.5 text-primary shrink-0" /> Safe & Secure
          </span>
        </div>

        {/* Search bar + filters */}
        <div className="flex flex-col gap-2.5 sm:gap-3">
          {/* Search row */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Job title, company, or location…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 pr-9 h-11 bg-card border-border/50 shadow-sm rounded-xl focus-visible:ring-primary/30 text-sm w-full"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Filter controls row - horizontal scroll on mobile */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-shrink-0">
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger className="w-[130px] sm:w-40 h-11 bg-card shadow-sm rounded-xl border-border/50 shrink-0">
                  <Filter className="w-4 h-4 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Advanced Filters Popover */}
              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl border-border/50 bg-card shadow-sm gap-2 relative shrink-0"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="hidden sm:inline">Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 sm:w-80 p-0" align="end">
                  <div className="p-4 space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-foreground">Advanced Filters</h3>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={() => { clearAllFilters(); setFiltersOpen(false); }}
                          className="text-xs text-destructive hover:underline"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Remote toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Remote Only</Label>
                      </div>
                      <Switch checked={isRemote} onCheckedChange={setIsRemote} />
                    </div>

                    <Separator />

                    {/* Experience Level */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Experience Level</Label>
                      </div>
                      <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                        <SelectTrigger className="h-9 rounded-lg text-sm">
                          <SelectValue placeholder="Any experience" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Level</SelectItem>
                          {EXPERIENCE_LEVELS.map(l => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    {/* Salary Range */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Salary Range</Label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Minimum</Label>
                          <Input
                            type="number"
                            placeholder="e.g. 30000"
                            value={salaryMin ?? ''}
                            onChange={e => setSalaryMin(e.target.value ? Number(e.target.value) : null)}
                            className="h-9 text-sm rounded-lg"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Maximum</Label>
                          <Input
                            type="number"
                            placeholder="e.g. 100000"
                            value={salaryMax ?? ''}
                            onChange={e => setSalaryMax(e.target.value ? Number(e.target.value) : null)}
                            className="h-9 text-sm rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t p-3">
                    <Button
                      size="sm"
                      className="w-full rounded-lg"
                      onClick={() => setFiltersOpen(false)}
                    >
                      Apply Filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px] sm:w-40 h-11 bg-card shadow-sm rounded-xl border-border/50 shrink-0">
                  <ArrowUpDown className="w-4 h-4 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick type pills - prevent overflow */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
            {JOB_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setJobType(jobType === type ? 'all' : type)}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${
                  jobType === type
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground'
                }`}
              >
                {type}
              </button>
            ))}
            <button
              onClick={() => setIsRemote(!isRemote)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isRemote
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground'
              }`}
            >
              <Wifi className="w-3 h-3" /> Remote
            </button>
          </div>

          {/* Active filters + view toggle */}
          <div className="flex items-center justify-between gap-2 min-h-[28px]">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 overflow-hidden">
              <AnimatePresence>
                {activeFilters.map(f => (
                  <motion.div
                    key={f.key}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Badge
                      variant="secondary"
                      className="gap-1 pl-2 sm:pl-2.5 pr-1.5 py-0.5 sm:py-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors text-[11px] sm:text-xs max-w-[140px] truncate"
                      onClick={() => clearFilter(f.key)}
                    >
                      <span className="truncate">{f.label}</span>
                      <X className="w-3 h-3 ml-0.5 shrink-0" />
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
              {activeFilters.length > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors underline-offset-2 hover:underline shrink-0"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-0.5 bg-muted/80 rounded-lg p-0.5 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">List view</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Grid view</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
