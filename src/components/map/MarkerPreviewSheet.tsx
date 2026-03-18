import { Candidate, Job, ViewMode } from '@/types';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MapPin, Briefcase, Clock, Banknote, ArrowRight,
  Building2, Star, Lock, LogIn, Share2,
  Zap, Send, ChevronRight, Sparkles, Landmark,
  Globe, TrendingUp, Award, Timer
} from 'lucide-react';
import { GovernmentJobBadge } from '@/components/government';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MarkerPreviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ViewMode;
  item: Candidate | Job | null;
  isEmployer?: boolean;
}

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Posted today';
  if (diffDays === 1) return 'Posted yesterday';
  if (diffDays < 7) return `Posted ${diffDays}d ago`;
  if (diffDays < 30) return `Posted ${Math.floor(diffDays / 7)}w ago`;
  return `Posted ${Math.floor(diffDays / 30)}mo ago`;
};

const handleShare = async (title: string, id: string, type: 'jobs' | 'candidates') => {
  const url = `${window.location.origin}/${type}/${id}`;
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  } catch { /* user cancelled */ }
};

const StatPill = ({ icon: Icon, label, color }: { icon: any; label: string; color: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className={cn("flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border", color)}
  >
    <Icon className="w-4 h-4 shrink-0" />
    <span className="text-sm font-semibold">{label}</span>
  </motion.div>
);

export const MarkerPreviewSheet = ({ 
  isOpen, onClose, mode, item, isEmployer = false,
}: MarkerPreviewSheetProps) => {
  const navigate = useNavigate();
  if (!item) return null;

  const isCandidate = 'job_title' in item && 'full_name' in item;

  const handleViewDetails = () => {
    onClose();
    navigate(isCandidate ? `/candidates/${item.id}` : `/jobs/${item.id}`);
  };

  const handleSignIn = () => { onClose(); navigate('/login'); };

  const renderCandidatePreview = (c: Candidate) => (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      {/* Top accent */}
      <div className="-mx-6 -mt-6 h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/40 rounded-t-3xl" />

      {/* Header */}
      <div className="flex items-start gap-4 pt-1">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-sm" />
          <Avatar className="relative w-[72px] h-[72px] border-2 border-primary/20 shadow-lg rounded-2xl">
            <AvatarImage src={c.avatar_url} alt={c.full_name} className="rounded-2xl" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-2xl font-bold rounded-2xl">
              {c.full_name?.charAt(0) || 'C'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-success rounded-full border-[2.5px] border-background flex items-center justify-center shadow-md">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="text-xl font-bold truncate tracking-tight">{c.full_name}</h3>
          <p className="text-muted-foreground truncate text-sm mt-0.5">{c.job_title || 'Job Seeker'}</p>
          <div className="flex items-center gap-2 mt-2">
            {c.distance_km && (
              <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1 rounded-xl bg-muted/40 border-border/40">
                <MapPin className="w-3 h-3 text-destructive" />{c.distance_km.toFixed(1)} km away
              </Badge>
            )}
          </div>
        </div>
      </div>

      {isEmployer ? (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <StatPill
              icon={Clock}
              label={`${c.experience_years || 0}+ years exp`}
              color="bg-primary/5 border-primary/15 text-primary"
            />
            {c.skills && c.skills.length > 0 && (
              <StatPill
                icon={Award}
                label={`${c.skills.length} skills`}
                color="bg-warning/5 border-warning/15 text-warning"
              />
            )}
          </div>

          {/* Skills */}
          {c.skills && c.skills.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Top Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {c.skills.slice(0, 6).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs rounded-xl px-2.5 py-1 font-medium bg-secondary/80">{skill}</Badge>
                ))}
                {c.skills.length > 6 && (
                  <Badge variant="outline" className="text-xs rounded-xl px-2.5 py-1 text-muted-foreground">+{c.skills.length - 6}</Badge>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2.5 pt-1">
            <Button onClick={handleViewDetails} className="flex-1 gap-2 rounded-2xl shadow-lg h-12 text-sm font-bold" size="lg">
              View Full Profile <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-border/40"
              onClick={() => handleShare(c.full_name, c.id, 'candidates')}>
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-muted/40 border border-border/40">
            <div className="p-2.5 rounded-xl bg-muted">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sign in as an employer to view full profile, skills, and contact details.
            </p>
          </div>
          <Button onClick={handleSignIn} className="w-full gap-2 rounded-2xl shadow-lg h-12 font-bold" size="lg">
            <LogIn className="w-4 h-4" /> Sign In to View Profile
          </Button>
        </>
      )}
    </motion.div>
  );

  const renderJobPreview = (job: Job) => {
    const isGov = job.job_category === 'government';
    const isNew = job.created_at && (Date.now() - new Date(job.created_at).getTime()) < 86400000;
    const accentClass = isGov ? 'from-success via-success/80 to-success/40' : 'from-destructive via-destructive/80 to-destructive/40';
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-5"
      >
        {/* Color header strip */}
        <div className={`-mx-6 -mt-6 h-1.5 bg-gradient-to-r ${accentClass} rounded-t-3xl`} />

        {isGov && (
          <div className="flex justify-center pt-1"><GovernmentJobBadge variant="large" /></div>
        )}

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-md border",
            isGov ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'
          )}>
            {isGov ? (
              <Landmark className="w-7 h-7 text-success" />
            ) : (
              <Building2 className="w-7 h-7 text-destructive" />
            )}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold truncate tracking-tight">{job.title}</h3>
              {isNew && (
                <Badge className="bg-gradient-to-r from-warning to-destructive text-white text-[10px] px-2.5 py-0.5 h-5 shrink-0 border-0 shadow-md font-extrabold tracking-wide">
                  NEW
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate">{job.company_name}</span>
            </div>
          </div>
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2">
          {job.job_type && (
            <Badge variant="secondary" className="gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold">
              <Briefcase className="w-3 h-3" />{job.job_type}
            </Badge>
          )}
          {job.salary_range && (
            <Badge variant="outline" className={cn(
              "gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold",
              "bg-success/5 text-success border-success/20"
            )}>
              <Banknote className="w-3 h-3" />₹{job.salary_range}
            </Badge>
          )}
          {job.distance_km != null && (
            <Badge variant="outline" className="gap-1.5 text-xs rounded-xl px-3 py-1.5 font-medium">
              <MapPin className="w-3 h-3 text-destructive" />{job.distance_km.toFixed(1)} km
            </Badge>
          )}
        </div>

        {job.created_at && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Timer className="w-3.5 h-3.5" />
            {formatTimeAgo(job.created_at)}
          </div>
        )}

        {job.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{job.description}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2.5 pt-1">
          <Button 
            onClick={() => { onClose(); navigate(`/jobs/${item.id}?action=apply`); }}
            className={cn(
              "flex-1 gap-2 rounded-2xl shadow-lg h-12 text-sm font-bold",
              isGov && 'bg-success hover:bg-success/90'
            )}
            size="lg"
          >
            <Zap className="w-4 h-4" /> Quick Apply
          </Button>
          <Button variant="outline" size="lg" onClick={handleViewDetails} className="gap-1.5 rounded-2xl h-12 border-border/40">
            Details <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-2xl border-border/40"
            onClick={() => handleShare(job.title, job.id, 'jobs')}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-[28px] px-6 pt-6 pb-8 max-h-[80vh] overflow-auto border-t-0 shadow-2xl"
      >
        {/* Drag handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted-foreground/15 rounded-full" />
        
        {isCandidate 
          ? renderCandidatePreview(item as Candidate)
          : renderJobPreview(item as Job)
        }
      </SheetContent>
    </Sheet>
  );
};
