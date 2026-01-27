import { ViewMode, Candidate, Job } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  X, Users, Briefcase, MapPin, ChevronRight, 
  LayoutDashboard, Settings, MessageSquare, LogOut, 
  LogIn, UserPlus, FileText, Bell, Heart
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { GovernmentJobBadge } from '@/components/government';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ViewMode;
  candidates: Candidate[];
  jobs: Job[];
  onSelectCandidate: (candidate: Candidate) => void;
  onSelectJob: (job: Job) => void;
}

export const Sidebar = ({
  isOpen,
  onClose,
  mode,
  candidates,
  jobs,
  onSelectCandidate,
  onSelectJob,
}: SidebarProps) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    onClose();
    navigate('/');
  };

  const handleNavClick = (path: string) => {
    onClose();
    navigate(path);
  };

  const dashboardPath = profile?.user_type === 'employer' ? '/employer-dashboard' : '/candidate-dashboard';
  const settingsPath = profile?.user_type === 'employer' ? '/company-profile' : '/candidate-settings';
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = userName.charAt(0).toUpperCase();

  const quickLinks = user ? [
    { icon: LayoutDashboard, label: 'Dashboard', path: dashboardPath },
    { icon: MessageSquare, label: 'Messages', path: '/messages' },
    { icon: Heart, label: profile?.user_type === 'employer' ? 'Saved Candidates' : 'Saved Jobs', path: dashboardPath },
    { icon: Bell, label: 'Notifications', path: dashboardPath },
    { icon: Settings, label: 'Settings', path: settingsPath },
  ] : [];

  return (
    <div className="fixed inset-0 z-[1000]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sidebar Panel */}
      <div className="absolute left-0 top-0 h-full w-80 md:w-96 bg-card shadow-2xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <Link to="/" onClick={onClose} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Hire for Job</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* User Profile Section */}
        {user ? (
          <div className="p-4 bg-secondary/30 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {profile?.user_type === 'employer' ? 'Employer' : 'Candidate'}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-secondary/30 border-b border-border shrink-0">
            <p className="text-sm text-muted-foreground mb-3">Sign in to access all features</p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => handleNavClick('/login')}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => handleNavClick('/signup')}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Join
              </Button>
            </div>
          </div>
        )}

        {/* Quick Navigation */}
        {user && quickLinks.length > 0 && (
          <div className="p-2 border-b border-border shrink-0">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Quick Access
            </p>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {quickLinks.map((link) => (
                <Button
                  key={link.path + link.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start h-9 text-sm"
                  onClick={() => handleNavClick(link.path)}
                >
                  <link.icon className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="truncate">{link.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Nearby Section Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {mode === 'hiring' ? (
              <>
                <Users className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Candidates Nearby</h2>
              </>
            ) : (
              <>
                <Briefcase className="w-5 h-5 text-destructive" />
                <h2 className="font-semibold">Jobs Nearby</h2>
              </>
            )}
          </div>
          <Badge variant="secondary">
            {mode === 'hiring' ? candidates.length : jobs.length}
          </Badge>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {mode === 'hiring'
              ? candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => onSelectCandidate(candidate)}
                    className="w-full card-google p-3 text-left hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex-shrink-0">
                        {candidate.avatar_url ? (
                          <img
                            src={candidate.avatar_url}
                            alt={candidate.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary font-semibold">
                            {candidate.full_name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{candidate.full_name}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {candidate.job_title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs py-0">
                            {candidate.experience_years}y exp
                          </Badge>
                          {candidate.distance_km !== undefined && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" />
                              {candidate.distance_km.toFixed(1)} km
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </button>
                ))
              : jobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => onSelectJob(job)}
                    className={`w-full card-google p-3 text-left transition-colors ${
                      job.job_category === 'government' 
                        ? 'hover:border-emerald-500/50 border-l-4 border-l-emerald-500' 
                        : 'hover:border-destructive/50'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-medium text-sm truncate">{job.title}</h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {job.company_name}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {job.job_category === 'government' ? (
                            <GovernmentJobBadge variant="compact" />
                          ) : (
                            <Badge variant="secondary" className="badge-job text-xs">
                              {job.job_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {job.salary_range && (
                          <span className="font-medium text-foreground">{job.salary_range}</span>
                        )}
                        {job.distance_km !== undefined && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />
                            {job.distance_km.toFixed(1)} km
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

            {/* Empty State */}
            {((mode === 'hiring' && candidates.length === 0) || 
              (mode === 'seeking' && jobs.length === 0)) && (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-sm">No {mode === 'hiring' ? 'candidates' : 'jobs'} found nearby</p>
                <p className="text-xs mt-1">Try expanding your search radius</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with Sign Out */}
        {user && (
          <div className="p-3 border-t border-border shrink-0">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};