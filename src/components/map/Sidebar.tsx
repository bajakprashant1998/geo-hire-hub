import { ViewMode, Candidate, Job } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  X, Users, Briefcase, MapPin, ChevronRight, 
  LayoutDashboard, Settings, MessageSquare, LogOut, 
  LogIn, UserPlus, Heart, Building2, Landmark,
  Clock, TrendingUp, Globe, Sparkles, Shield, Search
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
  const userRole = profile?.user_type === 'employer' ? 'Employer' : 'Candidate';

  const quickLinks = user ? [
    { icon: LayoutDashboard, label: 'Dashboard', path: dashboardPath, color: 'text-primary' },
    { icon: MessageSquare, label: 'Messages', path: profile?.user_type === 'employer' ? '/employer-dashboard?tab=chat' : '/candidate-dashboard?tab=messages', color: 'text-blue-500' },
    { icon: Heart, label: 'Saved Jobs', path: dashboardPath, color: 'text-rose-500' },
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Sidebar Panel */}
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute left-0 top-0 h-full w-[88vw] max-w-[380px] bg-background shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent" />
              <div className="relative flex items-center justify-between px-4 py-4">
                <Link to="/" onClick={onClose} className="flex items-center gap-2.5 group">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/15 rounded-xl blur-md group-hover:blur-lg transition-all" />
                    <img 
                      src="/logo.png" 
                      alt="Hire for Job" 
                      className="relative w-10 h-10 rounded-xl object-contain shadow-md"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
                  </div>
                  <div>
                    <span className="font-bold text-base text-foreground leading-none block tracking-tight">
                      Hire for Job
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Globe className="w-2.5 h-2.5" />
                      Find opportunities nearby
                    </span>
                  </div>
                </Link>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose}
                  className="h-9 w-9 rounded-full hover:bg-muted/80"
                >
                  <X className="w-4.5 h-4.5" />
                </Button>
              </div>
            </div>

            {/* User Profile Card */}
            {user ? (
              <div className="px-3.5 pt-1 pb-3">
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-muted/20 shadow-sm"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
                  <div className="relative p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm" />
                        <Avatar className="relative w-12 h-12 border-2 border-primary/20 shadow-md ring-2 ring-background">
                          <AvatarImage src={profile?.avatar_url || undefined} alt={userName} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-sm">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{userName}</p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user.email}</p>
                      </div>
                      <Badge className={cn(
                        "text-[9px] h-5 px-2 font-semibold border-0 shrink-0",
                        profile?.user_type === 'employer'
                          ? "bg-primary/15 text-primary"
                          : "bg-accent text-accent-foreground"
                      )}>
                        {userRole}
                      </Badge>
                    </div>

                    {/* Quick Links as horizontal pills */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                      {quickLinks.map((link) => (
                        <button
                          key={link.path + link.label}
                          onClick={() => handleNavClick(link.path)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
                        >
                          <link.icon className={cn("w-3.5 h-3.5", link.color)} />
                          {link.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="px-3.5 pt-1 pb-3">
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 h-9 text-xs gap-1.5 rounded-xl"
                        onClick={() => handleNavClick('/login')}
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        Sign In
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 h-9 text-xs gap-1.5 rounded-xl shadow-md"
                        onClick={() => handleNavClick('/signup')}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Sign Up
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Section Header with Stats */}
            <div className="px-3.5 pb-3">
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-2xl border border-border/30 bg-muted/20 p-3.5"
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className={cn(
                    "p-2.5 rounded-xl",
                    mode === 'seeking' ? 'bg-destructive/10' : 'bg-primary/10'
                  )}>
                    {mode === 'hiring' ? (
                      <Users className="w-5 h-5 text-primary" />
                    ) : (
                      <Briefcase className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-foreground leading-tight">
                      {mode === 'hiring' ? 'Candidates' : 'Jobs'} Nearby
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      {mode === 'hiring' 
                        ? `${candidates.length} professionals found`
                        : `${jobs.length} opportunities found`
                      }
                    </p>
                  </div>
                </div>

                {/* Category Pills - Jobs only */}
                {mode === 'seeking' && jobs.length > 0 && (
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-[11px] bg-muted/60 border border-border/40 text-foreground font-medium">
                      <Building2 className="w-3 h-3 text-muted-foreground" />
                      {privateJobsCount} Private
                    </Badge>
                    <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-foreground font-medium">
                      <Landmark className="w-3 h-3 text-emerald-500" />
                      {governmentJobsCount} Govt
                    </Badge>
                  </div>
                )}
              </motion.div>
            </div>

            {/* List */}
            <ScrollArea className="flex-1">
              <div className="px-3.5 pb-3 space-y-2.5">
                {mode === 'hiring'
                  ? candidates.map((candidate, index) => (
                      <motion.button
                        key={candidate.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 + index * 0.03 }}
                        onClick={() => onSelectCandidate(candidate)}
                        className="w-full p-3.5 rounded-2xl border border-border/40 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 text-left group active:scale-[0.98]"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="w-11 h-11 border-2 border-border/50 shadow-sm">
                            <AvatarImage src={candidate.avatar_url} alt={candidate.full_name} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
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
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 text-[10px] font-medium text-foreground">
                                    <TrendingUp className="w-3 h-3 text-primary" />
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
                                <span className="text-[10px] text-muted-foreground italic">Sign in as employer for details</span>
                              ) : null}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                        </div>
                      </motion.button>
                    ))
                  : jobs.map((job, index) => (
                      <motion.button
                        key={job.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 + index * 0.03 }}
                        onClick={() => onSelectJob(job)}
                        className={cn(
                          "w-full p-3.5 rounded-2xl border bg-card hover:shadow-lg transition-all duration-200 text-left group active:scale-[0.98]",
                          job.job_category === 'government' 
                            ? 'border-l-[3px] border-l-emerald-500 border-emerald-200/60 dark:border-emerald-800/40 hover:border-emerald-400/60 hover:shadow-emerald-500/5' 
                            : 'border-border/40 hover:border-primary/40 hover:shadow-primary/5'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                            job.job_category === 'government' 
                              ? 'bg-emerald-500/10' 
                              : 'bg-muted/60'
                          )}>
                            {job.job_category === 'government' ? (
                              <Landmark className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Building2 className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
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
                                <Badge variant="secondary" className="text-[10px] shrink-0 font-medium rounded-lg px-2 py-0.5 bg-muted/60">
                                  {job.job_type}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2.5">
                              {job.salary_range && (
                                <span className="text-xs font-bold text-foreground">
                                  {job.salary_range}
                                </span>
                              )}
                              {job.distance_km !== undefined && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 font-medium">
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
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-14 text-center"
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center",
                      mode === 'seeking' ? 'bg-destructive/10' : 'bg-primary/10'
                    )}>
                      {mode === 'seeking' ? (
                        <Search className="w-7 h-7 text-destructive/40" />
                      ) : (
                        <Users className="w-7 h-7 text-primary/40" />
                      )}
                    </div>
                    <p className="font-semibold text-sm text-foreground">
                      No {mode === 'hiring' ? 'candidates' : 'jobs'} found
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-[200px] mx-auto">
                      Try expanding your search radius or adjusting filters
                    </p>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            {user && (
              <div className="p-3 border-t border-border/30 bg-muted/10">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-destructive/80 hover:text-destructive hover:bg-destructive/8 h-10 rounded-xl text-xs font-medium"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
