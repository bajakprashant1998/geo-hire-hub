import { useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Sparkles, Plus, Heart, Clock, User, Trash2, Edit, Send, BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

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

export const SpotlightStories = ({ employerId, companyName, isOwner = false }: SpotlightStoriesProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('spotlight_stories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spotlight-stories', employerId] });
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

  const publishedStories = isOwner ? stories : stories.filter(s => s.is_published);

  if (!isOwner && publishedStories.length === 0) return null;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Spotlight Stories
          </CardTitle>
          {isOwner && (
            <Button size="sm" variant="outline" onClick={() => { resetForm(); setShowForm(true); }} className="gap-1.5 rounded-xl">
              <Plus className="h-4 w-4" /> New Story
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">A day in the life at {companyName}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : publishedStories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No spotlight stories yet.</p>
            {isOwner && <p className="text-xs mt-1">Share what it's like to work here!</p>}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {publishedStories.map((story, i) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="group relative rounded-xl border border-border/60 p-4 hover:border-primary/20 hover:bg-primary/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm leading-tight">{story.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-line line-clamp-4">
                        {story.body}
                      </p>
                    </div>
                    {isOwner && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(story)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(story.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {(story.tags?.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {story.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0 h-5 font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <Separator className="my-2.5" />

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                          {(story.author_name || 'T')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground/80">
                        {story.author_name || 'Team Member'}
                      </span>
                      {story.author_role && (
                        <span className="text-muted-foreground">· {story.author_role}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </CardContent>

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
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. A Day as a Software Engineer"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label>Story *</Label>
              <Textarea
                placeholder="Share what a typical day looks like, team culture, exciting projects..."
                value={form.body}
                onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                className="min-h-[140px]"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">{form.body.length}/2000</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Author Name</Label>
                <Input
                  placeholder="e.g. Sarah K."
                  value={form.author_name}
                  onChange={e => setForm(p => ({ ...p, author_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Author Role</Label>
                <Input
                  placeholder="e.g. Senior Developer"
                  value={form.author_role}
                  onChange={e => setForm(p => ({ ...p, author_role: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                placeholder="e.g. engineering, culture, remote"
                value={form.tags}
                onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="gap-1.5"
            >
              <Send className="h-4 w-4" />
              {editingStory ? 'Update' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
