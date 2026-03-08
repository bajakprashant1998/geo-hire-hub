import { useState, useEffect, forwardRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, Key, Clock, Smartphone, Trash2, AlertTriangle, Loader2, Eye, EyeOff, LogOut, Mail, AtSign, CheckCircle2, XCircle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Forward ref wrapper for AlertDialogTrigger buttons
const TriggerButton = forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
  (props, ref) => <Button ref={ref} {...props} />
);

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0, 0, 0.2, 1] as const }
  })
};

// Password strength calculator
const getPasswordStrength = (password: string) => {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    longEnough: password.length >= 12,
  };
  if (checks.length) score += 1;
  if (checks.uppercase) score += 1;
  if (checks.lowercase) score += 1;
  if (checks.number) score += 1;
  if (checks.special) score += 1;
  if (checks.longEnough) score += 1;

  let label = 'Too weak';
  let color = 'bg-destructive';
  let percent = 0;
  if (score <= 2) { label = 'Weak'; color = 'bg-destructive'; percent = 25; }
  else if (score <= 3) { label = 'Fair'; color = 'bg-orange-500'; percent = 50; }
  else if (score <= 4) { label = 'Good'; color = 'bg-yellow-500'; percent = 75; }
  else { label = 'Strong'; color = 'bg-green-500'; percent = 100; }

  if (password.length === 0) { label = ''; percent = 0; }

  return { score, checks, label, color, percent };
};

