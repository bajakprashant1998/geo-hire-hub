import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileEdit, Trash2, Clock, Briefcase, Loader2, MapPin, IndianRupee, Copy,
  Plus, Sparkles, ArrowUpDown, Search, Tag, Users, CalendarDays, LayoutGrid,
  LayoutList, CheckSquare, X, ArrowRight, Zap, AlertCircle, GripVertical,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

// ─── Types ──────────────────────────────────────────────────
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

// ─── Utility functions ──────────────────────────────────────
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
    workMode: data.workMode || null,
  };
};

const COMPLETION_FIELDS = ['title', 'description', 'coordinates', 'salaryMin', 'skills', 'contactPerson', 'jobType', 'address'];

const getCompletionPercent = (draft: JobDraft) => {
  const data = draft.draft_data || {};
  let filled = 0;
  COMPLETION_FIELDS.forEach((field) => {
    if (data[field] && (Array.isArray(data[field]) ? data[field].length > 0 : true)) filled++;
  });
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
};

const getCompletionTier = (percent: number) => {
  if (percent >= 80) return { label: 'Ready to post', color: 'text-success', bg: 'bg-success/10', border: 'border-success/30', progressClass: '[&>div]:bg-success', gradient: 'from-success to-success/60' };
  if (percent >= 50) return { label: 'Almost there', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', progressClass: '[&>div]:bg-warning', gradient: 'from-warning to-warning/60' };
  return { label: 'Needs more info', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30', progressClass: '[&>div]:bg-destructive', gradient: 'from-destructive/60 to-muted' };
};

const getMissingFields = (draft: JobDraft) => {
  const data = draft.draft_data || {};
  return COMPLETION_FIELDS.filter(f => !data[f] || (Array.isArray(data[f]) && data[f].length === 0));
};

// ─── Stat Pill ──────────────────────────────────────────────
const StatPill = ({ icon: Icon, value, label, color, bg }: { icon: any; value: number; label: string; color: string; bg: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-2.5 p-3 rounded-xl bg-card/60 backdrop-blur border border-border/40"
  >
    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', bg)}>
      <Icon className={cn('w-4 h-4', color)} />
    </div>
    <div>
      <p className="text-base font-bold text-foreground leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  </motion.div>
);

// ─── Draft Card (List View) ────────────────────────────────
const DraftCardList = ({
  draft, selected, onToggleSelect, onResume, onDuplicate, onDelete,
  duplicatingId, deletingId,
}: {
  draft: JobDraft; selected: boolean;
  onToggleSelect: () => void; onResume: () => void;
  onDuplicate: () => void; onDelete: () => void;
  duplicatingId: string | null; deletingId: string | null;
}) => {
  const completion = getCompletionPercent(draft);
  const tier = getCompletionTier(completion);
  const meta = getDraftMeta(draft);
  const missing = getMissingFields(draft);

  return (
    <Card className={cn(
      'rounded-xl border transition-all duration-200 overflow-hidden group',
      selected ? 'border-primary/50 bg-primary/[0.02] shadow-md' : 'border-border/50 hover:shadow-md'
    )}>
      {/* Gradient accent */}
      <div className="h-1">
        <div className={cn('h-full transition-all bg-gradient-to-r', tier.gradient)} style={{ width: `${completion}%` }} />
      </div>

      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <div className="pt-1 shrink-0">
            <Checkbox checked={selected} onCheckedChange={onToggleSelect} className="border-border/60" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Briefcase className="w-4 h-4 text-primary shrink-0" />
              <h4 className="font-semibold text-foreground truncate text-sm sm:text-base">
                {draft.title || 'Untitled Draft'}
              </h4>
              <Badge variant="outline" className={cn('shrink-0 text-[10px] font-semibold px-2 py-0', tier.border, tier.color, tier.bg)}>
                {completion}%
              </Badge>
              {completion >= 80 && (
                <Badge className="text-[10px] px-2 py-0 bg-success/15 text-success border-success/20 gap-1">
                  <Zap className="w-2.5 h-2.5" /> Ready
                </Badge>
              )}
            </div>

            {/* Meta tags */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {meta.jobType && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  <Tag className="w-2.5 h-2.5" />{meta.jobType}
                </span>
              )}
              {meta.workMode && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent-foreground font-medium">
                  {meta.workMode}
                </span>
              )}
              {meta.location && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  <MapPin className="w-2.5 h-2.5" />{meta.location}
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
                  <Users className="w-2.5 h-2.5" />{meta.openings} openings
                </span>
              )}
            </div>

            {/* Skills */}
            {meta.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {meta.skills.slice(0, 4).map((skill: string) => (
                  <Badge key={skill} variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal">{skill}</Badge>
                ))}
                {meta.skills.length > 4 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">+{meta.skills.length - 4}</Badge>
                )}
              </div>
            )}

            {/* Missing fields hint */}
            {completion < 80 && missing.length > 0 && (
              <div className="flex items-center gap-1.5 mb-2 text-[10px] text-muted-foreground">
                <AlertCircle className="w-3 h-3 text-warning shrink-0" />
                <span>Missing: {missing.slice(0, 3).map(f => f.replace(/([A-Z])/g, ' $1').trim()).join(', ')}{missing.length > 3 ? ` +${missing.length - 3} more` : ''}</span>
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

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="default" size="sm" className="gap-1.5 rounded-xl h-8 text-xs shadow-sm" onClick={onResume}>
                    <FileEdit className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Resume</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Continue editing this draft</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" disabled={duplicatingId === draft.id} onClick={onDuplicate}>
                    {duplicatingId === draft.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Duplicate draft</TooltipContent>
              </Tooltip>

              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30" disabled={deletingId === draft.id}>
                        {deletingId === draft.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Delete draft</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete "{draft.title || 'Untitled Draft'}". This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TooltipProvider>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-3 ml-8">
          <Progress value={completion} className={cn('h-1.5', tier.progressClass)} />
          <div className="flex items-center justify-between mt-1">
            <p className={cn('text-[10px] font-medium', tier.color)}>{tier.label}</p>
            <p className="text-[10px] text-muted-foreground">{completion}% complete</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Draft Card (Grid/Compact View) ────────────────────────
const DraftCardGrid = ({
  draft, selected, onToggleSelect, onResume, onDuplicate, onDelete,
  duplicatingId, deletingId,
}: {
  draft: JobDraft; selected: boolean;
  onToggleSelect: () => void; onResume: () => void;
  onDuplicate: () => void; onDelete: () => void;
  duplicatingId: string | null; deletingId: string | null;
}) => {
  const completion = getCompletionPercent(draft);
  const tier = getCompletionTier(completion);
  const meta = getDraftMeta(draft);

  return (
    <Card className={cn(
      'rounded-xl border transition-all duration-200 overflow-hidden group hover:shadow-lg',
      selected ? 'border-primary/50 bg-primary/[0.02]' : 'border-border/50'
    )}>
      <div className="h-1.5">
        <div className={cn('h-full bg-gradient-to-r', tier.gradient)} style={{ width: `${completion}%` }} />
      </div>
      <CardContent className="p-4 flex flex-col h-full">
        {/* Top: Checkbox + Badge */}
        <div className="flex items-center justify-between mb-3">
          <Checkbox checked={selected} onCheckedChange={onToggleSelect} className="border-border/60" />
          <Badge variant="outline" className={cn('text-[10px] font-semibold px-2 py-0', tier.border, tier.color, tier.bg)}>
            {completion}%
          </Badge>
        </div>

        {/* Title */}
        <h4 className="font-semibold text-foreground text-sm mb-2 line-clamp-2 leading-snug">
          {draft.title || 'Untitled Draft'}
        </h4>

        {/* Key meta */}
        <div className="flex flex-wrap gap-1 mb-3">
          {meta.jobType && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{meta.jobType}</span>
          )}
          {meta.location && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium flex items-center gap-0.5">
              <MapPin className="w-2 h-2" />{meta.location}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="mb-3">
          <Progress value={completion} className={cn('h-1', tier.progressClass)} />
          <p className={cn('text-[9px] font-medium mt-1', tier.color)}>{tier.label}</p>
        </div>

        {/* Time */}
        <p className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
        </p>

        {/* Actions */}
        <div className="mt-auto flex items-center gap-1.5">
          <Button size="sm" className="flex-1 gap-1 rounded-lg h-8 text-xs" onClick={onResume}>
            <FileEdit className="w-3 h-3" /> Resume
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg shrink-0" disabled={duplicatingId === draft.id} onClick={onDuplicate}>
            {duplicatingId === draft.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 border-destructive/30 shrink-0" disabled={deletingId === draft.id}>
                {deletingId === draft.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete "{draft.title || 'Untitled Draft'}".</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Bulk Actions Bar ───────────────────────────────────────
const BulkBar = ({ count, onClearAll, onDeleteAll }: { count: number; onClearAll: () => void; onDeleteAll: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 10 }}
    className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20"
  >
    <div className="flex items-center gap-2">
      <CheckSquare className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium text-foreground">{count} selected</span>
      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={onClearAll}>
        <X className="w-3 h-3 mr-1" /> Clear
      </Button>
    </div>
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="h-7 gap-1 text-xs rounded-lg">
          <Trash2 className="w-3 h-3" /> Delete {count}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {count} drafts?</AlertDialogTitle>
          <AlertDialogDescription>This will permanently delete the selected drafts. This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete All</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </motion.div>
);

// ─── Main Component ─────────────────────────────────────────
export const JobDraftsSection = ({ employerId }: JobDraftsSectionProps) => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<JobDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name' | 'completion'>('newest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'progress' | 'early'>('all');

  useEffect(() => { fetchDrafts(); }, [employerId]);

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

  const handleResumeDraft = (draftId: string) => navigate(`/post-job?draft=${draftId}`);

  const handleDeleteDraft = async (draftId: string) => {
    setDeletingId(draftId);
    try {
      const { error } = await supabase.from('job_drafts').delete().eq('id', draftId);
      if (error) throw error;
      setDrafts(prev => prev.filter(d => d.id !== draftId));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(draftId); return n; });
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
        .insert({ employer_id: employerId, title: `${draft.title || 'Untitled'} (Copy)`, draft_data: draft.draft_data as any })
        .select()
        .single();
      if (error) throw error;
      setDrafts(prev => [data as JobDraft, ...prev]);
      toast.success('Draft duplicated');
    } catch (error: any) {
      toast.error('Failed to duplicate draft');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    try {
      const { error } = await supabase.from('job_drafts').delete().in('id', ids);
      if (error) throw error;
      setDrafts(prev => prev.filter(d => !selectedIds.has(d.id)));
      setSelectedIds(new Set());
      toast.success(`${ids.length} drafts deleted`);
    } catch (error: any) {
      toast.error('Failed to delete drafts');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const filteredDrafts = useMemo(() => {
    return drafts
      .filter(d => {
        // Status filter
        const comp = getCompletionPercent(d);
        if (statusFilter === 'ready' && comp < 80) return false;
        if (statusFilter === 'progress' && (comp < 50 || comp >= 80)) return false;
        if (statusFilter === 'early' && comp >= 50) return false;
        // Search
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const meta = getDraftMeta(d);
        return (d.title || '').toLowerCase().includes(q)
          || (meta.location || '').toLowerCase().includes(q)
          || (meta.category || '').toLowerCase().includes(q)
          || (meta.skills || []).some((s: string) => s.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        if (sortOrder === 'oldest') return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        if (sortOrder === 'completion') return getCompletionPercent(b) - getCompletionPercent(a);
        return (a.title || '').localeCompare(b.title || '');
      });
  }, [drafts, searchQuery, sortOrder, statusFilter]);

  const stats = useMemo(() => ({
    total: drafts.length,
    ready: drafts.filter(d => getCompletionPercent(d) >= 80).length,
    needsWork: drafts.filter(d => getCompletionPercent(d) < 50).length,
  }), [drafts]);

  // ─── Loading skeleton ──────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-40 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-xl border border-border/30" />)}
        </div>
        {[1, 2].map(i => <div key={i} className="h-36 bg-muted/50 animate-pulse rounded-xl border border-border/30" />)}
      </div>
    );
  }

  // ─── Empty state ───────────
  if (drafts.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <FileEdit className="w-5 h-5 text-primary" />Saved Drafts
        </h3>
        <Card className="border-dashed border-2 border-border/60 rounded-xl">
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileEdit className="w-8 h-8 text-primary/50" />
            </div>
            <h4 className="font-semibold text-foreground mb-1">No drafts yet</h4>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">Start creating a job posting and save it as a draft to continue later.</p>
            <Link to="/post-job">
              <Button className="gap-2 rounded-xl"><Plus className="w-4 h-4" />Create New Job</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main render ───────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <FileEdit className="w-5 h-5 text-primary" />Saved Drafts
          </h3>
          <Badge variant="secondary" className="text-xs font-semibold">{drafts.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border/60 overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 transition-colors', viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 transition-colors', viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Link to="/post-job">
            <Button size="sm" className="gap-1.5 rounded-xl shadow-sm"><Plus className="w-4 h-4" /> New Draft</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatPill icon={FileEdit} value={stats.total} label="Total Drafts" color="text-primary" bg="bg-primary/10" />
        <StatPill icon={Sparkles} value={stats.ready} label="Ready to Post" color="text-success" bg="bg-success/10" />
        <StatPill icon={Clock} value={stats.needsWork} label="Needs Work" color="text-warning" bg="bg-warning/10" />
      </div>

      {/* Filter chips + Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Status filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            { key: 'all', label: 'All', count: drafts.length },
            { key: 'ready', label: 'Ready', count: stats.ready },
            { key: 'progress', label: 'In Progress', count: drafts.length - stats.ready - stats.needsWork },
            { key: 'early', label: 'Early Stage', count: stats.needsWork },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border',
                statusFilter === f.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 text-muted-foreground border-border/40 hover:bg-muted'
              )}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search drafts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 w-44 rounded-lg border border-border/60 bg-muted/30 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
            <SelectTrigger className="h-8 w-[130px] text-xs rounded-lg">
              <ArrowUpDown className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
              <SelectItem value="completion">By Completion</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk actions bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkBar count={selectedIds.size} onClearAll={() => setSelectedIds(new Set())} onDeleteAll={handleBulkDelete} />
        )}
      </AnimatePresence>

      {/* Draft Cards */}
      <AnimatePresence mode="popLayout">
        {filteredDrafts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 text-muted-foreground text-sm">
            <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            No drafts match your filter
          </motion.div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {filteredDrafts.map((draft, idx) => (
              <motion.div key={draft.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20, height: 0 }} transition={{ delay: idx * 0.03 }}>
                <DraftCardList
                  draft={draft}
                  selected={selectedIds.has(draft.id)}
                  onToggleSelect={() => toggleSelect(draft.id)}
                  onResume={() => handleResumeDraft(draft.id)}
                  onDuplicate={() => handleDuplicateDraft(draft)}
                  onDelete={() => handleDeleteDraft(draft.id)}
                  duplicatingId={duplicatingId}
                  deletingId={deletingId}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredDrafts.map((draft, idx) => (
              <motion.div key={draft.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.03 }}>
                <DraftCardGrid
                  draft={draft}
                  selected={selectedIds.has(draft.id)}
                  onToggleSelect={() => toggleSelect(draft.id)}
                  onResume={() => handleResumeDraft(draft.id)}
                  onDuplicate={() => handleDuplicateDraft(draft)}
                  onDelete={() => handleDeleteDraft(draft.id)}
                  duplicatingId={duplicatingId}
                  deletingId={deletingId}
                />
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
