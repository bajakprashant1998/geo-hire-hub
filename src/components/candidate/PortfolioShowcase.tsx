import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  Plus, ExternalLink, Github, Image as ImageIcon, Trash2, Edit2, GripVertical,
  Star, Upload, X, FileText, Briefcase, Eye, Link2, Loader2, Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PortfolioProject {
  id: string;
  candidate_id: string;
  title: string;
  description: string | null;
  project_type: string;
  tech_stack: string[];
  live_url: string | null;
  repo_url: string | null;
  thumbnail_url: string | null;
  media_urls: string[];
  problem_statement: string | null;
  solution: string | null;
  results: string | null;
  metrics: Record<string, string>;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  candidateId: string;
  readOnly?: boolean;
}

const EMPTY_FORM: Partial<PortfolioProject> = {
  title: '',
  description: '',
  project_type: 'project',
  tech_stack: [],
  live_url: '',
  repo_url: '',
  thumbnail_url: '',
  media_urls: [],
  problem_statement: '',
  solution: '',
  results: '',
  metrics: {},
  is_featured: false,
};

export const PortfolioShowcase = ({ candidateId, readOnly = false }: Props) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [techInput, setTechInput] = useState('');
  const [metricKey, setMetricKey] = useState('');
  const [metricValue, setMetricValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewProject, setViewProject] = useState<PortfolioProject | null>(null);
  const [activeTab, setActiveTab] = useState('gallery');

  const fetchProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from('portfolio_projects')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('sort_order', { ascending: true });
    if (!error && data) setProjects(data as unknown as PortfolioProject[]);
    setLoading(false);
  }, [candidateId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleUploadMedia = async (file: File, type: 'thumbnail' | 'media') => {
    if (!user) return null;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('portfolio-media').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('portfolio-media').getPublicUrl(path);
      return publicUrl;
    } catch (e: any) {
      toast.error('Upload failed: ' + e.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await handleUploadMedia(file, 'thumbnail');
    if (url) setForm(f => ({ ...f, thumbnail_url: url }));
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const url = await handleUploadMedia(file, 'media');
      if (url) urls.push(url);
    }
    setForm(f => ({ ...f, media_urls: [...(f.media_urls || []), ...urls] }));
  };

  const addTech = () => {
    if (!techInput.trim()) return;
    setForm(f => ({ ...f, tech_stack: [...(f.tech_stack || []), techInput.trim()] }));
    setTechInput('');
  };

  const removeTech = (idx: number) => {
    setForm(f => ({ ...f, tech_stack: (f.tech_stack || []).filter((_, i) => i !== idx) }));
  };

  const addMetric = () => {
    if (!metricKey.trim() || !metricValue.trim()) return;
    setForm(f => ({ ...f, metrics: { ...(f.metrics || {}), [metricKey.trim()]: metricValue.trim() } }));
    setMetricKey('');
    setMetricValue('');
  };

  const removeMetric = (key: string) => {
    setForm(f => {
      const m = { ...(f.metrics || {}) };
      delete m[key];
      return { ...f, metrics: m };
    });
  };

  const removeMedia = (idx: number) => {
    setForm(f => ({ ...f, media_urls: (f.media_urls || []).filter((_, i) => i !== idx) }));
  };

  const openCreate = () => {
    setEditingProject(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (p: PortfolioProject) => {
    setEditingProject(p);
    setForm({
      title: p.title,
      description: p.description || '',
      project_type: p.project_type,
      tech_stack: p.tech_stack || [],
      live_url: p.live_url || '',
      repo_url: p.repo_url || '',
      thumbnail_url: p.thumbnail_url || '',
      media_urls: p.media_urls || [],
      problem_statement: p.problem_statement || '',
      solution: p.solution || '',
      results: p.results || '',
      metrics: (p.metrics as Record<string, string>) || {},
      is_featured: p.is_featured,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        candidate_id: candidateId,
        title: form.title!.trim(),
        description: form.description || null,
        project_type: form.project_type || 'project',
        tech_stack: form.tech_stack || [],
        live_url: form.live_url || null,
        repo_url: form.repo_url || null,
        thumbnail_url: form.thumbnail_url || null,
        media_urls: form.media_urls || [],
        problem_statement: form.problem_statement || null,
        solution: form.solution || null,
        results: form.results || null,
        metrics: form.metrics || {},
        is_featured: form.is_featured || false,
        sort_order: editingProject?.sort_order ?? projects.length,
      };

      if (editingProject) {
        const { error } = await supabase
          .from('portfolio_projects')
          .update(payload)
          .eq('id', editingProject.id);
        if (error) throw error;
        toast.success('Project updated');
      } else {
        const { error } = await supabase
          .from('portfolio_projects')
          .insert(payload);
        if (error) throw error;
        toast.success('Project added');
      }
      setDialogOpen(false);
      fetchProjects();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('portfolio_projects').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); fetchProjects(); }
  };

  const toggleFeatured = async (p: PortfolioProject) => {
    await supabase.from('portfolio_projects').update({ is_featured: !p.is_featured }).eq('id', p.id);
    fetchProjects();
  };

  const galleryProjects = projects.filter(p => p.project_type === 'project');
  const caseStudies = projects.filter(p => p.project_type === 'case_study');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Layout className="w-5 h-5 text-primary" />
            Portfolio Showcase
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {readOnly ? 'Explore projects and case studies' : 'Showcase your best work to employers'}
          </p>
        </div>
        {!readOnly && (
          <Button onClick={openCreate} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" /> Add Project
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-xl bg-muted/50">
          <TabsTrigger value="gallery" className="rounded-lg gap-1.5">
            <Briefcase className="w-3.5 h-3.5" /> Projects ({galleryProjects.length})
          </TabsTrigger>
          <TabsTrigger value="case-studies" className="rounded-lg gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Case Studies ({caseStudies.length})
          </TabsTrigger>
        </TabsList>

        {/* Project Gallery */}
        <TabsContent value="gallery" className="mt-4">
          {galleryProjects.length === 0 ? (
            <EmptyState type="project" readOnly={readOnly} onCreate={openCreate} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {galleryProjects.map((p, i) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    index={i}
                    readOnly={readOnly}
                    onView={() => setViewProject(p)}
                    onEdit={() => openEdit(p)}
                    onDelete={() => handleDelete(p.id)}
                    onToggleFeatured={() => toggleFeatured(p)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Case Studies */}
        <TabsContent value="case-studies" className="mt-4">
          {caseStudies.length === 0 ? (
            <EmptyState type="case_study" readOnly={readOnly} onCreate={openCreate} />
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {caseStudies.map((p, i) => (
                  <CaseStudyCard
                    key={p.id}
                    project={p}
                    index={i}
                    readOnly={readOnly}
                    onView={() => setViewProject(p)}
                    onEdit={() => openEdit(p)}
                    onDelete={() => handleDelete(p.id)}
                    onToggleFeatured={() => toggleFeatured(p)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit Project' : 'Add New Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Type */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={form.project_type === 'project' ? 'default' : 'outline'}
                size="sm"
                className="rounded-lg"
                onClick={() => setForm(f => ({ ...f, project_type: 'project' }))}
              >
                <Briefcase className="w-3.5 h-3.5 mr-1.5" /> Project
              </Button>
              <Button
                type="button"
                variant={form.project_type === 'case_study' ? 'default' : 'outline'}
                size="sm"
                className="rounded-lg"
                onClick={() => setForm(f => ({ ...f, project_type: 'case_study' }))}
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" /> Case Study
              </Button>
            </div>

            {/* Title */}
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="My Awesome Project" className="mt-1" />
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief overview of the project..." className="mt-1" rows={3} />
            </div>

            {/* Thumbnail */}
            <div>
              <Label>Thumbnail</Label>
              <div className="mt-1 flex items-center gap-3">
                {form.thumbnail_url ? (
                  <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-border">
                    <img src={form.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setForm(f => ({ ...f, thumbnail_url: '' }))} className="absolute top-0.5 right-0.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{uploading ? 'Uploading...' : 'Upload image'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} disabled={uploading} />
                  </label>
                )}
              </div>
            </div>

            {/* Media Gallery */}
            <div>
              <Label>Media Gallery</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {(form.media_urls || []).map((url, i) => (
                  <div key={i} className="relative w-20 h-14 rounded-lg overflow-hidden border border-border">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeMedia(i)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-14 border border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/30 transition-colors">
                  <Plus className="w-4 h-4 text-muted-foreground" />
                  <input type="file" accept="image/*,video/*,.pdf" multiple className="hidden" onChange={handleMediaUpload} disabled={uploading} />
                </label>
              </div>
            </div>

            {/* Tech Stack */}
            <div>
              <Label>Tech Stack</Label>
              <div className="mt-1 flex gap-2">
                <Input value={techInput} onChange={e => setTechInput(e.target.value)} placeholder="React, Node.js..." className="flex-1" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTech())} />
                <Button type="button" size="sm" variant="outline" onClick={addTech}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(form.tech_stack || []).map((t, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeTech(i)}>
                    {t} <X className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            </div>

            {/* URLs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Live URL</Label>
                <Input value={form.live_url || ''} onChange={e => setForm(f => ({ ...f, live_url: e.target.value }))} placeholder="https://..." className="mt-1" />
              </div>
              <div>
                <Label>Repository URL</Label>
                <Input value={form.repo_url || ''} onChange={e => setForm(f => ({ ...f, repo_url: e.target.value }))} placeholder="https://github.com/..." className="mt-1" />
              </div>
            </div>

            {/* Case Study Fields */}
            {form.project_type === 'case_study' && (
              <>
                <div>
                  <Label>Problem Statement</Label>
                  <Textarea value={form.problem_statement || ''} onChange={e => setForm(f => ({ ...f, problem_statement: e.target.value }))} placeholder="What challenge did you solve?" className="mt-1" rows={3} />
                </div>
                <div>
                  <Label>Solution</Label>
                  <Textarea value={form.solution || ''} onChange={e => setForm(f => ({ ...f, solution: e.target.value }))} placeholder="How did you approach it?" className="mt-1" rows={3} />
                </div>
                <div>
                  <Label>Results</Label>
                  <Textarea value={form.results || ''} onChange={e => setForm(f => ({ ...f, results: e.target.value }))} placeholder="What outcomes did you achieve?" className="mt-1" rows={3} />
                </div>
                {/* Metrics */}
                <div>
                  <Label>Key Metrics</Label>
                  <div className="mt-1 flex gap-2">
                    <Input value={metricKey} onChange={e => setMetricKey(e.target.value)} placeholder="Metric name" className="flex-1" />
                    <Input value={metricValue} onChange={e => setMetricValue(e.target.value)} placeholder="Value" className="flex-1" />
                    <Button type="button" size="sm" variant="outline" onClick={addMetric}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(form.metrics || {}).map(([k, v]) => (
                      <Badge key={k} variant="outline" className="gap-1 cursor-pointer" onClick={() => removeMetric(k)}>
                        {k}: {v} <X className="w-3 h-3" />
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Featured */}
            <div className="flex items-center gap-3">
              <Switch checked={form.is_featured || false} onCheckedChange={v => setForm(f => ({ ...f, is_featured: v }))} />
              <Label>Featured project (shown first)</Label>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingProject ? 'Update Project' : 'Add Project'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Project Detail Dialog */}
      <Dialog open={!!viewProject} onOpenChange={v => !v && setViewProject(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {viewProject && <ProjectDetail project={viewProject} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Sub-components ─── */

const EmptyState = ({ type, readOnly, onCreate }: { type: string; readOnly: boolean; onCreate: () => void }) => (
  <div className="text-center py-12 border border-dashed border-border/50 rounded-2xl bg-muted/20">
    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
      {type === 'project' ? <Briefcase className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-primary" />}
    </div>
    <p className="font-semibold text-foreground">No {type === 'project' ? 'projects' : 'case studies'} yet</p>
    <p className="text-sm text-muted-foreground mt-1">
      {readOnly ? 'Nothing to show here yet.' : `Add your first ${type === 'project' ? 'project' : 'case study'} to showcase your work.`}
    </p>
    {!readOnly && (
      <Button onClick={onCreate} variant="outline" size="sm" className="mt-4 rounded-xl gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Add {type === 'project' ? 'Project' : 'Case Study'}
      </Button>
    )}
  </div>
);

const ProjectCard = ({ project, index, readOnly, onView, onEdit, onDelete, onToggleFeatured }: {
  project: PortfolioProject; index: number; readOnly: boolean;
  onView: () => void; onEdit: () => void; onDelete: () => void; onToggleFeatured: () => void;
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ delay: index * 0.05 }}
  >
    <Card className="group overflow-hidden border-border/40 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={onView}>
      {/* Thumbnail */}
      <div className="relative bg-muted/30">
        <AspectRatio ratio={16 / 9}>
          {project.thumbnail_url ? (
            <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
            </div>
          )}
        </AspectRatio>
        {project.is_featured && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-primary/90 text-primary-foreground text-[10px] gap-1">
              <Star className="w-3 h-3" /> Featured
            </Badge>
          </div>
        )}
        {!readOnly && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button onClick={e => { e.stopPropagation(); onToggleFeatured(); }} className="w-7 h-7 rounded-lg bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
              <Star className={cn("w-3.5 h-3.5", project.is_featured ? "text-primary fill-primary" : "text-muted-foreground")} />
            </button>
            <button onClick={e => { e.stopPropagation(); onEdit(); }} className="w-7 h-7 rounded-lg bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors">
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }} className="w-7 h-7 rounded-lg bg-destructive/90 backdrop-blur-sm flex items-center justify-center hover:bg-destructive transition-colors">
              <Trash2 className="w-3.5 h-3.5 text-destructive-foreground" />
            </button>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground text-sm line-clamp-1">{project.title}</h3>
        {project.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
        )}
        {project.tech_stack?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {project.tech_stack.slice(0, 4).map(t => (
              <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
            ))}
            {project.tech_stack.length > 4 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{project.tech_stack.length - 4}</Badge>
            )}
          </div>
        )}
        <div className="flex gap-2 mt-3">
          {project.live_url && (
            <a href={project.live_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-primary hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Live
            </a>
          )}
          {project.repo_url && (
            <a href={project.repo_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Github className="w-3 h-3" /> Code
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const CaseStudyCard = ({ project, index, readOnly, onView, onEdit, onDelete, onToggleFeatured }: {
  project: PortfolioProject; index: number; readOnly: boolean;
  onView: () => void; onEdit: () => void; onDelete: () => void; onToggleFeatured: () => void;
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ delay: index * 0.05 }}
  >
    <Card className="group overflow-hidden border-border/40 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={onView}>
      <CardContent className="p-5 flex gap-5">
        {/* Thumbnail */}
        {project.thumbnail_url && (
          <div className="w-32 h-24 shrink-0 rounded-xl overflow-hidden">
            <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{project.title}</h3>
                {project.is_featured && (
                  <Badge className="bg-primary/90 text-primary-foreground text-[10px] gap-1">
                    <Star className="w-3 h-3" /> Featured
                  </Badge>
                )}
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
              )}
            </div>
            {!readOnly && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={e => { e.stopPropagation(); onToggleFeatured(); }} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center">
                  <Star className={cn("w-3.5 h-3.5", project.is_featured ? "text-primary fill-primary" : "text-muted-foreground")} />
                </button>
                <button onClick={e => { e.stopPropagation(); onEdit(); }} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center">
                  <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={e => { e.stopPropagation(); onDelete(); }} className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            )}
          </div>
          {/* Metrics preview */}
          {Object.keys(project.metrics || {}).length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3">
              {Object.entries(project.metrics as Record<string, string>).slice(0, 3).map(([k, v]) => (
                <div key={k} className="text-center">
                  <p className="text-sm font-bold text-primary">{v}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k}</p>
                </div>
              ))}
            </div>
          )}
          {project.tech_stack?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {project.tech_stack.slice(0, 6).map(t => (
                <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const ProjectDetail = ({ project }: { project: PortfolioProject }) => (
  <div className="space-y-5">
    <div>
      <h2 className="text-xl font-bold text-foreground">{project.title}</h2>
      {project.description && <p className="text-muted-foreground mt-1">{project.description}</p>}
    </div>

    {/* Media Gallery */}
    {(project.thumbnail_url || (project.media_urls?.length > 0)) && (
      <div className="space-y-2">
        {project.thumbnail_url && (
          <div className="rounded-xl overflow-hidden border border-border">
            <img src={project.thumbnail_url} alt={project.title} className="w-full max-h-80 object-cover" />
          </div>
        )}
        {project.media_urls?.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {project.media_urls.map((url, i) => (
              <div key={i} className="rounded-lg overflow-hidden border border-border">
                <img src={url} alt="" className="w-full h-24 object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Case study sections */}
    {project.project_type === 'case_study' && (
      <div className="space-y-4">
        {project.problem_statement && (
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10">
            <h4 className="font-semibold text-sm text-destructive mb-1">Problem</h4>
            <p className="text-sm text-foreground">{project.problem_statement}</p>
          </div>
        )}
        {project.solution && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <h4 className="font-semibold text-sm text-primary mb-1">Solution</h4>
            <p className="text-sm text-foreground">{project.solution}</p>
          </div>
        )}
        {project.results && (
          <div className="p-4 rounded-xl bg-success/5 border border-success/10">
            <h4 className="font-semibold text-sm text-success mb-1">Results</h4>
            <p className="text-sm text-foreground">{project.results}</p>
          </div>
        )}
      </div>
    )}

    {/* Metrics */}
    {Object.keys(project.metrics || {}).length > 0 && (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(project.metrics as Record<string, string>).map(([k, v]) => (
          <div key={k} className="text-center p-3 rounded-xl bg-muted/30 border border-border/30">
            <p className="text-lg font-bold text-primary">{v}</p>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{k}</p>
          </div>
        ))}
      </div>
    )}

    {/* Tech stack */}
    {project.tech_stack?.length > 0 && (
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2">Tech Stack</h4>
        <div className="flex flex-wrap gap-1.5">
          {project.tech_stack.map(t => (
            <Badge key={t} variant="secondary">{t}</Badge>
          ))}
        </div>
      </div>
    )}

    {/* Links */}
    <div className="flex gap-3">
      {project.live_url && (
        <a href={project.live_url} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> View Live
          </Button>
        </a>
      )}
      {project.repo_url && (
        <a href={project.repo_url} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
            <Github className="w-3.5 h-3.5" /> Source Code
          </Button>
        </a>
      )}
    </div>
  </div>
);

export default PortfolioShowcase;
