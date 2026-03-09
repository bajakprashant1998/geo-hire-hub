import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FileText, Plus, Pencil, Trash2, Star, Copy, Loader2, Tag } from 'lucide-react';

interface CoverLetterTemplatesProps {
  candidateId: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export const CoverLetterTemplates = ({ candidateId }: CoverLetterTemplatesProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: '', content: '', is_default: false, tags: '' });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { fetchTemplates(); }, [candidateId]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cover_letter_templates')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('is_default', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setTemplates(data || []);
    } catch { toast.error('Failed to load templates'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', content: '', is_default: false, tags: '' });
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({ name: t.name, content: t.content, is_default: t.is_default, tags: t.tags.join(', ') });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.content.trim()) { toast.error('Name and content are required'); return; }
    setSaving(true);
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      
      // If setting as default, unset others first
      if (form.is_default) {
        await supabase.from('cover_letter_templates').update({ is_default: false }).eq('candidate_id', candidateId);
      }

      if (editing) {
        const { error } = await supabase.from('cover_letter_templates')
          .update({ name: form.name.trim(), content: form.content.trim(), is_default: form.is_default, tags, updated_at: new Date().toISOString() })
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Template updated');
      } else {
        const { error } = await supabase.from('cover_letter_templates')
          .insert({ candidate_id: candidateId, name: form.name.trim(), content: form.content.trim(), is_default: form.is_default, tags });
        if (error) throw error;
        toast.success('Template created');
      }
      setDialogOpen(false);
      fetchTemplates();
    } catch { toast.error('Failed to save template'); }
    finally { setSaving(false); }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase.from('cover_letter_templates').delete().eq('id', id);
      if (error) throw error;
      toast.success('Template deleted');
      fetchTemplates();
    } catch { toast.error('Failed to delete template'); }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Cover Letter Templates
          </h2>
          <p className="text-sm text-muted-foreground">{templates.length} template{templates.length !== 1 ? 's' : ''} saved</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> New Template
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-10 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-1">No templates yet</p>
            <p className="text-xs text-muted-foreground mb-3">Create reusable cover letter templates for faster applications</p>
            <Button variant="outline" size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1.5" /> Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <Card key={t.id} className="border-border/40 bg-card/60 backdrop-blur-sm hover:border-primary/20 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{t.name}</p>
                      {t.is_default && <Badge className="bg-primary/10 text-primary text-[10px] px-1.5 py-0"><Star className="w-2.5 h-2.5 mr-0.5" /> Default</Badge>}
                    </div>
                    {t.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {t.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Tag className="w-2.5 h-2.5 mr-0.5" />{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.content}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(t.content)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteTemplate(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {expandedId === t.id && (
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{t.content}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Template' : 'New Cover Letter Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input placeholder="e.g. Technical Role, Marketing Position..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={100} />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea placeholder="Dear Hiring Manager,&#10;&#10;I am writing to express my interest in..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={10} maxLength={5000} />
              <p className="text-xs text-muted-foreground mt-1">{form.content.length}/5000</p>
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input placeholder="tech, remote, startup" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_default} onCheckedChange={checked => setForm(f => ({ ...f, is_default: checked }))} />
              <Label>Set as default template</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              {editing ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
