import { Candidate, Job, ViewMode } from '@/types';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MapPin, Briefcase, Clock, DollarSign, ArrowRight,
  Building2, Star, Lock, LogIn, Share2,
  Zap, Send, ChevronRight, Sparkles
} from 'lucide-react';
import { GovernmentJobBadge } from '@/components/government';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-4"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3" />
        <span>Map</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Candidate</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="relative">
          <Avatar className="w-16 h-16 border-2 border-primary/20 shadow-lg">
            <AvatarImage src={c.avatar_url} alt={c.full_name} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xl font-bold">
              {c.full_name?.charAt(0) || 'C'}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-background flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold truncate">{c.full_name}</h3>
          <p className="text-muted-foreground truncate text-sm">{c.job_title || 'Job Seeker'}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {c.distance_km && (
              <Badge variant="outline" className="text-xs gap-1 px-2 py-0.5 rounded-lg bg-muted/50">
                <MapPin className="w-3 h-3" />{c.distance_km.toFixed(1)} km
              </Badge>
            )}
          </div>
        </div>
      </div>

      {isEmployer ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-2.5 px-3 py-2.5 bg-primary/5 rounded-xl border border-primary/10"
            >
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">{c.experience_years || 0}+ years</span>
            </motion.div>
            {c.skills && c.skills.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="flex items-center gap-2.5 px-3 py-2.5 bg-warning/5 rounded-xl border border-warning/10"
              >
                <Star className="w-4 h-4 text-warning" />
                <span className="text-sm font-semibold">{c.skills.length} skills</span>
              </motion.div>
            )}
          </div>

          {c.skills && c.skills.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Top Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {c.skills.slice(0, 5).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs rounded-lg">{skill}</Badge>
                ))}
                {c.skills.length > 5 && (
                  <Badge variant="outline" className="text-xs rounded-lg">+{c.skills.length - 5}</Badge>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button onClick={handleViewDetails} className="flex-1 gap-2 rounded-xl shadow-md" size="lg">
              View Full Profile <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl"
              onClick={() => handleShare(c.full_name, c.id, 'candidates')}>
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50">
            <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Sign in as an employer to view full profile, skills, and contact details.
            </p>
          </div>
          <Button onClick={handleSignIn} className="w-full gap-2 mt-2 rounded-xl shadow-md" size="lg">
            <LogIn className="w-4 h-4" /> Sign In to View Profile
          </Button>
        </>
      )}
    </motion.div>
  );

  const renderJobPreview = (job: Job) => {
    const isGov = job.job_category === 'government';
    const isNew = job.created_at && (Date.now() - new Date(job.created_at).getTime()) < 86400000;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="space-y-4"
      >
        {/* Color header strip */}
        <div className={`-mx-6 -mt-6 h-2 rounded-t-2xl ${isGov ? 'bg-emerald-500' : 'bg-destructive'}`} />

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>Map</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">Job Details</span>
        </div>

        {isGov && (
          <div className="flex justify-center"><GovernmentJobBadge variant="large" /></div>
        )}

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
            isGov ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-destructive/10'
          }`}>
            <Building2 className={`w-7 h-7 ${isGov ? 'text-emerald-600' : 'text-destructive'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold truncate">{job.title}</h3>
              {isNew && (
                <Badge className="bg-gradient-to-r from-warning to-orange-500 text-white text-[10px] px-2 py-0 h-5 shrink-0 border-0 shadow-sm">
                  NEW
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate">{job.company_name}</span>
            </div>
          </div>
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2">
          {job.job_type && (
            <Badge variant="secondary" className="gap-1 rounded-lg">
              <Briefcase className="w-3 h-3" />{job.job_type}
            </Badge>
          )}
          {job.salary_range && (
            <Badge variant="outline" className="gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 rounded-lg">
              <DollarSign className="w-3 h-3" />₹{job.salary_range}
            </Badge>
          )}
          {job.distance_km != null && (
            <Badge variant="outline" className="gap-1 text-xs rounded-lg">
              <MapPin className="w-3 h-3" />{job.distance_km.toFixed(1)} km
            </Badge>
          )}
          {job.created_at && (
            <span className="text-xs text-muted-foreground ml-auto self-center">
              {formatTimeAgo(job.created_at)}
            </span>
          )}
        </div>

        {job.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button 
            onClick={() => { onClose(); navigate(`/jobs/${item.id}?action=apply`); }}
            className={`flex-1 gap-2 rounded-xl shadow-md ${isGov ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            size="lg"
          >
            <Zap className="w-4 h-4" /> Quick Apply
          </Button>
          <Button variant="outline" size="lg" onClick={handleViewDetails} className="gap-1.5 rounded-xl">
            Details <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl"
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
        className="rounded-t-3xl px-6 pt-6 pb-8 max-h-[75vh] overflow-auto border-t-0 shadow-2xl"
      >
        {/* Drag handle */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-muted-foreground/20 rounded-full" />
        
        {isCandidate 
          ? renderCandidatePreview(item as Candidate)
          : renderJobPreview(item as Job)
        }
      </SheetContent>
    </Sheet>
  );
};