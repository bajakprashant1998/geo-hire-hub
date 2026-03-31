import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Lock, Eye, EyeOff, MapPin, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { isPasswordLeaked } from '@/lib/passwordCheck';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/SEOHead';

const UpdatePassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsValidSession(true);
      }
      setCheckingSession(false);
    };

    checkSession();

    // Listen for auth state changes (recovery flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error('Password must contain at least one uppercase letter and one number');
      return;
    }

    setLoading(true);

    try {
      // Check for leaked password
      const leaked = await isPasswordLeaked(password);
      if (leaked) {
        setLoading(false);
        toast.error('This password has appeared in a data breach. Please choose a different password for your security.');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      toast.success('Password updated successfully!');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Verifying session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute inset-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.08, scale: 1 }}
            transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
            className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.06, scale: 1 }}
            transition={{ duration: 1.5, delay: 0.6, ease: "easeOut" }}
            className="absolute top-1/2 left-1/3 w-64 h-64 bg-white rounded-full blur-3xl"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <span className="font-bold text-3xl text-white">Hire for Job</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
              Secure Your
              <br />
              <span className="text-white/90">Account</span>
            </h1>

            <p className="text-lg text-white/80 mb-12 max-w-md">
              Create a strong password to protect your account and keep your information safe.
            </p>

            {/* Security tips */}
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <span className="text-white/90">Use 6+ characters</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <span className="text-white/90">Mix letters, numbers & symbols</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <span className="text-white/90">Avoid common words</span>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary/50 to-transparent" />
      </div>

      {/* Right side - Update Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Back button */}
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to login
          </Link>

          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-2xl">Hire for Job</span>
          </div>

          {!isValidSession ? (
            /* Invalid/Expired Session */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-6"
            >
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-10 h-10 text-destructive" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Link expired</h2>
                <p className="text-muted-foreground">
                  This password reset link has expired or is invalid.
                </p>
              </div>
              <Link to="/forgot-password">
                <Button className="w-full h-12 text-base font-semibold">
                  Request New Link
                </Button>
              </Link>
            </motion.div>
          ) : success ? (
            /* Success State */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-6"
            >
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Password updated!</h2>
                <p className="text-muted-foreground">
                  Your password has been successfully updated.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Redirecting to login...
                </p>
              </div>
              <Link to="/login">
                <Button className="w-full h-12 text-base font-semibold">
                  Go to Login
                </Button>
              </Link>
            </motion.div>
          ) : (
            /* Update Password Form */
            <>
              {/* Header */}
              <div>
                <h2 className="text-3xl font-bold text-foreground">Set new password</h2>
                <p className="mt-2 text-muted-foreground">
                  Create a strong password for your account
                </p>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pl-12 pr-12 text-base border-2 focus:border-primary transition-colors"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 pl-12 pr-12 text-base border-2 focus:border-primary transition-colors"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Password strength indicator */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      <div className={`h-1.5 flex-1 rounded-full transition-colors ${password.length >= 6 ? 'bg-green-500' : 'bg-border'}`} />
                      <div className={`h-1.5 flex-1 rounded-full transition-colors ${password.length >= 8 ? 'bg-green-500' : 'bg-border'}`} />
                      <div className={`h-1.5 flex-1 rounded-full transition-colors ${password.length >= 10 && /[0-9]/.test(password) ? 'bg-green-500' : 'bg-border'}`} />
                      <div className={`h-1.5 flex-1 rounded-full transition-colors ${password.length >= 12 && /[!@#$%^&*]/.test(password) ? 'bg-green-500' : 'bg-border'}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {password.length < 6 ? 'Too short' : password.length < 8 ? 'Weak' : password.length < 10 ? 'Good' : 'Strong'}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 transition-all duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Updating...
                    </div>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default UpdatePassword;
