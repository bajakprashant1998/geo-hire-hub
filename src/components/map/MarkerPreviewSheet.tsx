import { Candidate, Job, ViewMode } from '@/types';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MapPin, Briefcase, Clock, DollarSign, ArrowRight,
  Building2, Star, Lock, LogIn, Share2, Bookmark,
  Zap, Send, ChevronRight
} from 'lucide-react';
import { GovernmentJobBadge, GovernmentEmployerBadge } from '@/components/government';
import { toast } from 'sonner';

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

  // ─── Candidate Card ────────────────────────────────────
  const renderCandidatePreview = (c: Candidate) => (
    <div className="space-y-4 animate-fade-in">
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
          <Avatar className="w-16 h-16 border-2 border-primary/20">
            <AvatarImage src={c.avatar_url} alt={c.full_name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
              {c.full_name?.charAt(0) || 'C'}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold truncate">{c.full_name}</h3>
          <p className="text-muted-foreground truncate">{c.job_title || 'Job Seeker'}</p>
          <div className="flex items-center gap-2 mt-1">
            {c.distance_km && (
              <Badge variant="outline" className="text-xs gap-1 px-2 py-0">
                <MapPin className="w-3 h-3" />{c.distance_km.toFixed(1)} km
              </Badge>
            )}
          </div>
        </div>
      </div>

      {isEmployer ? (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{c.experience_years || 0}+ years</span>
            </div>
            {c.skills && c.skills.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                <Star className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium">{c.skills.length} skills</span>
              </div>
            )}
          </div>

          {/* Skills */}
          {c.skills && c.skills.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Top Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {c.skills.slice(0, 5).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                ))}
                {c.skills.length > 5 && (
                  <Badge variant="outline" className="text-xs">+{c.skills.length - 5}</Badge>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button onClick={handleViewDetails} className="flex-1 gap-2" size="lg">
              View Full Profile <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-11 w-11"
              onClick={() => handleShare(c.full_name, c.id, 'candidates')}>
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
            <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Sign in as an employer to view full profile, skills, and contact details.
            </p>
          </div>
          <Button onClick={handleSignIn} className="w-full gap-2 mt-2" size="lg">
            <LogIn className="w-4 h-4" /> Sign In to View Profile
          </Button>
        </>
      )}
    </div>
  );

  // ─── Job Card ──────────────────────────────────────────
  const renderJobPreview = (job: Job) => {
    const isGov = job.job_category === 'government';
    const isNew = job.created_at && (Date.now() - new Date(job.created_at).getTime()) < 86400000;
    
    return (
      <div className="space-y-4 animate-fade-in">
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
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
            isGov ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-destructive/10'
          }`}>
            <Building2 className={`w-7 h-7 ${isGov ? 'text-emerald-600' : 'text-destructive'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold truncate">{job.title}</h3>
              {isNew && (
                <Badge className="bg-warning text-warning-foreground text-[10px] px-1.5 py-0 h-5 shrink-0 animate-pulse">NEW</Badge>
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
            <Badge variant="secondary" className="gap-1">
              <Briefcase className="w-3 h-3" />{job.job_type}
            </Badge>
          )}
          {job.salary_range && (
            <Badge variant="outline" className="gap-1 bg-accent text-accent-foreground border-border">
              <DollarSign className="w-3 h-3" />₹{job.salary_range}
            </Badge>
          )}
          {job.distance_km != null && (
            <Badge variant="outline" className="gap-1 text-xs">
              <MapPin className="w-3 h-3" />{job.distance_km.toFixed(1)} km
            </Badge>
          )}
          {job.created_at && (
            <span className="text-xs text-muted-foreground ml-auto self-center">
              {formatTimeAgo(job.created_at)}
            </span>
          )}
        </div>

        {/* Description snippet */}
        {job.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button 
            onClick={() => { onClose(); navigate(`/jobs/${item.id}?action=apply`); }}
            className={`flex-1 gap-2 ${isGov ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            size="lg"
          >
            <Send className="w-4 h-4" /> Quick Apply
          </Button>
          <Button variant="outline" size="lg" onClick={handleViewDetails} className="gap-1.5">
            Details <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0"
            onClick={() => handleShare(job.title, job.id, 'jobs')}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-2xl px-6 pt-6 pb-8 max-h-[75vh] overflow-auto"
      >
        {/* Drag handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
        
        {isCandidate 
          ? renderCandidatePreview(item as Candidate)
          : renderJobPreview(item as Job)
        }
      </SheetContent>
    </Sheet>
  );
};
