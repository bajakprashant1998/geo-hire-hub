import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Briefcase,
  Users,
  Mail,
  Eye,
  EyeOff,
  User,
  MapPin,
  Phone,
  Building2,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useGeolocation } from '@/hooks/useGeolocation';

const SECTORS = [
  'Information Technology',
  'Healthcare',
  'Finance & Banking',
  'Education',
  'Manufacturing',
  'Retail',
  'Media & Entertainment',
  'Construction',
  'Hospitality',
  'Transportation',
  'Real Estate',
  'Agriculture',
  'Energy',
  'Telecommunications',
  'Other',
];

const Signup = () => {
  const navigate = useNavigate();
  const geolocation = useGeolocation();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [sector, setSector] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'candidate' | 'employer'>('candidate');
  const [locationCaptured, setLocationCaptured] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!geolocation.loading && geolocation.latitude && geolocation.longitude) {
      setLocationCaptured(true);
    }
  }, [geolocation]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ['.doc', '.docx', '.pdf'];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(extension)) {
      toast.error('Please upload a .doc, .docx, or .pdf file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }
    
    setResumeFile(file);
    toast.success('Resume uploaded successfully!');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!termsAccepted) {
      toast.error('Please accept the Terms and Conditions');
      return;
    }

    setLoading(true);

    try {
      const fullName = `${firstName} ${lastName}`.trim();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            user_type: userType,
            phone: `${countryCode}${phone}`,
            sector,
            ...(userType === 'employer' ? { organization_name: organizationName } : {}),
          },
        },
      });

      if (error) throw error;

      // Update profile with location
      if (data.user && geolocation.latitude && geolocation.longitude) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            latitude: geolocation.latitude,
            longitude: geolocation.longitude,
          })
          .eq('user_id', data.user.id);

        if (updateError) {
          console.error('Failed to update location:', updateError);
        }
      }

      toast.success('Account created! Welcome to Hire for Job.');
      navigate('/profile-setup');
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 to-background">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to map
        </Link>
      </div>

      <div className="container mx-auto px-4 pb-12">
        <div className="max-w-2xl mx-auto">
          {/* Signup Card */}
          <Card className="shadow-2xl border-0 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-8 text-center border-b">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                SIGNUP TO YOUR ACCOUNT
              </h1>
              <p className="text-primary font-medium flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                Choose your Account Type
              </p>
            </div>

            <CardContent className="p-6 md:p-8">
              {/* User Type Selector */}
              <div className="flex justify-center gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => setUserType('candidate')}
                  className={`relative flex flex-col items-center p-6 rounded-2xl border-2 transition-all duration-300 flex-1 max-w-[200px] group ${
                    userType === 'candidate'
                      ? 'border-primary bg-gradient-to-b from-primary/10 to-primary/5 shadow-lg shadow-primary/10'
                      : 'border-border hover:border-primary/50 hover:shadow-md'
                  }`}
                >
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 ${
                      userType === 'candidate' 
                        ? 'bg-primary text-primary-foreground shadow-lg' 
                        : 'bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                    }`}
                  >
                    <Users className="w-8 h-8" />
                  </div>
                  <span
                    className={`font-bold text-lg transition-colors ${
                      userType === 'candidate' ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  >
                    Candidate
                  </span>
                  <span className="text-xs text-muted-foreground text-center mt-2 leading-relaxed">
                    I want to discover awesome companies.
                  </span>
                  {userType === 'candidate' && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setUserType('employer')}
                  className={`relative flex flex-col items-center p-6 rounded-2xl border-2 transition-all duration-300 flex-1 max-w-[200px] group ${
                    userType === 'employer'
                      ? 'border-primary bg-gradient-to-b from-primary/10 to-primary/5 shadow-lg shadow-primary/10'
                      : 'border-border hover:border-primary/50 hover:shadow-md'
                  }`}
                >
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 ${
                      userType === 'employer' 
                        ? 'bg-primary text-primary-foreground shadow-lg' 
                        : 'bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                    }`}
                  >
                    <Building2 className="w-8 h-8" />
                  </div>
                  <span
                    className={`font-bold text-lg transition-colors ${
                      userType === 'employer' ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  >
                    Employer
                  </span>
                  <span className="text-xs text-muted-foreground text-center mt-2 leading-relaxed">
                    I want to attract the best talent.
                  </span>
                  {userType === 'employer' && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              </div>

              <form onSubmit={handleSignup} className="space-y-5">
                {/* Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="Enter First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="h-12 pr-10 rounded-xl border-border focus:border-primary"
                        required
                      />
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Enter Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="h-12 pr-10 rounded-xl border-border focus:border-primary"
                        required
                      />
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {/* Username and Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium">
                      Username <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-12 pr-10 rounded-xl border-border focus:border-primary"
                        required
                      />
                      <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 pr-10 rounded-xl border-border focus:border-primary"
                        required
                      />
                      <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 pr-10 rounded-xl border-border focus:border-primary"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm Password <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Enter Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-12 pr-10 rounded-xl border-border focus:border-primary"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                  <div className="flex gap-3">
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger className="w-[120px] h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+91">🇮🇳 +91</SelectItem>
                        <SelectItem value="+1">🇺🇸 +1</SelectItem>
                        <SelectItem value="+44">🇬🇧 +44</SelectItem>
                        <SelectItem value="+61">🇦🇺 +61</SelectItem>
                        <SelectItem value="+971">🇦🇪 +971</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="81234 56789"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-12 pr-10 rounded-xl border-border focus:border-primary"
                      />
                      <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {/* Organization Name - Employer Only */}
                {userType === 'employer' && (
                  <div className="space-y-2">
                    <Label htmlFor="organizationName" className="text-sm font-medium">
                      Organization Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="organizationName"
                        type="text"
                        placeholder="Enter Organization Name"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        className="h-12 pr-10 rounded-xl border-border focus:border-primary"
                        required={userType === 'employer'}
                      />
                      <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                )}

                {/* Sector */}
                <div className="space-y-2">
                  <Label htmlFor="sector" className="text-sm font-medium">Select Sector</Label>
                  <Select value={sector} onValueChange={setSector}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Please Select Sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Resume Upload - Candidate Only */}
                {userType === 'candidate' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Upload Resume</Label>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
                        isDragging
                          ? 'border-primary bg-primary/5 scale-[1.02]'
                          : resumeFile
                          ? 'border-success bg-success/5'
                          : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                      }`}
                    >
                      {resumeFile ? (
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-success" />
                          </div>
                          <div className="flex items-center gap-3 bg-secondary rounded-xl px-4 py-3">
                            <FileText className="w-5 h-5 text-primary" />
                            <span className="text-sm font-medium truncate max-w-[200px]">{resumeFile.name}</span>
                            <button
                              type="button"
                              onClick={() => setResumeFile(null)}
                              className="ml-2 p-1 hover:bg-destructive/10 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-8 h-8 text-primary" />
                          </div>
                          <p className="text-base font-medium text-foreground mb-1">
                            Drop a resume file or click to upload.
                          </p>
                          <p className="text-sm text-muted-foreground mb-4">
                            To upload file size is (Max 5Mb) and allowed file types are (.doc, .docx, .pdf)
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => document.getElementById('resumeInput')?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Resume
                          </Button>
                        </>
                      )}
                      <input
                        id="resumeInput"
                        type="file"
                        accept=".doc,.docx,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}

                {/* Location status */}
                <div
                  className={`p-4 rounded-xl flex items-center gap-3 transition-all ${
                    locationCaptured
                      ? 'bg-success/10 border border-success/20'
                      : geolocation.loading
                      ? 'bg-warning/10 border border-warning/20'
                      : 'bg-muted border border-border'
                  }`}
                >
                  {geolocation.loading ? (
                    <Loader2 className="w-5 h-5 text-warning animate-spin" />
                  ) : locationCaptured ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <span
                      className={`text-sm font-medium ${
                        locationCaptured
                          ? 'text-success'
                          : geolocation.loading
                          ? 'text-warning'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {geolocation.loading
                        ? 'Detecting your location...'
                        : locationCaptured
                        ? 'Location captured for map placement'
                        : 'Enable location to appear on the map'}
                    </span>
                  </div>
                  <MapPin className={`w-5 h-5 ${locationCaptured ? 'text-success' : 'text-muted-foreground'}`} />
                </div>

                {/* Terms and Conditions */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/50">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                    className="mt-0.5"
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                    By clicking checkbox, you agree to our{' '}
                    <Link to="/terms" className="text-primary hover:underline font-medium">
                      Terms and Conditions
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-primary hover:underline font-medium">
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-14 rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-all" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Sign Up'
                  )}
                </Button>
              </form>

              <div className="mt-8 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-semibold">
                  Login
                </Link>
              </div>

              {/* Social Login Section */}
              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-4 text-muted-foreground font-medium">Or Sign In With</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <Button 
                    variant="outline" 
                    className="h-12 rounded-xl bg-[#4267B2] text-white hover:bg-[#4267B2]/90 border-0 font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    Facebook
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-12 rounded-xl bg-black text-white hover:bg-black/90 border-0 font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Twitter
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-12 rounded-xl font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-12 rounded-xl bg-[#0077B5] text-white hover:bg-[#0077B5]/90 border-0 font-medium"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    LinkedIn
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Signup;
