import { useState, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, Key, Clock, Smartphone, Trash2, AlertTriangle, Loader2, Eye, EyeOff, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Forward ref wrapper for AlertDialogTrigger buttons
const TriggerButton = forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
  (props, ref) => <Button ref={ref} {...props} />
);

export const SecuritySettings = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('Password changed successfully');
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    setDeactivating(true);
    try {
      // Update profile to mark as deactivated
      const { error } = await supabase
        .from('profiles')
        .update({ is_visible_on_map: false })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Account deactivated. You can reactivate by logging in again.');
      await signOut();
      navigate('/');
    } catch (error) {
      toast.error('Failed to deactivate account');
    } finally {
      setDeactivating(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <Card className="shadow-google">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Password
          </CardTitle>
          <CardDescription>Change your account password</CardDescription>
        </CardHeader>
        <CardContent>
          {!changingPassword ? (
            <Button onClick={() => setChangingPassword(true)} variant="outline">
              Change Password
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleChangePassword} disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update Password
                </Button>
                <Button variant="outline" onClick={() => setChangingPassword(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card className="shadow-google">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div>
              <p className="font-medium">Enable 2FA</p>
              <p className="text-sm text-muted-foreground">
                Use an authenticator app for additional security
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <Switch 
                checked={twoFactorEnabled} 
                onCheckedChange={(checked) => {
                  setTwoFactorEnabled(checked);
                  toast.info(checked ? '2FA setup coming soon' : '2FA disabled');
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Login Activity */}
      <Card className="shadow-google">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Login Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div>
                <p className="font-medium">Last Login</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(user?.last_sign_in_at || null)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div>
                <p className="font-medium">Account Created</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(user?.created_at || null)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out All Sessions */}
      <Card className="shadow-google">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="w-5 h-5 text-primary" />
            Active Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            onClick={async () => {
              await supabase.auth.signOut({ scope: 'global' });
              toast.success('Signed out from all sessions');
              navigate('/login');
            }}
          >
            Sign Out All Sessions
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="shadow-google border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg">
            <div>
              <p className="font-medium">Deactivate Account</p>
              <p className="text-sm text-muted-foreground">
                Temporarily hide your profile and stop notifications
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <TriggerButton variant="outline" className="text-destructive border-destructive/50">
                  Deactivate
                </TriggerButton>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate Account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your profile will be hidden from employers and you won't receive notifications. 
                    You can reactivate your account by logging in again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeactivateAccount}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deactivating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Deactivate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <TriggerButton variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </TriggerButton>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account Permanently?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All your data including applications, 
                    messages, and saved jobs will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={() => toast.info('Account deletion requires contacting support')}
                  >
                    I understand, delete my account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
