import { useState, useEffect, forwardRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Shield, Key, Clock, Smartphone, Trash2, AlertTriangle, Loader2, Eye, EyeOff, LogOut,
  Mail, AtSign, CheckCircle2, XCircle, Info, Bell, BellRing, Lock, Fingerprint,
  ShieldCheck, ShieldAlert, ChevronRight, Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PushNotificationToggle } from '@/components/candidate/PushNotificationToggle';
import { cn } from '@/lib/utils';

const TriggerButton = forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
  (props, ref) => <Button ref={ref} {...props} />
);

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
  let color = 'text-destructive';
  let barColor = 'bg-destructive';
  let percent = 0;
  if (score <= 2) { label = 'Weak'; percent = 25; }
  else if (score <= 3) { label = 'Fair'; color = 'text-warning-foreground'; barColor = 'bg-warning'; percent = 50; }
  else if (score <= 4) { label = 'Good'; color = 'text-primary'; barColor = 'bg-primary'; percent = 75; }
  else { label = 'Strong'; color = 'text-success'; barColor = 'bg-success'; percent = 100; }
  if (password.length === 0) { label = ''; percent = 0; }

  return { score, checks, label, color, barColor, percent };
};

/* ── Security Score Hero ── */
const SecurityScoreHero = ({ score, checks }: { score: number; checks: { label: string; passed: boolean }[] }) => {
  const percentage = Math.round((score / checks.length) * 100);
  const level = percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : percentage >= 40 ? 'Fair' : 'Needs Attention';
  const levelColor = percentage >= 80 ? 'text-success' : percentage >= 60 ? 'text-primary' : percentage >= 40 ? 'text-warning-foreground' : 'text-destructive';
  const LevelIcon = percentage >= 60 ? ShieldCheck : ShieldAlert;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-success/5 border border-border/50 p-5 sm:p-6"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <motion.circle
                cx="50" cy="50" r="42" fill="none"
                stroke={percentage >= 80 ? 'hsl(var(--success))' : percentage >= 60 ? 'hsl(var(--primary))' : 'hsl(var(--warning))'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={264}
                initial={{ strokeDashoffset: 264 }}
                animate={{ strokeDashoffset: 264 - (264 * percentage) / 100 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <LevelIcon className={cn('w-7 h-7', levelColor)} />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Security Score</p>
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">{level}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className={cn('font-bold', levelColor)}>{score}</span> of {checks.length} security checks passed
            </p>
          </div>
        </div>

        {/* Quick checks */}
        <div className="flex flex-wrap gap-1.5 sm:flex-col sm:gap-1 sm:items-end">
          {checks.slice(0, 4).map(c => (
            <div key={c.label} className="flex items-center gap-1.5 text-xs">
              {c.passed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              )}
              <span className={c.passed ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/* ── Setting Row ── */
const SettingRow = ({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  action,
  badge,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  action: React.ReactNode;
  badge?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors border border-border/20">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-foreground">{title}</p>
          {badge}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
    <div className="shrink-0 ml-3">{action}</div>
  </div>
);

/* ── Section Card ── */
const SectionCard = ({
  icon: Icon,
  title,
  description,
  children,
  variant = 'default',
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}) => (
  <Card className={cn(
    'border overflow-hidden rounded-2xl',
    variant === 'danger' ? 'border-destructive/20' : 'border-border/40'
  )}>
    <div className={cn(
      'flex items-center gap-3 p-4 border-b',
      variant === 'danger' ? 'border-destructive/20 bg-destructive/5' : 'border-border/30 bg-gradient-to-r from-primary/5 to-transparent'
    )}>
      <div className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center',
        variant === 'danger' ? 'bg-destructive/10' : 'bg-primary/10'
      )}>
        <Icon className={cn('w-4.5 h-4.5', variant === 'danger' ? 'text-destructive' : 'text-primary')} />
      </div>
      <div>
        <h3 className={cn('font-bold text-sm', variant === 'danger' ? 'text-destructive' : 'text-foreground')}>{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <CardContent className="p-4 space-y-3">{children}</CardContent>
  </Card>
);

/* ── Main Component ── */
export const SecuritySettings = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [changingPassword, setChangingPassword] = useState(false);
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
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmitPassword = newPassword.length >= 8 && passwordsMatch && passwordStrength.score >= 3;

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

  const securityChecks = useMemo(() => [
    { label: 'Email verified', passed: !!user?.email_confirmed_at },
    { label: 'Strong password', passed: true },
    { label: 'Email alerts on', passed: emailNotifications },
    { label: 'Push notifications', passed: false },
    { label: '2FA enabled', passed: false },
  ], [user, emailNotifications]);

  const securityScore = securityChecks.filter(c => c.passed).length;

  const toggleNotifPref = async (
    key: string,
    enabled: boolean,
    setter: (v: boolean) => void,
    loadingSetter: (v: boolean) => void,
  ) => {
    if (!user) return;
    loadingSetter(true);
    setter(enabled);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({ user_id: user.id, [key]: enabled } as any, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success(`${enabled ? 'Enabled' : 'Disabled'} successfully`);
    } catch {
      setter(!enabled);
      toast.error('Failed to update preference');
    } finally {
      loadingSetter(false);
    }
  };

  const handleChangePassword = async () => {
    if (!canSubmitPassword) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password changed successfully');
      setChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) { toast.error('Please enter a valid email'); return; }
    if (newEmail === user?.email) { toast.error('Must be different from current email'); return; }
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success('Confirmation email sent. Please verify to complete.');
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
      const { error } = await supabase.from('profiles').update({ is_visible_on_map: false }).eq('user_id', user?.id);
      if (error) throw error;
      toast.success('Account deactivated');
      await signOut();
      navigate('/');
    } catch { toast.error('Failed to deactivate account'); }
    finally { setDeactivating(false); }
  };

  const formatDate = (d: string | null) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-5">
      {/* Security Score */}
      <SecurityScoreHero score={securityScore} checks={securityChecks} />

      {/* Tabs */}
      <Tabs defaultValue="account">
        <TabsList className="w-full grid grid-cols-3 h-11 bg-muted/30 rounded-xl p-1">
          <TabsTrigger value="account" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
            <Shield className="w-4 h-4" /> Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
            <Bell className="w-4 h-4" /> Alerts
          </TabsTrigger>
          <TabsTrigger value="danger" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5 text-destructive data-[state=active]:text-destructive">
            <AlertTriangle className="w-4 h-4" /> Danger
          </TabsTrigger>
        </TabsList>

        {/* ── Account Tab ── */}
        <TabsContent value="account" className="space-y-4 mt-4">
          {/* Email */}
          <SectionCard icon={AtSign} title="Email Address" description="Change the email associated with your account">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  {user?.email_confirmed_at ? (
                    <><CheckCircle2 className="w-3 h-3 text-success" /> Verified</>
                  ) : (
                    <><XCircle className="w-3 h-3 text-warning-foreground" /> Not verified</>
                  )}
                </p>
              </div>
              {!changingEmail && (
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setChangingEmail(true)}>
                  Change
                </Button>
              )}
            </div>
            <AnimatePresence>
              {changingEmail && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">New Email</Label>
                    <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Enter new email" className="rounded-xl" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleChangeEmail} disabled={emailLoading} className="rounded-xl gap-1.5">
                      {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Update
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setChangingEmail(false); setNewEmail(''); }}>Cancel</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SectionCard>

          {/* Password */}
          <SectionCard icon={Key} title="Password" description="Change your account password">
            <AnimatePresence mode="wait">
              {!changingPassword ? (
                <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setChangingPassword(true)}>
                    Change Password
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">New Password</Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="rounded-xl pr-10"
                      />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>

                    {newPassword.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Strength</span>
                          <Badge variant="outline" className={cn('text-[10px] h-5 border-0', passwordStrength.color, passwordStrength.color.replace('text-', 'bg-') + '/10')}>
                            {passwordStrength.label}
                          </Badge>
                        </div>
                        <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                          <motion.div
                            className={cn('h-full rounded-full', passwordStrength.barColor)}
                            initial={{ width: 0 }}
                            animate={{ width: `${passwordStrength.percent}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            { key: 'length', label: '8+ characters' },
                            { key: 'uppercase', label: 'Uppercase' },
                            { key: 'lowercase', label: 'Lowercase' },
                            { key: 'number', label: 'Number' },
                            { key: 'special', label: 'Special char' },
                          ].map(({ key, label }) => (
                            <div key={key} className="flex items-center gap-1 text-[11px]">
                              {passwordStrength.checks[key as keyof typeof passwordStrength.checks] ? (
                                <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                              ) : (
                                <XCircle className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                              )}
                              <span className={passwordStrength.checks[key as keyof typeof passwordStrength.checks] ? 'text-foreground' : 'text-muted-foreground/50'}>{label}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className={cn('rounded-xl pr-10', passwordsMismatch && 'border-destructive', passwordsMatch && 'border-success')}
                      />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    {passwordsMismatch && <p className="text-[11px] text-destructive flex items-center gap-1"><XCircle className="w-3 h-3" /> Passwords don't match</p>}
                    {passwordsMatch && <p className="text-[11px] text-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Passwords match</p>}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleChangePassword} disabled={loading || !canSubmitPassword} className="rounded-xl gap-1.5">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Update
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setChangingPassword(false); setNewPassword(''); setConfirmPassword(''); }}>Cancel</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SectionCard>

          {/* 2FA */}
          <SectionCard icon={Fingerprint} title="Two-Factor Authentication" description="Add an extra layer of security">
            <SettingRow
              icon={Smartphone}
              iconBg="bg-muted/50"
              iconColor="text-muted-foreground"
              title="Authenticator App"
              description="Use an app like Google Authenticator"
              badge={<Badge variant="outline" className="text-[10px] h-5 border-0 bg-muted text-muted-foreground">Coming Soon</Badge>}
              action={<Lock className="w-4 h-4 text-muted-foreground/40" />}
            />
            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                2FA adds a verification code requirement each time you sign in, protecting against unauthorized access.
              </p>
            </div>
          </SectionCard>

          {/* Login Activity */}
          <SectionCard icon={Clock} title="Login Activity" description="Review recent account activity">
            {[
              { icon: CheckCircle2, iconBg: 'bg-success/10', iconColor: 'text-success', label: 'Last Login', value: formatDate(user?.last_sign_in_at || null) },
              { icon: Clock, iconBg: 'bg-primary/10', iconColor: 'text-primary', label: 'Account Created', value: formatDate(user?.created_at || null) },
              { icon: Mail, iconBg: 'bg-muted/50', iconColor: 'text-muted-foreground', label: 'Email Verified', value: user?.email_confirmed_at ? formatDate(user.email_confirmed_at) : 'Not verified' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/20">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', item.iconBg)}>
                  <item.icon className={cn('w-4 h-4', item.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium text-foreground">{item.value}</p>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl w-full gap-1.5 mt-1"
              onClick={async () => {
                await supabase.auth.signOut({ scope: 'global' });
                toast.success('Signed out from all sessions');
                navigate('/login');
              }}
            >
              <LogOut className="w-4 h-4" /> Sign Out All Sessions
            </Button>
          </SectionCard>
        </TabsContent>

        {/* ── Notifications Tab ── */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <SectionCard icon={Mail} title="Email Notifications" description="Control email alerts for dashboard events">
            <SettingRow
              icon={Mail}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              title="Email Alerts"
              description="Messages, tasks, and application updates"
              badge={<Badge variant="outline" className={cn('text-[10px] h-5 border-0', emailNotifications ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>{emailNotifications ? 'On' : 'Off'}</Badge>}
              action={<Switch checked={emailNotifications} onCheckedChange={(v) => toggleNotifPref('email_notifications_enabled', v, setEmailNotifications, setLoadingEmailPref)} disabled={loadingEmailPref} />}
            />
          </SectionCard>

          <SectionCard icon={BellRing} title="Browser Push Notifications" description="Real-time alerts in your browser">
            <PushNotificationToggle />
          </SectionCard>

          <SectionCard icon={Smartphone} title="WhatsApp & SMS" description="Get instant alerts on your phone">
            <SettingRow
              icon={Smartphone}
              iconBg="bg-success/10"
              iconColor="text-success"
              title="WhatsApp Notifications"
              description="Interview reminders and application updates"
              badge={<Badge variant="outline" className={cn('text-[10px] h-5 border-0', whatsappNotifications ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>{whatsappNotifications ? 'On' : 'Off'}</Badge>}
              action={<Switch checked={whatsappNotifications} onCheckedChange={(v) => toggleNotifPref('whatsapp_notifications_enabled', v, setWhatsappNotifications, setLoadingWhatsappPref)} disabled={loadingWhatsappPref} />}
            />
            <SettingRow
              icon={Mail}
              iconBg="bg-warning/10"
              iconColor="text-warning-foreground"
              title="SMS Notifications"
              description="Text message alerts for critical updates"
              badge={<Badge variant="outline" className={cn('text-[10px] h-5 border-0', smsNotifications ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>{smsNotifications ? 'On' : 'Off'}</Badge>}
              action={<Switch checked={smsNotifications} onCheckedChange={(v) => toggleNotifPref('sms_notifications_enabled', v, setSmsNotifications, setLoadingSmsPref)} disabled={loadingSmsPref} />}
            />
          </SectionCard>
        </TabsContent>

        {/* ── Danger Tab ── */}
        <TabsContent value="danger" className="space-y-4 mt-4">
          <SectionCard icon={AlertTriangle} title="Danger Zone" description="Irreversible actions — proceed with caution" variant="danger">
            <div className="flex items-center justify-between p-3.5 border border-destructive/15 rounded-xl">
              <div>
                <p className="text-sm font-bold text-foreground">Deactivate Account</p>
                <p className="text-xs text-muted-foreground">Temporarily hide your profile</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <TriggerButton variant="outline" size="sm" className="text-destructive border-destructive/30 rounded-xl">Deactivate</TriggerButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deactivate Account?</AlertDialogTitle>
                    <AlertDialogDescription>Your profile will be hidden. You can reactivate by logging in again.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeactivateAccount} className="bg-destructive hover:bg-destructive/90">
                      {deactivating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Deactivate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex items-center justify-between p-3.5 border border-destructive/15 rounded-xl">
              <div>
                <p className="text-sm font-bold text-foreground">Delete Account</p>
                <p className="text-xs text-muted-foreground">Permanently delete all data</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <TriggerButton variant="destructive" size="sm" className="rounded-xl gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </TriggerButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Account Permanently?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone. All data will be permanently deleted.</AlertDialogDescription>
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
                            { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } }
                          );
                          if (!res.ok) throw new Error('Failed');
                          toast.success('Account deleted');
                          await signOut();
                          navigate('/');
                        } catch (err: any) { toast.error(err.message || 'Failed to delete account'); }
                      }}
                    >
                      I understand, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};
