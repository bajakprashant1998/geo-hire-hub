import { ViewMode, Candidate, Job } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  X, Users, Briefcase, MapPin, ChevronRight, 
  LayoutDashboard, Settings, MessageSquare, LogOut, 
  LogIn, UserPlus, Bell, Heart, Building2, Landmark,
  Clock, Star, TrendingUp
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { GovernmentJobBadge } from '@/components/government';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
    { icon: MessageSquare, label: 'Messages', path: profile?.user_type === 'employer' ? '/employer-dashboard?tab=chat' : '/candidate-dashboard?tab=messages' },
    { icon: Heart, label: profile?.user_type === 'employer' ? 'Saved' : 'Saved Jobs', path: dashboardPath },
    { icon: Bell, label: 'Alerts', path: dashboardPath },
    { icon: Settings, label: 'Settings', path: settingsPath },
  ] : [];

  const governmentJobsCount = jobs.filter(j => j.job_category === 'government').length;
  const privateJobsCount = jobs.filter(j => j.job_category !== 'government').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000]">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Sidebar Panel */}
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute left-0 top-0 h-full w-[340px] md:w-[400px] bg-background shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header with gradient */}
            <div className={cn(
              "relative p-5 pb-4",
              mode === 'seeking' 
                ? "bg-gradient-to-br from-destructive/10 via-background to-background" 
                : "bg-gradient-to-br from-primary/10 via-background to-background"
            )}>
              <div className="flex items-center justify-between">
                <Link to="/" onClick={onClose} className="flex items-center gap-2.5">
                  <img 
                    src="/logo.png" 
                    alt="Hire for Job" 
                    className="w-9 h-9 rounded-lg object-contain"
                  />
                  <span className="font-bold text-lg text-foreground">Hire for Job</span>
                </Link>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={onClose}
                      className="h-9 w-9 rounded-full hover:bg-muted"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Close sidebar</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* User Profile Card */}
            {user ? (
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <Avatar className="w-11 h-11 border-2 border-background shadow-sm">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] h-5 px-2 shrink-0">
                    {profile?.user_type === 'employer' ? 'Employer' : 'Candidate'}
                  </Badge>
                </div>

                {/* Quick Links */}
                <div className="flex gap-1 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                  {quickLinks.map((link) => (
                    <Button
                      key={link.path + link.label}
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => handleNavClick(link.path)}
                    >
                      <link.icon className="w-3.5 h-3.5" />
                      <span>{link.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-4 py-4 border-b border-border">
                <p className="text-sm text-muted-foreground mb-3">Sign in to access all features</p>
                <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 h-9"
                      onClick={() => handleNavClick('/login')}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sign in to your account</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="sm" 
                      className="flex-1 h-9"
                      onClick={() => handleNavClick('/signup')}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Get Started
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Create a new account</TooltipContent>
                </Tooltip>
                </div>
              </div>
            )}

            {/* Section Header with Stats */}
            <div className="px-4 py-4 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "p-2 rounded-lg",
                    mode === 'seeking' ? 'bg-destructive/10' : 'bg-primary/10'
                  )}>
                    {mode === 'hiring' ? (
                      <Users className="w-5 h-5 text-primary" />
                    ) : (
                      <Briefcase className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-foreground">
                      {mode === 'hiring' ? 'Candidates' : 'Jobs'} Nearby
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {mode === 'hiring' 
                        ? `${candidates.length} professionals found`
                        : `${jobs.length} opportunities found`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Category Pills - Jobs only */}
              {mode === 'seeking' && jobs.length > 0 && (
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-background border border-border text-xs">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium">{privateJobsCount}</span>
                    <span className="text-muted-foreground">Private</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs">
                    <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">{governmentJobsCount}</span>
                    <span className="text-emerald-600 dark:text-emerald-500">Govt</span>
                  </div>
                </div>
              )}
            </div>

            {/* List */}
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {mode === 'hiring'
                  ? candidates.map((candidate, index) => (
                      <motion.button
                        key={candidate.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => onSelectCandidate(candidate)}
                        className="w-full p-3.5 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 text-left group"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="w-11 h-11 border border-border">
                            <AvatarImage src={candidate.avatar_url} alt={candidate.full_name} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {candidate.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {candidate.full_name}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {candidate.job_title}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {profile?.user_type === 'employer' && (
                                <>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium">
                                    <TrendingUp className="w-3 h-3" />
                                    {candidate.experience_years}y exp
                                  </span>
                                  {candidate.distance_km !== undefined && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                      <MapPin className="w-3 h-3" />
                                      {candidate.distance_km.toFixed(1)} km
                                    </span>
                                  )}
                                </>
                              )}
                              {!profile?.user_type || profile.user_type !== 'employer' ? (
                                <span className="text-[10px] text-muted-foreground">Sign in as employer for details</span>
                              ) : null}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                        </div>
                      </motion.button>
                    ))
                  : jobs.map((job, index) => (
                      <motion.button
                        key={job.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => onSelectJob(job)}
                        className={cn(
                          "w-full p-3.5 rounded-xl border bg-card hover:shadow-md transition-all duration-200 text-left group",
                          job.job_category === 'government' 
                            ? 'border-l-4 border-l-emerald-500 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400' 
                            : 'border-border hover:border-destructive/50'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-11 h-11 rounded-lg flex items-center justify-center shrink-0",
                            job.job_category === 'government' 
                              ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                              : 'bg-muted'
                          )}>
                            {job.job_category === 'government' ? (
                              <Landmark className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Briefcase className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                  {job.title}
                                </h3>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {job.company_name}
                                </p>
                              </div>
                              {job.job_category === 'government' ? (
                                <GovernmentJobBadge variant="compact" />
                              ) : (
                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                  {job.job_type}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              {job.salary_range && (
                                <span className="text-xs font-semibold text-foreground">
                                  {job.salary_range}
                                </span>
                              )}
                              {job.distance_km !== undefined && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3" />
                                  {job.distance_km.toFixed(1)} km
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto">
                                <Clock className="w-3 h-3" />
                                {new Date(job.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}

                {/* Empty State */}
                {((mode === 'hiring' && candidates.length === 0) || 
                  (mode === 'seeking' && jobs.length === 0)) && (
                  <div className="py-12 text-center">
                    <div className={cn(
                      "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
                      mode === 'seeking' ? 'bg-destructive/10' : 'bg-primary/10'
                    )}>
                      {mode === 'seeking' ? (
                        <Briefcase className="w-8 h-8 text-destructive/50" />
                      ) : (
                        <Users className="w-8 h-8 text-primary/50" />
                      )}
                    </div>
                    <p className="font-medium text-foreground">
                      No {mode === 'hiring' ? 'candidates' : 'jobs'} found
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try expanding your search radius
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            {user && (
              <div className="p-3 border-t border-border bg-muted/20">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 h-10"
                      onClick={handleSignOut}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sign out of your account</TooltipContent>
                </Tooltip>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
