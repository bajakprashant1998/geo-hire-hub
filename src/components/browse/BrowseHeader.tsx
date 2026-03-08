import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, LayoutDashboard, Sparkles, ArrowUpDown,
  LayoutGrid, LayoutList, X, Map
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { BreadcrumbNav } from '@/components/BreadcrumbNav';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
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
}

export const BrowseHeader = ({
  search, setSearch, jobType, setJobType,
  sortBy, setSortBy, viewMode, setViewMode,
  total, debouncedSearch, clearAllFilters,
}: BrowseHeaderProps) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const dashboardPath = profile?.user_type === 'employer' ? '/employer-dashboard' : '/candidate-dashboard';

  const activeFilters = [
    ...(jobType !== 'all' ? [{ key: 'type', label: jobType }] : []),
    ...(debouncedSearch ? [{ key: 'search', label: `"${debouncedSearch}"` }] : []),
  ];

  const clearFilter = (key: string) => {
    if (key === 'type') setJobType('all');
    if (key === 'search') setSearch('');
  };

  return (
    <div className="border-b bg-gradient-to-br from-primary/[0.04] via-background to-accent/30 sticky top-0 z-30 backdrop-blur-md">
      <div className="container mx-auto px-4 py-5 max-w-6xl">
        {/* Top row */}
        <div className="flex items-center justify-between mb-4">
          <BreadcrumbNav items={[{ label: 'Browse Jobs' }]} />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/jobs-near-me')}
              className="gap-1.5 text-muted-foreground hover:text-foreground text-xs"
            >
              <Map className="w-3.5 h-3.5" /> Map View
            </Button>
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(dashboardPath)}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
              </Button>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Find Your Next Opportunity
          </h1>
          <p className="text-muted-foreground mt-1.5 flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>
              <strong className="text-foreground tabular-nums">{total.toLocaleString()}</strong> open positions — updated in real time
            </span>
          </p>
        </div>

        {/* Search bar + filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Job title, company, or location…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 pr-9 h-11 bg-card border-border/50 shadow-sm rounded-xl focus-visible:ring-primary/30 text-sm"
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
            <div className="flex gap-2.5">
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger className="w-full sm:w-40 h-11 bg-card shadow-sm rounded-xl border-border/50">
                  <Filter className="w-4 h-4 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-40 h-11 bg-card shadow-sm rounded-xl border-border/50">
                  <ArrowUpDown className="w-4 h-4 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick type pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {JOB_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setJobType(jobType === type ? 'all' : type)}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  jobType === type
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Active filters + view toggle */}
          <div className="flex items-center justify-between gap-2 min-h-[28px]">
            <div className="flex items-center gap-2 flex-wrap">
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
                      className="gap-1 pl-2.5 pr-1.5 py-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => clearFilter(f.key)}
                    >
                      {f.label}
                      <X className="w-3 h-3 ml-0.5" />
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
              {activeFilters.length > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors underline-offset-2 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-0.5 bg-muted/80 rounded-lg p-0.5">
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
