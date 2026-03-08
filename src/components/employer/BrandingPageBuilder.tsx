import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, GripVertical, Pencil, Trash2, Eye, EyeOff, Palette,
  Type, Image, Video, Quote, Users, ArrowUp, ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface BrandingSection {
  id: string;
  employer_id: string;
  section_type: string;
  title: string | null;
  content: string | null;
  media_url: string | null;
  sort_order: number;
  is_visible: boolean;
}

interface BrandingPageBuilderProps {
  employerId: string;
}

const SECTION_TYPES = [
  { value: 'text', label: 'Text Block', icon: Type, desc: 'Rich text content section' },
  { value: 'hero_image', label: 'Hero Image', icon: Image, desc: 'Large banner image' },
  { value: 'video', label: 'Video', icon: Video, desc: 'Embed a YouTube/Vimeo URL' },
  { value: 'testimonial', label: 'Employee Story', icon: Quote, desc: 'Employee testimonial' },
  { value: 'team', label: 'Team Spotlight', icon: Users, desc: 'Highlight team members' },
  { value: 'gallery', label: 'Photo Gallery', icon: Image, desc: 'Office / event photos' },
];

const emptyForm = { section_type: 'text', title: '', content: '', media_url: '', is_visible: true };

export const BrandingPageBuilder = ({ employerId }: BrandingPageBuilderProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: sections, isLoading } = useQuery({
    queryKey: ['branding-sections', employerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employer_branding_sections')
        .select('*')
        .eq('employer_id', employerId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as BrandingSection[];
    },
    enabled: !!employerId,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        employer_id: employerId,
        section_type: values.section_type,
        title: values.title || null,
        content: values.content || null,
        media_url: values.media_url || null,
        is_visible: values.is_visible,
        sort_order: sections?.length || 0,
      };
      if (values.id) {
        const { error } = await supabase.from('employer_branding_sections').update(payload).eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employer_branding_sections').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding-sections'] });
      toast.success(editingId ? 'Section updated' : 'Section added');
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employer_branding_sections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding-sections'] });
      toast.success('Section deleted');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newOrder }: { id: string; newOrder: number }) => {
      const { error } = await supabase.from('employer_branding_sections').update({ sort_order: newOrder }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branding-sections'] }),
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      const { error } = await supabase.from('employer_branding_sections').update({ is_visible }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branding-sections'] }),
  });

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (!sections) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= sections.length) return;
    reorderMutation.mutate({ id: sections[index].id, newOrder: sections[target].sort_order });
    reorderMutation.mutate({ id: sections[target].id, newOrder: sections[index].sort_order });
  };

  const openEdit = (section: BrandingSection) => {
    setEditingId(section.id);
    setForm({
      section_type: section.section_type,
      title: section.title || '',
      content: section.content || '',
      media_url: section.media_url || '',
      is_visible: section.is_visible,
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const sectionIcon = (type: string) => {
    const found = SECTION_TYPES.find(s => s.value === type);
    return found ? <found.icon className="h-4 w-4" /> : <Type className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Branding Page Builder
          </h2>
          <p className="text-xs text-muted-foreground">Build your company culture page with drag-and-drop sections</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Section
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : !sections?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Palette className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No branding sections yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1 mb-4">Add hero images, team spotlights, employee stories and more</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SECTION_TYPES.map(t => (
                <Button key={t.value} variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
                  setForm({ ...emptyForm, section_type: t.value });
                  setDialogOpen(true);
                }}>
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {sections.map((section, i) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className={!section.is_visible ? 'opacity-50' : ''}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0} onClick={() => moveSection(i, 'up')}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === sections.length - 1} onClick={() => moveSection(i, 'down')}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="p-2 rounded-lg bg-primary/5">{sectionIcon(section.section_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{section.title || SECTION_TYPES.find(t => t.value === section.section_type)?.label}</span>
                        <Badge variant="outline" className="text-[10px]">{section.section_type}</Badge>
                      </div>
                      {section.content && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{section.content}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => toggleVisibility.mutate({ id: section.id, is_visible: !section.is_visible })}>
                        {section.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(section)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(section.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Section' : 'Add Branding Section'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Section Type</Label>
              <Select value={form.section_type} onValueChange={v => setForm({ ...form, section_type: v })} disabled={!!editingId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2"><t.icon className="h-3.5 w-3.5" /> {t.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Section title..." />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Write your content..." rows={4} />
            </div>
            {['hero_image', 'video', 'gallery'].includes(form.section_type) && (
              <div>
                <Label>Media URL</Label>
                <Input value={form.media_url} onChange={e => setForm({ ...form, media_url: e.target.value })} placeholder="https://..." />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.is_visible} onCheckedChange={v => setForm({ ...form, is_visible: v })} />
              <Label>Visible on public profile</Label>
            </div>
            <Button
              className="w-full"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(editingId ? { ...form, id: editingId } : form)}
            >
              {saveMutation.isPending ? 'Saving...' : editingId ? 'Update Section' : 'Add Section'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
