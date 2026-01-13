import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Briefcase, Users, Mail, Lock, Eye, EyeOff, User, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useGeolocation } from '@/hooks/useGeolocation';

const Signup = () => {
  const navigate = useNavigate();
  const geolocation = useGeolocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'candidate' | 'employer'>('candidate');
  const [locationCaptured, setLocationCaptured] = useState(false);

  useEffect(() => {
    if (!geolocation.loading && geolocation.latitude && geolocation.longitude) {
      setLocationCaptured(true);
    }
  }, [geolocation]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            user_type: userType,
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

      toast.success('Account created! Welcome to GeoJobs.');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Back button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to map
        </Link>

        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-google">
            <span className="text-primary-foreground font-bold text-xl">GJ</span>
          </div>
          <span className="font-bold text-2xl">GeoJobs</span>
        </div>

        {/* Signup Card */}
        <Card className="shadow-google-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Join GeoJobs and find opportunities near you</CardDescription>
          </CardHeader>
          <CardContent>
            {/* User type tabs */}
            <Tabs value={userType} onValueChange={(v) => setUserType(v as any)} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="candidate" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Job Seeker
                </TabsTrigger>
                <TabsTrigger value="employer" className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Employer
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Location status */}
            <div
              className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                locationCaptured
                  ? 'bg-success/10 text-success'
                  : 'bg-warning/10 text-warning-foreground'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span className="text-sm">
                {geolocation.loading
                  ? 'Detecting your location...'
                  : locationCaptured
                  ? 'Location captured for map placement'
                  : 'Enable location to appear on the map'}
              </span>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  {userType === 'employer' ? 'Company Name' : 'Full Name'}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={userType === 'employer' ? 'Your Company' : 'John Doe'}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
