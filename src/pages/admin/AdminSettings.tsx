import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActionLogTable } from '@/components/admin/ActionLogTable';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save,
  Shield,
  Eye,
  Briefcase,
  ToggleLeft,
  Bot,
  Chrome,
  Search,
  Settings2,
  History,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

interface Setting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string | null;
}

interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description: string | null;
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/40 last:border-0">
      <div className="min-w-0 flex-1">
        <Label className="font-medium text-sm">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SaveButton({
  onClick,
  isPending,
  label = 'Save Changes',
}: {
  onClick: () => void;
  isPending: boolean;
  label?: string;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={isPending}
      size="sm"
      className="mt-3 gap-2"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Save className="h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  );
}

function SettingsCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-64" />
        <div className="space-y-3 pt-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Record<string, Record<string, unknown>>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('settings');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_settings').select('*');
      if (error) throw error;
      const settingsMap: Record<string, Record<string, unknown>> = {};
      (data as Setting[]).forEach((s) => {
        settingsMap[s.key] = s.value as Record<string, unknown>;
      });
      setLocalSettings(settingsMap);
      return data as Setting[];
    },
  });

  const { data: featureFlags, isLoading: flagsLoading } = useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('feature_flags').select('*').order('key');
      if (error) throw error;
      return data as FeatureFlag[];
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('admin_settings')
        .update({ value: value as unknown as null, updated_at: new Date().toISOString() })
        .eq('key', key);
      if (error) throw error;
      await supabase.rpc('log_admin_action', {
        p_action_type: 'update',
        p_target_type: 'setting',
        p_target_id: key,
        p_details: value as unknown as null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Settings saved successfully', { icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> });
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  const toggleFlagMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from('feature_flags').update({ enabled }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      toast.success('Feature flag updated');
    },
    onError: (error) => {
      toast.error('Failed to update flag: ' + error.message);
    },
  });

  const updateLocalSetting = (key: string, field: string, value: unknown) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const saveSettings = (key: string) => {
    if (localSettings[key]) {
      updateSettingMutation.mutate({ key, value: localSettings[key] });
    }
  };

  // Filter feature flags by search
  const filteredFlags = useMemo(() => {
    if (!featureFlags) return [];
    if (!searchQuery.trim()) return featureFlags;
    const q = searchQuery.toLowerCase();
    return featureFlags.filter(
      (f) =>
        f.key.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q))
    );
  }, [featureFlags, searchQuery]);

  // Determine which settings sections match search
  const sectionMatches = useMemo(() => {
    if (!searchQuery.trim()) return { google: true, ai: true, resume: true, job: true, employer: true };
    const q = searchQuery.toLowerCase();
    return {
      google: ['google', 'oauth', 'sign-in', 'candidate', 'employer', 'account'].some((k) => k.includes(q) || q.includes(k)),
      ai: ['ai', 'verification', 'auto', 'approval', 'trust', 'score', 'business'].some((k) => k.includes(q) || q.includes(k)),
      resume: ['resume', 'visibility', 'contact', 'applied'].some((k) => k.includes(q) || q.includes(k)),
      job: ['job', 'moderation', 'approval', 'expire', 'posting'].some((k) => k.includes(q) || q.includes(k)),
      employer: ['employer', 'verification', 'tax', 'document'].some((k) => k.includes(q) || q.includes(k)),
    };
  }, [searchQuery]);

  const resumeSettings = localSettings['resume_visibility'] || {};
  const jobSettings = localSettings['job_moderation'] || {};
  const employerSettings = localSettings['employer_verification'] || {};
  const aiVerificationSettings = localSettings['ai_verification'] || {};
  const googleOAuthSettings = localSettings['google_oauth'] || {
    enabled_for_candidates: true,
    enabled_for_employers: true,
    force_account_select: true,
  };

  const enabledFlagsCount = featureFlags?.filter((f) => f.enabled).length || 0;
  const totalFlagsCount = featureFlags?.length || 0;

  if (isLoading) {
    return (
      <AdminLayout title="Settings">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <SettingsCardSkeleton key={i} />
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings">
      <div className="space-y-5">
        {/* Header Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Platform Configuration</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage feature flags, security policies, and platform behavior
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
              <Sparkles className="h-3 w-3" />
              {enabledFlagsCount}/{totalFlagsCount} flags active
            </Badge>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="settings" className="gap-1.5 text-xs">
              <Settings2 className="h-3.5 w-3.5" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="flags" className="gap-1.5 text-xs">
              <ToggleLeft className="h-3.5 w-3.5" />
              Feature Flags
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5 text-xs">
              <History className="h-3.5 w-3.5" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          {/* ───── Settings Tab ───── */}
          <TabsContent value="settings" className="mt-4 space-y-4">
            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search settings…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <AnimatePresence mode="popLayout">
              {/* Google OAuth */}
              {sectionMatches.google && (
                <motion.div key="google" variants={cardVariants} initial="hidden" animate="visible" exit="hidden" custom={0}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Chrome className="h-4 w-4 text-primary" />
                        </div>
                        Google Sign-In
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Control Google OAuth for candidates and employers
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-0">
                      <SettingRow label="Enable for Candidates" description="Allow candidates to sign in / sign up with Google">
                        <Switch
                          checked={googleOAuthSettings.enabled_for_candidates as boolean}
                          onCheckedChange={(checked) => updateLocalSetting('google_oauth', 'enabled_for_candidates', checked)}
                        />
                      </SettingRow>
                      <SettingRow label="Enable for Employers" description="Allow employers to sign in / sign up with Google">
                        <Switch
                          checked={googleOAuthSettings.enabled_for_employers as boolean}
                          onCheckedChange={(checked) => updateLocalSetting('google_oauth', 'enabled_for_employers', checked)}
                        />
                      </SettingRow>
                      <SettingRow label="Force Account Selection" description="Always show Google account picker (recommended)">
                        <Switch
                          checked={googleOAuthSettings.force_account_select as boolean}
                          onCheckedChange={(checked) => updateLocalSetting('google_oauth', 'force_account_select', checked)}
                        />
                      </SettingRow>
                      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground mt-3">
                        <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          Custom Google OAuth Credentials
                        </p>
                        <p>To use your own Google Client ID & Secret for <strong>hireforjob.com</strong> branding, go to Lovable Cloud → Users → Authentication Settings → Google.</p>
                      </div>
                      <SaveButton onClick={() => saveSettings('google_oauth')} isPending={updateSettingMutation.isPending} label="Save OAuth Settings" />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* AI Verification */}
              {sectionMatches.ai && (
                <motion.div key="ai" variants={cardVariants} initial="hidden" animate="visible" exit="hidden" custom={1}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-violet-500" />
                        </div>
                        AI Employer Verification
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Configure AI-driven auto-approval system for employers
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-0">
                      <SettingRow label="Auto Approval Enabled" description="Automatically approve employers with high trust scores">
                        <Switch
                          checked={aiVerificationSettings.auto_approval_enabled as boolean}
                          onCheckedChange={(checked) => updateLocalSetting('ai_verification', 'auto_approval_enabled', checked)}
                        />
                      </SettingRow>
                      <SettingRow label="Google Business Mandatory" description="Require Google Business Profile for verification">
                        <Switch
                          checked={aiVerificationSettings.google_business_mandatory as boolean}
                          onCheckedChange={(checked) => updateLocalSetting('ai_verification', 'google_business_mandatory', checked)}
                        />
                      </SettingRow>
                      <SettingRow label="Documents Mandatory" description="Require document uploads for AI verification">
                        <Switch
                          checked={aiVerificationSettings.documents_mandatory as boolean}
                          onCheckedChange={(checked) => updateLocalSetting('ai_verification', 'documents_mandatory', checked)}
                        />
                      </SettingRow>
                      <div className="pt-3 border-t border-border/40">
                        <Label className="text-sm font-medium">Minimum Auto-Approve Score</Label>
                        <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                          Employers scoring at or above this threshold will be auto-approved
                        </p>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            value={aiVerificationSettings.min_auto_approve_score as number || 80}
                            onChange={(e) => updateLocalSetting('ai_verification', 'min_auto_approve_score', parseInt(e.target.value) || 80)}
                            className="w-24 h-9 text-sm"
                            min={50}
                            max={100}
                          />
                          <Badge variant="outline" className="text-[10px]">
                            {(aiVerificationSettings.min_auto_approve_score as number) || 80}/100
                          </Badge>
                        </div>
                      </div>
                      <SaveButton onClick={() => saveSettings('ai_verification')} isPending={updateSettingMutation.isPending} />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Resume Visibility */}
              {sectionMatches.resume && (
                <motion.div key="resume" variants={cardVariants} initial="hidden" animate="visible" exit="hidden" custom={2}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                          <Eye className="h-4 w-4 text-sky-500" />
                        </div>
                        Resume Visibility
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Control global resume visibility rules for candidates
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-0">
                      <SettingRow label="Require Employer Approval" description="Employers must be approved before viewing resumes">
                        <Switch
                          checked={resumeSettings.require_employer_approval as boolean}
                          onCheckedChange={(checked) => updateLocalSetting('resume_visibility', 'require_employer_approval', checked)}
                        />
                      </SettingRow>
                      <SettingRow label="Hide Contact Until Applied" description="Contact info hidden until candidate applies to a job">
                        <Switch
                          checked={resumeSettings.hide_contact_until_applied as boolean}
                          onCheckedChange={(checked) => updateLocalSetting('resume_visibility', 'hide_contact_until_applied', checked)}
                        />
                      </SettingRow>
                      <SaveButton onClick={() => saveSettings('resume_visibility')} isPending={updateSettingMutation.isPending} />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Job Moderation */}
              {sectionMatches.job && (
                <motion.div key="job" variants={cardVariants} initial="hidden" animate="visible" exit="hidden" custom={3}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Briefcase className="h-4 w-4 text-amber-500" />
                        </div>
                        Job Moderation
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Configure job posting moderation rules
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-0">
                      <SettingRow label="Require Admin Approval" description="All jobs require admin approval before going live">
                        <Switch
                          checked={jobSettings.require_approval as boolean}
                          onCheckedChange={(checked) => updateLocalSetting('job_moderation', 'require_approval', checked)}
                        />
                      </SettingRow>
                      <div className="pt-3 border-t border-border/40">
                        <Label className="text-sm font-medium">Auto-Expire Days</Label>
                        <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                          Jobs automatically expire after this many days
                        </p>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            value={jobSettings.auto_expire_days as number || 30}
                            onChange={(e) => updateLocalSetting('job_moderation', 'auto_expire_days', parseInt(e.target.value) || 30)}
                            className="w-24 h-9 text-sm"
                          />
                          <span className="text-xs text-muted-foreground">days</span>
                        </div>
                      </div>
                      <SaveButton onClick={() => saveSettings('job_moderation')} isPending={updateSettingMutation.isPending} />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Employer Verification */}
              {sectionMatches.employer && (
                <motion.div key="employer" variants={cardVariants} initial="hidden" animate="visible" exit="hidden" custom={4}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Shield className="h-4 w-4 text-emerald-500" />
                        </div>
                        Employer Verification
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Requirements for employer verification
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-0">
                      <SettingRow label="Require Tax ID" description="Employers must provide VAT/GST/Tax ID for verification">
                        <Switch
                          checked={employerSettings.require_tax_id as boolean}
                          onCheckedChange={(checked) => updateLocalSetting('employer_verification', 'require_tax_id', checked)}
                        />
                      </SettingRow>
                      <SettingRow label="Require Documents" description="Require office photo and business card for verification">
                        <Switch
                          checked={employerSettings.require_documents as boolean}
                          onCheckedChange={(checked) => updateLocalSetting('employer_verification', 'require_documents', checked)}
                        />
                      </SettingRow>
                      <SaveButton onClick={() => saveSettings('employer_verification')} isPending={updateSettingMutation.isPending} />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* No results */}
              {searchQuery.trim() &&
                !sectionMatches.google &&
                !sectionMatches.ai &&
                !sectionMatches.resume &&
                !sectionMatches.job &&
                !sectionMatches.employer && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                    <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No settings match "{searchQuery}"</p>
                  </motion.div>
                )}
            </AnimatePresence>
          </TabsContent>

          {/* ───── Feature Flags Tab ───── */}
          <TabsContent value="flags" className="mt-4 space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search feature flags…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ToggleLeft className="h-5 w-5 text-primary" />
                  Feature Flags
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {enabledFlagsCount} active
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">Toggle platform features on or off instantly</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {flagsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredFlags.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No flags match your search</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {filteredFlags.map((flag, i) => (
                      <motion.div
                        key={flag.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between py-3 gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {flag.key
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </span>
                            <Badge
                              variant={flag.enabled ? 'default' : 'secondary'}
                              className="text-[9px] px-1.5 py-0"
                            >
                              {flag.enabled ? 'ON' : 'OFF'}
                            </Badge>
                          </div>
                          {flag.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{flag.description}</p>
                          )}
                        </div>
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={(checked) => toggleFlagMutation.mutate({ id: flag.id, enabled: checked })}
                          disabled={toggleFlagMutation.isPending}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ───── Audit Log Tab ───── */}
          <TabsContent value="audit" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-5 w-5 text-primary" />
                  Admin Activity Log
                </CardTitle>
                <CardDescription className="text-xs">
                  Complete audit trail of all admin actions
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ActionLogTable limit={50} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
