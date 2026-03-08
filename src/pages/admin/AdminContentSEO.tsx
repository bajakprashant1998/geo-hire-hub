import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe, Megaphone, Search, Star, Save, Edit, Eye, RefreshCw,
  FileText, CheckCircle, XCircle, ExternalLink, Code, Tag, Link2,
  Type, AlignLeft, Sparkles, Settings, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

interface SiteContent {
  id: string;
  content_key: string;
  content_type: string;
  title: string | null;
  body: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  updated_at: string;
}

const ContentCard = ({ item, icon: Icon, label, description, onEdit, children }: {
  item: SiteContent | undefined; icon: any; label: string; description: string; onEdit: () => void; children: React.ReactNode;
}) => (
  <Card className="rounded-2xl border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden group hover:shadow-md transition-all">
    <CardContent className="p-0">
      <div className="flex items-center justify-between p-4 border-b border-border/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{label}</h3>
            <p className="text-[11px] text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {item?.is_active ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] gap-1">
              <CheckCircle className="h-2.5 w-2.5" />Active
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] gap-1"><XCircle className="h-2.5 w-2.5" />Inactive</Badge>
          )}
          {item?.updated_at && (
            <Tooltip>
              <TooltipTrigger>
                <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}</span>
              </TooltipTrigger>
              <TooltipContent>{format(new Date(item.updated_at), 'PPP p')}</TooltipContent>
            </Tooltip>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs rounded-lg" onClick={onEdit} disabled={!item}>
            <Edit className="h-3 w-3" /> Edit
          </Button>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </CardContent>
  </Card>
);

const MetaField = ({ label, value, icon: Icon, mono }: { label: string; value: string; icon?: any; mono?: boolean }) => (
  <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
      {Icon && <Icon className="h-2.5 w-2.5" />}{label}
    </p>
    <p className={`text-sm ${mono ? 'font-mono text-xs' : ''} ${value === 'Not set' ? 'text-muted-foreground italic' : ''}`}>{value}</p>
  </div>
);

