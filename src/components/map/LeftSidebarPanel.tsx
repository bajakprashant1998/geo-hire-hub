import { ViewMode } from '@/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  MapPin, LogIn, UserPlus, Users, Briefcase, Target,
  List, Building2, Landmark, Search, Navigation,
  LayoutDashboard, Settings, LogOut, X, MessageSquare,
  Heart, Bell, ChevronRight, Sparkles, TrendingUp,
  Clock, Star, Filter, Zap, Globe, Shield, Flame
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RadiusFilter } from './RadiusFilter';
import { useState } from 'react';
import { SearchBar } from './SearchBar';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { AdvancedFilters, MapFilters, defaultFilters } from './AdvancedFilters';
import { NearbyCompanies } from './NearbyCompanies';
import { HeatmapToggle } from './HeatmapToggle';
import { SalaryHeatmapPanel } from './SalaryHeatmapPanel';

interface Job {
  id: string;
  title: string;
  company_name: string;
  salary_range: string;
  job_type: string;
  distance_km: number;
}

interface Candidate {
  id: string;
  full_name: string;
  job_title: string;
  experience_years: number;
  distance_km: number;
}

interface LeftSidebarPanelProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  candidateCount: number;
  jobCount: number;
  governmentJobCount: number;
  privateJobCount: number;
  onViewList: () => void;
  onCenterOnUser: () => void;
  userLocation: { lat: number; lng: number } | null;
  onClose?: () => void;
  filters?: MapFilters;
  onFiltersChange?: (filters: MapFilters) => void;
  heatmapEnabled?: boolean;
  onHeatmapToggle?: () => void;
  salaryHeatmapEnabled?: boolean;
  onSalaryHeatmapToggle?: () => void;
  salaryRoleFilter?: string;
  onSalaryRoleFilterChange?: (role: string) => void;
}

