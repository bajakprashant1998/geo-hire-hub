import { ViewMode } from '@/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  MapPin, LogIn, UserPlus, Users, Briefcase, Target,
  List, Building2, Landmark, Search, Navigation,
  LayoutDashboard, Settings, LogOut, X, MessageSquare,
  Heart, Bell, ChevronRight, Sparkles, TrendingUp,
  Clock, Star, Filter
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
}

export const LeftSidebarPanel = ({
  mode, onModeChange, searchQuery, onSearchChange,
  radius, onRadiusChange, candidateCount, jobCount,
  governmentJobCount, privateJobCount, onViewList,
  onCenterOnUser, userLocation, onClose,
}: LeftSidebarPanelProps) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [limit, setLimit] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  const count = mode === 'hiring' ? candidateCount : jobCount;

  // Fetch nearby jobs
  const { data: nearbyJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['nearby-jobs-sidebar', userLocation?.lat, userLocation?.lng, radius, limit],
    queryFn: async () => {
      if (!userLocation) return [];
      const { data, error } = await supabase.rpc('get_nearby_jobs', {
        user_lat: userLocation.lat, user_lng: userLocation.lng, radius_km: radius
      });
      if (error) return [];
      return (data || []).slice(0, limit) as Job[];
    },
    enabled: !!userLocation && mode === 'seeking',
  });

  // Fetch nearby candidates
  const { data: nearbyCandidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ['nearby-candidates-sidebar', userLocation?.lat, userLocation?.lng, radius, limit],
    queryFn: async () => {
      if (!userLocation) return [];
      const { data, error } = await supabase.rpc('get_nearby_candidates', {
        user_lat: userLocation.lat, user_lng: userLocation.lng, radius_km: radius
      });
      if (error) return [];
      return (data || []).slice(0, limit) as Candidate[];
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
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <img
              src="/logo.png"
              alt="Hire for Job"
              className="w-9 h-9 rounded-xl object-contain shadow-md group-hover:shadow-lg transition-shadow"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-background" />
          </div>
          <div>
            <span className="font-bold text-foreground text-base leading-none block">
              Hire for Job
            </span>
            <span className="text-[10px] text-muted-foreground">Find opportunities nearby</span>
          </div>
        </Link>
        {onClose && (
          <Tooltip><TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg">
            <X className="w-4 h-4" />
          </Button>
          </TooltipTrigger><TooltipContent>Close panel</TooltipContent></Tooltip>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* User Profile Card */}
          {user ? (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 to-muted/10"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-11 h-11 border-2 border-primary/20 shadow-sm ring-2 ring-background">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{userName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-medium">
                        {userRole}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Access Grid */}
                <div className="grid grid-cols-4 gap-1 mt-3">
                  {[
                    { icon: LayoutDashboard, label: 'Dashboard', href: dashboardPath },
                    { icon: MessageSquare, label: 'Messages', href: '/messages' },
                    { icon: Heart, label: 'Saved', href: dashboardPath },
                    { icon: Settings, label: 'Settings', href: settingsPath },
                  ].map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted/60 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                        <item.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-[9px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Join HireForJob</span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Get personalized job matches and connect with employers near you.
                </p>
                <div className="flex gap-2">
                  <Link to="/login" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full h-9 text-xs gap-1.5">
                      <LogIn className="w-3.5 h-3.5" />
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/signup" className="flex-1">
                    <Button size="sm" className="w-full h-9 text-xs gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" />
                      Sign Up
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Mode Toggle */}
          <div className="relative flex bg-muted/50 rounded-xl p-1 border border-border/30">
            <motion.div
              className="absolute inset-y-1 rounded-lg z-0"
              initial={false}
              animate={{
                left: mode === 'hiring' ? '4px' : '50%',
                right: mode === 'hiring' ? '50%' : '4px',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <div className={cn(
                "w-full h-full rounded-lg shadow-sm",
                mode === 'hiring' ? 'bg-primary' : 'bg-destructive'
              )} />
            </motion.div>
            <button
              onClick={() => onModeChange('hiring')}
              className={cn(
                "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors",
                mode === 'hiring' ? 'text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              I am Hiring
            </button>
            <button
              onClick={() => onModeChange('seeking')}
              className={cn(
                "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors",
                mode === 'seeking' ? 'text-destructive-foreground' : 'text-muted-foreground'
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

          {/* Filters & Radius Toggle */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex-1 h-8 text-xs gap-1.5 rounded-lg",
                showFilters && "border-primary/50 text-primary bg-primary/5"
              )}
            >
              <Filter className="w-3 h-3" />
              Radius & Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCenterOnUser}
              className="h-8 text-xs gap-1.5 rounded-lg"
            >
              <Navigation className="w-3 h-3" />
              My Location
            </Button>
          </div>

          {/* Expandable Filters */}
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

          <Separator className="my-1" />

          {/* Stats Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "p-2 rounded-lg",
                mode === 'seeking' ? 'bg-destructive/10' : 'bg-primary/10'
              )}>
                {mode === 'seeking' ? (
                  <Briefcase className="w-4 h-4 text-destructive" />
                ) : (
                  <Users className="w-4 h-4 text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <motion.span
                    key={count}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xl font-bold text-foreground"
                  >
                    {count}
                  </motion.span>
                  <span className="text-sm text-muted-foreground">
                    {mode === 'seeking' ? 'Jobs' : 'Candidates'}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">within {radius}km radius</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onViewList} className="h-7 px-2 text-xs gap-1">
              <List className="w-3 h-3" />
              All
            </Button>
          </div>

          {/* Category Badges - Jobs only */}
          {mode === 'seeking' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
                <Building2 className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-bold text-foreground">{privateJobCount}</p>
                  <p className="text-[10px] text-muted-foreground">Private</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-br from-success/5 to-transparent border border-success/10">
                <Landmark className="w-4 h-4 text-success" />
                <div>
                  <p className="text-sm font-bold text-foreground">{governmentJobCount}</p>
                  <p className="text-[10px] text-muted-foreground">Government</p>
                </div>
              </div>
            </div>
          )}

          <Separator className="my-1" />

          {/* List of Items */}
          <div className="space-y-1">
            {isLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse p-3 rounded-xl bg-muted/30">
                    <div className="h-3.5 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-2.5 bg-muted rounded w-1/3" />
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
                      className="block p-3 rounded-xl hover:bg-muted/40 transition-all border border-transparent hover:border-border/30 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {job.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {job.company_name}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {job.salary_range && (
                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-0.5 bg-success/10 text-success border-0">
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
                        <Badge variant="outline" className="text-[9px] shrink-0 h-5">
                          {job.job_type || 'Full-time'}
                        </Badge>
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
                      className="block p-3 rounded-xl hover:bg-muted/40 transition-all border border-transparent hover:border-border/30 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {candidate.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {candidate.job_title}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-0.5 border-0">
                              <Clock className="w-2.5 h-2.5" />
                              {candidate.experience_years || 0}y exp
                            </Badge>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5" />
                              {candidate.distance_km?.toFixed(1)} km
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
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
              className="w-full mt-1 h-9 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setLimit(l => l + 10)}
            >
              Load more results...
            </Button>
          )}

          {/* View All CTA */}
          {count > 0 && (
            <button
              onClick={onViewList}
              className="group w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-gradient-to-r from-primary/8 via-primary/4 to-transparent border border-primary/15 hover:border-primary/30 hover:from-primary/12 transition-all duration-300"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <List className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="font-medium text-xs text-foreground">
                View All {mode === 'seeking' ? 'Jobs' : 'Candidates'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all ml-auto" />
            </button>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {user && (
        <div className="p-3 border-t border-border/50">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            size="sm"
            className="w-full justify-start gap-2 h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ mode }: { mode: 'seeking' | 'hiring' }) => (
  <div className="text-center py-10 px-4">
    <div className={cn(
      "w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center",
      mode === 'seeking' ? 'bg-destructive/10' : 'bg-primary/10'
    )}>
      {mode === 'seeking' ? (
        <Briefcase className="w-6 h-6 text-destructive/60" />
      ) : (
        <Users className="w-6 h-6 text-primary/60" />
      )}
    </div>
    <p className="text-sm font-medium text-foreground mb-1">
      No {mode === 'seeking' ? 'jobs' : 'candidates'} found
    </p>
    <p className="text-xs text-muted-foreground">
      Try increasing the search radius or adjusting your filters
    </p>
  </div>
);
