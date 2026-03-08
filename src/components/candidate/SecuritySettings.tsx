import { useState, useEffect, forwardRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import {
  Shield, Key, Clock, Smartphone, Trash2, AlertTriangle, Loader2, Eye, EyeOff, LogOut,
  Mail, AtSign, CheckCircle2, XCircle, Info, Bell, BellRing, Lock, Fingerprint,
  ShieldCheck, ShieldAlert, ChevronRight, Check, Globe, Monitor, RefreshCw,
  UserX, ShieldOff, ArrowRight, Zap, Copy, ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PushNotificationToggle } from '@/components/candidate/PushNotificationToggle';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const TriggerButton = forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
  (props, ref) => <Button ref={ref} {...props} />
);

/* ── Password strength calculator ── */
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
  else if (score <= 3) { label = 'Fair'; color = 'text-amber-500'; barColor = 'bg-amber-500'; percent = 50; }
  else if (score <= 4) { label = 'Good'; color = 'text-primary'; barColor = 'bg-primary'; percent = 75; }
  else { label = 'Strong'; color = 'text-emerald-500'; barColor = 'bg-emerald-500'; percent = 100; }
  if (password.length === 0) { label = ''; percent = 0; }

  return { score, checks, label, color, barColor, percent };
};

/* ── Animated counter ── */
const AnimatedNumber = ({ value, suffix = '' }: { value: number; suffix?: string }) => (
  <motion.span
    key={value}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="tabular-nums"
  >
    {value}{suffix}
  </motion.span>
);

