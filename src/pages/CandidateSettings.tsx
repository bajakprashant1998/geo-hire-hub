import { useState, useEffect } from 'react';
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
  Eye,
  Loader2,
  Briefcase,
  GraduationCap,
  Plus,
  X,
  MapPin,
  Shield,
  FileText,
  Bell,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ResumeUpload } from '@/components/candidate/ResumeUpload';
import { SecuritySettings } from '@/components/candidate/SecuritySettings';
import { JobAlertsManager } from '@/components/candidate/JobAlertsManager';
import { EmailVerificationGuard } from '@/components/auth/EmailVerificationGuard';
import { motion } from 'framer-motion';

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
          className={`h-full rounded-full ${
            completeness >= 80 ? 'bg-green-500' : completeness >= 50 ? 'bg-yellow-500' : 'bg-red-500'
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
  const { user, profile, refreshProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [candidate, setCandidate] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile fields
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);
  const [expectedSalary, setExpectedSalary] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [education, setEducation] = useState<Education[]>([]);
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [portfolioInput, setPortfolioInput] = useState('');
  
  // Privacy settings
  const [isVisibleOnMap, setIsVisibleOnMap] = useState(true);
  const [resumeVisibility, setResumeVisibility] = useState('approved_employers');

  useEffect(() => {
    if (profile) {
      fetchCandidateProfile();
    } else if (user === null) {
      navigate('/login');
    }
  }, [profile, user]);

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
        setFullName(profile.full_name || '');
        setAvatarUrl(profile.avatar_url || '');
        setJobTitle(data.job_title || '');
        setBio(data.bio || '');
        setExperienceYears(data.experience_years || 0);
        setExpectedSalary(data.expected_salary || '');
        setSkills(data.skills || []);
        // Parse education properly
        let parsedEducation: Education[] = [];
        if (data.education) {
          if (Array.isArray(data.education)) {
            parsedEducation = data.education as unknown as Education[];
          }
        }
        setEducation(parsedEducation);
        setPortfolioUrls(data.portfolio_urls || []);
        setIsVisibleOnMap(profile.is_visible_on_map !== false);
        setResumeVisibility(data.resume_visibility || 'approved_employers');
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

  const calculateCompleteness = () => {
    const checks = [
      fullName,
      avatarUrl,
      jobTitle,
      skills.length > 0,
      experienceYears > 0,
      education.length > 0,
      profile?.latitude && profile?.longitude,
      bio && bio.length > 20,
      candidate?.resume_url,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  };

  const calculateMissingFields = () => {
    const missing: string[] = [];
    if (!fullName) missing.push('Full Name');
    if (!avatarUrl) missing.push('Profile Photo');
    if (!jobTitle) missing.push('Job Title');
    if (!skills.length) missing.push('Skills');
    if (!experienceYears) missing.push('Experience');
    if (!education.length) missing.push('Education');
    if (!profile?.latitude || !profile?.longitude) missing.push('Location');
    if (!bio || bio.length < 20) missing.push('Bio (min 20 chars)');
    if (!candidate?.resume_url) missing.push('Resume');
    return missing;
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const addPortfolio = () => {
    if (portfolioInput.trim() && !portfolioUrls.includes(portfolioInput.trim())) {
      setPortfolioUrls([...portfolioUrls, portfolioInput.trim()]);
      setPortfolioInput('');
    }
  };

  const removePortfolio = (url: string) => {
    setPortfolioUrls(portfolioUrls.filter(u => u !== url));
  };

  const addEducation = () => {
    setEducation([...education, { institution: '', degree: '', field: '', startYear: '', endYear: '' }]);
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    const newEducation = [...education];
    newEducation[index] = { ...newEducation[index], [field]: value };
    setEducation(newEducation);
  };

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!candidate || !profile) return;

    setSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          avatar_url: avatarUrl || null,
          is_visible_on_map: isVisibleOnMap,
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // Update candidate
      const { error: candidateError } = await supabase
        .from('candidates')
        .update({
          job_title: jobTitle,
          bio,
          experience_years: experienceYears,
          expected_salary: expectedSalary,
          skills,
          education: education as unknown as any,
          portfolio_urls: portfolioUrls,
          resume_visibility: resumeVisibility,
        })
        .eq('id', candidate.id);

      if (candidateError) throw candidateError;

      await refreshProfile();
      toast.success('Profile saved successfully');
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const completeness = calculateCompleteness();

  return (
    <EmailVerificationGuard fallbackMessage="Please verify your email to edit your profile.">
      <div className="min-h-screen bg-secondary py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/candidate-dashboard')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Profile Settings</h1>
                <p className="text-muted-foreground">Manage your profile and preferences</p>
              </div>
            </div>
          </div>

          {/* Completeness Bar */}
          <Card className="shadow-google">
            <CardContent className="p-6">
              <ProfileCompletenessCard 
                completeness={completeness}
                missingFields={calculateMissingFields()}
              />
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="resume" className="gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Resume</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="gap-2">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">Privacy</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              {/* Photo & Basic Info */}
              <Card className="shadow-google">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Photo Upload */}
                  <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-secondary/50 rounded-lg">
                    {user && (
                      <PhotoUpload
                        userId={user.id}
                        currentPhotoUrl={avatarUrl}
                        onPhotoUploaded={setAvatarUrl}
                        size="lg"
                      />
                    )}
                    <div className="text-center md:text-left">
                      <h3 className="font-semibold">Profile Photo</h3>
                      <p className="text-sm text-muted-foreground">
                        Upload a professional photo. Recommended: Square image (1:1 ratio), at least 200x200px.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Basic Fields */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Job Title *</Label>
                      <Input
                        id="jobTitle"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="e.g., Software Engineer"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="experience">Years of Experience</Label>
                      <Input
                        id="experience"
                        type="number"
                        min="0"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salary">Expected Salary</Label>
                      <Input
                        id="salary"
                        value={expectedSalary}
                        onChange={(e) => setExpectedSalary(e.target.value)}
                        placeholder="e.g., $80,000 - $100,000"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">About / Summary</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Write a brief summary about yourself..."
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      {bio.length}/20 characters minimum
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Skills */}
              <Card className="shadow-google">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      placeholder="Add a skill..."
                    />
                    <Button type="button" onClick={addSkill} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="gap-1 py-1.5 px-3">
                        {skill}
                        <X 
                          className="w-3 h-3 cursor-pointer hover:text-destructive ml-1" 
                          onClick={() => removeSkill(skill)} 
                        />
                      </Badge>
                    ))}
                    {skills.length === 0 && (
                      <p className="text-sm text-muted-foreground">No skills added yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Education */}
              <Card className="shadow-google">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      Education
                    </CardTitle>
                    <Button type="button" onClick={addEducation} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {education.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No education added yet. Click "Add" to add your education.
                    </p>
                  ) : (
                    education.map((edu, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={() => removeEducation(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input 
                            placeholder="Institution" 
                            value={edu.institution}
                            onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                          />
                          <Input 
                            placeholder="Degree" 
                            value={edu.degree}
                            onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Input 
                            placeholder="Field of Study" 
                            value={edu.field}
                            onChange={(e) => updateEducation(index, 'field', e.target.value)}
                          />
                          <Input 
                            placeholder="Start Year" 
                            value={edu.startYear}
                            onChange={(e) => updateEducation(index, 'startYear', e.target.value)}
                          />
                          <Input 
                            placeholder="End Year" 
                            value={edu.endYear}
                            onChange={(e) => updateEducation(index, 'endYear', e.target.value)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Portfolio */}
              <Card className="shadow-google">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    Portfolio Links
                  </CardTitle>
                  <CardDescription>Add links to your work, GitHub, LinkedIn, etc.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={portfolioInput}
                      onChange={(e) => setPortfolioInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPortfolio())}
                      placeholder="https://..."
                    />
                    <Button type="button" onClick={addPortfolio} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {portfolioUrls.map((url, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-primary hover:underline truncate">
                          {url}
                        </a>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePortfolio(url)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    {portfolioUrls.length === 0 && (
                      <p className="text-sm text-muted-foreground">No portfolio links added yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex items-center justify-between">
                <Link to={`/candidates/${candidate?.id}`}>
                  <Button variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    View as Employer
                  </Button>
                </Link>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Profile
                </Button>
              </div>
            </TabsContent>

            {/* Resume Tab */}
            <TabsContent value="resume" className="space-y-6">
              {candidate && (
                <ResumeUpload 
                  candidate={candidate}
                  onUpdate={() => fetchCandidateProfile()}
                />
              )}
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
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
                      className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
                        resumeVisibility === option.value ? 'bg-primary/10 border-2 border-primary' : 'bg-secondary hover:bg-secondary/80'
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

              {/* Save Button */}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Privacy Settings
                </Button>
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <SecuritySettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </EmailVerificationGuard>
  );
};

export default CandidateSettings;