export default function AdminContentSEO() {
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState<SiteContent | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    body: string;
    metadata: Record<string, unknown>;
    is_active: boolean;
  }>({ title: '', body: '', metadata: {}, is_active: true });

  const { data: content, isLoading, refetch } = useQuery({
    queryKey: ['admin-site-content'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_content').select('*').order('content_key');
      if (error) throw error;
      return data as SiteContent[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, title, body, metadata, is_active }: { id: string; title: string | null; body: string | null; metadata: Record<string, unknown>; is_active: boolean }) => {
      const { error } = await supabase.from('site_content').update({ title, body, metadata: metadata as unknown as null, is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-site-content'] }); setEditItem(null); toast.success('Content updated'); },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const openEdit = (item: SiteContent) => {
    setFormData({ title: item.title || '', body: item.body || '', metadata: item.metadata || {}, is_active: item.is_active });
    setEditItem(item);
  };

  const updateMeta = (key: string, value: unknown) => {
    setFormData(prev => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }));
  };

  const bannerContent = content?.find(c => c.content_key === 'homepage_banner');
  const announcementContent = content?.find(c => c.content_key === 'announcement_bar');
  const seoContent = content?.find(c => c.content_key === 'meta_homepage');
  const featuredConfig = content?.find(c => c.content_key === 'featured_jobs_config');

  const activeCount = content?.filter(c => c.is_active).length || 0;
  const totalCount = content?.length || 0;

  if (isLoading) {
    return (
      <AdminLayout title="Content & SEO">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64 rounded-xl" />
          <div className="grid gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Content & SEO">
      <TooltipProvider>
        <div className="space-y-5">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Content & SEO</h2>
                <p className="text-xs text-muted-foreground">Manage banners, metadata, and featured content</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 py-1 px-3 text-xs bg-card/60 backdrop-blur-sm border-border/40">
                <Layers className="h-3 w-3 text-primary" />
                {activeCount}/{totalCount} active
              </Badge>
              <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <Tabs defaultValue="banners" className="space-y-5">
              <TabsList className="bg-muted/40 backdrop-blur-sm border border-border/30 p-1 h-auto rounded-xl">
                <TabsTrigger value="banners" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-2 gap-1.5">
                  <Megaphone className="h-3.5 w-3.5" />Banners
                </TabsTrigger>
                <TabsTrigger value="seo" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-2 gap-1.5">
                  <Search className="h-3.5 w-3.5" />SEO Meta
                </TabsTrigger>
                <TabsTrigger value="featured" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-2 gap-1.5">
                  <Star className="h-3.5 w-3.5" />Featured
                </TabsTrigger>
                <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm text-xs px-4 py-2 gap-1.5">
                  <Layers className="h-3.5 w-3.5" />All Content
                </TabsTrigger>
              </TabsList>

              {/* Banners Tab */}
              <TabsContent value="banners" className="space-y-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <ContentCard item={bannerContent} icon={Globe} label="Homepage Banner" description="Main hero section on the landing page" onEdit={() => bannerContent && openEdit(bannerContent)}>
                    <div className="rounded-xl border border-border/20 p-5 bg-gradient-to-br from-primary/5 to-primary/[0.02]">
                      <h3 className="text-lg font-bold">{bannerContent?.title || <span className="text-muted-foreground italic">No title set</span>}</h3>
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{bannerContent?.body || <span className="italic">No description set</span>}</p>
                      <div className="flex items-center gap-2 mt-3">
                        {bannerContent?.metadata?.cta_text && (
                          <Badge variant="outline" className="gap-1 text-xs"><Link2 className="h-2.5 w-2.5" />CTA: {String(bannerContent.metadata.cta_text)}</Badge>
                        )}
                        {bannerContent?.metadata?.cta_link && (
                          <Badge variant="outline" className="gap-1 text-[10px] font-mono"><ExternalLink className="h-2.5 w-2.5" />{String(bannerContent.metadata.cta_link)}</Badge>
                        )}
                      </div>
                    </div>
                  </ContentCard>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <ContentCard item={announcementContent} icon={Megaphone} label="Announcement Bar" description="Top-of-page banner shown globally" onEdit={() => announcementContent && openEdit(announcementContent)}>
                    {announcementContent?.title ? (
                      <div className="rounded-xl border border-border/20 p-4 bg-muted/30">
                        <div className="flex items-center gap-2">
                          <strong className="text-sm">{announcementContent.title}</strong>
                          {announcementContent.metadata?.type && (
                            <Badge variant="outline" className="text-[10px] capitalize">{String(announcementContent.metadata.type)}</Badge>
                          )}
                        </div>
                        {announcementContent.body && <p className="text-sm text-muted-foreground mt-1">{announcementContent.body}</p>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <XCircle className="h-4 w-4" /> No announcement configured
                      </div>
                    )}
                  </ContentCard>
                </motion.div>
              </TabsContent>

              {/* SEO Tab */}
              <TabsContent value="seo" className="space-y-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <ContentCard item={seoContent} icon={Search} label="Homepage Meta Tags" description="SEO metadata for search engines" onEdit={() => seoContent && openEdit(seoContent)}>
                    <div className="space-y-3">
                      {/* SERP Preview */}
                      <div className="rounded-xl border border-border/20 p-4 bg-card">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Google SERP Preview</p>
                        <div className="space-y-0.5">
                          <p className="text-blue-600 dark:text-blue-400 text-base font-medium truncate">
                            {seoContent?.title || 'Page Title – Not Set'}
                          </p>
                          <p className="text-emerald-700 dark:text-emerald-500 text-xs font-mono">https://www.hireforjob.com</p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                            {seoContent?.body || 'Meta description not set. Add a compelling description to improve click-through rates.'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <MetaField label="Title Tag" value={seoContent?.title || 'Not set'} icon={Type} />
                        <MetaField
                          label="Title Length"
                          value={seoContent?.title ? `${seoContent.title.length} chars ${seoContent.title.length > 60 ? '⚠️ Too long' : seoContent.title.length < 30 ? '⚠️ Too short' : '✅'}` : 'Not set'}
                          icon={Code}
                        />
                      </div>
                      <MetaField label="Meta Description" value={seoContent?.body || 'Not set'} icon={AlignLeft} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <MetaField
                          label="Description Length"
                          value={seoContent?.body ? `${seoContent.body.length} chars ${seoContent.body.length > 160 ? '⚠️ Too long' : seoContent.body.length < 70 ? '⚠️ Too short' : '✅'}` : 'Not set'}
                          icon={Code}
                        />
                        <MetaField label="Keywords" value={String(seoContent?.metadata?.keywords || 'Not set')} icon={Tag} />
                      </div>
                    </div>
                  </ContentCard>
                </motion.div>
              </TabsContent>

              {/* Featured Tab */}
              <TabsContent value="featured" className="space-y-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <ContentCard item={featuredConfig} icon={Star} label="Featured Jobs" description="Promote specific jobs on the homepage" onEdit={() => featuredConfig && openEdit(featuredConfig)}>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-muted/30 border border-border/20">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                        {featuredConfig?.metadata?.enabled ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1">
                            <CheckCircle className="h-3 w-3" />Enabled
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Disabled</Badge>
                        )}
                      </div>
                      <MetaField label="Max Featured" value={String(featuredConfig?.metadata?.max_featured || 5)} icon={Star} />
                    </div>
                  </ContentCard>
                </motion.div>
              </TabsContent>

              {/* All Content Tab */}
              <TabsContent value="all" className="space-y-3">
                {content?.map((item, idx) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                    <Card className="rounded-2xl border-border/30 bg-card/80 backdrop-blur-sm hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-muted/50 shrink-0">
                              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{item.content_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                <Badge variant="outline" className="text-[10px]">{item.content_type}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{item.title || 'No title'} · {item.body?.substring(0, 60) || 'No body'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.is_active ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">Active</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                            )}
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 rounded-lg" onClick={() => openEdit(item)}>
                              <Edit className="h-3 w-3" /> Edit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                {(!content || content.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 rounded-2xl bg-muted/50 mb-4"><FileText className="h-8 w-8 text-muted-foreground" /></div>
                    <p className="font-semibold">No content entries found</p>
                    <p className="text-sm text-muted-foreground mt-1">Content entries are created in the database</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Edit Dialog */}
          <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-primary" />
                  Edit: {editItem?.content_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </DialogTitle>
                <DialogDescription>
                  Update content and metadata for this section
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Title</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="rounded-xl" placeholder="Enter title..." />
                  {formData.title && (
                    <p className="text-[10px] text-muted-foreground">{formData.title.length} characters</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Body / Description</Label>
                  <Textarea value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} className="min-h-[100px] rounded-xl" placeholder="Enter body content..." />
                  {formData.body && (
                    <p className="text-[10px] text-muted-foreground">{formData.body.length} characters</p>
                  )}
                </div>

                {editItem?.content_type === 'banner' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">CTA Button Text</Label>
                      <Input value={String(formData.metadata.cta_text || '')} onChange={(e) => updateMeta('cta_text', e.target.value)} className="rounded-xl" placeholder="e.g., Browse Jobs" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">CTA Link</Label>
                      <Input value={String(formData.metadata.cta_link || '')} onChange={(e) => updateMeta('cta_link', e.target.value)} className="rounded-xl font-mono text-xs" placeholder="/browse-jobs" />
                    </div>
                  </div>
                )}

                {editItem?.content_type === 'announcement' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Type</Label>
                    <Select value={String(formData.metadata.type || 'info')} onValueChange={(v) => updateMeta('type', v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">ℹ️ Info</SelectItem>
                        <SelectItem value="warning">⚠️ Warning</SelectItem>
                        <SelectItem value="success">✅ Success</SelectItem>
                        <SelectItem value="error">❌ Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {editItem?.content_type === 'seo' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Keywords (comma-separated)</Label>
                    <Input value={String(formData.metadata.keywords || '')} onChange={(e) => updateMeta('keywords', e.target.value)} className="rounded-xl" placeholder="hire for job, jobs near me, ..." />
                  </div>
                )}

                {editItem?.content_type === 'config' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/20">
                      <Switch checked={!!formData.metadata.enabled} onCheckedChange={(checked) => updateMeta('enabled', checked)} />
                      <Label className="text-xs font-semibold">Enable Featured</Label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Max Featured</Label>
                      <Input type="number" value={String(formData.metadata.max_featured || 5)} onChange={(e) => updateMeta('max_featured', parseInt(e.target.value) || 5)} className="rounded-xl" />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/20">
                  <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                  <Label className="text-xs font-semibold">Active</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" className="rounded-xl" onClick={() => setEditItem(null)}>Cancel</Button>
                <Button
                  className="rounded-xl gap-1.5"
                  onClick={() => editItem && updateMutation.mutate({ id: editItem.id, title: formData.title || null, body: formData.body || null, metadata: formData.metadata, is_active: formData.is_active })}
                  disabled={updateMutation.isPending}
                >
                  <Save className="h-3.5 w-3.5" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </AdminLayout>
  );
}