/* ── Security Score Hero — Redesigned ── */
const SecurityScoreHero = ({ score, total, checks }: { score: number; total: number; checks: { label: string; passed: boolean; icon: React.ElementType }[] }) => {
  const percentage = Math.round((score / total) * 100);
  const level = percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : percentage >= 40 ? 'Fair' : 'Needs Work';
  const levelColor = percentage >= 80 ? 'text-emerald-500' : percentage >= 60 ? 'text-primary' : percentage >= 40 ? 'text-amber-500' : 'text-destructive';
  const ringStroke = percentage >= 80 ? 'hsl(var(--chart-2))' : percentage >= 60 ? 'hsl(var(--primary))' : percentage >= 40 ? 'hsl(var(--chart-4))' : 'hsl(var(--destructive))';

  const failedChecks = checks.filter(c => !c.passed);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5"
    >
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/3 rounded-full -translate-y-1/3 translate-x-1/3 blur-2xl" />
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500/3 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl" />

      <div className="relative z-10 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Score ring */}
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-[88px] h-[88px] shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="7" opacity="0.3" />
                <motion.circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke={ringStroke}
                  strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={251}
                  initial={{ strokeDashoffset: 251 }}
                  animate={{ strokeDashoffset: 251 - (251 * percentage) / 100 }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-xl font-black', levelColor)}><AnimatedNumber value={percentage} suffix="%" /></span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg sm:text-xl font-extrabold text-foreground">Security Score</h2>
                <Badge variant="outline" className={cn('text-[10px] font-bold h-5 border-0 px-2', 
                  percentage >= 80 ? 'bg-emerald-500/10 text-emerald-500' :
                  percentage >= 60 ? 'bg-primary/10 text-primary' :
                  percentage >= 40 ? 'bg-amber-500/10 text-amber-500' :
                  'bg-destructive/10 text-destructive'
                )}>
                  {level}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className={cn('font-bold', levelColor)}>{score}</span> of {total} checks passed
              </p>

              {/* Quick action for failed items */}
              {failedChecks.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {failedChecks.slice(0, 2).map(c => (
                    <span key={c.label} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-destructive/8 text-destructive border border-destructive/10">
                      <XCircle className="w-3 h-3" /> {c.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Checklist column */}
          <div className="grid grid-cols-2 sm:flex sm:flex-col gap-1.5 sm:min-w-[180px]">
            {checks.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                  c.passed ? 'bg-emerald-500/8 text-foreground' : 'bg-muted/30 text-muted-foreground'
                )}
              >
                {c.passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/20 shrink-0" />
                )}
                <span className="font-medium truncate">{c.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Section Card ── */
const SectionCard = ({
  icon: Icon,
  title,
  description,
  children,
  variant = 'default',
  collapsible = false,
  defaultOpen = true,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
  collapsible?: boolean;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        'border overflow-hidden rounded-2xl shadow-sm',
        variant === 'danger' ? 'border-destructive/20' : 'border-border/40'
      )}>
        <button
          type="button"
          className={cn(
            'flex items-center gap-3 p-4 border-b w-full text-left transition-colors',
            variant === 'danger' ? 'border-destructive/20 bg-destructive/5 hover:bg-destructive/8' : 'border-border/30 bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/8',
            !collapsible && 'cursor-default'
          )}
          onClick={() => collapsible && setOpen(!open)}
        >
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
            variant === 'danger' ? 'bg-destructive/10' : 'bg-primary/10'
          )}>
            <Icon className={cn('w-[18px] h-[18px]', variant === 'danger' ? 'text-destructive' : 'text-primary')} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn('font-bold text-sm', variant === 'danger' ? 'text-destructive' : 'text-foreground')}>{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          {collapsible && (
            <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform shrink-0', open && 'rotate-90')} />
          )}
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={collapsible ? { height: 0, opacity: 0 } : false}
              animate={{ height: 'auto', opacity: 1 }}
              exit={collapsible ? { height: 0, opacity: 0 } : undefined}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="p-4 space-y-3">{children}</CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

/* ── Setting Row ── */
const SettingRow = ({
  icon: Icon, iconBg, iconColor, title, description, action, badge,
}: {
  icon: React.ElementType; iconBg: string; iconColor: string; title: string; description: string;
  action: React.ReactNode; badge?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/20 hover:bg-muted/35 transition-all duration-200 border border-border/20 group">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105', iconBg)}>
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

/* ── Quick Action Card ── */
const QuickActionCard = ({
  icon: Icon, title, description, onClick, variant = 'default', disabled = false,
}: {
  icon: React.ElementType; title: string; description: string;
  onClick: () => void; variant?: 'default' | 'primary'; disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 w-full group',
      variant === 'primary'
        ? 'bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/30'
        : 'bg-muted/20 border-border/30 hover:bg-muted/35',
      disabled && 'opacity-50 cursor-not-allowed'
    )}
  >
    <div className={cn(
      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
      variant === 'primary' ? 'bg-primary/10' : 'bg-muted/50'
    )}>
      <Icon className={cn('w-5 h-5', variant === 'primary' ? 'text-primary' : 'text-muted-foreground')} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
  </button>
);

/* ═══════════════════════════════════════
   ███  Main Component
   ═══════════════════════════════════════ */
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
  const [activeTab, setActiveTab] = useState('account');

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
    { label: 'Email verified', passed: !!user?.email_confirmed_at, icon: Mail },
    { label: 'Strong password', passed: true, icon: Key },
    { label: 'Email alerts', passed: emailNotifications, icon: Bell },
    { label: 'Push enabled', passed: false, icon: BellRing },
    { label: '2FA active', passed: false, icon: Fingerprint },
  ], [user, emailNotifications]);

  const securityScore = securityChecks.filter(c => c.passed).length;

  const toggleNotifPref = async (
    key: string, enabled: boolean,
    setter: (v: boolean) => void, loadingSetter: (v: boolean) => void,
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

  const formatRelative = (d: string | null) => {
    if (!d) return '';
    try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ''; }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Security Score Hero */}
      <SecurityScoreHero score={securityScore} total={securityChecks.length} checks={securityChecks} />

      {/* Quick Actions row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <QuickActionCard
          icon={Key}
          title="Change Password"
          description="Update your credentials"
          variant="primary"
          onClick={() => { setActiveTab('account'); setChangingPassword(true); }}
        />
        <QuickActionCard
          icon={Bell}
          title="Manage Alerts"
          description="Configure notifications"
          onClick={() => setActiveTab('notifications')}
        />
        <QuickActionCard
          icon={LogOut}
          title="Sign Out All"
          description="End all active sessions"
          onClick={async () => {
            await supabase.auth.signOut({ scope: 'global' });
            toast.success('Signed out from all sessions');
            navigate('/login');
          }}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
          <SectionCard icon={AtSign} title="Email Address" description="Primary email for your account and notifications">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {user?.email_confirmed_at ? (
                      <Badge variant="outline" className="text-[10px] h-5 border-0 bg-emerald-500/10 text-emerald-500 font-bold gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 border-0 bg-amber-500/10 text-amber-500 font-bold gap-1">
                        <XCircle className="w-3 h-3" /> Unverified
                      </Badge>
                    )}
                    {user?.email_confirmed_at && (
                      <span className="text-[10px] text-muted-foreground">
                        since {formatDate(user.email_confirmed_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {!changingEmail && (
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => setChangingEmail(true)}>
                  Change
                </Button>
              )}
            </div>
            <AnimatePresence>
              {changingEmail && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                  <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground">A confirmation link will be sent to both your current and new email addresses.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">New Email Address</Label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Enter new email" className="rounded-xl pl-9" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleChangeEmail} disabled={emailLoading} className="rounded-xl gap-1.5">
                      {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Update Email
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => { setChangingEmail(false); setNewEmail(''); }}>Cancel</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SectionCard>

          {/* Password */}
          <SectionCard icon={Key} title="Password" description="Keep your account secure with a strong password">
            <AnimatePresence mode="wait">
              {!changingPassword ? (
                <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">••••••••••</p>
                      <p className="text-xs text-muted-foreground">Last changed: Unknown</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => setChangingPassword(true)}>
                    <Key className="w-3.5 h-3.5" /> Change
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                  {/* New password */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="rounded-xl pl-9 pr-10"
                      />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-10 hover:bg-transparent" onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                    </div>

                    {/* Strength meter */}
                    {newPassword.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Password Strength</span>
                          <Badge variant="outline" className={cn(
                            'text-[10px] h-5 border-0 font-bold',
                            passwordStrength.color,
                            passwordStrength.percent >= 75 ? 'bg-emerald-500/10' :
                            passwordStrength.percent >= 50 ? 'bg-primary/10' :
                            passwordStrength.percent >= 25 ? 'bg-amber-500/10' : 'bg-destructive/10'
                          )}>
                            {passwordStrength.label}
                          </Badge>
                        </div>
                        <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                          <motion.div
                            className={cn('h-full rounded-full', passwordStrength.barColor)}
                            initial={{ width: 0 }}
                            animate={{ width: `${passwordStrength.percent}%` }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                          />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5">
                          {[
                            { key: 'length', label: '8+ characters' },
                            { key: 'uppercase', label: 'Uppercase letter' },
                            { key: 'lowercase', label: 'Lowercase letter' },
                            { key: 'number', label: 'Number' },
                            { key: 'special', label: 'Special character' },
                            { key: 'longEnough', label: '12+ characters' },
                          ].map(({ key, label }) => (
                            <div key={key} className="flex items-center gap-1.5 text-[11px]">
                              {passwordStrength.checks[key as keyof typeof passwordStrength.checks] ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-muted-foreground/20 shrink-0" />
                              )}
                              <span className={passwordStrength.checks[key as keyof typeof passwordStrength.checks] ? 'text-foreground font-medium' : 'text-muted-foreground/60'}>
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className={cn('rounded-xl pl-9 pr-10', passwordsMismatch && 'border-destructive focus-visible:ring-destructive', passwordsMatch && 'border-emerald-500 focus-visible:ring-emerald-500')}
                      />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-10 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                    </div>
                    <AnimatePresence>
                      {passwordsMismatch && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] text-destructive flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Passwords don't match
                        </motion.p>
                      )}
                      {passwordsMatch && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[11px] text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Passwords match
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={handleChangePassword} disabled={loading || !canSubmitPassword} className="rounded-xl gap-1.5">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Update Password
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => { setChangingPassword(false); setNewPassword(''); setConfirmPassword(''); }}>Cancel</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SectionCard>

          {/* 2FA */}
          <SectionCard icon={Fingerprint} title="Two-Factor Authentication" description="Extra verification step when signing in">
            <SettingRow
              icon={Smartphone}
              iconBg="bg-muted/50"
              iconColor="text-muted-foreground"
              title="Authenticator App"
              description="Use an app like Google Authenticator or Authy"
              badge={<Badge variant="outline" className="text-[10px] h-5 border-0 bg-muted/80 text-muted-foreground font-bold">Coming Soon</Badge>}
              action={<Lock className="w-4 h-4 text-muted-foreground/30" />}
            />
            <div className="flex items-start gap-2.5 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Why enable 2FA?</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Two-factor authentication adds a verification code requirement each time you sign in, protecting your account even if your password is compromised.
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Login Activity */}
          <SectionCard icon={Clock} title="Login Activity" description="Monitor recent account access">
            <div className="space-y-2">
              {[
                { icon: Monitor, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', label: 'Last Sign In', value: formatDate(user?.last_sign_in_at || null), sub: formatRelative(user?.last_sign_in_at || null) },
                { icon: Clock, iconBg: 'bg-primary/10', iconColor: 'text-primary', label: 'Account Created', value: formatDate(user?.created_at || null), sub: formatRelative(user?.created_at || null) },
                { icon: Mail, iconBg: user?.email_confirmed_at ? 'bg-emerald-500/10' : 'bg-amber-500/10', iconColor: user?.email_confirmed_at ? 'text-emerald-500' : 'text-amber-500', label: 'Email Verification', value: user?.email_confirmed_at ? formatDate(user.email_confirmed_at) : 'Not verified', sub: user?.email_confirmed_at ? formatRelative(user.email_confirmed_at) : 'Action required' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/20"
                >
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', item.iconBg)}>
                    <item.icon className={cn('w-4 h-4', item.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground font-medium">{item.label}</p>
                    <p className="text-sm font-bold text-foreground truncate">{item.value}</p>
                  </div>
                  {item.sub && (
                    <span className="text-[10px] text-muted-foreground shrink-0">{item.sub}</span>
                  )}
                </motion.div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="rounded-xl w-full gap-1.5 mt-1 text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
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
          {/* Summary card */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-muted/20 border border-border/30">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Notification Preferences</p>
              <p className="text-xs text-muted-foreground">Choose how you want to receive updates about your jobs, candidates, and interviews.</p>
            </div>
          </div>

          <SectionCard icon={Mail} title="Email Notifications" description="Receive updates in your inbox">
            <SettingRow
              icon={Mail}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              title="Email Alerts"
              description="Messages, tasks, interviews, and application updates"
              badge={
                <Badge variant="outline" className={cn('text-[10px] h-5 border-0 font-bold', emailNotifications ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground')}>
                  {emailNotifications ? 'Active' : 'Off'}
                </Badge>
              }
              action={<Switch checked={emailNotifications} onCheckedChange={(v) => toggleNotifPref('email_notifications_enabled', v, setEmailNotifications, setLoadingEmailPref)} disabled={loadingEmailPref} />}
            />
            {!emailNotifications && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  You won't receive email notifications about new applications, interview requests, or messages.
                </p>
              </motion.div>
            )}
          </SectionCard>

          <SectionCard icon={BellRing} title="Browser Push Notifications" description="Instant alerts in your browser window">
            <PushNotificationToggle />
          </SectionCard>

          <SectionCard icon={Smartphone} title="Mobile Notifications" description="Stay updated on the go">
            <SettingRow
              icon={Smartphone}
              iconBg="bg-emerald-500/10"
              iconColor="text-emerald-500"
              title="WhatsApp Notifications"
              description="Interview reminders and application updates via WhatsApp"
              badge={
                <Badge variant="outline" className={cn('text-[10px] h-5 border-0 font-bold', whatsappNotifications ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground')}>
                  {whatsappNotifications ? 'Active' : 'Off'}
                </Badge>
              }
              action={<Switch checked={whatsappNotifications} onCheckedChange={(v) => toggleNotifPref('whatsapp_notifications_enabled', v, setWhatsappNotifications, setLoadingWhatsappPref)} disabled={loadingWhatsappPref} />}
            />
            <SettingRow
              icon={Mail}
              iconBg="bg-amber-500/10"
              iconColor="text-amber-500"
              title="SMS Notifications"
              description="Critical alerts via text messages"
              badge={
                <Badge variant="outline" className={cn('text-[10px] h-5 border-0 font-bold', smsNotifications ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground')}>
                  {smsNotifications ? 'Active' : 'Off'}
                </Badge>
              }
              action={<Switch checked={smsNotifications} onCheckedChange={(v) => toggleNotifPref('sms_notifications_enabled', v, setSmsNotifications, setLoadingSmsPref)} disabled={loadingSmsPref} />}
            />
          </SectionCard>
        </TabsContent>

        {/* ── Danger Tab ── */}
        <TabsContent value="danger" className="space-y-4 mt-4">
          {/* Warning banner */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/5 border border-destructive/15">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-destructive">Caution Required</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Actions in this section are permanent or have significant consequences. Please read carefully before proceeding.
              </p>
            </div>
          </div>

          <SectionCard icon={UserX} title="Deactivate Account" description="Temporarily hide your profile and jobs" variant="danger">
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { label: 'Your profile will be hidden from search', icon: EyeOff },
                  { label: 'Active jobs will be paused', icon: Clock },
                  { label: 'You can reactivate anytime by logging back in', icon: RefreshCw },
                  { label: 'Your data will be preserved', icon: Shield },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <TriggerButton variant="outline" size="sm" className="text-destructive border-destructive/30 rounded-xl w-full sm:w-auto gap-1.5">
                    <ShieldOff className="w-3.5 h-3.5" /> Deactivate Account
                  </TriggerButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <UserX className="w-5 h-5 text-destructive" /> Deactivate Account?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Your profile will be hidden from all users. Active job listings will be paused. You can reactivate by logging in again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Keep Account</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeactivateAccount} className="bg-destructive hover:bg-destructive/90 rounded-xl gap-1.5">
                      {deactivating && <Loader2 className="w-4 h-4 animate-spin" />} Deactivate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </SectionCard>

          <SectionCard icon={Trash2} title="Delete Account" description="Permanently remove your account and all data" variant="danger">
            <div className="space-y-3">
              <div className="p-3 bg-destructive/8 rounded-xl border border-destructive/15 space-y-2">
                <p className="text-xs font-bold text-destructive">This action is irreversible. You will lose:</p>
                <ul className="space-y-1.5">
                  {[
                    'All job listings and applicant data',
                    'Messages and conversation history',
                    'Company profile and verification status',
                    'Subscription and billing data',
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <XCircle className="w-3 h-3 text-destructive shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <TriggerButton variant="destructive" size="sm" className="rounded-xl gap-1.5 w-full sm:w-auto">
                    <Trash2 className="w-3.5 h-3.5" /> Delete Account Permanently
                  </TriggerButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                      <Trash2 className="w-5 h-5" /> Delete Account Permanently?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. All your data including jobs, applications, messages, and company profile will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90 rounded-xl"
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
                      I understand, delete everything
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
