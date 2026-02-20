import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  User,
  Save,
  Loader2,
  MapPin,
  Shield,
  FileText,
  Bell,
  Globe,
  Navigation,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SecuritySettings } from '@/components/candidate/SecuritySettings';
import { JobAlertsManager } from '@/components/candidate/JobAlertsManager';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { LocationMapPicker } from '@/components/post-job/LocationMapPicker';
import { motion, AnimatePresence } from 'framer-motion';

interface Education {
  institution: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
}

// Profile Completeness component
const ProfileCompletenessCard = ({ completeness, missingFields }: { completeness: number; missingFields: string[] }) => {
  const getColor = () => {
    if (completeness >= 80) return 'text-green-500';
    if (completeness >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Profile Completeness</span>
        <span className={`text-2xl font-bold ${getColor()}`}>{completeness}%</span>
      </div>
      <div className="h-3 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${completeness}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full rounded-full ${completeness >= 80 ? 'bg-green-500' : completeness >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
        />
      </div>
      {missingFields.length > 0 && (
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">Complete these to improve visibility:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {missingFields.slice(0, 3).map((field, i) => (
              <li key={i}>{field}</li>
            ))}
            {missingFields.length > 3 && (
              <li className="text-muted-foreground/70">+{missingFields.length - 3} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

const CandidateSettings = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, loading: authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [candidate, setCandidate] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('privacy');
  const [profileRetryCount, setProfileRetryCount] = useState(0);

  // Privacy settings
  const [isVisibleOnMap, setIsVisibleOnMap] = useState(true);
  const [resumeVisibility, setResumeVisibility] = useState('approved_employers');

  // Location settings
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState('');

  // Initial values for change detection
  const [initialValues, setInitialValues] = useState<any>(null);

  // Check if any values have changed
  const hasChanges = () => {
    if (!initialValues) return false;

    return (
      isVisibleOnMap !== initialValues.isVisibleOnMap ||
      resumeVisibility !== initialValues.resumeVisibility ||
      coordinates?.lat !== initialValues.coordinates?.lat ||
      coordinates?.lng !== initialValues.coordinates?.lng ||
      locationAddress !== initialValues.locationAddress
    );
  };

  // Retry profile fetch if user exists but profile is null
  useEffect(() => {
    if (user && !profile && !profileLoading && profileRetryCount < 3) {
      const timer = setTimeout(() => {
        refreshProfile();
        setProfileRetryCount(prev => prev + 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, profile, profileLoading, profileRetryCount, refreshProfile]);

  useEffect(() => {
    // Still loading auth
    if (authLoading) return;

    // Not logged in
    if (!user) {
      navigate('/login');
      return;
    }

    // Wait for profile but not forever
    if (!profile && profileLoading) return;

    // Profile loaded, fetch candidate data
    if (profile) {
      fetchCandidateProfile();
    } else {
      // Profile failed to load after retries
      setLoading(false);
    }
  }, [profile, user, authLoading, profileLoading]);

  const fetchCandidateProfile = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCandidate(data);
        setIsVisibleOnMap(profile.is_visible_on_map !== false);
        setResumeVisibility(data.resume_visibility || 'approved_employers');

        // Set location
        const coords = profile.latitude && profile.longitude
          ? { lat: profile.latitude, lng: profile.longitude }
          : null;
        setCoordinates(coords);

        // Store initial values for change detection
        setInitialValues({
          isVisibleOnMap: profile.is_visible_on_map !== false,
          resumeVisibility: data.resume_visibility || 'approved_employers',
          coordinates: coords,
        });
      } else {
        toast.error('No candidate profile found');
        navigate('/candidate-dashboard');
      }
    } catch (error) {
      console.error('Error fetching candidate:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!candidate || !profile) return;

    setSaving(true);
    try {
      // Update profile with coordinates
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_visible_on_map: isVisibleOnMap,
          latitude: coordinates?.lat || null,
          longitude: coordinates?.lng || null,
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // Update candidate settings
      const { error: candidateError } = await supabase
        .from('candidates')
        .update({
          resume_visibility: resumeVisibility,
        })
        .eq('id', candidate.id);

      if (candidateError) throw candidateError;

      // Update initial values
      setInitialValues({
        isVisibleOnMap,
        resumeVisibility,
        coordinates: coordinates ? { ...coordinates } : null,
      });

      await refreshProfile();
      toast.success('Settings saved successfully');
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Show auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show profile loading state
  if (user && !profile && profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Show error if profile failed to load
  if (user && !profile && !profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">Profile Not Found</h2>
            <p className="text-muted-foreground mb-8">We couldn't load your profile. Please try again.</p>
            <div className="flex gap-3">
              <Button onClick={() => refreshProfile()} variant="outline" className="flex-1">
                Retry
              </Button>
              <Button onClick={() => navigate('/candidate-dashboard')} className="flex-1">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <EmailVerificationGuard fallbackMessage="Please verify your email to access settings.">
      <div className="min-h-screen bg-secondary py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/candidate-dashboard')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Account Settings</h1>
                <p className="text-muted-foreground">Manage your account security and preferences</p>
              </div>
            </div>

            <AnimatePresence>
              {hasChanges() && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-3 w-full max-w-2xl">
              <TabsTrigger value="privacy" className="gap-2">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">Privacy</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Job Alerts</span>
              </TabsTrigger>
            </TabsList>



            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              {/* Location Picker */}
              <Card className="shadow-google">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-primary" />
                    Your Location
                  </CardTitle>
                  <CardDescription>Set your location so employers can find you nearby</CardDescription>
                </CardHeader>
                <CardContent>
                  <LocationMapPicker
                    coordinates={coordinates}
                    setCoordinates={setCoordinates}
                    address={locationAddress}
                    setAddress={setLocationAddress}
                  />
                </CardContent>
              </Card>

              <Card className="shadow-google">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Map Visibility
                  </CardTitle>
                  <CardDescription>Control whether employers can find you on the map</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                    <div>
                      <p className="font-medium">Show on Map</p>
                      <p className="text-sm text-muted-foreground">
                        Allow employers to see your profile marker on the map
                      </p>
                    </div>
                    <Switch
                      checked={isVisibleOnMap}
                      onCheckedChange={setIsVisibleOnMap}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-google">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Resume Privacy
                  </CardTitle>
                  <CardDescription>Control who can view your resume</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { value: 'approved_employers', label: 'Verified Employers Only', desc: 'Only admin-approved employers can view' },
                    { value: 'all_employers', label: 'All Employers', desc: 'Any registered employer can view' },
                    { value: 'applied_only', label: 'Applied Jobs Only', desc: 'Only employers you applied to can view' },
                    { value: 'private', label: 'Private', desc: 'No one can view your resume' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${resumeVisibility === option.value ? 'bg-primary/10 border-2 border-primary' : 'bg-secondary hover:bg-secondary/80'
                        }`}
                    >
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.desc}</p>
                      </div>
                      <input
                        type="radio"
                        name="resumeVisibility"
                        value={option.value}
                        checked={resumeVisibility === option.value}
                        onChange={(e) => setResumeVisibility(e.target.value)}
                        className="w-4 h-4 text-primary"
                      />
                    </label>
                  ))}
                </CardContent>
              </Card>

              {/* Job Alerts */}
              {candidate && <JobAlertsManager candidateId={candidate.id} />}
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <SecuritySettings />
            </TabsContent>
          </Tabs>
        </div>
        {/* Floating Save Button */}
        <AnimatePresence>
          {hasChanges() && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="bg-card border shadow-lg rounded-full px-6 py-3 flex items-center gap-4">
                <span className="text-sm font-medium text-muted-foreground">You have unsaved changes</span>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </EmailVerificationGuard>
  );
};

export default CandidateSettings;
