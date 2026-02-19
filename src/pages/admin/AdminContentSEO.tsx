import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe,
  Megaphone,
  Search,
  Star,
  Save,
  Edit,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

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

export default function AdminContentSEO() {
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState<SiteContent | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    body: string;
    metadata: Record<string, unknown>;
    is_active: boolean;
  }>({ title: '', body: '', metadata: {}, is_active: true });

  const { data: content, isLoading } = useQuery({
    queryKey: ['admin-site-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('*')
        .order('content_key');
      if (error) throw error;
      return data as SiteContent[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, title, body, metadata, is_active }: { id: string; title: string | null; body: string | null; metadata: Record<string, unknown>; is_active: boolean }) => {
      const { error } = await supabase
        .from('site_content')
        .update({ title, body, metadata: metadata as unknown as null, is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-site-content'] });
      setEditItem(null);
      toast.success('Content updated');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const openEdit = (item: SiteContent) => {
    setFormData({
      title: item.title || '',
      body: item.body || '',
      metadata: item.metadata || {},
      is_active: item.is_active,
    });
    setEditItem(item);
  };

  const updateMeta = (key: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value },
    }));
  };

  const bannerContent = content?.find(c => c.content_key === 'homepage_banner');
  const announcementContent = content?.find(c => c.content_key === 'announcement_bar');
  const seoContent = content?.find(c => c.content_key === 'meta_homepage');
  const featuredConfig = content?.find(c => c.content_key === 'featured_jobs_config');

  if (isLoading) {
    return (
      <AdminLayout title="Content & SEO">
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-32" /></CardContent></Card>)}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Content & SEO">
      <Tabs defaultValue="banners" className="space-y-6">
        <TabsList>
          <TabsTrigger value="banners"><Megaphone className="h-4 w-4 mr-1" />Banners</TabsTrigger>
          <TabsTrigger value="seo"><Search className="h-4 w-4 mr-1" />SEO</TabsTrigger>
          <TabsTrigger value="featured"><Star className="h-4 w-4 mr-1" />Featured</TabsTrigger>
        </TabsList>

        {/* Banners Tab */}
        <TabsContent value="banners" className="space-y-6">
          {/* Homepage Banner */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Homepage Banner
                  </CardTitle>
                  <CardDescription>Main hero section on the landing page</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {bannerContent?.is_active ? (
                    <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={() => bannerContent && openEdit(bannerContent)}>
                    <Edit className="h-4 w-4 mr-1" />Edit
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border p-6 bg-primary/5">
                <h3 className="text-xl font-bold">{bannerContent?.title || 'No title set'}</h3>
                <p className="text-muted-foreground mt-1">{bannerContent?.body || 'No description set'}</p>
                {bannerContent?.metadata?.cta_text && (
                  <Badge className="mt-3">CTA: {String(bannerContent.metadata.cta_text)}</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Announcement Bar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Megaphone className="h-5 w-5" />
                    Announcement Bar
                  </CardTitle>
                  <CardDescription>Top-of-page announcement shown globally</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {announcementContent?.is_active ? (
                    <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={() => announcementContent && openEdit(announcementContent)}>
                    <Edit className="h-4 w-4 mr-1" />Edit
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {announcementContent?.title ? (
                <div className="rounded-lg border p-4 bg-muted/50">
                  <strong>{announcementContent.title}</strong>
                  {announcementContent.body && <p className="text-sm mt-1">{announcementContent.body}</p>}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No announcement configured. Edit to add one.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Homepage Meta Tags
                  </CardTitle>
                  <CardDescription>SEO metadata for the homepage</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => seoContent && openEdit(seoContent)}>
                  <Edit className="h-4 w-4 mr-1" />Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-xs">Title Tag</Label>
                <p className="font-medium">{seoContent?.title || 'Not set'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Meta Description</Label>
                <p className="text-sm">{seoContent?.body || 'Not set'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Keywords</Label>
                <p className="text-sm">{String(seoContent?.metadata?.keywords || 'Not set')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Featured Jobs Tab */}
        <TabsContent value="featured" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Featured Jobs
                  </CardTitle>
                  <CardDescription>Promote specific jobs on the homepage</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => featuredConfig && openEdit(featuredConfig)}>
                  <Edit className="h-4 w-4 mr-1" />Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label>Featured Jobs Enabled:</Label>
                  {featuredConfig?.metadata?.enabled ? (
                    <Badge className="bg-success/10 text-success border-success/20">Yes</Badge>
                  ) : (
                    <Badge variant="secondary">No</Badge>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Max Featured</Label>
                  <p>{String(featuredConfig?.metadata?.max_featured || 5)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Universal Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit: {editItem?.content_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Body / Description</Label>
              <Textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            {/* Dynamic metadata fields based on content type */}
            {editItem?.content_type === 'banner' && (
              <>
                <div className="space-y-2">
                  <Label>CTA Button Text</Label>
                  <Input
                    value={String(formData.metadata.cta_text || '')}
                    onChange={(e) => updateMeta('cta_text', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CTA Link</Label>
                  <Input
                    value={String(formData.metadata.cta_link || '')}
                    onChange={(e) => updateMeta('cta_link', e.target.value)}
                  />
                </div>
              </>
            )}

            {editItem?.content_type === 'announcement' && (
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={String(formData.metadata.type || 'info')}
                  onChange={(e) => updateMeta('type', e.target.value)}
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
              </div>
            )}

            {editItem?.content_type === 'seo' && (
              <div className="space-y-2">
                <Label>Keywords (comma-separated)</Label>
                <Input
                  value={String(formData.metadata.keywords || '')}
                  onChange={(e) => updateMeta('keywords', e.target.value)}
                />
              </div>
            )}

            {editItem?.content_type === 'config' && (
              <>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!formData.metadata.enabled}
                    onCheckedChange={(checked) => updateMeta('enabled', checked)}
                  />
                  <Label>Enable Featured Jobs</Label>
                </div>
                <div className="space-y-2">
                  <Label>Max Featured Jobs</Label>
                  <Input
                    type="number"
                    value={String(formData.metadata.max_featured || 5)}
                    onChange={(e) => updateMeta('max_featured', parseInt(e.target.value) || 5)}
                    className="w-32"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button
              onClick={() => editItem && updateMutation.mutate({
                id: editItem.id,
                title: formData.title || null,
                body: formData.body || null,
                metadata: formData.metadata,
                is_active: formData.is_active,
              })}
              disabled={updateMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
