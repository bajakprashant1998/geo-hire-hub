import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, Briefcase, Users, Mail, Eye, EyeOff, User, MapPin, Phone, Building2,
  Upload, X, Loader2, CheckCircle2, AlertCircle, FileText, Lock, Shield, MessageCircle,
  Sparkles, TrendingUp, Globe2, Award, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useGeolocation } from '@/hooks/useGeolocation';
import { motion, AnimatePresence } from 'framer-motion';
import { SEOHead } from '@/components/SEOHead';
import { InternationalPhoneInput } from '@/components/InternationalPhoneInput';

const SECTORS = [
  'Accounting & Auditing', 'Aerospace & Defense', 'Agriculture & Farming',
  'Architecture & Design', 'Automotive', 'Aviation & Airlines',
  'Banking & Financial Services', 'Biotechnology', 'Chemical & Petrochemical',
  'Construction & Infrastructure', 'Consulting & Advisory', 'E-Commerce',
  'Education & Training', 'Energy & Utilities', 'Engineering',
  'Entertainment & Media', 'Environmental Services', 'Fashion & Apparel',
  'Food & Beverage', 'Government & Public Sector', 'Healthcare & Pharmaceuticals',
  'Hospitality & Tourism', 'Human Resources & Staffing', 'Information Technology',
  'Insurance', 'Legal Services', 'Logistics & Supply Chain', 'Manufacturing',
  'Marketing & Advertising', 'Mining & Metals', 'NGO & Non-Profit', 'Oil & Gas',
  'Printing & Publishing', 'Real Estate & Property', 'Retail & Wholesale',
  'Security Services', 'Shipping & Maritime', 'Sports & Fitness',
  'Telecommunications', 'Textiles', 'Transportation', 'Travel & Leisure', 'Other',
];

