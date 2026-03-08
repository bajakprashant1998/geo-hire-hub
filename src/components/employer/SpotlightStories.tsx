import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sparkles, Plus, Heart, Clock, Trash2, Edit, Send, BookOpen,
  Eye, EyeOff, MessageSquare, TrendingUp, Search, Filter,
  Quote, ChevronDown, ChevronUp, MoreVertical, Loader2, Info, X
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SpotlightStoriesProps {
  employerId: string;
  companyName: string;
  isOwner?: boolean;
}

interface Story {
  id: string;
  employer_id: string;
  title: string;
  body: string;
  image_url: string | null;
  author_name: string | null;
  author_role: string | null;
  tags: string[];
  is_published: boolean;
  likes_count: number;
  created_at: string;
}

const TAG_SUGGESTIONS = [
  'engineering', 'culture', 'remote', 'leadership', 'design',
  'product', 'growth', 'diversity', 'onboarding', 'team-building',
];

export const SpotlightStories = ({ employerId, companyName, isOwner = false }: SpotlightStoriesProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', body: '', author_name: '', author_role: '', tags: '',
  });

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['spotlight-stories', employerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spotlight_stories')
        .select('*')
        .eq('employer_id', employerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Story[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const { error } = await supabase.from('spotlight_stories').insert({
        employer_id: employerId,
        title: payload.title,
        body: payload.body,
        author_name: payload.author_name || null,
        author_role: payload.author_role || null,
        tags: payload.tags ? payload.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spotlight-stories', employerId] });
      resetForm();
      toast.success('Story published!');
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: typeof form & { id: string }) => {
      const { error } = await supabase.from('spotlight_stories').update({
        title: payload.title,
        body: payload.body,
        author_name: payload.author_name || null,
        author_role: payload.author_role || null,
        tags: payload.tags ? payload.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spotlight-stories', employerId] });
      resetForm();
      toast.success('Story updated!');
    },
    onError: (e) => toast.error(e.message),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from('spotlight_stories')
        .update({ is_published })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['spotlight-stories', employerId] });
      toast.success(vars.is_published ? 'Story published!' : 'Story unpublished');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('spotlight_stories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spotlight-stories', employerId] });
      setDeleteId(null);
      toast.success('Story deleted');
    },
  });

  const resetForm = () => {
    setForm({ title: '', body: '', author_name: '', author_role: '', tags: '' });
    setShowForm(false);
    setEditingStory(null);
  };

  const openEdit = (s: Story) => {
    setForm({
      title: s.title,
      body: s.body,
      author_name: s.author_name || '',
      author_role: s.author_role || '',
      tags: (s.tags || []).join(', '),
    });
    setEditingStory(s);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and story are required');
      return;
    }
    if (editingStory) {
      updateMutation.mutate({ ...form, id: editingStory.id });
    } else {
      createMutation.mutate(form);
    }
  };

  const addTagSuggestion = (tag: string) => {
    const current = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (!current.includes(tag)) {
      setForm(p => ({ ...p, tags: [...current, tag].join(', ') }));
    }
  };

  const publishedStories = isOwner ? stories : stories.filter(s => s.is_published);

  // All unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    publishedStories.forEach(s => s.tags?.forEach(t => tagSet.add(t)));
    return Array.from(tagSet);
  }, [publishedStories]);

  // Filter & search
  const filteredStories = useMemo(() => {
    let result = publishedStories;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.body.toLowerCase().includes(q) ||
        s.author_name?.toLowerCase().includes(q)
      );
    }
    if (filterTag) {
      result = result.filter(s => s.tags?.includes(filterTag));
    }
    return result;
  }, [publishedStories, searchQuery, filterTag]);

  // Stats
  const stats = useMemo(() => ({
    total: stories.length,
    published: stories.filter(s => s.is_published).length,
    drafts: stories.filter(s => !s.is_published).length,
    totalLikes: stories.reduce((acc, s) => acc + (s.likes_count || 0), 0),
  }), [stories]);

  if (!isOwner && publishedStories.length === 0) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Spotlight Stories</h2>
            <p className="text-sm text-muted-foreground">A day in the life at {companyName}</p>
          </div>
        </div>
        {isOwner && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-1.5 rounded-xl">
            <Plus className="h-4 w-4" /> New Story
          </Button>
        )}
      </div>

      {/* Stats Row (owner only) */}
      {isOwner && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Stories', value: stats.total, icon: BookOpen, color: 'text-primary' },
            { label: 'Published', value: stats.published, icon: Eye, color: 'text-success' },
            { label: 'Drafts', value: stats.drafts, icon: EyeOff, color: 'text-warning' },
            { label: 'Total Likes', value: stats.totalLikes, icon: Heart, color: 'text-destructive' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-border/40">
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-muted/50")}>
                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                  </div>
                  <div>
                    <p className="text-lg font-bold tabular-nums">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Search & Filter */}
      {publishedStories.length > 2 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search stories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-xl bg-muted/30 border-border/40"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              {allTags.slice(0, 6).map(tag => (
                <Badge
                  key={tag}
                  variant={filterTag === tag ? 'default' : 'outline'}
                  className="cursor-pointer text-[10px] h-6 rounded-full hover:bg-primary/10 transition-colors"
                  onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                >
                  {tag}
                </Badge>
              ))}
              {filterTag && (
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setFilterTag(null)}>
                  <X className="w-3 h-3 mr-1" /> Clear
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stories Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filteredStories.length === 0 ? (
        <Card className="border-border/40 border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
              <BookOpen className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="font-semibold text-lg">
              {searchQuery || filterTag ? 'No stories match your search' : 'No spotlight stories yet'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {searchQuery || filterTag
                ? 'Try adjusting your search or clearing filters.'
                : isOwner
                  ? 'Share what it\'s like to work at your company. Spotlight stories help candidates get a feel for your culture.'
                  : 'Check back later for team stories.'}
            </p>
            {isOwner && !searchQuery && !filterTag && (
              <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-1.5 rounded-xl mt-2">
                <Plus className="h-4 w-4" /> Write Your First Story
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredStories.map((story, i) => {
              const isExpanded = expandedId === story.id;
              const isLong = story.body.length > 200;
              return (
                <motion.div
                  key={story.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(isExpanded && "sm:col-span-2")}
                >
                  <Card className={cn(
                    "group relative border-border/40 hover:border-primary/20 hover:shadow-md transition-all overflow-hidden",
                    !story.is_published && isOwner && "border-dashed opacity-75"
                  )}>
                    {/* Decorative accent */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />

                    <CardContent className="p-5 pt-6">
                      {/* Top row: author + actions */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                            <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">
                              {(story.author_name || 'T')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium leading-tight">
                              {story.author_name || 'Team Member'}
                            </p>
                            {story.author_role && (
                              <p className="text-[10px] text-muted-foreground">{story.author_role}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isOwner && !story.is_published && (
                            <Badge variant="outline" className="text-[9px] h-5 bg-warning/10 text-warning border-warning/20">
                              Draft
                            </Badge>
                          )}
                          {isOwner && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => openEdit(story)}>
                                  <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => togglePublishMutation.mutate({ id: story.id, is_published: !story.is_published })}>
                                  {story.is_published
                                    ? <><EyeOff className="h-3.5 w-3.5 mr-2" /> Unpublish</>
                                    : <><Eye className="h-3.5 w-3.5 mr-2" /> Publish</>
                                  }
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(story.id)}>
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="font-semibold text-base leading-snug mb-2">{story.title}</h4>

                      {/* Body */}
                      <div className="relative">
                        <p className={cn(
                          "text-sm text-muted-foreground whitespace-pre-line leading-relaxed",
                          !isExpanded && isLong && "line-clamp-4"
                        )}>
                          {story.body}
                        </p>
                        {isLong && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : story.id)}
                            className="text-xs text-primary font-medium mt-1.5 flex items-center gap-1 hover:underline"
                          >
                            {isExpanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
                          </button>
                        )}
                      </div>

                      {/* Tags */}
                      {story.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {story.tags.map(tag => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className={cn(
                                "text-[10px] px-2 py-0 h-5 font-normal rounded-full cursor-pointer hover:bg-primary/10",
                                filterTag === tag && "bg-primary/10 text-primary"
                              )}
                              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                            >
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {story.likes_count || 0}
                          </span>
                        </div>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {editingStory ? 'Edit Story' : 'New Spotlight Story'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Title *</Label>
              <Input
                placeholder="e.g. A Day as a Software Engineer"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                maxLength={120}
                className="rounded-xl bg-muted/30 border-border/40"
              />
              <p className="text-[10px] text-muted-foreground text-right">{form.title.length}/120</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Story *</Label>
              <Textarea
                placeholder="Share what a typical day looks like, team culture, exciting projects..."
                value={form.body}
                onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                className="min-h-[160px] rounded-xl bg-muted/30 border-border/40"
                maxLength={2000}
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">
                  {form.body.length < 50 && form.body.length > 0 && '💡 Aim for at least 50 characters for a good story'}
                </p>
                <p className="text-[10px] text-muted-foreground">{form.body.length}/2000</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Author Name</Label>
                <Input
                  placeholder="e.g. Sarah K."
                  value={form.author_name}
                  onChange={e => setForm(p => ({ ...p, author_name: e.target.value }))}
                  className="rounded-xl bg-muted/30 border-border/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Author Role</Label>
                <Input
                  placeholder="e.g. Senior Developer"
                  value={form.author_role}
                  onChange={e => setForm(p => ({ ...p, author_role: e.target.value }))}
                  className="rounded-xl bg-muted/30 border-border/40"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tags (comma-separated)</Label>
              <Input
                placeholder="e.g. engineering, culture, remote"
                value={form.tags}
                onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
                className="rounded-xl bg-muted/30 border-border/40"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {TAG_SUGGESTIONS.filter(t => !form.tags.toLowerCase().includes(t)).slice(0, 5).map(tag => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[10px] h-5 cursor-pointer border-dashed hover:bg-primary/5 hover:border-primary/30 transition-colors"
                    onClick={() => addTagSuggestion(tag)}
                  >
                    + {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            {form.title && (
              <div className="p-3 rounded-xl bg-muted/20 border border-border/30 space-y-2">
                <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Preview
                </p>
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                      {(form.author_name || 'T')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-xs font-medium">{form.author_name || 'Team Member'}</span>
                    {form.author_role && <span className="text-[10px] text-muted-foreground ml-1">· {form.author_role}</span>}
                  </div>
                </div>
                <h4 className="font-semibold text-sm">{form.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-3">{form.body}</p>
                {form.tags && (
                  <div className="flex gap-1 flex-wrap">
                    {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[9px] h-4 rounded-full">#{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm} className="rounded-xl">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending || !form.title.trim() || !form.body.trim()}
              className="gap-1.5 rounded-xl"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {editingStory ? 'Update' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this story?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The story will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