// Haversine distance helper
const calculateHaversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const LeftSidebarPanel = ({
  mode, onModeChange, searchQuery, onSearchChange,
  radius, onRadiusChange, candidateCount, jobCount,
  governmentJobCount, privateJobCount, onViewList,
  onCenterOnUser, userLocation, onClose,
  filters = defaultFilters, onFiltersChange,
  heatmapEnabled = false, onHeatmapToggle,
  salaryHeatmapEnabled = false, onSalaryHeatmapToggle,
  salaryRoleFilter = '', onSalaryRoleFilterChange,
}: LeftSidebarPanelProps) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [limit, setLimit] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showCompanies, setShowCompanies] = useState(false);

  const count = mode === 'hiring' ? candidateCount : jobCount;

  // Fetch nearby jobs — RPC for auth users, direct query fallback
  const { data: nearbyJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['nearby-jobs-sidebar', userLocation?.lat, userLocation?.lng, radius, limit, !!user],
    queryFn: async () => {
      if (!userLocation) return [];

      if (user) {
        const { data, error } = await supabase.rpc('get_nearby_jobs', {
          user_lat: userLocation.lat, user_lng: userLocation.lng, radius_km: radius
        });
        if (!error && data) return (data || []).slice(0, limit) as Job[];
      }

      const { data: directData, error: directError } = await supabase
        .from('jobs')
        .select('id, title, salary_range, job_type, latitude, longitude, employers!inner(company_name)')
        .eq('status', 'open')
        .eq('is_active', true);

      if (directError || !directData) return [];

      return directData
        .map((j: any) => ({
          id: j.id,
          title: j.title,
          company_name: j.employers?.company_name || 'Company',
          salary_range: j.salary_range || '',
          job_type: j.job_type || 'Full-time',
          distance_km: calculateHaversine(userLocation.lat, userLocation.lng, j.latitude, j.longitude),
        }))
        .filter((j: Job) => j.distance_km <= radius)
        .sort((a: Job, b: Job) => a.distance_km - b.distance_km)
        .slice(0, limit);
    },
    enabled: !!userLocation && mode === 'seeking',
  });

  // Fetch nearby candidates — RPC for auth users, direct query fallback
  const { data: nearbyCandidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ['nearby-candidates-sidebar', userLocation?.lat, userLocation?.lng, radius, limit, !!user],
    queryFn: async () => {
      if (!userLocation) return [];

      if (user) {
        const { data, error } = await supabase.rpc('get_nearby_candidates', {
          user_lat: userLocation.lat, user_lng: userLocation.lng, radius_km: radius
        });
        if (!error && data) return (data || []).slice(0, limit) as Candidate[];
      }

      const { data: directData, error: directError } = await supabase
        .from('candidates')
        .select('id, profile_id, job_title, experience_years, profiles!inner(full_name, latitude, longitude, is_visible_on_map)')
        .not('profiles.latitude', 'is', null)
        .not('profiles.longitude', 'is', null);

      if (directError || !directData) return [];

      return directData
        .filter((c: any) => c.profiles?.is_visible_on_map)
        .map((c: any) => ({
          id: c.id,
          full_name: c.profiles.full_name,
          job_title: c.job_title,
          experience_years: c.experience_years || 0,
          distance_km: calculateHaversine(userLocation.lat, userLocation.lng, c.profiles.latitude, c.profiles.longitude),
        }))
        .filter((c: Candidate) => c.distance_km <= radius)
        .sort((a: Candidate, b: Candidate) => a.distance_km - b.distance_km)
        .slice(0, limit);
    },
    enabled: !!userLocation && mode === 'hiring',
  });

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const dashboardPath = profile?.user_type === 'employer' ? '/employer-dashboard' : '/candidate-dashboard';
  const settingsPath = profile?.user_type === 'employer' ? '/company-profile' : '/candidate-settings';
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = userName.charAt(0).toUpperCase();
  const userRole = profile?.user_type === 'employer' ? 'Employer' : 'Candidate';

  const isLoading = mode === 'seeking' ? jobsLoading : candidatesLoading;
  const items = mode === 'seeking' ? nearbyJobs : nearbyCandidates;

  return (
    <div className="h-full flex flex-col bg-background/95 backdrop-blur-xl">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="relative flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md group-hover:blur-lg transition-all" />
              <img
                src="/logo.png"
                alt="Hire for Job"
                className="relative w-10 h-10 rounded-xl object-contain shadow-lg group-hover:shadow-xl transition-shadow"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background shadow-sm" />
            </div>
            <div>
              <span className="font-bold text-foreground text-base leading-none block tracking-tight">
                Hire for Job
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Globe className="w-2.5 h-2.5" />
                Find opportunities nearby
              </span>
            </div>
          </Link>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* User Profile Card */}
          {user ? (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 to-muted/20 backdrop-blur-sm shadow-sm"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-primary/3 rounded-full translate-y-1/2 -translate-x-1/2 blur-lg" />
              <div className="relative p-3.5">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm" />
                    <Avatar className="relative w-12 h-12 border-2 border-primary/25 shadow-md ring-2 ring-background">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{userName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge className={cn(
                        "text-[9px] h-4 px-1.5 font-semibold border-0",
                        profile?.user_type === 'employer'
                          ? "bg-primary/15 text-primary"
                          : "bg-accent text-accent-foreground"
                      )}>
                        {userRole}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Access Grid */}
                <div className="grid grid-cols-4 gap-1.5 mt-3.5">
                  {[
                    { icon: LayoutDashboard, label: 'Dashb...', href: dashboardPath, color: 'text-primary' },
                    { icon: MessageSquare, label: 'Messa...', href: profile?.user_type === 'employer' ? '/employer-dashboard?tab=chat' : '/candidate-dashboard?tab=messages', color: 'text-blue-500' },
                    { icon: Heart, label: 'Saved', href: dashboardPath, color: 'text-rose-500' },
                    { icon: Settings, label: 'Settings', href: settingsPath, color: 'text-muted-foreground' },
                  ].map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted/60 transition-all group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center transition-all group-hover:scale-105 group-hover:shadow-sm">
                        <item.icon className={cn("w-4 h-4 transition-colors", item.color, "group-hover:text-primary")} />
                      </div>
                      <span className="text-[9px] font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate w-full text-center">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent"
            >
              <div className="absolute top-2 right-2 w-16 h-16 bg-primary/10 rounded-full blur-xl" />
              <div className="relative p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-bold text-foreground">Join HireForJob</span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                  Get personalized job matches and connect with employers near you.
                </p>
                <div className="flex gap-2">
                  <Link to="/login" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full h-9 text-xs gap-1.5 rounded-xl">
                      <LogIn className="w-3.5 h-3.5" />
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/signup" className="flex-1">
                    <Button size="sm" className="w-full h-9 text-xs gap-1.5 rounded-xl shadow-md">
                      <UserPlus className="w-3.5 h-3.5" />
                      Sign Up
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Mode Toggle */}
          <div className="relative flex bg-muted/40 rounded-2xl p-1 border border-border/20 shadow-inner">
            <motion.div
              className="absolute inset-y-1 rounded-xl z-0"
              initial={false}
              animate={{
                left: mode === 'hiring' ? '4px' : '50%',
                right: mode === 'hiring' ? '50%' : '4px',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <div className={cn(
                "w-full h-full rounded-xl shadow-lg",
                mode === 'hiring'
                  ? 'bg-gradient-to-r from-primary to-primary/90'
                  : 'bg-gradient-to-r from-destructive to-destructive/90'
              )} />
            </motion.div>
            <button
              onClick={() => onModeChange('hiring')}
              className={cn(
                "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-colors",
                mode === 'hiring' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              I am Hiring
            </button>
            <button
              onClick={() => onModeChange('seeking')}
              className={cn(
                "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-colors",
                mode === 'seeking' ? 'text-destructive-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Briefcase className="w-3.5 h-3.5" />
              I need a Job
            </button>
          </div>

          {/* Search */}
          <SearchBar
            onSearch={onSearchChange}
            placeholder={mode === 'hiring' ? 'Search candidates...' : 'Search jobs...'}
            resultCount={count}
            showResultCount={true}
          />

          {/* Filters & Location */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex-1 h-9 text-xs gap-1.5 rounded-xl border-border/40 transition-all",
                showFilters && "border-primary/50 text-primary bg-primary/5 shadow-sm"
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              Radius
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCenterOnUser}
              className="h-9 text-xs gap-1.5 rounded-xl border-border/40"
            >
              <Navigation className="w-3.5 h-3.5" />
              Location
            </Button>
            {onHeatmapToggle && (
              <Button
                variant="outline"
                size="sm"
                onClick={onHeatmapToggle}
                className={cn(
                  "h-9 text-xs gap-1.5 rounded-xl border-border/40 transition-all",
                  heatmapEnabled && "border-orange-400/50 text-orange-500 bg-orange-500/5"
                )}
              >
                <Flame className="w-3.5 h-3.5" />
              </Button>
            )}
            {onSalaryHeatmapToggle && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSalaryHeatmapToggle}
                className={cn(
                  "h-9 text-xs gap-1.5 rounded-xl border-border/40 transition-all",
                  salaryHeatmapEnabled && "border-emerald-400/50 text-emerald-500 bg-emerald-500/5"
                )}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                ₹
              </Button>
            )}
          </div>

          {/* Expandable Radius Filter */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <RadiusFilter
                  radius={radius}
                  onRadiusChange={onRadiusChange}
                  className="shadow-none border border-border/30 p-3 bg-muted/20 rounded-xl"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Advanced Filters */}
          {onFiltersChange && (
            <AdvancedFilters
              filters={filters}
              onFiltersChange={onFiltersChange}
              isOpen={showAdvancedFilters}
              onToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
              activeCount={
                (filters.jobTypes.length > 0 ? 1 : 0) +
                (filters.category !== 'all' ? 1 : 0) +
                (filters.experienceMin > 0 || filters.experienceMax < 30 ? 1 : 0) +
                (filters.salaryMin > 0 || filters.salaryMax < 100 ? 1 : 0)
              }
            />
          )}

          {/* Nearby Companies Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCompanies(!showCompanies)}
            className={cn(
              "w-full h-9 text-xs gap-1.5 rounded-xl border-border/40 transition-all",
              showCompanies && "border-primary/50 text-primary bg-primary/5 shadow-sm"
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            Nearby Companies
            <ChevronRight className={cn("w-3 h-3 ml-auto transition-transform", showCompanies && "rotate-90")} />
          </Button>

          <AnimatePresence>
            {showCompanies && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border border-border/30 rounded-xl bg-muted/10 p-2">
                  <NearbyCompanies userLocation={userLocation} radius={radius} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats Header */}
          <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-muted/30 to-transparent p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2.5 rounded-xl shadow-sm",
                  mode === 'seeking'
                    ? 'bg-gradient-to-br from-destructive/15 to-destructive/5'
                    : 'bg-gradient-to-br from-primary/15 to-primary/5'
                )}>
                  {mode === 'seeking' ? (
                    <Briefcase className="w-5 h-5 text-destructive" />
                  ) : (
                    <Users className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <motion.span
                      key={count}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-2xl font-black text-foreground tabular-nums"
                    >
                      {count}
                    </motion.span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {mode === 'seeking' ? 'Jobs' : 'Candidates'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    within {radius}km radius
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onViewList}
                className="h-8 px-3 text-xs gap-1.5 rounded-xl border-border/40"
              >
                <List className="w-3 h-3" />
                All
              </Button>
            </div>

            {/* Category Badges - Jobs only */}
            {mode === 'seeking' && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card/60 border border-border/20">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{privateJobCount}</p>
                    <p className="text-[10px] text-muted-foreground">Private</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card/60 border border-success/15">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <Landmark className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{governmentJobCount}</p>
                    <p className="text-[10px] text-muted-foreground">Government</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* List of Items */}
          <div className="space-y-1.5">
            {isLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="animate-pulse p-3.5 rounded-xl bg-muted/20 border border-border/10">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted/40" />
                      <div className="flex-1">
                        <div className="h-3.5 bg-muted/40 rounded-lg w-3/4 mb-2" />
                        <div className="h-3 bg-muted/30 rounded-lg w-1/2 mb-2.5" />
                        <div className="flex gap-2">
                          <div className="h-5 bg-muted/20 rounded-full w-16" />
                          <div className="h-5 bg-muted/20 rounded-full w-14" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : mode === 'seeking' ? (
              nearbyJobs && nearbyJobs.length > 0 ? (
                nearbyJobs.map((job, index) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Link
                      to={`/job/${job.id}`}
                      className="group block p-3.5 rounded-xl border border-border/20 hover:border-primary/30 bg-card/40 hover:bg-card/80 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted/60 to-muted/30 flex items-center justify-center shrink-0 group-hover:from-primary/10 group-hover:to-primary/5 transition-all">
                            <Briefcase className="w-4.5 h-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[13px] text-foreground truncate group-hover:text-primary transition-colors">
                              {job.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {job.company_name}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {job.salary_range && (
                                <Badge variant="secondary" className="text-[10px] h-5 px-2 gap-0.5 bg-success/10 text-success border-0 font-semibold">
                                  <TrendingUp className="w-2.5 h-2.5" />
                                  {job.salary_range}
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                {job.distance_km?.toFixed(1)} km
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <Badge variant="outline" className="text-[9px] h-5 px-2 rounded-lg border-border/40">
                            {job.job_type || 'Full-time'}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))
              ) : (
                <EmptyState mode="seeking" />
              )
            ) : (
              nearbyCandidates && nearbyCandidates.length > 0 ? (
                nearbyCandidates.map((candidate, index) => (
                  <motion.div
                    key={candidate.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Link
                      to={`/candidate/${candidate.id}`}
                      className="group block p-3.5 rounded-xl border border-border/20 hover:border-primary/30 bg-card/40 hover:bg-card/80 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                            {candidate.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[13px] text-foreground truncate group-hover:text-primary transition-colors">
                              {candidate.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {candidate.job_title}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-[10px] h-5 px-2 gap-0.5 border-0 font-semibold">
                                <Clock className="w-2.5 h-2.5" />
                                {candidate.experience_years || 0}y exp
                              </Badge>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                {candidate.distance_km?.toFixed(1)} km
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                      </div>
                    </Link>
                  </motion.div>
                ))
              ) : (
                <EmptyState mode="hiring" />
              )
            )}
          </div>

          {/* Load More */}
          {items && items.length === limit && (
            <Button
              variant="ghost"
              className="w-full mt-1 h-10 text-xs text-muted-foreground hover:text-foreground rounded-xl gap-2"
              onClick={() => setLimit(l => l + 10)}
            >
              <Zap className="w-3.5 h-3.5" />
              Load more results...
            </Button>
          )}

          {/* View All CTA */}
          {count > 0 && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={onViewList}
              className="group w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-primary/8 via-primary/4 to-transparent border border-primary/15 hover:border-primary/30 hover:from-primary/12 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <List className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-xs text-foreground">
                View All {mode === 'seeking' ? 'Jobs' : 'Candidates'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all ml-auto" />
            </motion.button>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border/30 bg-muted/10">
        {user && (
          <div className="p-3">
            <Button
              variant="ghost"
              onClick={handleSignOut}
              size="sm"
              className="w-full justify-start gap-2 h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>
        )}
        <div className="px-3 py-2 border-t border-border/20">
          <p className="text-[10px] text-muted-foreground text-center">
            Developed and maintained by{' '}
            <a
              href="https://www.dibull.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium transition-colors"
            >
              dibull
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ mode }: { mode: 'seeking' | 'hiring' }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center py-12 px-4"
  >
    <div className={cn(
      "w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-sm",
      mode === 'seeking'
        ? 'bg-gradient-to-br from-destructive/15 to-destructive/5'
        : 'bg-gradient-to-br from-primary/15 to-primary/5'
    )}>
      {mode === 'seeking' ? (
        <Briefcase className="w-7 h-7 text-destructive/50" />
      ) : (
        <Users className="w-7 h-7 text-primary/50" />
      )}
    </div>
    <p className="text-sm font-semibold text-foreground mb-1">
      No {mode === 'seeking' ? 'jobs' : 'candidates'} found
    </p>
    <p className="text-xs text-muted-foreground leading-relaxed">
      Try increasing the search radius or adjusting your filters
    </p>
  </motion.div>
);
