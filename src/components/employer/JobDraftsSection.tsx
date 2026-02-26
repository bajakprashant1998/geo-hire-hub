import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FileEdit,
  Trash2,
  Clock,
  Briefcase,
  Loader2,
  MapPin,
  IndianRupee,
  Copy,
  Plus,
  Sparkles,
  ArrowUpDown,
  Search,
  Tag,
  Users,
  CalendarDays,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface JobDraft {
  id: string;
  title: string | null;
  draft_data: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

interface JobDraftsSectionProps {
  employerId: string;
}

export const JobDraftsSection = ({ employerId }: JobDraftsSectionProps) => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<JobDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');

  useEffect(() => {
    fetchDrafts();
  }, [employerId]);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_drafts')
        .select('*')
        .eq('employer_id', employerId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDrafts((data || []) as JobDraft[]);
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeDraft = (draftId: string) => {
    navigate(`/post-job?draft=${draftId}`);
  };

  const handleDeleteDraft = async (draftId: string) => {
    setDeletingId(draftId);
    try {
      const { error } = await supabase
        .from('job_drafts')
        .delete()
        .eq('id', draftId);

      if (error) throw error;
      setDrafts(drafts.filter((d) => d.id !== draftId));
      toast.success('Draft deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete draft');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicateDraft = async (draft: JobDraft) => {
    setDuplicatingId(draft.id);
    try {
      const { data, error } = await supabase
        .from('job_drafts')
        .insert({
          employer_id: employerId,
          title: `${draft.title || 'Untitled'} (Copy)`,
          draft_data: draft.draft_data as any,
        })
        .select()
        .single();

      if (error) throw error;
      setDrafts([data as JobDraft, ...drafts]);
      toast.success('Draft duplicated');
    } catch (error: any) {
      toast.error('Failed to duplicate draft');
    } finally {
      setDuplicatingId(null);
    }
  };

  const getDraftMeta = (draft: JobDraft) => {
    const data = draft.draft_data || {};
    return {
      jobType: data.jobType || null,
      location: data.address ? data.address.split(',')[0] : data.locationCity || null,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      salaryCurrency: data.salaryCurrency || '₹',
      category: data.jobCategory || data.category || null,
      skills: data.skills || [],
      description: data.description || null,
      openings: data.openings || null,
    };
  };

  const getCompletionPercent = (draft: JobDraft) => {
    const data = draft.draft_data || {};
    let filled = 0;
    const fields = ['title', 'description', 'coordinates', 'salaryMin', 'skills', 'contactPerson', 'jobType', 'address'];

    fields.forEach((field) => {
      if (data[field] && (Array.isArray(data[field]) ? data[field].length > 0 : true)) {
        filled++;
      }
    });

    return Math.round((filled / fields.length) * 100);
  };

  const getCompletionColor = (percent: number) => {
    if (percent >= 80) return 'text-success';
    if (percent >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const getProgressClass = (percent: number) => {
    if (percent >= 80) return '[&>div]:bg-success';
    if (percent >= 50) return '[&>div]:bg-warning';
    return '[&>div]:bg-destructive';
  };

  // Filter & sort
  const filteredDrafts = drafts
    .filter((d) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const meta = getDraftMeta(d);
      return (
        (d.title || '').toLowerCase().includes(q) ||
        (meta.location || '').toLowerCase().includes(q) ||
        (meta.category || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sortOrder === 'oldest') return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      return (a.title || '').localeCompare(b.title || '');
    });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-40 bg-muted animate-pulse rounded-lg" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="h-32 bg-muted/50 animate-pulse rounded-xl border border-border/30" />
        ))}
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <FileEdit className="w-5 h-5 text-primary" />
          Saved Drafts
        </h3>
        <Card className="border-dashed border-2 border-border/60 rounded-xl">
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileEdit className="w-8 h-8 text-primary/50" />
            </div>
            <h4 className="font-semibold text-foreground mb-1">No drafts yet</h4>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              Start creating a job posting and save it as a draft to continue later.
            </p>
            <Link to="/post-job">
              <Button className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" />
                Create New Job
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <FileEdit className="w-5 h-5 text-primary" />
            Saved Drafts
          </h3>
          <Badge variant="secondary" className="text-xs font-semibold">
            {drafts.length}
          </Badge>
        </div>
        <Link to="/post-job">
          <Button size="sm" className="gap-1.5 rounded-xl shadow-sm">
            <Plus className="w-4 h-4" /> New Draft
          </Button>
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Drafts', value: drafts.length, icon: FileEdit, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Ready to Post', value: drafts.filter(d => getCompletionPercent(d) >= 80).length, icon: Sparkles, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Needs Work', value: drafts.filter(d => getCompletionPercent(d) < 50).length, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-card/60 backdrop-blur border border-border/40"
          >
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', stat.bg)}>
              <stat.icon className={cn('w-4 h-4', stat.color)} />
            </div>
            <div>
              <p className="text-base font-bold text-foreground leading-none">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & Sort */}
      {drafts.length > 1 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search drafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-border/60 bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl h-9 shrink-0"
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : prev === 'oldest' ? 'name' : 'newest')}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="text-xs capitalize hidden sm:inline">{sortOrder}</span>
          </Button>
        </div>
      )}

      {/* Draft Cards */}
      <AnimatePresence mode="popLayout">
        {filteredDrafts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-muted-foreground text-sm"
          >
            No drafts match your search
          </motion.div>
        ) : (
          filteredDrafts.map((draft, idx) => {
            const completion = getCompletionPercent(draft);
            const meta = getDraftMeta(draft);

            return (
              <motion.div
                key={draft.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Card className="rounded-xl border border-border/50 hover:shadow-md transition-all duration-200 overflow-hidden group">
                  {/* Gradient accent top */}
                  <div className="h-1">
                    <div
                      className={cn(
                        'h-full transition-all',
                        completion >= 80
                          ? 'bg-gradient-to-r from-success to-success/60'
                          : completion >= 50
                            ? 'bg-gradient-to-r from-warning to-warning/60'
                            : 'bg-gradient-to-r from-destructive/60 to-muted'
                      )}
                      style={{ width: `${completion}%` }}
                    />
                  </div>

                  <CardContent className="p-4 sm:p-5">
                    {/* Row 1: Title + Badge + Actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Briefcase className="w-4 h-4 text-primary shrink-0" />
                          <h4 className="font-semibold text-foreground truncate text-sm sm:text-base">
                            {draft.title || 'Untitled Draft'}
                          </h4>
                          <Badge
                            variant="outline"
                            className={cn(
                              'shrink-0 text-[10px] font-semibold px-2 py-0',
                              completion >= 80
                                ? 'border-success/30 text-success bg-success/5'
                                : completion >= 50
                                  ? 'border-warning/30 text-warning bg-warning/5'
                                  : 'border-destructive/30 text-destructive bg-destructive/5'
                            )}
                          >
                            {completion}%
                          </Badge>
                        </div>

                        {/* Meta info tags */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          {meta.jobType && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                              <Tag className="w-2.5 h-2.5" />
                              {meta.jobType}
                            </span>
                          )}
                          {meta.location && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                              <MapPin className="w-2.5 h-2.5" />
                              {meta.location}
                            </span>
                          )}
                          {(meta.salaryMin || meta.salaryMax) && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                              <IndianRupee className="w-2.5 h-2.5" />
                              {meta.salaryCurrency}{meta.salaryMin || '0'} - {meta.salaryCurrency}{meta.salaryMax || meta.salaryMin}
                            </span>
                          )}
                          {meta.category && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent-foreground font-medium">
                              {meta.category}
                            </span>
                          )}
                          {meta.openings && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                              <Users className="w-2.5 h-2.5" />
                              {meta.openings} openings
                            </span>
                          )}
                        </div>

                        {/* Skills preview */}
                        {meta.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {meta.skills.slice(0, 4).map((skill: string) => (
                              <Badge key={skill} variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                                {skill}
                              </Badge>
                            ))}
                            {meta.skills.length > 4 && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                                +{meta.skills.length - 4}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Timestamps */}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Edited {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            Created {format(new Date(draft.created_at), 'MMM d')}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1.5 rounded-xl h-8 text-xs shadow-sm"
                          onClick={() => handleResumeDraft(draft.id)}
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          Resume
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-xl"
                          disabled={duplicatingId === draft.id}
                          onClick={() => handleDuplicateDraft(draft)}
                          title="Duplicate draft"
                        >
                          {duplicatingId === draft.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                              disabled={deletingId === draft.id}
                            >
                              {deletingId === draft.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{draft.title || 'Untitled Draft'}".
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteDraft(draft.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <Progress
                        value={completion}
                        className={cn('h-1.5', getProgressClass(completion))}
                      />
                      <div className="flex items-center justify-between mt-1">
                        <p className={cn('text-[10px] font-medium', getCompletionColor(completion))}>
                          {completion >= 80 ? 'Ready to post' : completion >= 50 ? 'Almost there' : 'Needs more info'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {completion}% complete
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );
};
