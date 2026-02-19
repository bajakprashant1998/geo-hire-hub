import { ViewMode } from '@/types';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  LogIn, 
  UserPlus, 
  Users, 
  Briefcase, 
  Target, 
  List, 
  Building2, 
  Landmark,
  Search,
  Navigation,
  LayoutDashboard,
  Settings,
  LogOut,
  X,
  MessageSquare,
  Heart,
  Bell,
  ChevronRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LocationBadge } from './LocationBadge';
import { useState, useRef, useEffect, useCallback } from 'react';
import { SearchSuggestions, saveRecentSearch } from './SearchSuggestions';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

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
  mode,
  onModeChange,
  searchQuery,
  onSearchChange,
  radius,
  onRadiusChange,
  candidateCount,
  jobCount,
  governmentJobCount,
  privateJobCount,
  onViewList,
  onCenterOnUser,
  userLocation,
  onClose,
}: LeftSidebarPanelProps) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const count = mode === 'hiring' ? candidateCount : jobCount;
  const [limit, setLimit] = useState(10);

  // Fetch nearby jobs
  const { data: nearbyJobs } = useQuery({
    queryKey: ['nearby-jobs-sidebar', userLocation?.lat, userLocation?.lng, radius, limit],
    queryFn: async () => {
      if (!userLocation) return [];
      const { data, error } = await supabase.rpc('get_nearby_jobs', {
        user_lat: userLocation.lat,
        user_lng: userLocation.lng,
        radius_km: radius
      });
      if (error) return [];
      return (data || []).slice(0, limit) as Job[];
    },
    enabled: !!userLocation && mode === 'seeking',
  });

  // Fetch nearby candidates
  const { data: nearbyCandidates } = useQuery({
    queryKey: ['nearby-candidates-sidebar', userLocation?.lat, userLocation?.lng, radius, limit],
    queryFn: async () => {
      if (!userLocation) return [];
      const { data, error } = await supabase.rpc('get_nearby_candidates', {
        user_lat: userLocation.lat,
        user_lng: userLocation.lng,
        radius_km: radius
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

  const quickAccessItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: dashboardPath },
    { icon: MessageSquare, label: 'Messages', href: '/messages' },
    { icon: Heart, label: profile?.user_type === 'employer' ? 'Saved Candidates' : 'Saved Jobs', href: dashboardPath },
    { icon: Bell, label: 'Notifications', href: dashboardPath },
    { icon: Settings, label: 'Settings', href: settingsPath },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2.5">
          <img 
            src="/logo.png" 
            alt="Hire for Job" 
            className="w-8 h-8 rounded-lg object-contain"
          />
          <span className="font-semibold text-foreground">
            Hire for Job
          </span>
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* User Profile Card */}
          {user ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <Badge variant="secondary" className="mt-1 text-[10px] h-5 px-2">
                  {userRole}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Link to="/login" className="block">
                <Button variant="outline" className="w-full justify-start gap-2 h-10">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
              </Link>
              <Link to="/signup" className="block">
                <Button className="w-full justify-start gap-2 h-10">
                  <UserPlus className="w-4 h-4" />
                  Get Started
                </Button>
              </Link>
            </div>
          )}

          {/* Quick Access Menu */}
          {user && (
            <>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Quick Access
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {quickAccessItems.slice(0, 4).map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm text-muted-foreground hover:text-foreground"
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                </div>
                <Link
                  to={settingsPath}
                  className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-sm text-muted-foreground hover:text-foreground mt-1"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </Link>
              </div>
              <Separator />
            </>
          )}

          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'hiring' ? 'outline' : 'ghost'}
              size="sm"
              className={cn(
                "flex-1 h-9 gap-1.5 text-xs font-medium",
                mode === 'hiring' && 'border-primary/50 text-primary'
              )}
              onClick={() => onModeChange('hiring')}
            >
              <Users className="w-3.5 h-3.5" />
              I am Hiring
            </Button>
            <Button
              variant={mode === 'seeking' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "flex-1 h-9 gap-1.5 text-xs font-medium",
                mode === 'seeking' && 'bg-destructive hover:bg-destructive/90'
              )}
              onClick={() => onModeChange('seeking')}
            >
              <Briefcase className="w-3.5 h-3.5" />
              I need a Job
            </Button>
          </div>

          {/* Jobs/Candidates Header */}
          <div className="flex items-start gap-3 pt-2">
            <div className={cn(
              "p-2 rounded-lg",
              mode === 'seeking' ? 'bg-destructive/10' : 'bg-primary/10'
            )}>
              {mode === 'seeking' ? (
                <Briefcase className="w-5 h-5 text-destructive" />
              ) : (
                <Users className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline justify-between">
                <h2 className="text-2xl font-bold text-foreground leading-tight">
                  {mode === 'seeking' ? 'Jobs' : 'Candidates'}
                  <br />
                  <span className="text-muted-foreground font-normal text-lg">Nearby</span>
                </h2>
                <span className="text-xl font-semibold text-muted-foreground">{count}</span>
              </div>
            </div>
          </div>

          {/* Category Badges - Jobs only */}
          {mode === 'seeking' && (
            <div className="flex gap-2">
              <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
                <Building2 className="w-3 h-3" />
                {privateJobCount} Private
              </Badge>
              <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
                <Landmark className="w-3 h-3" />
                {governmentJobCount} Govt
              </Badge>
            </div>
          )}

          <Separator />

          {/* List of Jobs/Candidates */}
          <div className="space-y-1">
            {mode === 'seeking' ? (
              nearbyJobs && nearbyJobs.length > 0 ? (
                nearbyJobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/job/${job.id}`}
                    className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {job.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {job.company_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-muted-foreground">
                            {job.salary_range || 'Salary not specified'}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70">•</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />
                            {job.distance_km?.toFixed(1)} km
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {job.job_type || 'Full-time'}
                      </Badge>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No jobs found nearby
                </div>
              )
            ) : (
              nearbyCandidates && nearbyCandidates.length > 0 ? (
                nearbyCandidates.map((candidate) => (
                  <Link
                    key={candidate.id}
                    to={`/candidate/${candidate.id}`}
                    className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {candidate.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {candidate.job_title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-muted-foreground">
                            {candidate.experience_years || 0} years exp
                          </span>
                          <span className="text-[10px] text-muted-foreground/70">•</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />
                            {candidate.distance_km?.toFixed(1)} km
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No candidates found nearby
                </div>
              )
            )}
          </div>

          {/* Load More Button */}
          {(mode === 'seeking' ? nearbyJobs : nearbyCandidates)?.length === limit && (
            <Button 
              variant="outline" 
              className="w-full mt-2" 
              onClick={() => setLimit(l => l + 10)}
            >
              Load More
            </Button>
          )}

          {/* View All Button */}
          {count > 0 && (
            <button
              onClick={onViewList}
              className="group w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 hover:border-primary/40 hover:from-primary/15 hover:via-primary/10 transition-all duration-300"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <List className="w-4 h-4 text-primary" />
              </div>
              <span className="font-medium text-sm text-foreground">
                View All {mode === 'seeking' ? 'Jobs' : 'Candidates'}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all ml-auto" />
            </button>
          )}
        </div>
      </ScrollArea>

      {/* Sign Out Footer */}
      {user && (
        <div className="p-4 border-t border-border">
          <Button 
            variant="ghost" 
            onClick={handleSignOut}
            className="w-full justify-start gap-2 h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      )}
    </div>
  );
};