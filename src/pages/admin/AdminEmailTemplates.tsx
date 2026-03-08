import { useState, useMemo } from 'react';
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail, Edit, Eye, Code, Variable, Send, ScrollText, CheckCircle2, XCircle,
  Clock, Search, RefreshCw, AlertTriangle, Loader2, FileText, BarChart3,
  Inbox, ArrowUpRight, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
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

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

export default function AdminEmailTemplates() {
  const queryClient = useQueryClient();
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [templateSearch, setTemplateSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'sent' | 'failed' | 'pending'>('all');
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
        .limit(200);
      if (error) throw error;
      return data as EmailLog[];
    },
    enabled: activeTab === 'logs' || activeTab === 'analytics',
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
      template.variables?.forEach(v => { testVars[v] = `[Test ${v}]`; });
      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: { user_id: user.id, template_key: template.template_key, variables: testVars },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.success) toast.success('Test email sent! Check your inbox.');
      else if (data?.skipped) toast.info('Email skipped: ' + data.reason);
      else toast.error('Send failed: ' + JSON.stringify(data));
      queryClient.invalidateQueries({ queryKey: ['admin-email-logs'] });
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const openEdit = (t: EmailTemplate) => {
    setFormData({ subject: t.subject, html_body: t.html_body, description: t.description || '', is_active: t.is_active });
    setEditTemplate(t);
  };

  const handlePreview = (t: EmailTemplate) => {
    let preview = t.html_body;
    t.variables?.forEach(v => {
      preview = preview.replace(new RegExp(`{{${v}}}`, 'g'), `<span style="background:hsl(48 96% 89%);padding:2px 6px;border-radius:4px;font-weight:600;font-size:13px">[${v}]</span>`);
    });
    setPreviewHtml(preview);
    setPreviewSubject(t.subject);
    setShowPreview(true);
  };

  const formatKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  // Stats
  const activeTemplates = templates?.filter(t => t.is_active).length || 0;
  const totalSent = emailLogs?.filter(l => l.status === 'sent').length || 0;
  const totalFailed = emailLogs?.filter(l => l.status === 'failed').length || 0;
  const deliveryRate = emailLogs?.length ? Math.round((totalSent / emailLogs.length) * 100) : 0;

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    if (!templateSearch) return templates || [];
    const q = templateSearch.toLowerCase();
    return (templates || []).filter(t =>
      t.template_key.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  }, [templates, templateSearch]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let logs = emailLogs || [];
    if (logSearch) {
      const q = logSearch.toLowerCase();
      logs = logs.filter(l => l.recipient_email.toLowerCase().includes(q) || l.template_key.toLowerCase().includes(q) || l.subject.toLowerCase().includes(q));
    }
    if (logStatusFilter !== 'all') logs = logs.filter(l => l.status === logStatusFilter);
    return logs;
  }, [emailLogs, logSearch, logStatusFilter]);

  // Analytics: emails per template
  const templateAnalytics = useMemo(() => {
    const map: Record<string, { sent: number; failed: number; total: number }> = {};
    emailLogs?.forEach(l => {
      if (!map[l.template_key]) map[l.template_key] = { sent: 0, failed: 0, total: 0 };
      map[l.template_key].total++;
      if (l.status === 'sent') map[l.template_key].sent++;
      if (l.status === 'failed') map[l.template_key].failed++;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [emailLogs]);

  const stats = [
    { title: 'Templates', value: templates?.length || 0, sub: `${activeTemplates} active`, icon: FileText, gradient: 'from-primary/10 to-primary/5', iconColor: 'text-primary' },
    { title: 'Emails Sent', value: totalSent, sub: 'last 200 logs', icon: Send, gradient: 'from-emerald-500/10 to-emerald-500/5', iconColor: 'text-emerald-600' },
    { title: 'Failed', value: totalFailed, sub: totalFailed > 0 ? 'needs attention' : 'all clear', icon: XCircle, gradient: totalFailed > 0 ? 'from-destructive/10 to-destructive/5' : 'from-muted/10 to-muted/5', iconColor: totalFailed > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { title: 'Delivery Rate', value: `${deliveryRate}%`, sub: emailLogs?.length ? `of ${emailLogs.length} emails` : 'no data', icon: BarChart3, gradient: 'from-blue-500/10 to-blue-500/5', iconColor: 'text-blue-600' },
  ];

  const statusBadge = (status: string) => {
    if (status === 'sent') return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Sent</Badge>;
    if (status === 'failed') return <Badge variant="destructive" className="text-[10px] gap-1"><XCircle className="h-2.5 w-2.5" />Failed</Badge>;
    return <Badge variant="secondary" className="text-[10px] gap-1"><Clock className="h-2.5 w-2.5" />Pending</Badge>;
  };

  return (
    <AdminLayout title="Email Templates">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <motion.div key={stat.title} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <Card className={`bg-gradient-to-br ${stat.gradient} border-0 shadow-sm`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-background/80 ${stat.iconColor}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Failed Alert */}
      {totalFailed > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm text-foreground">{totalFailed} email{totalFailed > 1 ? 's' : ''} failed to deliver</p>
                <p className="text-xs text-muted-foreground">Check the Logs tab for error details.</p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0" onClick={() => setActiveTab('logs')}>
                View Logs <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="templates" className="gap-1.5"><Mail className="h-3.5 w-3.5" />Templates</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5"><ScrollText className="h-3.5 w-3.5" />Logs</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Analytics</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
              <div>
                <CardTitle className="text-base">Email Templates</CardTitle>
                <CardDescription className="text-xs mt-1">Customize notification emails. Use {'{{variable}}'} for dynamic content.</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search templates..." className="pl-8 h-9 w-52 text-xs" value={templateSearch} onChange={e => setTemplateSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-16">
                  <Inbox className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">{templateSearch ? 'No templates match your search' : 'No email templates configured'}</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  <AnimatePresence>
                    {filteredTemplates.map((t, i) => (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.4) }}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-muted/30 transition-colors group"
                      >
                        {/* Left: info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${t.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                            <span className="font-medium text-sm">{formatKey(t.template_key)}</span>
                            {!t.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground ml-4 truncate">{t.subject}</p>
                          {t.description && <p className="text-[11px] text-muted-foreground/70 ml-4 mt-0.5">{t.description}</p>}
                          {t.variables?.length > 0 && (
                            <div className="flex gap-1 flex-wrap ml-4 mt-1.5">
                              {t.variables.map(v => (
                                <Badge key={v} variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
                                  <Variable className="h-2.5 w-2.5" />{v}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Right: meta + actions */}
                        <div className="flex items-center gap-2 sm:gap-1 ml-4 sm:ml-0 shrink-0">
                          <span className="text-[10px] text-muted-foreground hidden lg:block mr-2">
                            {formatDistanceToNow(new Date(t.updated_at), { addSuffix: true })}
                          </span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(t)} title="Preview">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)} title="Edit">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => sendTestMutation.mutate(t)}
                            disabled={sendTestMutation.isPending || !t.is_active}
                            title="Send Test Email"
                          >
                            {sendTestMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
              <div>
                <CardTitle className="text-base">Email Delivery Logs</CardTitle>
                <CardDescription className="text-xs mt-1">Recent delivery attempts and their status.</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search logs..." className="pl-8 h-9 w-48 text-xs" value={logSearch} onChange={e => setLogSearch(e.target.value)} />
                </div>
                <div className="flex gap-1">
                  {(['all', 'sent', 'failed', 'pending'] as const).map(s => (
                    <Button key={s} size="sm" variant={logStatusFilter === s ? 'default' : 'ghost'} className="h-8 text-xs capitalize" onClick={() => setLogStatusFilter(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="h-8" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-email-logs'] })}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-16">
                  <ScrollText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">{logSearch || logStatusFilter !== 'all' ? 'No logs match your filters' : 'No email logs yet'}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredLogs.map((log, i) => (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.5) }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell>{statusBadge(log.status)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-mono">{log.template_key}</Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-[180px] truncate">{log.recipient_email}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate text-muted-foreground">{log.subject}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</TableCell>
                          <TableCell className="text-xs text-destructive max-w-[180px] truncate">{log.error_message || '—'}</TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Per-template breakdown */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Usage by Template</CardTitle>
                <CardDescription className="text-xs">Email volume and success rate per template.</CardDescription>
              </CardHeader>
              <CardContent>
                {templateAnalytics.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No email data available yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templateAnalytics.map(([key, data], i) => {
                      const rate = data.total > 0 ? Math.round((data.sent / data.total) * 100) : 0;
                      return (
                        <motion.div
                          key={key}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-medium text-sm">{formatKey(key)}</span>
                              <Badge variant="outline" className="text-[10px] font-mono">{key}</Badge>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                  className={`h-full rounded-full ${rate >= 90 ? 'bg-emerald-500' : rate >= 70 ? 'bg-amber-500' : 'bg-destructive'}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${rate}%` }}
                                  transition={{ delay: i * 0.06 + 0.2, duration: 0.5 }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-10 text-right">{rate}%</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 space-y-0.5">
                            <p className="text-sm font-semibold">{data.total}</p>
                            <p className="text-[10px] text-muted-foreground">{data.sent} sent · {data.failed} failed</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={() => setEditTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit: {editTemplate ? formatKey(editTemplate.template_key) : ''}</DialogTitle>
            <DialogDescription>
              {editTemplate?.variables?.length
                ? <>Available variables: {editTemplate.variables.map(v => (
                    <Badge key={v} variant="outline" className="text-[10px] mx-0.5 font-mono">{`{{${v}}}`}</Badge>
                  ))}</>
                : 'No variables for this template.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="edit">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="edit" className="gap-1.5"><Code className="h-3.5 w-3.5" />Edit</TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5"><Eye className="h-3.5 w-3.5" />Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description <span className="text-muted-foreground text-xs">(internal only)</span></Label>
                <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="What this email is for..." />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>HTML Body</Label>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { navigator.clipboard.writeText(formData.html_body); toast.success('Copied!'); }}>
                    <Copy className="h-3 w-3" />Copy
                  </Button>
                </div>
                <Textarea
                  value={formData.html_body}
                  onChange={e => setFormData({ ...formData, html_body: e.target.value })}
                  className="min-h-[300px] font-mono text-xs leading-relaxed"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <Label className="text-sm">Active</Label>
                  <p className="text-[11px] text-muted-foreground">Inactive templates won't send emails.</p>
                </div>
                <Switch checked={formData.is_active} onCheckedChange={checked => setFormData({ ...formData, is_active: checked })} />
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 border-b">
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="text-sm font-medium">{formData.subject}</p>
                </div>
                <div className="p-6">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(formData.html_body.replace(
                        /\{\{(\w+)\}\}/g,
                        '<span style="background:hsl(48 96% 89%);padding:2px 6px;border-radius:4px;font-weight:600;font-size:13px">[$1]</span>'
                      )),
                    }}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplate(null)}>Cancel</Button>
            <Button onClick={() => editTemplate && updateMutation.mutate({ id: editTemplate.id, ...formData })} disabled={updateMutation.isPending}>
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
            <DialogDescription>{previewSubject}</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 border-b">
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="text-sm font-medium">{previewSubject}</p>
            </div>
            <div className="p-6" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }} />
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