export const SecuritySettings = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [deactivating, setDeactivating] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [whatsappNotifications, setWhatsappNotifications] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [loadingEmailPref, setLoadingEmailPref] = useState(false);
  const [loadingWhatsappPref, setLoadingWhatsappPref] = useState(false);
  const [loadingSmsPref, setLoadingSmsPref] = useState(false);

  // Email change state
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  // Load notification preferences
  useEffect(() => {
    if (!user) return;
    supabase
      .from('notification_preferences')
      .select('email_notifications_enabled, whatsapp_notifications_enabled, sms_notifications_enabled')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEmailNotifications(data.email_notifications_enabled);
          setWhatsappNotifications((data as any).whatsapp_notifications_enabled ?? false);
          setSmsNotifications((data as any).sms_notifications_enabled ?? false);
        }
      });
  }, [user]);

  const handleEmailNotificationToggle = async (enabled: boolean) => {
    if (!user) return;
    setLoadingEmailPref(true);
    setEmailNotifications(enabled);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: user.id, email_notifications_enabled: enabled }, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success(enabled ? 'Email notifications enabled' : 'Email notifications disabled');
    } catch {
      setEmailNotifications(!enabled);
      toast.error('Failed to update preference');
    } finally {
      setLoadingEmailPref(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      toast.error('Password must contain at least one uppercase letter and one number');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
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

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (newEmail === user?.email) {
      toast.error('New email must be different from current email');
      return;
    }

    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success('Confirmation email sent to your new address. Please verify to complete the change.');
      setChangingEmail(false);
      setNewEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    setDeactivating(true);
    try {
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
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const canSubmitPassword = newPassword.length >= 8 && passwordsMatch && passwordStrength.score >= 3;

  return (
    <div className="space-y-5">
      {/* Email Notification Preferences */}
      <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
        <Card className="shadow-google">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Email Notifications
            </CardTitle>
            <CardDescription>Control email notifications for dashboard events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive email alerts for new messages, task assignments, and application updates
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={emailNotifications ? "default" : "secondary"}>
                  {emailNotifications ? 'Enabled' : 'Disabled'}
                </Badge>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={handleEmailNotificationToggle}
                  disabled={loadingEmailPref}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Push Notifications */}
      <motion.div custom={0.45} variants={cardVariants} initial="hidden" animate="visible">
        <Card className="shadow-google">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Browser Push Notifications
            </CardTitle>
            <CardDescription>Get real-time alerts in your browser</CardDescription>
          </CardHeader>
          <CardContent>
            <PushNotificationToggle />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div custom={0.5} variants={cardVariants} initial="hidden" animate="visible">
        <Card className="shadow-google">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              WhatsApp & SMS Notifications
            </CardTitle>
            <CardDescription>Get instant alerts on your phone</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
              <div>
                <p className="font-medium">WhatsApp Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive interview reminders and application updates via WhatsApp
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={whatsappNotifications ? "default" : "secondary"}>
                  {whatsappNotifications ? 'Enabled' : 'Disabled'}
                </Badge>
                <Switch
                  checked={whatsappNotifications}
                  onCheckedChange={async (enabled) => {
                    setLoadingWhatsappPref(true);
                    setWhatsappNotifications(enabled);
                    try {
                      const { error } = await supabase
                        .from('notification_preferences')
                        .upsert({ user_id: user!.id, whatsapp_notifications_enabled: enabled } as any, { onConflict: 'user_id' });
                      if (error) throw error;
                      toast.success(enabled ? 'WhatsApp notifications enabled' : 'WhatsApp notifications disabled');
                    } catch {
                      setWhatsappNotifications(!enabled);
                      toast.error('Failed to update preference');
                    } finally {
                      setLoadingWhatsappPref(false);
                    }
                  }}
                  disabled={loadingWhatsappPref}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive text message alerts for critical updates
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={smsNotifications ? "default" : "secondary"}>
                  {smsNotifications ? 'Enabled' : 'Disabled'}
                </Badge>
                <Switch
                  checked={smsNotifications}
                  onCheckedChange={async (enabled) => {
                    setLoadingSmsPref(true);
                    setSmsNotifications(enabled);
                    try {
                      const { error } = await supabase
                        .from('notification_preferences')
                        .upsert({ user_id: user!.id, sms_notifications_enabled: enabled } as any, { onConflict: 'user_id' });
                      if (error) throw error;
                      toast.success(enabled ? 'SMS notifications enabled' : 'SMS notifications disabled');
                    } catch {
                      setSmsNotifications(!enabled);
                      toast.error('Failed to update preference');
                    } finally {
                      setLoadingSmsPref(false);
                    }
                  }}
                  disabled={loadingSmsPref}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Update Email */}
      <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
        <Card className="shadow-google">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AtSign className="w-5 h-5 text-primary" />
              Email Address
            </CardTitle>
            <CardDescription>Change the email associated with your account</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Current email: <span className="font-semibold text-foreground">{user?.email}</span>
            </p>
            <AnimatePresence mode="wait">
              {!changingEmail ? (
                <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Button onClick={() => setChangingEmail(true)} variant="outline" className="rounded-xl">
                    Change Email
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>New Email Address</Label>
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter new email address"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleChangeEmail} disabled={emailLoading} className="rounded-xl">
                      {emailLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Update Email
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => { setChangingEmail(false); setNewEmail(''); }}>
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Password Change */}
      <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
        <Card className="shadow-google">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Password
            </CardTitle>
            <CardDescription>Change your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {!changingPassword ? (
                <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Button onClick={() => setChangingPassword(true)} variant="outline" className="rounded-xl">
                    Change Password
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="rounded-xl pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>

                    {/* Password Strength Meter */}
                    {newPassword.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Password strength</span>
                          <Badge variant="outline" className="text-xs">
                            {passwordStrength.label}
                          </Badge>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${passwordStrength.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${passwordStrength.percent}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 mt-2">
                          {[
                            { key: 'length', label: '8+ characters' },
                            { key: 'uppercase', label: 'Uppercase letter' },
                            { key: 'lowercase', label: 'Lowercase letter' },
                            { key: 'number', label: 'Number' },
                            { key: 'special', label: 'Special character' },
                          ].map(({ key, label }) => (
                            <div key={key} className="flex items-center gap-1.5 text-xs">
                              {passwordStrength.checks[key as keyof typeof passwordStrength.checks] ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                              )}
                              <span className={passwordStrength.checks[key as keyof typeof passwordStrength.checks] ? 'text-foreground' : 'text-muted-foreground'}>
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className={`rounded-xl pr-10 ${passwordsMismatch ? 'border-destructive focus-visible:ring-destructive' : ''} ${passwordsMatch ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {passwordsMismatch && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Passwords do not match
                      </motion.p>
                    )}
                    {passwordsMatch && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                      </motion.p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleChangePassword} disabled={loading || !canSubmitPassword} className="rounded-xl">
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Update Password
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => {
                      setChangingPassword(false);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}>
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Two-Factor Authentication */}
      <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible">
        <Card className="shadow-google">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>Add an extra layer of security to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Use an authenticator app for additional security
                </p>
              </div>
              <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                Coming Soon
              </Badge>
            </div>
            <div className="flex items-start gap-2 mt-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Two-factor authentication adds an extra security layer by requiring a verification code from your authenticator app each time you sign in.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Login Activity */}
      <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible">
        <Card className="shadow-google">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Login Activity
            </CardTitle>
            <CardDescription>Review your recent account activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Last Login</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(user?.last_sign_in_at || null)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Account Created</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(user?.created_at || null)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Email Verified</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email_confirmed_at ? formatDate(user.email_confirmed_at) : 'Not verified'}
                    </p>
                  </div>
                </div>
                {user?.email_confirmed_at ? (
                  <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/15">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-orange-600">
                    Pending
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sign Out All Sessions */}
      <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible">
        <Card className="shadow-google">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-primary" />
              Active Sessions
            </CardTitle>
            <CardDescription>Manage your active sessions across devices</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              If you suspect unauthorized access, sign out from all sessions to secure your account.
            </p>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={async () => {
                await supabase.auth.signOut({ scope: 'global' });
                toast.success('Signed out from all sessions');
                navigate('/login');
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out All Sessions
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div custom={6} variants={cardVariants} initial="hidden" animate="visible">
        <Card className="shadow-google border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions — proceed with caution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-xl">
              <div>
                <p className="font-medium">Deactivate Account</p>
                <p className="text-sm text-muted-foreground">
                  Temporarily hide your profile and stop notifications
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <TriggerButton variant="outline" className="text-destructive border-destructive/50 rounded-xl">
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

            <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-xl">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <TriggerButton variant="destructive" className="rounded-xl">
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
                      onClick={async () => {
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          if (!session) { toast.error('Not authenticated'); return; }
                          const res = await fetch(
                            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
                            {
                              method: 'POST',
                              headers: {
                                Authorization: `Bearer ${session.access_token}`,
                                'Content-Type': 'application/json',
                              },
                            }
                          );
                          if (!res.ok) throw new Error('Failed to delete account');
                          toast.success('Account deleted successfully');
                          await signOut();
                          navigate('/');
                        } catch (err: any) {
                          toast.error(err.message || 'Failed to delete account');
                        }
                      }}
                    >
                      I understand, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
