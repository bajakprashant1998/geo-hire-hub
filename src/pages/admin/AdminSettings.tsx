import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ActionLogTable } from '@/components/admin/ActionLogTable';
import { 
  Save,
  Shield,
  Eye,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';

interface Setting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string | null;
}

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Record<string, Record<string, unknown>>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*');
      if (error) throw error;
      
      const settingsMap: Record<string, Record<string, unknown>> = {};
      (data as Setting[]).forEach(s => {
        settingsMap[s.key] = s.value as Record<string, unknown>;
      });
      setLocalSettings(settingsMap);
      return data as Setting[];
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
        p_details: value as unknown as null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Settings saved');
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });

  const updateLocalSetting = (key: string, field: string, value: unknown) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const saveSettings = (key: string) => {
    if (localSettings[key]) {
      updateSettingMutation.mutate({ key, value: localSettings[key] });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Settings">
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </AdminLayout>
    );
  }

  const resumeSettings = localSettings['resume_visibility'] || {};
  const jobSettings = localSettings['job_moderation'] || {};
  const employerSettings = localSettings['employer_verification'] || {};

  return (
    <AdminLayout title="Settings">
      <div className="space-y-6">
        {/* Resume Visibility Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Resume Visibility
            </CardTitle>
            <CardDescription>
              Control global resume visibility rules for candidates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Employer Approval</Label>
                <p className="text-sm text-muted-foreground">
                  Employers must be approved before viewing resumes
                </p>
              </div>
              <Switch
                checked={resumeSettings.require_employer_approval as boolean}
                onCheckedChange={(checked) => 
                  updateLocalSetting('resume_visibility', 'require_employer_approval', checked)
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Hide Contact Until Applied</Label>
                <p className="text-sm text-muted-foreground">
                  Contact info hidden until candidate applies to a job
                </p>
              </div>
              <Switch
                checked={resumeSettings.hide_contact_until_applied as boolean}
                onCheckedChange={(checked) => 
                  updateLocalSetting('resume_visibility', 'hide_contact_until_applied', checked)
                }
              />
            </div>
            <Button 
              onClick={() => saveSettings('resume_visibility')}
              disabled={updateSettingMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Job Moderation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Moderation
            </CardTitle>
            <CardDescription>
              Configure job posting moderation rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Admin Approval</Label>
                <p className="text-sm text-muted-foreground">
                  All jobs require admin approval before going live
                </p>
              </div>
              <Switch
                checked={jobSettings.require_approval as boolean}
                onCheckedChange={(checked) => 
                  updateLocalSetting('job_moderation', 'require_approval', checked)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Auto-Expire Days</Label>
              <p className="text-sm text-muted-foreground">
                Jobs automatically expire after this many days
              </p>
              <Input
                type="number"
                value={jobSettings.auto_expire_days as number || 30}
                onChange={(e) => 
                  updateLocalSetting('job_moderation', 'auto_expire_days', parseInt(e.target.value) || 30)
                }
                className="w-32"
              />
            </div>
            <Button 
              onClick={() => saveSettings('job_moderation')}
              disabled={updateSettingMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Employer Verification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Employer Verification
            </CardTitle>
            <CardDescription>
              Requirements for employer verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Tax ID</Label>
                <p className="text-sm text-muted-foreground">
                  Employers must provide VAT/GST/Tax ID for verification
                </p>
              </div>
              <Switch
                checked={employerSettings.require_tax_id as boolean}
                onCheckedChange={(checked) => 
                  updateLocalSetting('employer_verification', 'require_tax_id', checked)
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Documents</Label>
                <p className="text-sm text-muted-foreground">
                  Require office photo and business card for verification
                </p>
              </div>
              <Switch
                checked={employerSettings.require_documents as boolean}
                onCheckedChange={(checked) => 
                  updateLocalSetting('employer_verification', 'require_documents', checked)
                }
              />
            </div>
            <Button 
              onClick={() => saveSettings('employer_verification')}
              disabled={updateSettingMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Activity Log</CardTitle>
            <CardDescription>
              Complete audit trail of all admin actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionLogTable limit={50} />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
