import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Edit, Eye, Code, Variable, Send, ScrollText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';

interface EmailTemplate {
  id: string;
  template_key: string;
  subject: string;
  html_body: string;
  description: string | null;
  variables: string[];
  is_active: boolean;
  updated_at: string;
}

interface EmailLog {
  id: string;
  template_key: string;
  recipient_email: string;
  recipient_user_id: string | null;
  subject: string;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export default function AdminEmailTemplates() {
  const queryClient = useQueryClient();
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [formData, setFormData] = useState({
    subject: '',
    html_body: '',
    description: '',
    is_active: true,
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['admin-email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_key');
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const { data: emailLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['admin-email-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as EmailLog[];
    },
    enabled: activeTab === 'logs',
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; subject: string; html_body: string; description: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('email_templates')
        .update({ ...updates, description: updates.description || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
      setEditTemplate(null);
      toast.success('Template updated');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const sendTestMutation = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const testVars: Record<string, string> = {};
      template.variables?.forEach(v => {
        testVars[v] = `[Test ${v}]`;
      });

      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: { user_id: user.id, template_key: template.template_key, variables: testVars },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success('Test email sent! Check your inbox.');
      } else if (data?.skipped) {
        toast.info('Email skipped: ' + data.reason);
      } else {
        toast.error('Send failed: ' + JSON.stringify(data));
      }
      queryClient.invalidateQueries({ queryKey: ['admin-email-logs'] });
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const openEdit = (t: EmailTemplate) => {
    setFormData({
      subject: t.subject,
      html_body: t.html_body,
      description: t.description || '',
      is_active: t.is_active,
    });
    setEditTemplate(t);
  };

  const handlePreview = (html: string, variables: string[]) => {
    let preview = html;
    variables.forEach(v => {
      preview = preview.replace(new RegExp(`{{${v}}}`, 'g'), `<span style="background:#fef3c7;padding:2px 4px;border-radius:3px">[${v}]</span>`);
    });
    setPreviewHtml(preview);
    setShowPreview(true);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <AdminLayout title="Email Templates">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="templates"><Mail className="h-4 w-4 mr-1" />Templates</TabsTrigger>
          <TabsTrigger value="logs"><ScrollText className="h-4 w-4 mr-1" />Email Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Templates
              </CardTitle>
              <CardDescription>
                Customize the email templates sent to users. Use {'{{variable}}'} syntax for dynamic content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Variables</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates?.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{t.template_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{t.subject}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {t.variables?.map((v) => (
                              <Badge key={v} variant="outline" className="text-xs">
                                <Variable className="h-3 w-3 mr-1" />{v}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {t.is_active ? (
                            <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(t.updated_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handlePreview(t.html_body, t.variables)} title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => sendTestMutation.mutate(t)}
                            disabled={sendTestMutation.isPending || !t.is_active}
                            title="Send Test Email"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Email Logs
              </CardTitle>
              <CardDescription>Recent email delivery attempts and their status.</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : !emailLogs?.length ? (
                <p className="text-muted-foreground text-center py-8">No email logs yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {statusIcon(log.status)}
                            <span className="text-sm capitalize">{log.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{log.template_key}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{log.recipient_email}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{log.subject}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                          {log.error_message || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={() => setEditTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit: {editTemplate?.template_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</DialogTitle>
            <DialogDescription>
              Available variables: {editTemplate?.variables?.map(v => `{{${v}}}`).join(', ')}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="edit">
            <TabsList>
              <TabsTrigger value="edit"><Code className="h-4 w-4 mr-1" />Edit</TabsTrigger>
              <TabsTrigger value="preview"><Eye className="h-4 w-4 mr-1" />Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Internal description..."
                />
              </div>
              <div className="space-y-2">
                <Label>HTML Body</Label>
                <Textarea
                  value={formData.html_body}
                  onChange={(e) => setFormData({ ...formData, html_body: e.target.value })}
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg p-4 bg-background">
                <div className="text-sm text-muted-foreground mb-2">Subject: <strong>{formData.subject}</strong></div>
                <div className="border-t pt-4">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(formData.html_body.replace(
                        /\{\{(\w+)\}\}/g,
                        '<span style="background:hsl(var(--warning)/0.2);padding:2px 6px;border-radius:4px;font-weight:600">[$1]</span>'
                      )),
                    }}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplate(null)}>Cancel</Button>
            <Button
              onClick={() => editTemplate && updateMutation.mutate({ id: editTemplate.id, ...formData })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg p-6 bg-background" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }} />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