const Signup = () => {
  const navigate = useNavigate();
  const geolocation = useGeolocation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [whatsappNumber, setWhatsappNumber] = useState('+91 ');
  const [sector, setSector] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [userType, setUserType] = useState<'candidate' | 'employer'>('candidate');
  const [locationCaptured, setLocationCaptured] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (!geolocation.loading && geolocation.latitude && geolocation.longitude) {
      setLocationCaptured(true);
    }
  }, [geolocation]);

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return { score: score * 20, label: 'Weak', color: 'bg-destructive' };
    if (score <= 3) return { score: score * 20, label: 'Fair', color: 'bg-warning' };
    if (score <= 4) return { score: score * 20, label: 'Good', color: 'bg-primary' };
    return { score: 100, label: 'Strong', color: 'bg-[hsl(var(--success))]' };
  }, [password]);

  const completionPercent = useMemo(() => {
    let filled = 0;
    const total = userType === 'employer' ? 7 : 6;
    if (firstName) filled++;
    if (lastName) filled++;
    if (email) filled++;
    if (password && confirmPassword) filled++;
    if (phone.replace(/\D/g, '').length > 3) filled++;
    if (userType === 'employer' && organizationName) filled++;
    if (termsAccepted) filled++;
    return Math.round((filled / total) * 100);
  }, [firstName, lastName, email, password, confirmPassword, phone, organizationName, userType, termsAccepted]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ['.doc', '.docx', '.pdf'];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!validTypes.includes(extension)) { toast.error('Please upload a .doc, .docx, or .pdf file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('File size should be less than 5MB'); return; }
    setResumeFile(file);
    toast.success('Resume uploaded successfully!');
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      sessionStorage.setItem('preferred_role', userType);
      const { error } = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
        extraParams: { prompt: 'select_account' },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Google signup failed');
      setGoogleLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Password must be at least 8 characters long'); return; }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) { toast.error('Password must contain at least one uppercase letter and one number'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    const phoneDigits = phone.replace(/[^\d]/g, '');
    if (phoneDigits.length > 3 && (phoneDigits.length < 7 || phoneDigits.length > 15)) {
      toast.error('Please enter a valid phone number (7-15 digits)'); return;
    }
    if (!termsAccepted) { toast.error('Please accept the Terms and Conditions'); return; }

    setLoading(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName, user_type: userType, phone: phone.trim(),
            whatsapp_number: whatsappNumber.trim(), sector,
            ...(userType === 'employer' ? { organization_name: organizationName } : {}),
          },
        },
      });
      if (error) throw error;
      const user = data?.user;
      if (user && geolocation.latitude && geolocation.longitude) {
        await supabase.from('profiles').update({
          latitude: geolocation.latitude, longitude: geolocation.longitude,
        }).eq('user_id', user.id);
      }
      sessionStorage.setItem('pendingVerificationEmail', email);
      toast.success('Account created! Please check your inbox for the verification link.');
      navigate('/verify-email');
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const candidatePerks = [
    { icon: MapPin, title: 'Location Matching', desc: 'Jobs near you' },
    { icon: Sparkles, title: 'AI Resume Builder', desc: 'Stand out instantly' },
    { icon: TrendingUp, title: 'Career Tracking', desc: 'Monitor progress' },
    { icon: Zap, title: 'Auto Apply', desc: 'Save your time' },
  ];

  const employerPerks = [
    { icon: Globe2, title: 'Global Talent Pool', desc: 'Find the best fit' },
    { icon: Award, title: 'Verified Profiles', desc: 'Quality candidates' },
    { icon: Sparkles, title: 'AI Screening', desc: 'Smart shortlisting' },
    { icon: TrendingUp, title: 'Hiring Analytics', desc: 'Data-driven hiring' },
  ];

  const perks = userType === 'employer' ? employerPerks : candidatePerks;

  const inputClass = "h-11 pl-10 text-sm border-border/50 rounded-xl bg-background/50 focus:bg-background focus:border-primary/50 transition-all duration-200";
  const labelClass = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";
  const iconClass = (id: string) => `absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${focusedField === id ? 'text-primary' : 'text-muted-foreground'}`;

  return (
    <div className="min-h-screen flex">
      <SEOHead title="Sign Up | HireForJob" description="Create your HireForJob account. Join as a job seeker or employer to find opportunities and talent near you." canonicalUrl="https://www.hireforjob.com/signup" />

      {/* Left side - Premium Branding */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/50 via-transparent to-transparent" />

        {/* Animated orbs - pointer-events-none to prevent blocking */}
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.15, 0.08] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-16 left-8 w-80 h-80 bg-white rounded-full blur-[100px] pointer-events-none" />
        <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.06, 0.12, 0.06] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }} className="absolute bottom-16 right-8 w-96 h-96 bg-white rounded-full blur-[120px] pointer-events-none" />
        <motion.div animate={{ y: [0, -20, 0], opacity: [0.04, 0.1, 0.04] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }} className="absolute top-1/2 left-1/3 w-64 h-64 bg-white rounded-full blur-[80px] pointer-events-none" />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        <div className="relative z-10 flex flex-col justify-start gap-10 px-12 xl:px-16 py-10 w-full">
          {/* Logo */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg shadow-black/10">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-2xl text-white tracking-tight">Hire for Job</span>
            </div>
          </motion.div>

          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="space-y-8">
            <div>
              <AnimatePresence mode="wait">
                <motion.h1
                  key={userType}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.1] tracking-tight"
                >
                  {userType === 'candidate' ? (
                    <>Launch Your<br /><span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">Dream Career</span><br />Today</>
                  ) : (
                    <>Find Your<br /><span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">Perfect Hire</span><br />Faster</>
                  )}
                </motion.h1>
              </AnimatePresence>
              <p className="text-lg text-white/70 mt-6 max-w-lg leading-relaxed">
                {userType === 'candidate'
                  ? 'Create your profile in minutes and let AI match you with the best opportunities near you.'
                  : 'Post jobs, discover verified talent, and hire smarter with our AI-powered platform.'
                }
              </p>
            </div>

            {/* Feature pills - animated per userType */}
            <AnimatePresence mode="wait">
              <motion.div
                key={userType}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 gap-3"
              >
                {perks.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                      <f.icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{f.title}</p>
                      <p className="text-xs text-white/60">{f.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Testimonial / social proof */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-6 py-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-white/70" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} className="w-3.5 h-3.5 text-yellow-300 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <p className="text-sm text-white/80 italic leading-relaxed">
              "I found my dream job within a week of signing up. The location-based matching is a game-changer!"
            </p>
            <p className="text-xs text-white/50 mt-2 font-medium">— Priya S., Software Engineer</p>
          </motion.div>
        </div>
      </div>

      {/* Right side - Signup Form */}
      <div className="w-full lg:w-[55%] flex items-start justify-center p-6 sm:p-8 lg:p-10 bg-background overflow-y-auto relative">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/3 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-xl space-y-5 relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group text-sm">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to map
          </Link>

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-2">
            <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight">Hire for Job</span>
          </div>

          {/* Form card */}
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-7 space-y-5 shadow-xl shadow-black/5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Create your account</h2>
                <p className="mt-1 text-sm text-muted-foreground">Join and discover your perfect match</p>
              </div>
              {/* Completion badge */}
              <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5">
                <div className="relative w-8 h-8">
                  <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-border/30" />
                    <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="stroke-primary" strokeDasharray={`${completionPercent * 0.94} 100`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">{completionPercent}%</span>
                </div>
              </div>
            </div>

            {/* User type toggle */}
            <div className="flex bg-muted/50 rounded-xl p-1">
              {[
                { type: 'candidate' as const, icon: Users, label: 'Job Seeker' },
                { type: 'employer' as const, icon: Briefcase, label: 'Employer' },
              ].map((tab) => (
                <button
                  key={tab.type}
                  type="button"
                  onClick={() => setUserType(tab.type)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${userType === tab.type
                    ? 'bg-background text-foreground shadow-md shadow-black/5'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Google Sign Up */}
            <Button
              type="button" variant="outline"
              className="w-full h-12 text-sm font-medium border-2 gap-3 rounded-xl hover:bg-muted/50 transition-all duration-200 hover:shadow-md"
              onClick={handleGoogleSignup} disabled={googleLoading}
            >
              {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card/60 px-3 text-muted-foreground font-medium tracking-wider">or</span>
              </div>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              {/* Section: Personal Info */}
              <div className="flex items-center gap-2 pt-1">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal Information</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className={labelClass}>First Name <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <User className={iconClass('firstName')} />
                    <Input id="firstName" type="text" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} onFocus={() => setFocusedField('firstName')} onBlur={() => setFocusedField(null)} className={inputClass} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className={labelClass}>Last Name <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <User className={iconClass('lastName')} />
                    <Input id="lastName" type="text" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} onFocus={() => setFocusedField('lastName')} onBlur={() => setFocusedField(null)} className={inputClass} required />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className={labelClass}>Email Address <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Mail className={iconClass('email')} />
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} className={inputClass} required />
                </div>
              </div>

              {/* Section: Security */}
              <div className="flex items-center gap-2 pt-2">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Security</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${focusedField === 'password' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className="h-11 pl-10 pr-10 text-sm border-border/50 rounded-xl bg-background/50 focus:bg-background focus:border-primary/50 transition-all duration-200" minLength={6} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Confirm <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${focusedField === 'confirmPassword' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                      className="h-11 pl-10 pr-10 text-sm border-border/50 rounded-xl bg-background/50 focus:bg-background focus:border-primary/50 transition-all duration-200" minLength={6} required />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password strength */}
              <AnimatePresence>
                {password && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${passwordStrength.color}`} style={{ width: `${passwordStrength.score}%` }} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground w-12">{passwordStrength.label}</span>
                    </div>
                    {passwordStrength.score < 60 && (
                      <p className="text-[11px] text-muted-foreground">Use 8+ chars, uppercase, number & special char</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Section: Contact */}
              <div className="flex items-center gap-2 pt-2">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> Phone
                  </Label>
                  <InternationalPhoneInput value={phone} onChange={setPhone} placeholder="81234 56789" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MessageCircle className="w-3 h-3" /> WhatsApp
                  </Label>
                  <InternationalPhoneInput value={whatsappNumber} onChange={setWhatsappNumber} placeholder="WhatsApp number" />
                </div>
              </div>

              {/* Employer-specific fields */}
              <AnimatePresence>
                {userType === 'employer' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 pt-2">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Organization</span>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="organizationName" className={labelClass}>Company Name <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Building2 className={iconClass('organizationName')} />
                        <Input id="organizationName" type="text" placeholder="Your company name" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} onFocus={() => setFocusedField('organizationName')} onBlur={() => setFocusedField(null)} className={inputClass} required={userType === 'employer'} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Industry Select */}
              <div className="space-y-1.5">
                <Label htmlFor="sector" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Industry
                </Label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger className="h-11 border-border/50 rounded-xl bg-background/50">
                    <SelectValue placeholder="Choose your industry" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {SECTORS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resume Upload - Candidate Only */}
              <AnimatePresence>
                {userType === 'candidate' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resume</Label>
                    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all duration-300 ${isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : resumeFile ? 'border-[hsl(var(--success))] bg-[hsl(var(--success))]/5' : 'border-border/50 hover:border-primary/40 hover:bg-muted/30'}`}>
                      {resumeFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[hsl(var(--success))]/10 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-[hsl(var(--success))]" />
                          </div>
                          <span className="text-sm font-medium truncate max-w-[200px]">{resumeFile.name}</span>
                          <button type="button" onClick={() => setResumeFile(null)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors">
                            <X className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Drop your resume or{' '}
                            <button type="button" onClick={() => document.getElementById('resumeInput')?.click()} className="text-primary font-medium hover:underline">browse</button>
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">Max 5MB • .doc, .docx, .pdf</p>
                        </>
                      )}
                      <input id="resumeInput" type="file" accept=".doc,.docx,.pdf" onChange={handleFileChange} className="hidden" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Location status */}
              <div className={`p-3 rounded-xl flex items-center gap-3 transition-all text-sm ${locationCaptured ? 'bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20' : geolocation.loading ? 'bg-warning/10 border border-warning/20' : 'bg-muted/30 border border-border/50'}`}>
                {geolocation.loading ? <Loader2 className="w-4 h-4 text-warning animate-spin" /> : locationCaptured ? <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" /> : <AlertCircle className="w-4 h-4 text-muted-foreground" />}
                <span className={`flex-1 text-sm ${locationCaptured ? 'text-[hsl(var(--success))]' : geolocation.loading ? 'text-warning' : 'text-muted-foreground'}`}>
                  {geolocation.loading ? 'Detecting location...' : locationCaptured ? 'Location captured' : 'Enable location for map placement'}
                </span>
                <MapPin className={`w-4 h-4 ${locationCaptured ? 'text-[hsl(var(--success))]' : 'text-muted-foreground'}`} />
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked as boolean)} className="mt-0.5" />
                <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" className="text-primary hover:text-primary/80 font-medium transition-colors">Terms</Link>{' '}and{' '}
                  <Link to="/privacy" className="text-primary hover:text-primary/80 font-medium transition-colors">Privacy Policy</Link>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                disabled={loading}
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating account...
                    </motion.div>
                  ) : (
                    <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      Create Account
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </form>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-5 pt-1">
              {[
                { icon: Shield, label: 'SSL Secured' },
                { icon: CheckCircle2, label: 'Data Protected' },
              ].map((badge) => (
                <div key={badge.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <badge.icon className="w-3.5 h-3.5 text-primary/70" />
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:text-primary/80 transition-colors">Sign in</Link>
          </p>

          <p className="text-center text-xs text-muted-foreground/70 pb-8">
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-foreground transition-colors">Terms</Link>{' '}and{' '}
            <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
